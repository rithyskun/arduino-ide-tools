'use client';
import { useIDEStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface HardwarePanelProps {
  onSwitchToggle: (on: boolean) => void;
  pinStates: Record<number, number>;
}

export default function HardwarePanel({
  onSwitchToggle,
  pinStates,
}: HardwarePanelProps) {
  const { activeProjectId, projects, updateDeviceValue, setPinState } =
    useIDEStore();
  const project = projects.find((p) => p.id === activeProjectId);

  // Parse device instances from __devices.json
  let devices: Array<{
    instanceId: string;
    deviceType: string;
    label: string;
    values: Record<string, number>;
  }> = [];
  try {
    const devFile = project?.files.find((f) => f.name === '__devices.json');
    if (devFile) devices = JSON.parse(devFile.content);
  } catch {
    /* empty */
  }

  // HX711 instances
  const scales = devices.filter((d) => d.deviceType === 'hx711');
  // INA260 instance
  const ina260 = devices.find((d) => d.deviceType === 'ina260');
  // Rainfall instances
  const rainSensors = devices.filter((d) => d.deviceType === 'dfrobot_rain');

  const motorSwitchOn = (pinStates[15] ?? 0) === 1;
  const relay1On = (pinStates[6] ?? 1) === 0; // active-LOW
  const relay2On = (pinStates[7] ?? 1) === 0;

  function setDevVal(instanceId: string, key: string, val: number) {
    updateDeviceValue(instanceId, key, val);
  }

  // Fallback static sliders when no devices configured
  const hasDevices = devices.length > 0;

  return (
    <div className="flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="panel-hdr justify-between">
        <span>Virtual Hardware</span>
        <span className="text-[9px] text-fg-subtle">
          {devices.length} device{devices.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Motor switch */}
      <div className="flex items-center justify-between px-3 py-2 bg-bg-surface border-b border-border-subtle">
        <span className="font-mono text-[10px] text-fg-subtle">
          Motor Switch (Pin 15)
        </span>
        <div
          onClick={() => {
            const next = !motorSwitchOn;
            setPinState(15, next ? 1 : 0);
            onSwitchToggle(next);
          }}
          className={cn(
            'w-9 h-5 rounded-full border cursor-pointer relative transition-all',
            motorSwitchOn
              ? 'bg-green-800 border-accent-green'
              : 'bg-bg-raised border-border-default'
          )}
        >
          <div
            className={cn(
              'w-3.5 h-3.5 rounded-full absolute top-[3px] transition-all',
              motorSwitchOn
                ? 'left-[18px] bg-accent-green'
                : 'left-[3px] bg-fg-subtle'
            )}
          />
        </div>
      </div>

      {/* HX711 Scale sliders */}
      {(scales.length > 0 ? scales : DEFAULT_SCALES).map((scale, i) => {
        const instanceId =
          'instanceId' in scale ? scale.instanceId : `default-scale-${i}`;
        const label = scale.label ?? `Scale ${i}`;
        const weight = scale.values?.weight ?? 500;
        return (
          <SliderRow
            key={instanceId}
            label={`${label} weight`}
            value={weight}
            min={0}
            max={2000}
            unit="g"
            color="bg-accent-green"
            onChange={(v) => {
              if ('instanceId' in scale)
                setDevVal(scale.instanceId, 'weight', v);
            }}
          />
        );
      })}

      {/* INA260 sliders */}
      {ina260 ? (
        <>
          <SliderRow
            label="INA Voltage"
            value={ina260.values?.voltage ?? 12100}
            min={10000}
            max={14000}
            unit="mV"
            step={10}
            color="bg-accent-amber"
            onChange={(v) => setDevVal(ina260.instanceId, 'voltage', v)}
          />
          <SliderRow
            label="INA Current"
            value={ina260.values?.current ?? 320}
            min={0}
            max={2000}
            unit="mA"
            color="bg-accent-blue"
            onChange={(v) => setDevVal(ina260.instanceId, 'current', v)}
          />
        </>
      ) : (
        <>
          <SliderRow
            label="INA Voltage"
            value={12100}
            min={10000}
            max={14000}
            unit="mV"
            step={10}
            color="bg-accent-amber"
            onChange={() => {}}
          />
          <SliderRow
            label="INA Current"
            value={320}
            min={0}
            max={2000}
            unit="mA"
            color="bg-accent-blue"
            onChange={() => {}}
          />
        </>
      )}

      {/* Rainfall sliders */}
      {(rainSensors.length > 0 ? rainSensors : DEFAULT_RAIN).map((r, i) => {
        const instanceId =
          'instanceId' in r ? r.instanceId : `default-rain-${i}`;
        const label = r.label ?? `Rain ${i}`;
        const tips = r.values?.tips ?? i * 5;
        return (
          <SliderRow
            key={instanceId}
            label={`${label} tips`}
            value={tips}
            min={0}
            max={300}
            unit=""
            color="bg-accent-cyan"
            onChange={(v) => {
              if ('instanceId' in r) setDevVal(r.instanceId, 'tips', v);
            }}
          />
        );
      })}

      {/* Live readings grid */}
      <div className="panel-hdr mt-1">Live Readings</div>
      <div className="grid grid-cols-2 gap-px bg-border-subtle">
        <HWCell
          label="Relay 1 (D6)"
          value={relay1On ? 'ON' : 'OFF'}
          color={relay1On ? 'text-accent-green' : ''}
        />
        <HWCell
          label="Relay 2 (D7)"
          value={relay2On ? 'ON' : 'OFF'}
          color={relay2On ? 'text-accent-green' : ''}
        />
        <HWCell label="Motor RPM" value={motorSwitchOn ? '120' : '0'} />
        <HWCell label="Step Pin (D3)" value={(pinStates[3] ?? 0).toString()} />
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function SliderRow({
  label,
  value,
  min,
  max,
  unit,
  step = 1,
  color,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  step?: number;
  color: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-surface border-b border-border-subtle">
      <label className="font-mono text-[10px] text-fg-subtle min-w-[90px] truncate">
        {label}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        className="flex-1 accent-green-500 h-1"
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="font-mono text-[10px] text-fg-default min-w-[52px] text-right">
        {value}
        {unit}
      </span>
    </div>
  );
}

function HWCell({
  label,
  value,
  color = '',
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="hw-cell">
      <div className="hw-label">{label}</div>
      <div className={`hw-value ${color}`}>{value}</div>
    </div>
  );
}

// ── Default stubs when no devices added yet ────────────────────
const DEFAULT_SCALES = [
  { label: 'Scale 0', values: { weight: 500 } },
  { label: 'Scale 1', values: { weight: 750 } },
  { label: 'Scale 2', values: { weight: 300 } },
];
const DEFAULT_RAIN = [
  { label: 'Rain 0', values: { tips: 12 } },
  { label: 'Rain 1', values: { tips: 8 } },
];
