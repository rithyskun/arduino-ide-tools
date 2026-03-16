'use client';
import { useState } from 'react';
import {
  Thermometer, Settings, Monitor, Cpu, Zap, Activity,
  Eye, Wind, Flame, Layers, Circle, SlidersHorizontal,
  Wifi, ToggleLeft,
} from 'lucide-react';
import type { DeviceInstance } from '@/types';

interface DeviceDrivenPanelProps {
  devices: DeviceInstance[];
  deviceStates: Record<string, Record<string, unknown>>;
  onDeviceStateChange: (deviceId: string, state: Record<string, unknown>) => void;
  onSendSerial: (cmd: string) => void;
  simRunning: boolean;
}

// ── Shared UI primitives ──────────────────────────────────────────
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="font-mono text-[10px] text-[var(--fg-subtle)]">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function Slider({
  min, max, step = 1, value, onChange, unit = '', width = 'w-24',
}: { min: number; max: number; step?: number; value: number; onChange: (v: number) => void; unit?: string; width?: string }) {
  return (
    <>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
        className={`${width} accent-[var(--accent-green)]`} />
      <span className="font-mono text-[10px] text-[var(--fg-default)] w-14 text-right">
        {typeof value === 'number' && step < 1 ? value.toFixed(1) : value}{unit}
      </span>
    </>
  );
}

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <Row label={label}>
      <button onClick={onToggle}
        className={`w-10 h-5 rounded-full border transition-all relative ${on ? 'bg-green-800 border-[var(--accent-green)]' : 'bg-[var(--bg-raised)] border-[var(--border-default)]'}`}>
        <div className={`w-3.5 h-3.5 rounded-full absolute top-[3px] transition-all ${on ? 'bg-[var(--accent-green)] left-[22px]' : 'bg-[var(--fg-subtle)] left-[3px]'}`} />
      </button>
      <span className={`font-mono text-[10px] ${on ? 'text-[var(--accent-green)]' : 'text-[var(--fg-subtle)]'}`}>{on ? 'ON' : 'OFF'}</span>
    </Row>
  );
}

function Badge({ color, text }: { color: string; text: string }) {
  return <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${color}`}>{text}</span>;
}

// ── Per-device control renderers ─────────────────────────────────
function DeviceControls({ device, state, onChange }: {
  device: DeviceInstance;
  state: Record<string, unknown>;
  onChange: (s: Record<string, unknown>) => void;
}) {
  const n = (key: string, fallback: number) => typeof state[key] === 'number' ? state[key] as number : fallback;
  const b = (key: string, fallback: boolean) => typeof state[key] === 'boolean' ? state[key] as boolean : fallback;

  switch (device.deviceType) {

    case 'dht22':
      return (
        <div className="space-y-1">
          <Row label="Temperature">
            <Slider min={-40} max={80} step={0.1} value={n('temperature', 25)} onChange={v => onChange({ temperature: v })} unit="°C" />
          </Row>
          <Row label="Humidity">
            <Slider min={0} max={100} step={0.1} value={n('humidity', 60)} onChange={v => onChange({ humidity: v })} unit="%" />
          </Row>
          {b('isReading', false) && <p className="font-mono text-[9px] text-[var(--accent-blue)] animate-pulse">Reading…</p>}
        </div>
      );

    case 'bmp280':
      return (
        <div className="space-y-1">
          <Row label="Pressure">
            <Slider min={95000} max={106000} step={10} value={n('pressure', 101325)} onChange={v => onChange({ pressure: v })} unit="Pa" width="w-20" />
          </Row>
          <Row label="Temperature">
            <Slider min={-20} max={60} step={0.1} value={n('temperature', 24)} onChange={v => onChange({ temperature: v })} unit="°C" />
          </Row>
          <Row label="Altitude">
            <span className="font-mono text-[10px] text-[var(--fg-default)]">{n('altitude', 120).toFixed(1)} m</span>
          </Row>
        </div>
      );

    case 'hx711':
      return (
        <div className="space-y-1">
          <Row label="Weight (g)">
            <Slider min={0} max={5000} step={1} value={n('weight', 0)} onChange={v => onChange({ weight: v })} unit="g" />
          </Row>
          <Row label="Tare">
            <button onClick={() => onChange({ tare: true })}
              className="font-mono text-[9px] px-2 py-1 rounded border border-[var(--border-default)] text-[var(--fg-muted)] hover:bg-[var(--bg-raised)]">
              TARE
            </button>
          </Row>
        </div>
      );

    case 'ultrasonic':
      return (
        <div className="space-y-1">
          <Row label="Distance">
            <Slider min={2} max={400} step={1} value={n('distance', 50)} onChange={v => onChange({ distance: v })} unit="cm" />
          </Row>
          <Row label="Status">
            <Badge color="text-[var(--accent-blue)] border-[var(--border-subtle)]" text={`${n('distance', 50)} cm`} />
          </Row>
        </div>
      );

    case 'pir':
      return (
        <div className="space-y-1">
          <Toggle on={b('motionDetected', false)} onToggle={() => onChange({ motionDetected: !b('motionDetected', false) })} label="Motion Detected" />
          <Row label="Warmed Up">
            <Badge
              color={b('warmedUp', false) ? 'text-[var(--accent-green)] border-green-800' : 'text-[var(--accent-amber)] border-yellow-800'}
              text={b('warmedUp', false) ? 'READY' : 'WARMING UP'} />
          </Row>
          <Row label="">
            <button onClick={() => onChange({ motionDetected: true })}
              className="font-mono text-[9px] px-2 py-1 rounded border border-[var(--border-default)] text-[var(--fg-muted)] hover:bg-[var(--bg-raised)]">
              Trigger Motion
            </button>
          </Row>
        </div>
      );

    case 'mq2':
      return (
        <div className="space-y-1">
          <Row label="Gas Level (ADC)">
            <Slider min={100} max={1023} step={1} value={n('adcValue', 120)} onChange={v => onChange({ adcValue: v })} unit="" />
          </Row>
          <Row label="Status">
            <Badge
              color={b('gasPresent', false) ? 'text-[var(--accent-red)] border-red-800 animate-pulse' : 'text-[var(--accent-green)] border-green-800'}
              text={b('gasPresent', false) ? '⚠ GAS DETECTED' : 'CLEAR'} />
          </Row>
          <Row label="Warmed Up">
            <Badge color={b('warmupDone', false) ? 'text-[var(--fg-subtle)] border-[var(--border-subtle)]' : 'text-[var(--accent-amber)] border-yellow-800'}
              text={b('warmupDone', false) ? 'READY' : 'WARMING UP'} />
          </Row>
        </div>
      );

    case 'ds18b20':
      return (
        <div className="space-y-1">
          <Row label="Temperature">
            <Slider min={-55} max={125} step={0.1} value={n('temperature', 24)} onChange={v => onChange({ temperature: v })} unit="°C" />
          </Row>
          <Row label="Conversion">
            <Badge color={b('conversionDone', true) ? 'text-[var(--accent-green)] border-green-800' : 'text-[var(--accent-blue)] border-blue-800 animate-pulse'}
              text={b('conversionDone', true) ? 'DONE' : 'CONVERTING…'} />
          </Row>
          <Row label="Sensors on bus">
            <span className="font-mono text-[10px] text-[var(--fg-default)]">{n('sensorCount', 1)}</span>
          </Row>
        </div>
      );

    case 'mpu6050':
      return (
        <div className="space-y-1">
          <Row label="Accel X"><Slider min={-16384} max={16384} step={100} value={n('ax', 0)} onChange={v => onChange({ ax: v })} unit="" width="w-20" /></Row>
          <Row label="Accel Y"><Slider min={-16384} max={16384} step={100} value={n('ay', 0)} onChange={v => onChange({ ay: v })} unit="" width="w-20" /></Row>
          <Row label="Accel Z"><Slider min={-16384} max={16384} step={100} value={n('az', 16384)} onChange={v => onChange({ az: v })} unit="" width="w-20" /></Row>
          <Row label="Temp"><span className="font-mono text-[10px] text-[var(--fg-default)]">{n('temperature', 25).toFixed(1)}°C</span></Row>
          <Row label="Init"><Badge color={b('initialized', false) ? 'text-[var(--accent-green)] border-green-800' : 'text-[var(--fg-subtle)] border-[var(--border-subtle)]'} text={b('initialized', false) ? 'READY' : 'NOT INIT'} /></Row>
        </div>
      );

    case 'led':
      return (
        <div className="space-y-1">
          <Toggle on={b('state', false)} onToggle={() => onChange({ state: !b('state', false), brightness: b('state', false) ? 0 : 255 })} label="LED State" />
          <Row label="Brightness">
            <Slider min={0} max={255} step={1} value={n('brightness', 0)} onChange={v => onChange({ brightness: v, state: v > 0 })} unit="" />
          </Row>
          <Row label="Power">
            <span className="font-mono text-[10px] text-[var(--fg-default)]">{n('powerConsumption', 0)} mW</span>
          </Row>
        </div>
      );

    case 'relay':
      return (
        <div className="space-y-1">
          <Toggle on={b('activated', false)} onToggle={() => onChange({ activated: !b('activated', false) })} label="Relay" />
          <Row label="State">
            <Badge color={b('activated', false) ? 'text-[var(--accent-green)] border-green-800' : 'text-[var(--fg-subtle)] border-[var(--border-subtle)]'}
              text={b('activated', false) ? 'CLOSED (ON)' : 'OPEN (OFF)'} />
          </Row>
        </div>
      );

    case 'servo':
      return (
        <div className="space-y-1">
          <Row label="Angle">
            <Slider min={0} max={180} step={1} value={n('targetAngle', 90)} onChange={v => onChange({ targetAngle: v })} unit="°" />
          </Row>
          <Row label="Current">
            <span className="font-mono text-[10px] text-[var(--fg-default)]">{n('currentAngle', 90).toFixed(1)}°</span>
          </Row>
        </div>
      );

    case 'buzzer':
      return (
        <div className="space-y-1">
          <Toggle on={b('active', false)} onToggle={() => onChange({ active: !b('active', false) })} label="Buzzer" />
          <Row label="Frequency">
            <Slider min={20} max={20000} step={10} value={n('frequency', 1000)} onChange={v => onChange({ frequency: v })} unit="Hz" width="w-20" />
          </Row>
          <Row label="Volume">
            <Slider min={0} max={100} step={1} value={n('volume', 50)} onChange={v => onChange({ volume: v })} unit="%" width="w-20" />
          </Row>
        </div>
      );

    case 'neopixel': {
      const pixels = Array.isArray(state.pixels) ? state.pixels as Array<{index:number;r:number;g:number;b:number;hex:string}> : [];
      return (
        <div className="space-y-1">
          <Row label="Pixels">
            <span className="font-mono text-[10px] text-[var(--fg-default)]">{n('numPixels', 8)} px</span>
          </Row>
          <Row label="Brightness">
            <Slider min={0} max={255} step={1} value={n('brightness', 255)} onChange={v => onChange({ brightness: v })} unit="" />
          </Row>
          <div className="flex flex-wrap gap-1 mt-1 max-h-16 overflow-y-auto">
            {pixels.slice(0, 32).map(p => (
              <div key={p.index} title={`#${p.index}: ${p.hex}`}
                className="w-4 h-4 rounded-sm border border-[var(--border-subtle)]"
                style={{ backgroundColor: p.hex }} />
            ))}
            {pixels.length === 0 && <span className="font-mono text-[9px] text-[var(--fg-subtle)]">No data — call show()</span>}
          </div>
        </div>
      );
    }

    case 'oled': {
      const entries = Array.isArray(state.textEntries) ? state.textEntries as Array<{x:number;y:number;text:string;size:number}> : [];
      return (
        <div className="space-y-1">
          <Row label="Display">
            <Badge color={b('initialized', false) ? 'text-[var(--accent-green)] border-green-800' : 'text-[var(--fg-subtle)] border-[var(--border-subtle)]'}
              text={b('initialized', false) ? 'ON' : 'NOT INIT'} />
          </Row>
          <div className="bg-black rounded p-1 mt-1 min-h-[48px] font-mono text-[8px] text-white leading-tight overflow-hidden"
            style={{ width: 128, fontSize: 7 }}>
            {entries.length === 0
              ? <span className="text-gray-600">clearDisplay()</span>
              : entries.slice(-8).map((e, i) => <div key={i}>{e.text}</div>)}
          </div>
        </div>
      );
    }

    case 'lcd1602': {
      const lines = Array.isArray(state.lines) ? state.lines as string[] : [];
      return (
        <div className="space-y-1">
          <Toggle on={b('backlight', true)} onToggle={() => onChange({ backlight: !b('backlight', true) })} label="Backlight" />
          <div className="bg-[#1a3a1a] rounded p-1 mt-1 font-mono text-[10px] text-[#90ee90] leading-5"
            style={{ minHeight: 36, width: 160 }}>
            {lines[0] !== undefined ? <div>{lines[0]}</div> : <div className="text-green-900">—</div>}
            {lines[1] !== undefined ? <div>{lines[1]}</div> : <div className="text-green-900">—</div>}
          </div>
        </div>
      );
    }

    case 'button':
      return (
        <div className="space-y-1">
          <Toggle on={b('pressed', false)} onToggle={() => onChange({ pressed: !b('pressed', false) })} label="Pressed" />
          <Row label="Press count"><span className="font-mono text-[10px] text-[var(--fg-default)]">{n('pressCount', 0)}</span></Row>
          <Row label="Pin logic">
            <Badge color="text-[var(--fg-subtle)] border-[var(--border-subtle)]"
              text={`PIN = ${n('pinState', 1)} (${b('activeLow', true) ? 'PULLUP' : 'active-HIGH'})`} />
          </Row>
        </div>
      );

    case 'potentiometer':
      return (
        <div className="space-y-1">
          <Row label="Value">
            <Slider min={0} max={1023} step={1} value={n('value', 512)} onChange={v => onChange({ value: v })} unit="" />
          </Row>
          <Row label="Voltage">
            <span className="font-mono text-[10px] text-[var(--fg-default)]">{((n('value', 512) * 5) / 1023).toFixed(2)} V</span>
          </Row>
          <Row label="Percent">
            <span className="font-mono text-[10px] text-[var(--fg-default)]">{n('valuePercent', 50)}%</span>
          </Row>
        </div>
      );

    case 'soil-moisture':
      return (
        <div className="space-y-1">
          <Row label="Moisture %">
            <Slider min={0} max={100} step={1} value={n('moisturePercent', 50)} onChange={v => onChange({ moisturePercent: v })} unit="%" />
          </Row>
          <Row label="ADC">
            <span className="font-mono text-[10px] text-[var(--fg-default)]">{n('adcValue', 512)}</span>
          </Row>
        </div>
      );

    case 'stepper':
      return (
        <div className="space-y-1">
          <Row label="Target pos">
            <input type="number" value={n('targetPosition', 0)}
              onChange={e => onChange({ targetPosition: parseInt(e.target.value) || 0 })}
              className="w-20 px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-raised)] font-mono text-[10px] text-[var(--fg-default)]" />
            <span className="font-mono text-[9px] text-[var(--fg-subtle)]">steps</span>
          </Row>
          <Row label="Current pos">
            <span className="font-mono text-[10px] text-[var(--fg-default)]">{n('currentPosition', 0)} steps</span>
          </Row>
          <Row label="Speed">
            <Slider min={0} max={1000} step={10} value={n('speed', 200)} onChange={v => onChange({ speed: v })} unit=" rpm" width="w-20" />
          </Row>
        </div>
      );

    default:
      return (
        <div className="font-mono text-[9px] text-[var(--fg-subtle)] italic">
          No controls — state: {JSON.stringify(state).slice(0, 80)}
        </div>
      );
  }
}

// ── Icon map ──────────────────────────────────────────────────────
function DeviceIcon({ type }: { type: string }) {
  const map: Record<string, React.ReactNode> = {
    dht22: <Thermometer size={13} />,
    bmp280: <Activity size={13} />,
    hx711: <Layers size={13} />,
    ina260: <Zap size={13} />,
    ultrasonic: <Wifi size={13} />,
    pir: <Eye size={13} />,
    mq2: <Wind size={13} />,
    ds18b20: <Thermometer size={13} />,
    mpu6050: <Activity size={13} />,
    led: <Circle size={13} />,
    relay: <ToggleLeft size={13} />,
    servo: <Settings size={13} />,
    buzzer: <Flame size={13} />,
    stepper: <Settings size={13} className="animate-spin" />,
    neopixel: <Circle size={13} />,
    oled: <Monitor size={13} />,
    lcd1602: <Monitor size={13} />,
    button: <Circle size={13} />,
    potentiometer: <SlidersHorizontal size={13} />,
    'soil-moisture': <Thermometer size={13} />,
  };
  return <>{map[type] ?? <Cpu size={13} />}</>;
}

function categoryColor(cat: string) {
  return ({
    sensor: 'text-[var(--accent-blue)]',
    actuator: 'text-[var(--accent-green)]',
    display: 'text-purple-400',
    input: 'text-[var(--accent-amber)]',
    power: 'text-[var(--accent-red)]',
  } as Record<string,string>)[cat] ?? 'text-[var(--fg-subtle)]';
}

// ── Main panel ────────────────────────────────────────────────────
export default function DeviceDrivenPanel({
  devices,
  deviceStates,
  onDeviceStateChange,
  onSendSerial,
  simRunning,
}: DeviceDrivenPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
        <Cpu size={28} className="text-[var(--fg-subtle)]" />
        <p className="font-mono text-[10px] text-[var(--fg-subtle)]">
          No devices configured.<br />Add devices from the Device Catalog.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-y-auto h-full">
      <div className="panel-hdr justify-between flex-shrink-0">
        <span>Device Controls</span>
        <span className="text-[9px] text-[var(--fg-subtle)]">
          {devices.length} device{devices.length !== 1 ? 's' : ''}
          {!simRunning && ' — start sim to enable'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
        {devices.map(device => {
          const state = deviceStates[device.instanceId] ?? {};
          const isOpen = expanded[device.instanceId] ?? true;

          return (
            <div key={device.instanceId}>
              {/* Device header */}
              <button
                onClick={() => setExpanded(p => ({ ...p, [device.instanceId]: !isOpen }))}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--bg-raised)] transition-colors"
              >
                <span className={categoryColor(device.deviceType)}>
                  <DeviceIcon type={device.deviceType} />
                </span>
                <span className="font-mono text-[10px] text-[var(--fg-default)] font-bold flex-1 text-left truncate">
                  {device.label}
                </span>
                <span className="font-mono text-[9px] text-[var(--fg-subtle)]">
                  {device.deviceType}
                </span>
                <span className="font-mono text-[9px] text-[var(--fg-subtle)] ml-1">
                  {isOpen ? '▾' : '▸'}
                </span>
              </button>

              {/* Device controls */}
              {isOpen && (
                <div className={`px-3 pb-3 ${!simRunning ? 'opacity-60 pointer-events-none' : ''}`}>
                  <DeviceControls
                    device={device}
                    state={state}
                    onChange={s => onDeviceStateChange(device.instanceId, s)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
