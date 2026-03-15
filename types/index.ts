// ── File system ──────────────────────────────────────────────────
export interface ProjectFile {
  name: string;
  content: string;
  language: 'cpp' | 'json' | 'plaintext';
  modified: boolean;
  readonly?: boolean;
}

export interface Project {
  id: string;
  name: string;
  boardId: string;
  files: ProjectFile[];
  createdAt: number;
  updatedAt: number;
}

// ── Boards ───────────────────────────────────────────────────────
export interface BoardPin {
  number: number;
  label: string;
  type: 'digital' | 'analog' | 'power' | 'pwm' | 'spi' | 'i2c' | 'uart';
}

export interface Board {
  id: string;
  name: string;
  mcu: string;
  fcpu: number;
  flashKB: number;
  ramKB: number;
  eepromKB: number;
  pins: BoardPin[];
  analogPins: number[]; // Arduino pin numbers for A0..An
  uartPins: { tx: number; rx: number }[];
  i2cPins: { sda: number; scl: number }[];
  spiPins: { mosi: number; miso: number; sck: number; ss: number }[];
  builtinLed?: number;
  icon: string;
}

// ── Devices / peripherals ────────────────────────────────────────
export type DeviceCategory =
  | 'sensor'
  | 'display'
  | 'motor'
  | 'communication'
  | 'power'
  | 'storage'
  | 'input';

export interface DevicePin {
  name: string; // e.g. "SDA", "DOUT", "VCC"
  type: 'i2c' | 'spi' | 'digital' | 'analog' | 'power' | 'pwm';
  required: boolean;
}

export interface DeviceConfig {
  [key: string]: number | string | boolean;
}

export interface Device {
  id: string;
  type: string; // e.g. "hx711", "ina260", "dfrobot_rain"
  name: string; // display name
  category: DeviceCategory;
  description: string;
  icon: string;
  library: string;
  headerFile: string;
  pins: DevicePin[];
  defaultConfig: DeviceConfig;
  stubCode: string; // minimal usage snippet
}

// ── Device instance on the virtual breadboard ────────────────────
export interface DeviceInstance {
  instanceId: string;
  deviceType: string;
  label: string;
  config: DeviceConfig;
  pinMapping: Record<string, number>; // devicePin → boardPin
  // Simulated sensor values (set by user sliders)
  values: Record<string, number>;
}

// ── Simulator state ──────────────────────────────────────────────
export type SimStatus = 'idle' | 'compiling' | 'running' | 'stopped' | 'error';
export type SimMode = 'interpreted' | 'avr' | 'smart';

export interface SimState {
  status: SimStatus;
  mode: SimMode;
  millis: number;
  speed: number; // simulation speed multiplier
  pins: Uint8Array;
  analog: Uint16Array;
  eeprom: Uint8Array;
}

// ── Serial ───────────────────────────────────────────────────────
export type SerialLineType = 'inf' | 'err' | 'data' | 'raw' | 'cmd' | 'sys';

export interface SerialLine {
  id: number;
  text: string;
  type: SerialLineType;
  timestamp: number; // simulated millis
}

// ── Compile log ──────────────────────────────────────────────────
export type LogLevel = 'step' | 'ok' | 'warn' | 'error' | 'info';

export interface CompileLogLine {
  id: number;
  text: string;
  level: LogLevel;
}
