/**
 * physics.ts — realistic sensor simulation models
 *
 * Each model takes user-controlled "ideal" values and produces
 * realistic noisy / time-dependent outputs that match real hardware:
 * - Gaussian noise scaled to datasheet specs
 * - Temperature drift coefficients
 * - Settling time / slew-rate limiting
 * - ADC quantisation
 * - Non-linearity
 */

// ── Gaussian noise ─────────────────────────────────────────────────
function gaussian(mean = 0, stddev = 1): number {
  // Box–Muller transform
  const u1 = 1 - Math.random();
  const u2 = 1 - Math.random();
  return (
    mean + stddev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// ── HX711 24-bit Load Cell ADC ─────────────────────────────────────
export interface HX711State {
  rawAdc: number; // raw 24-bit reading
  grams: number; // calibrated weight
  offset: number; // tare offset (raw)
  scaleFactor: number; // raw counts / gram
  gain: number; // 128 | 64 | 32
  settling: number; // remaining settling steps
  lastGrams: number; // for slew-rate
  tempDrift: number; // drift accumulator
}

export function hx711Init(targetGrams = 500, factor = -46.5): HX711State {
  const offset = 0;
  const rawAdc = targetGrams * factor + offset;
  return {
    rawAdc,
    grams: targetGrams,
    offset,
    scaleFactor: factor,
    gain: 128,
    settling: 0,
    lastGrams: targetGrams,
    tempDrift: 0,
  };
}

export function hx711Tick(
  state: HX711State,
  targetGrams: number,
  tempC = 25
): HX711State {
  const s = { ...state };
  const rateLimit = 80; // max g/tick slew (realistically ~100ms settling)

  // Slew-rate limit the weight change
  const delta = targetGrams - s.lastGrams;
  const slewed = s.lastGrams + clamp(delta, -rateLimit, rateLimit);
  s.lastGrams = slewed;

  // Temperature drift: ~3 ppm/°C × (temp - 25) × full-scale
  s.tempDrift = (tempC - 25) * 3e-6 * 500 * s.scaleFactor;

  // Noise: HX711 typical noise ≈ 0.5g RMS (datasheet Table 2)
  const noise = gaussian(0, 0.5);

  s.grams = slewed + noise;
  s.rawAdc = s.grams * s.scaleFactor + s.offset + s.tempDrift;

  // Quantise to 24-bit resolution
  s.rawAdc = Math.round(s.rawAdc);
  return s;
}

export function hx711GetValue(state: HX711State): number {
  // get_value(n) = (rawAdc - offset) / scaleFactor  → grams
  return (state.rawAdc - state.offset) / state.scaleFactor;
}

// ── INA260 Current / Voltage / Power Monitor ───────────────────────
export interface INA260State {
  busVoltage: number; // mV
  current: number; // mA
  power: number; // mW  (hardware-calculated)
  shuntVoltage: number; // µV
  alertStatus: number; // alert register bits
}

export function ina260Init(
  voltageSetMV = 12000,
  currentSetMA = 300
): INA260State {
  return {
    busVoltage: voltageSetMV,
    current: currentSetMA,
    power: (voltageSetMV * currentSetMA) / 1000,
    shuntVoltage: currentSetMA * 2, // 2mΩ internal shunt
    alertStatus: 0,
  };
}

export function ina260Tick(
  state: INA260State,
  targetV: number,
  targetI: number
): INA260State {
  const s = { ...state };

  // LSB sizes from datasheet: 1.25mV voltage, 1.25mA current
  const voltageLSB = 1.25;
  const currentLSB = 1.25;

  // Add noise: ±0.5% typical accuracy
  const vNoise = gaussian(0, targetV * 0.005);
  const iNoise = gaussian(0, Math.max(targetI * 0.005, 1));

  // Quantise to ADC LSBs
  s.busVoltage = Math.round((targetV + vNoise) / voltageLSB) * voltageLSB;
  s.current = Math.round((targetI + iNoise) / currentLSB) * currentLSB;
  // INA260 internal power register: V × I with 10mW LSB
  s.power = Math.round((s.busVoltage * s.current) / (1000 * 10)) * 10;
  s.shuntVoltage = s.current * 2; // µV

  // Alert: over-current flag at 2A
  s.alertStatus = s.current > 2000 ? 0x04 : 0;

  return s;
}

// ── DFRobot Rainfall Sensor (tipping-bucket) ───────────────────────
export interface RainState {
  rawTips: number; // bucket tip count
  rainfall: number; // mm (0.2794mm per tip)
  rainfallRate: number; // mm/h  (last 60s window)
  tipHistory: number[]; // timestamp of last 60 tips for rate calc
  firmwareVer: string;
}

const MM_PER_TIP = 0.2794;

export function rainInit(tips = 0): RainState {
  return {
    rawTips: tips,
    rainfall: tips * MM_PER_TIP,
    rainfallRate: 0,
    tipHistory: [],
    firmwareVer: 'V1.0.0',
  };
}

export function rainTick(
  state: RainState,
  targetTips: number,
  simMillis: number
): RainState {
  const s = { ...state };

  if (targetTips > s.rawTips) {
    const newTips = targetTips - s.rawTips;
    for (let i = 0; i < newTips; i++) {
      s.tipHistory.push(simMillis);
    }
  }
  s.rawTips = targetTips;
  s.rainfall = targetTips * MM_PER_TIP;

  // Rate: tips in last 3600 000ms window → mm/h
  const windowMs = 3_600_000;
  const cutoff = simMillis - windowMs;
  s.tipHistory = s.tipHistory.filter((t) => t >= cutoff);
  s.rainfallRate = s.tipHistory.length * MM_PER_TIP;

  return s;
}

// ── NTC Thermistor (Steinhart–Hart) ───────────────────────────────
export interface NTCState {
  adcRaw: number; // 0–1023
  celsius: number;
  resistance: number;
}

const NTC_B = 3950; // B coefficient
const NTC_R25 = 10000; // 10kΩ at 25°C
const NTC_RSERIES = 10000; // series resistor
const T0 = 298.15; // 25°C in K

export function ntcInit(tempC = 25): NTCState {
  return ntcTick({ adcRaw: 0, celsius: tempC, resistance: NTC_R25 }, tempC);
}

export function ntcTick(state: NTCState, targetC: number): NTCState {
  const s = { ...state };
  // Slew temperature slowly (thermal mass)
  const diff = targetC - s.celsius;
  s.celsius += clamp(diff, -0.5, 0.5); // max 0.5°C per tick

  // Resistance via B-parameter equation
  const T = s.celsius + 273.15;
  s.resistance = NTC_R25 * Math.exp(NTC_B * (1 / T - 1 / T0));

  // ADC reading (voltage divider with series R, 10-bit, 5V ref)
  const voltage = (5.0 * NTC_RSERIES) / (NTC_RSERIES + s.resistance);
  const raw = clamp(Math.round((voltage / 5.0) * 1023), 0, 1023);
  // Add quantisation noise ±1 LSB
  s.adcRaw = clamp(raw + Math.round(gaussian(0, 0.5)), 0, 1023);

  return s;
}

export function ntcToTemp(adcRaw: number): number {
  if (adcRaw <= 0) return -273;
  const voltage = (adcRaw / 1023.0) * 5.0;
  const r = (NTC_RSERIES * voltage) / (5.0 - voltage);
  const invT = Math.log(r / NTC_R25) / NTC_B + 1 / T0;
  return 1 / invT - 273.15;
}

// ── Stepper Motor (A4988 driver) ───────────────────────────────────
export interface StepperState {
  rpm: number;
  targetRpm: number;
  steps: number; // absolute step count
  direction: number; // 1 | -1
  enabled: boolean;
  stalled: boolean;
  stepInterval: number; // µs between steps
  flowRateL_h: number; // derived: 0.0359 × rpm + 0.18
  pulsesPerL: number; // 5600 pulses/L
  stepToggle: boolean; // current STEP pin state
  lastStepMs: number;
}

export function stepperInit(): StepperState {
  return {
    rpm: 0,
    targetRpm: 0,
    steps: 0,
    direction: 1,
    enabled: false,
    stalled: false,
    stepInterval: 0,
    flowRateL_h: 0,
    pulsesPerL: 5600,
    stepToggle: false,
    lastStepMs: 0,
  };
}

const STEPS_PER_REV = 200;
const MICROSTEP = 4;

export function stepperTick(
  state: StepperState,
  simMillis: number
): StepperState {
  const s = { ...state };
  if (!s.enabled || s.rpm === 0) {
    s.stepToggle = false;
    s.flowRateL_h = 0;
    return s;
  }
  // Step interval in ms
  const intervalMs = (60 * 1000) / (s.rpm * STEPS_PER_REV * MICROSTEP * 2);

  if (simMillis - s.lastStepMs >= intervalMs) {
    s.stepToggle = !s.stepToggle;
    s.lastStepMs = simMillis;
    if (s.stepToggle) s.steps += s.direction;
  }
  s.flowRateL_h = 0.0359 * s.rpm + 0.18;

  return s;
}

// ── 4KB EEPROM emulation ───────────────────────────────────────────
export class EEPROMEmulator {
  private data = new Uint8Array(4096).fill(0xff); // 0xFF = erased state

  read(addr: number): number {
    return this.data[addr & 0xfff] ?? 0xff;
  }
  write(addr: number, val: number) {
    // AVR EEPROM: only writes cells that differ (preserves write count)
    this.data[addr & 0xfff] = val & 0xff;
  }
  get(addr: number, size: 1 | 2 | 4): number {
    let v = 0;
    for (let i = 0; i < size; i++) v |= this.read(addr + i) << (i * 8);
    return v;
  }
  put(addr: number, val: number, size: 1 | 2 | 4) {
    for (let i = 0; i < size; i++)
      this.write(addr + i, (val >> (i * 8)) & 0xff);
  }
  dump(): Uint8Array {
    return new Uint8Array(this.data);
  }
  load(data: Uint8Array) {
    this.data.set(data.slice(0, 4096));
  }
}

// ── I2C Bus emulator ──────────────────────────────────────────────
export type I2CHandler = (reg: number, write?: number) => number;

export class I2CBus {
  private devices = new Map<number, I2CHandler>();

  register(address: number, handler: I2CHandler) {
    this.devices.set(address, handler);
  }
  unregister(address: number) {
    this.devices.delete(address);
  }

  read(address: number, reg: number): number {
    const handler = this.devices.get(address);
    return handler ? handler(reg) : 0xff;
  }
  write(address: number, reg: number, val: number) {
    const handler = this.devices.get(address);
    if (handler) handler(reg, val);
  }
  isPresent(address: number): boolean {
    return this.devices.has(address);
  }
  listAddresses(): number[] {
    return Array.from(this.devices.keys());
  }
}

// ── Timer1 interrupt emulation ────────────────────────────────────
export class Timer1Emulator {
  private periodUs = 0;
  private accumUs = 0;
  private running = false;
  private isr: (() => void) | null = null;

  initialize(periodUs: number) {
    this.periodUs = periodUs;
  }
  attachInterrupt(fn: () => void) {
    this.isr = fn;
  }
  detachInterrupt() {
    this.isr = null;
  }
  start() {
    this.running = true;
  }
  stop() {
    this.running = false;
    this.accumUs = 0;
  }
  restart() {
    this.accumUs = 0;
    this.running = true;
  }

  // Call every simulation tick; deltaMs = simulated milliseconds elapsed
  tick(deltaMs: number) {
    if (!this.running || this.periodUs <= 0 || !this.isr) return;
    this.accumUs += deltaMs * 1000; // ms → µs
    while (this.accumUs >= this.periodUs) {
      this.accumUs -= this.periodUs;
      this.isr();
    }
  }
}
