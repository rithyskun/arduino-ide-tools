'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Thermometer,
  Zap,
  Droplets,
  Weight,
  RotateCcw,
  Cpu,
  Radio,
} from 'lucide-react';
import type { SensorInputs } from '@/lib/simulator/smart-engine';
import type { DiagnosticSnapshot } from '@/lib/simulator/smart-engine';
import { ntcToTemp } from '@/lib/simulator/physics';

interface SmartHardwarePanelProps {
  inputs: SensorInputs;
  diagnostics: DiagnosticSnapshot | null;
  onInputChange: (inputs: Partial<SensorInputs>) => void;
  onSwitchToggle: (on: boolean) => void;
  onSendSerial: (cmd: string) => void;
  simRunning: boolean;
}

export default function SmartHardwarePanel({
  inputs,
  diagnostics,
  onInputChange,
  onSwitchToggle,
  onSendSerial,
  simRunning,
}: SmartHardwarePanelProps) {
  const [tab, setTab] = useState<'controls' | 'diagnostics' | 'i2c' | 'eeprom'>(
    'controls'
  );
  const motorOn = diagnostics?.motorRunning ?? false;

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Sub-tabs */}
      <div
        className="flex border-b flex-shrink-0"
        style={{
          borderColor: 'var(--border-subtle)',
          background: 'var(--bg-surface)',
        }}
      >
        {(['controls', 'diagnostics', 'i2c', 'eeprom'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-1.5 font-mono text-[9px] uppercase tracking-widest transition-colors"
            style={{
              color: tab === t ? 'var(--accent-blue)' : 'var(--fg-subtle)',
              borderBottom:
                tab === t
                  ? '2px solid var(--accent-blue)'
                  : '2px solid transparent',
              background: 'transparent',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'controls' && (
          <ControlsTab
            inputs={inputs}
            diagnostics={diagnostics}
            onInputChange={onInputChange}
            onSwitchToggle={onSwitchToggle}
            motorOn={motorOn}
            simRunning={simRunning}
          />
        )}
        {tab === 'diagnostics' && <DiagnosticsTab diagnostics={diagnostics} />}
        {tab === 'i2c' && <I2CTab diagnostics={diagnostics} />}
        {tab === 'eeprom' && <EEPROMTab diagnostics={diagnostics} />}
      </div>
    </div>
  );
}

// ── Controls Tab ─────────────────────────────────────────────────
function ControlsTab({
  inputs,
  diagnostics,
  onInputChange,
  onSwitchToggle,
  motorOn,
  simRunning,
}: {
  inputs: SensorInputs;
  diagnostics: DiagnosticSnapshot | null;
  onInputChange: (p: Partial<SensorInputs>) => void;
  onSwitchToggle: (on: boolean) => void;
  motorOn: boolean;
  simRunning: boolean;
}) {
  const [switchOn, setSwitchOn] = useState(false);

  function toggleSwitch() {
    const next = !switchOn;
    setSwitchOn(next);
    onSwitchToggle(next);
  }

  const scaleWeights = inputs.scaleWeightG;
  const relay1On = (diagnostics?.pins[6] ?? 1) === 0;
  const relay2On = (diagnostics?.pins[7] ?? 1) === 0;

  return (
    <div className="space-y-0">
      {/* Motor switch */}
      <SectionHdr
        icon={<RotateCcw size={10} />}
        label="Stepper Motor (Pin 15)"
      />
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <p
            className="font-mono text-[10px]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            Motor Switch
          </p>
          <p
            className="font-mono text-[9px]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            RPM:{' '}
            <span
              style={{
                color: motorOn ? 'var(--accent-green)' : 'var(--fg-subtle)',
              }}
            >
              {diagnostics?.motorRpm ?? 0}
            </span>
            &nbsp;· Flow:{' '}
            <span style={{ color: 'var(--accent-blue)' }}>
              {diagnostics?.stepper.flowRateL_h.toFixed(2) ?? '0.00'} L/h
            </span>
          </p>
        </div>
        <Toggle on={switchOn} onChange={toggleSwitch} />
      </div>

      {/* Scale weights */}
      <SectionHdr icon={<Weight size={10} />} label="HX711 Load Cells" />
      {[0, 1, 2].map((i) => {
        const actual = diagnostics?.hx711[i]
          ? Math.round(
              (diagnostics.hx711[i].rawAdc - diagnostics.hx711[i].offset) /
                diagnostics.hx711[i].scaleFactor
            )
          : null;
        return (
          <SliderRow
            key={i}
            label={`Scale ${i}`}
            value={scaleWeights[i]}
            min={0}
            max={3000}
            step={1}
            unit="g"
            actual={actual !== null ? `${actual}g` : undefined}
            accentVar="--accent-green"
            onChange={(v) => {
              const next = [...scaleWeights] as [number, number, number];
              next[i] = v;
              onInputChange({ scaleWeightG: next });
            }}
          />
        );
      })}

      {/* INA260 */}
      <SectionHdr icon={<Zap size={10} />} label="INA260 Power Monitor" />
      <SliderRow
        label="Voltage"
        value={inputs.inaVoltage}
        min={5000}
        max={16000}
        step={10}
        unit="mV"
        actual={diagnostics?.ina260.busVoltage.toFixed(1) + 'mV'}
        accentVar="--accent-amber"
        onChange={(v) => onInputChange({ inaVoltage: v })}
      />
      <SliderRow
        label="Current"
        value={inputs.inaCurrent}
        min={0}
        max={5000}
        step={10}
        unit="mA"
        actual={diagnostics?.ina260.current.toFixed(1) + 'mA'}
        accentVar="--accent-blue"
        onChange={(v) => onInputChange({ inaCurrent: v })}
      />
      <div
        className="px-3 py-1.5 flex justify-between"
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <span
          className="font-mono text-[10px]"
          style={{ color: 'var(--fg-subtle)' }}
        >
          Computed power
        </span>
        <span
          className="font-mono text-[10px]"
          style={{ color: 'var(--accent-red)' }}
        >
          {diagnostics ? diagnostics.ina260.power.toFixed(0) + ' mW' : '—'}
          {diagnostics && diagnostics.ina260.alertStatus ? ' ⚠ ALERT' : ''}
        </span>
      </div>

      {/* Rainfall */}
      <SectionHdr
        icon={<Droplets size={10} />}
        label="DFRobot Rainfall Sensors"
      />
      {[0, 1].map((i) => (
        <SliderRow
          key={i}
          label={`Rain ${i} tips`}
          value={inputs.rainTips[i]}
          min={0}
          max={500}
          step={1}
          unit=""
          actual={
            diagnostics
              ? `${(diagnostics.rain[i].rawTips * 0.2794).toFixed(1)}mm`
              : undefined
          }
          accentVar="--accent-cyan"
          onChange={(v) => {
            const next = [...inputs.rainTips] as [number, number];
            next[i] = v;
            onInputChange({ rainTips: next });
          }}
        />
      ))}

      {/* NTC Temperature */}
      <SectionHdr
        icon={<Thermometer size={10} />}
        label="NTC Thermistors A0–A4"
      />
      {[0, 1, 2, 3, 4].map((i) => {
        const adcRaw = diagnostics?.ntc[i].adcRaw;
        const measuredC =
          adcRaw !== undefined ? ntcToTemp(adcRaw).toFixed(1) : null;
        return (
          <SliderRow
            key={i}
            label={`A${i} temp`}
            value={inputs.ntcTempC[i]}
            min={-20}
            max={80}
            step={0.5}
            unit="°C"
            actual={
              measuredC !== null ? `ADC:${adcRaw} (${measuredC}°C)` : undefined
            }
            accentVar="--accent-red"
            onChange={(v) => {
              const next = [...inputs.ntcTempC] as [
                number,
                number,
                number,
                number,
                number,
              ];
              next[i] = v;
              onInputChange({ ntcTempC: next });
            }}
          />
        );
      })}

      {/* Ambient */}
      <SectionHdr icon={<Activity size={10} />} label="Environment" />
      <SliderRow
        label="Ambient Temp"
        value={inputs.ambientTempC}
        min={-10}
        max={60}
        step={0.5}
        unit="°C"
        accentVar="--accent-purple"
        onChange={(v) => onInputChange({ ambientTempC: v })}
      />

      {/* Live pin readings */}
      <SectionHdr icon={<Cpu size={10} />} label="Pin States" />
      <div
        className="grid grid-cols-3 gap-px"
        style={{ background: 'var(--border-subtle)' }}
      >
        {[
          {
            pin: 3,
            label: 'STEP (D3)',
            isHigh: (diagnostics?.pins[3] ?? 0) === 1,
          },
          {
            pin: 4,
            label: 'DIR (D4)',
            isHigh: (diagnostics?.pins[4] ?? 1) === 1,
          },
          {
            pin: 5,
            label: 'ENABLE (D5)',
            isHigh: (diagnostics?.pins[5] ?? 0) === 0,
          },
          { pin: 6, label: 'RELAY1 (D6)', isHigh: relay1On },
          { pin: 7, label: 'RELAY2 (D7)', isHigh: relay2On },
          {
            pin: 15,
            label: 'SWITCH (D15)',
            isHigh: (diagnostics?.pins[15] ?? 0) === 1,
          },
        ].map(({ pin, label, isHigh }) => (
          <div key={pin} className="hw-cell">
            <div className="hw-label">{label}</div>
            <div
              className="font-mono text-[11px] font-bold"
              style={{
                color: isHigh ? 'var(--accent-green)' : 'var(--fg-subtle)',
              }}
            >
              {isHigh ? 'HIGH' : 'LOW'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Diagnostics Tab ───────────────────────────────────────────────
function DiagnosticsTab({
  diagnostics,
}: {
  diagnostics: DiagnosticSnapshot | null;
}) {
  if (!diagnostics)
    return <Empty label="Start simulation to see diagnostics" />;

  const rows: [string, string, string][] = [
    // [label, value, color]
    ['Sim time', `${(diagnostics.millis / 1000).toFixed(1)}s`, '--fg-default'],
    [
      'Motor',
      diagnostics.motorRunning ? `${diagnostics.motorRpm} RPM` : 'STOPPED',
      diagnostics.motorRunning ? '--accent-green' : '--fg-subtle',
    ],
    [
      'Flow rate',
      `${diagnostics.stepper.flowRateL_h.toFixed(3)} L/h`,
      '--accent-blue',
    ],
    ['Target flow', `${diagnostics.targetFlow.toFixed(2)} L/h`, '--fg-muted'],
    ['Step count', diagnostics.stepper.steps.toLocaleString(), '--fg-muted'],
    [
      'Relay 1',
      diagnostics.relay1 ? 'ON' : 'OFF',
      diagnostics.relay1 ? '--accent-green' : '--fg-subtle',
    ],
    [
      'Relay 2',
      diagnostics.relay2 ? 'ON' : 'OFF',
      diagnostics.relay2 ? '--accent-green' : '--fg-subtle',
    ],
    [
      'EEPROM',
      diagnostics.eepromMagic ? 'VALID (0xA55A)' : 'EMPTY',
      diagnostics.eepromMagic ? '--accent-green' : '--fg-subtle',
    ],
    ['Scale[0] raw', diagnostics.hx711[0].rawAdc.toFixed(0), '--fg-muted'],
    ['Scale[1] raw', diagnostics.hx711[1].rawAdc.toFixed(0), '--fg-muted'],
    ['Scale[2] raw', diagnostics.hx711[2].rawAdc.toFixed(0), '--fg-muted'],
    [
      'INA voltage',
      `${diagnostics.ina260.busVoltage.toFixed(2)} mV`,
      '--accent-amber',
    ],
    [
      'INA current',
      `${diagnostics.ina260.current.toFixed(2)} mA`,
      '--accent-blue',
    ],
    ['INA power', `${diagnostics.ina260.power.toFixed(0)} mW`, '--accent-red'],
    [
      'INA alert',
      diagnostics.ina260.alertStatus
        ? `0x${diagnostics.ina260.alertStatus.toString(16).toUpperCase()}`
        : 'none',
      diagnostics.ina260.alertStatus ? '--accent-red' : '--fg-subtle',
    ],
    [
      'Rain[0]',
      `${diagnostics.rain[0].rawTips} tips / ${diagnostics.rain[0].rainfall.toFixed(2)} mm`,
      '--accent-cyan',
    ],
    [
      'Rain[1]',
      `${diagnostics.rain[1].rawTips} tips / ${diagnostics.rain[1].rainfall.toFixed(2)} mm`,
      '--accent-cyan',
    ],
    [
      'Rain[0] rate',
      `${diagnostics.rain[0].rainfallRate.toFixed(2)} mm/h`,
      '--fg-muted',
    ],
    ...diagnostics.ntc.map((n, i): [string, string, string] => [
      `NTC A${i}`,
      `ADC:${n.adcRaw} · ${ntcToTemp(n.adcRaw).toFixed(1)}°C · ${(n.resistance / 1000).toFixed(1)}kΩ`,
      '--fg-muted',
    ]),
    ...([0, 1, 2] as const).map((i): [string, string, string] => [
      `Scale[${i}] factor`,
      diagnostics.scaleFactor[i].toFixed(4),
      '--fg-muted',
    ]),
  ];

  return (
    <div>
      {rows.map(([label, value, color]) => (
        <div
          key={label}
          className="flex items-center justify-between px-3 py-1.5"
          style={{
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-base)',
          }}
        >
          <span
            className="font-mono text-[10px]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {label}
          </span>
          <span
            className="font-mono text-[10px] font-bold"
            style={{ color: `var(${color})` }}
          >
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── I2C Bus Tab ───────────────────────────────────────────────────
function I2CTab({ diagnostics }: { diagnostics: DiagnosticSnapshot | null }) {
  if (!diagnostics) return <Empty label="Start simulation to scan I2C bus" />;

  const KNOWN: Record<number, string> = {
    0x40: 'INA260 Power Monitor',
    0x70: 'PCA9685A I2C Mux',
    0x1d: 'DFRobot Rainfall #0',
    0x1e: 'DFRobot Rainfall #1',
  };

  const allAddresses = Array.from({ length: 128 }, (_, i) => i);

  return (
    <div>
      <div
        className="px-3 py-2 font-mono text-[10px]"
        style={{
          color: 'var(--fg-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
        }}
      >
        I2C scan at 10kHz — {diagnostics.i2cBus.length} device
        {diagnostics.i2cBus.length !== 1 ? 's' : ''} found
      </div>
      {/* Visual I2C address grid */}
      <div className="p-3">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: 'repeat(16, 1fr)' }}
        >
          {allAddresses.map((addr) => {
            const present = diagnostics.i2cBus.includes(addr);
            return (
              <div
                key={addr}
                title={
                  present
                    ? `0x${addr.toString(16).toUpperCase()}: ${KNOWN[addr] ?? 'Unknown'}`
                    : `0x${addr.toString(16).toUpperCase()}`
                }
                className="aspect-square rounded-sm flex items-center justify-center font-mono transition-all cursor-default"
                style={{
                  fontSize: '6px',
                  background: present
                    ? 'var(--accent-blue)'
                    : 'var(--bg-raised)',
                  color: present ? 'white' : 'var(--border-default)',
                  border: present
                    ? '1px solid var(--accent-blue)'
                    : '1px solid var(--border-subtle)',
                }}
              >
                {addr.toString(16).padStart(2, '0')}
              </div>
            );
          })}
        </div>
        <p
          className="font-mono text-[9px] mt-2"
          style={{ color: 'var(--fg-subtle)' }}
        >
          Blue = device present · Hover for details
        </p>
      </div>
      {/* Device list */}
      {diagnostics.i2cBus.map((addr) => (
        <div
          key={addr}
          className="flex items-center gap-3 px-3 py-2"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-base)',
          }}
        >
          <span
            className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded"
            style={{
              background: 'var(--tint-blue)',
              color: 'var(--accent-blue)',
              border: '1px solid var(--border-blue)',
            }}
          >
            0x{addr.toString(16).toUpperCase().padStart(2, '0')}
          </span>
          <span
            className="font-mono text-[10px]"
            style={{ color: 'var(--fg-default)' }}
          >
            {KNOWN[addr] ?? 'Unknown device'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── EEPROM Tab ────────────────────────────────────────────────────
function EEPROMTab({
  diagnostics,
}: {
  diagnostics: DiagnosticSnapshot | null;
}) {
  if (!diagnostics) return <Empty label="Start simulation to inspect EEPROM" />;

  const valid = diagnostics.eepromMagic;
  const layout = [
    {
      addr: '0x0000–0x0001',
      label: 'Magic bytes',
      value: valid ? '0xA5 0x5A ✓' : '0xFF 0xFF (empty)',
    },
    {
      addr: '0x0002–0x0005',
      label: 'Scale 0 offset',
      value: valid ? 'float (4 bytes)' : '—',
    },
    {
      addr: '0x0006–0x0009',
      label: 'Scale 1 offset',
      value: valid ? 'float (4 bytes)' : '—',
    },
    {
      addr: '0x000A–0x000D',
      label: 'Scale 2 offset',
      value: valid ? 'float (4 bytes)' : '—',
    },
    {
      addr: '0x000E–0x0011',
      label: 'Scale 0 factor',
      value: valid ? diagnostics.scaleFactor[0].toFixed(4) : '—',
    },
    {
      addr: '0x0012–0x0015',
      label: 'Scale 1 factor',
      value: valid ? diagnostics.scaleFactor[1].toFixed(4) : '—',
    },
    {
      addr: '0x0016–0x0019',
      label: 'Scale 2 factor',
      value: valid ? diagnostics.scaleFactor[2].toFixed(4) : '—',
    },
    { addr: '0x001A–0x0FFF', label: 'Free space', value: `${4096 - 26} bytes` },
  ];

  return (
    <div>
      <div
        className="px-3 py-2 font-mono text-[10px] flex items-center gap-2"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
        }}
      >
        <span style={{ color: 'var(--fg-subtle)' }}>4KB EEPROM ·</span>
        <span
          style={{ color: valid ? 'var(--accent-green)' : 'var(--fg-subtle)' }}
        >
          {valid ? '✓ Valid data' : 'Empty (all 0xFF)'}
        </span>
        <span
          className="ml-auto font-mono text-[9px]"
          style={{ color: 'var(--fg-subtle)' }}
        >
          AVR ATmega2560
        </span>
      </div>
      {layout.map((row) => (
        <div
          key={row.addr}
          className="flex items-center gap-3 px-3 py-1.5"
          style={{
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-base)',
          }}
        >
          <span
            className="font-mono text-[9px] w-28 flex-shrink-0"
            style={{ color: 'var(--accent-blue)' }}
          >
            {row.addr}
          </span>
          <span
            className="font-mono text-[9px] flex-1"
            style={{ color: 'var(--fg-muted)' }}
          >
            {row.label}
          </span>
          <span
            className="font-mono text-[9px]"
            style={{ color: 'var(--fg-default)' }}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────
function SectionHdr({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5"
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      <span style={{ color: 'var(--fg-subtle)' }}>{icon}</span>
      <span
        className="font-mono text-[9px] uppercase tracking-widest"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {label}
      </span>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  actual,
  accentVar,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  actual?: string;
  accentVar: string;
  onChange: (v: number) => void;
}) {
  return (
    <div
      className="px-3 py-1.5 flex items-center gap-2"
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-base)',
      }}
    >
      <label
        className="font-mono text-[10px] min-w-[70px] truncate"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {label}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        className="flex-1 h-1 no-transition"
        style={{ accentColor: `var(${accentVar})` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span
        className="font-mono text-[10px] text-right"
        style={{ color: `var(${accentVar})`, minWidth: '52px' }}
      >
        {value}
        {unit}
      </span>
      {actual && (
        <span
          className="font-mono text-[9px]"
          style={{
            color: 'var(--fg-subtle)',
            minWidth: '72px',
            textAlign: 'right',
          }}
        >
          ≈{actual}
        </span>
      )}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      className="w-9 h-5 rounded-full border cursor-pointer relative transition-all"
      style={{
        background: on ? 'var(--tint-green)' : 'var(--bg-raised)',
        borderColor: on ? 'var(--accent-green)' : 'var(--border-default)',
      }}
    >
      <div
        className="w-3.5 h-3.5 rounded-full absolute top-[3px] transition-all"
        style={{
          left: on ? '18px' : '3px',
          background: on ? 'var(--accent-green)' : 'var(--fg-subtle)',
        }}
      />
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div
      className="flex items-center justify-center h-24 font-mono text-xs"
      style={{ color: 'var(--fg-subtle)' }}
    >
      {label}
    </div>
  );
}
