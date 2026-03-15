/**
 * SmartSimulator — realistic hardware simulation engine
 *
 * Architecture:
 *  - Physics models for every device (noise, slew, quantisation)
 *  - I2C bus emulator with per-address handlers
 *  - Timer1 interrupt emulator driving stepper step-pin toggle
 *  - 4KB EEPROM emulator (persists tare/calibration across reset)
 *  - NTC Steinhart–Hart thermistor model (5 channels)
 *  - Stepper RPM → flow-rate calculation
 *  - PCA9685A I2C mux channel routing
 *  - Relay active-LOW logic
 *  - Serial command dispatch mirroring command_handler.h exactly
 *  - Periodic CSV report matching main.ino loop() exactly
 */

import {
  hx711Init,
  hx711Tick,
  hx711GetValue,
  type HX711State,
  ina260Init,
  ina260Tick,
  type INA260State,
  rainInit,
  rainTick,
  type RainState,
  ntcInit,
  ntcTick,
  ntcToTemp,
  type NTCState,
  stepperInit,
  stepperTick,
  type StepperState,
  EEPROMEmulator,
  I2CBus,
  Timer1Emulator,
} from './physics';

// ── User-controlled virtual sensor inputs ─────────────────────────
export interface SensorInputs {
  scaleWeightG: [number, number, number]; // grams on each scale
  inaVoltage: number; // mV
  inaCurrent: number; // mA
  rainTips: [number, number]; // bucket tips
  ntcTempC: [number, number, number, number, number]; // °C per channel
  ambientTempC: number; // affects drift on all sensors
}

export interface SimCallbacks {
  onSerial: (text: string) => void;
  onPinChange: (pin: number, val: number) => void;
  onAnalogChange: (pin: number, val: number) => void;
  onMillisUpdate: (ms: number) => void;
  onStop: () => void;
  onI2CScan: (addresses: number[]) => void;
}

export interface DiagnosticSnapshot {
  millis: number;
  hx711: HX711State[];
  ina260: INA260State;
  rain: RainState[];
  ntc: NTCState[];
  stepper: StepperState;
  eepromMagic: boolean;
  i2cBus: number[]; // detected addresses
  pins: Record<number, number>;
  motorRunning: boolean;
  motorRpm: number;
  relay1: boolean;
  relay2: boolean;
  targetFlow: number;
  scaleFactor: number[];
}

export class SmartSimulator {
  // ── Physics state ─────────────────────────────────────────────
  private hx711: HX711State[];
  private ina260: INA260State;
  private rain: RainState[];
  private ntc: NTCState[];
  private stepper: StepperState;
  private eeprom = new EEPROMEmulator();
  private i2cBus = new I2CBus();
  private timer1 = new Timer1Emulator();

  // ── Firmware state (mirrors main.ino globals) ─────────────────
  private motorRunning = false;
  private motorSpeed = 0; // target RPM
  private targetFlow = 0;
  private relay1 = false;
  private relay2 = false;
  private scaleFactor = [-46.5, -29.11, -46.5];
  private scaleOffset = [0, 0, 0];
  private prevSwitch = false;
  private lastReportMs = 0;
  private reportInterval = 5000;

  // ── Sim runtime ───────────────────────────────────────────────
  private millis = 0;
  private running = false;
  private speedMult = 5;
  private lastReal = 0;
  private accumMs = 0;
  private handle: ReturnType<typeof setTimeout> | null = null;
  private rxQueue: number[] = [];
  private rxBuffer = '';
  private pins: Record<number, number> = {};
  private inputs: SensorInputs;
  private cb: SimCallbacks;

  // ── PCA9685A mux: selected channel ────────────────────────────
  private pcaChannel = 0;

  constructor(cb: SimCallbacks) {
    this.cb = cb;
    this.inputs = this.defaultInputs();

    // Init all physics models
    this.hx711 = [0, 1, 2].map((i) =>
      hx711Init(this.inputs.scaleWeightG[i], this.scaleFactor[i])
    );
    this.ina260 = ina260Init(this.inputs.inaVoltage, this.inputs.inaCurrent);
    this.rain = [0, 1].map((i) => rainInit(this.inputs.rainTips[i]));
    this.ntc = [0, 1, 2, 3, 4].map((i) => ntcInit(this.inputs.ntcTempC[i]));
    this.stepper = stepperInit();

    this.registerI2CDevices();
  }

  // ── Public API ────────────────────────────────────────────────
  setInputs(inputs: Partial<SensorInputs>) {
    this.inputs = { ...this.inputs, ...inputs };
  }
  setSpeed(mult: number) {
    this.speedMult = Math.max(0.5, Math.min(20, mult));
  }
  setPin(pin: number, val: number) {
    this.pins[pin] = val;
    this.cb.onPinChange(pin, val);
  }
  sendSerial(text: string) {
    for (const ch of text + '\n') this.rxQueue.push(ch.charCodeAt(0));
  }
  getDiagnostics(): DiagnosticSnapshot {
    return {
      millis: this.millis,
      hx711: this.hx711,
      ina260: this.ina260,
      rain: this.rain,
      ntc: this.ntc,
      stepper: this.stepper,
      eepromMagic: this.eeprom.read(0) === 0xa5 && this.eeprom.read(1) === 0x5a,
      i2cBus: this.i2cBus.listAddresses(),
      pins: { ...this.pins },
      motorRunning: this.motorRunning,
      motorRpm: this.stepper.rpm,
      relay1: this.relay1,
      relay2: this.relay2,
      targetFlow: this.targetFlow,
      scaleFactor: [...this.scaleFactor],
    };
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.millis = 0;
    this.accumMs = 0;
    this.lastReal = Date.now();
    this.lastReportMs = 0;
    this.rxQueue = [];
    this.rxBuffer = '';

    this.bootSequence();
    this.tick();
  }

  stop() {
    this.running = false;
    if (this.handle) {
      clearTimeout(this.handle);
      this.handle = null;
    }
    this.cb.onStop();
  }

  reset() {
    this.stop();
  }

  // ── I2C device registration ────────────────────────────────────
  private registerI2CDevices() {
    // PCA9685A I2C mux at 0x70
    this.i2cBus.register(0x70, (reg, val) => {
      if (val !== undefined) this.pcaChannel = val & 0x0f;
      return this.pcaChannel;
    });

    // INA260 at 0x40
    this.i2cBus.register(0x40, (reg) => {
      // Register map: 0=config, 1=current, 2=voltage, 3=power, 0xFE=mfr-id
      switch (reg) {
        case 0x00:
          return 0x6127; // default config
        case 0x01:
          return Math.round(this.ina260.current / 1.25) & 0xffff;
        case 0x02:
          return Math.round(this.ina260.busVoltage / 1.25) & 0xffff;
        case 0x03:
          return Math.round(this.ina260.power / 10) & 0xffff;
        case 0xfe:
          return 0x5449; // TI manufacturer ID
        case 0xff:
          return 0x2270; // device ID
        default:
          return 0xffff;
      }
    });

    // DFRobot rainfall sensors at 0x1D and 0x1E
    this.i2cBus.register(0x1d, (reg) => this.rainI2CHandler(0, reg));
    this.i2cBus.register(0x1e, (reg) => this.rainI2CHandler(1, reg));

    // HX711 — not I2C, but register on pseudo-address for mux simulation
    // (real HX711 uses DOUT/SCK, we emulate it directly in emitReport)

    this.cb.onI2CScan(this.i2cBus.listAddresses());
  }

  private rainI2CHandler(idx: number, reg: number): number {
    const r = this.rain[idx];
    switch (reg) {
      case 0x00:
        return 0x01; // status: ready
      case 0x01:
        return r.rawTips & 0xff;
      case 0x02:
        return (r.rawTips >> 8) & 0xff;
      case 0x03:
        return Math.round(r.rainfall * 10) & 0xff; // mm × 10
      case 0x04:
        return Math.round(r.rainfallRate * 10) & 0xff;
      case 0x10:
        return 0x56; // 'V'
      case 0x11:
        return 0x31; // '1'
      case 0x12:
        return 0x2e; // '.'
      case 0x13:
        return 0x30; // '0'
      case 0x14:
        return 0x2e; // '.'
      case 0x15:
        return 0x30; // '0'
      default:
        return 0xff;
    }
  }

  // ── Boot sequence — mirrors setup() ───────────────────────────
  private bootSequence() {
    const log = (t: string) => this.cb.onSerial(t);
    log('<Inf> Arduino starting...');
    log('<Inf> Arduino firmware version: 1.1.2');
    log(`<Inf> I2C bus clock: ${10}kHz`);

    // I2C scan
    const found = this.i2cBus.listAddresses();
    log(
      `<Inf> I2C scan: found ${found.length} device(s): ${found.map((a) => '0x' + a.toString(16).toUpperCase()).join(', ')}`
    );

    // Scales
    log('<Inf> Calibrating scales...');
    for (let i = 0; i < 3; i++) {
      const mask = (1 << i).toString(2).padStart(8, '0');
      log(`<Inf> PCA9685 channel selected: 0b${mask}`);
      log(`<Inf> PCA9685 channel changed.`);

      // Try EEPROM load
      const magic0 = this.eeprom.read(0);
      const magic1 = this.eeprom.read(1);
      if (magic0 === 0xa5 && magic1 === 0x5a) {
        const factor = this.eepromGetFloat(14 + i * 4);
        const offset = this.eepromGetFloat(2 + i * 4);
        this.scaleFactor[i] = factor;
        this.scaleOffset[i] = offset;
        this.hx711[i] = { ...this.hx711[i], scaleFactor: factor, offset };
        log(
          `<Inf> Scale ${i} loaded from EEPROM: factor=${factor.toFixed(2)}, offset=${offset.toFixed(0)}`
        );
      } else {
        log(
          `<Inf> Scale ${i} initialized with calibration factor: ${this.scaleFactor[i]}`
        );
      }
    }
    log('<Inf> Scales initialized.');

    if (this.eeprom.read(0) === 0xa5 && this.eeprom.read(1) === 0x5a) {
      log('<Inf> Loaded tare offsets and factors from EEPROM.');
    } else {
      log('<Inf> No EEPROM data found, using default calibration factors.');
    }

    // Rainmeters
    log('<Inf> Initializing Rainmeters...');
    for (let i = 0; i < 2; i++) {
      const addr = 0x1d + i;
      if (this.i2cBus.isPresent(addr)) {
        const ver = `V${this.i2cBus.read(addr, 0x10) === 0x56 ? '1.0.0' : '?.?.?'}`;
        log(`<Inf> Rainmeter ${i} initialized successfully.`);
        log(`<Inf> Rainmeter initialized. Firmware version: ${ver}`);
      } else {
        log(`<Err> Rainmeter ${i} not responding.`);
      }
    }
    log('<Inf> Rainmeters initialized.');

    // Relays
    log('<Inf> Initializing relays...');
    this.pins[6] = 1; // RELAY1 HIGH = off (active-LOW)
    this.pins[7] = 1; // RELAY2 HIGH = off
    this.cb.onPinChange(6, 1);
    this.cb.onPinChange(7, 1);

    // INA260
    log('<Inf> Initializing INA260.');
    if (this.i2cBus.isPresent(0x40)) {
      const mfrId = this.i2cBus.read(0x40, 0xfe);
      log(`<Inf> INA260 found (MFR ID: 0x${mfrId.toString(16).toUpperCase()})`);
      log('<Inf> INA260 initialized successfully.');
    } else {
      log('<Err> INA260 initialization failed.');
    }

    // Stepper
    log('<Inf> Initializing stepper motor...');
    this.pins[3] = 0; // STEP
    this.pins[4] = 1; // DIR = HIGH (forward)
    this.pins[5] = 0; // ENABLE = LOW (active)
    // Timer1 ISR: toggles STEP pin
    const stepInterval = Math.round((60 * 1_000_000) / (120 * 200 * 4 * 2)); // ~120 RPM default
    this.timer1.initialize(stepInterval);
    this.timer1.attachInterrupt(() => {
      if (this.motorRunning) {
        this.stepper = {
          ...this.stepper,
          stepToggle: !this.stepper.stepToggle,
        };
        this.pins[3] = this.stepper.stepToggle ? 1 : 0;
      }
    });
    this.timer1.stop();
    log('<Inf> Stepper motor initialized.');
    log('<Inf> Arduino setup complete. Ready to receive commands.');
  }

  // ── Main tick loop ────────────────────────────────────────────
  private tick() {
    if (!this.running) return;

    const now = Date.now();
    const realDelta = Math.min(now - this.lastReal, 200); // cap at 200ms to avoid spiral
    this.lastReal = now;
    this.accumMs += realDelta * this.speedMult;

    const STEP_MS = 10; // simulate in 10ms chunks for accuracy
    while (this.accumMs >= STEP_MS) {
      this.accumMs -= STEP_MS;
      this.millis += STEP_MS;
      this.simStep(STEP_MS);
    }

    this.cb.onMillisUpdate(this.millis);
    this.handle = setTimeout(() => this.tick(), 16);
  }

  private simStep(deltaMs: number) {
    const T = this.inputs.ambientTempC;

    // ── Update physics models ──────────────────────────────────
    for (let i = 0; i < 3; i++) {
      this.hx711[i] = hx711Tick(this.hx711[i], this.inputs.scaleWeightG[i], T);
    }
    this.ina260 = ina260Tick(
      this.ina260,
      this.inputs.inaVoltage,
      this.inputs.inaCurrent
    );
    for (let i = 0; i < 2; i++) {
      this.rain[i] = rainTick(
        this.rain[i],
        this.inputs.rainTips[i],
        this.millis
      );
    }
    for (let i = 0; i < 5; i++) {
      this.ntc[i] = ntcTick(this.ntc[i], this.inputs.ntcTempC[i]);
      this.pins[54 + i] = this.ntc[i].adcRaw;
      this.cb.onAnalogChange(i, this.ntc[i].adcRaw);
    }

    // ── Timer1 ISR ────────────────────────────────────────────
    this.timer1.tick(deltaMs);

    // ── Stepper physics ───────────────────────────────────────
    if (this.motorRunning) {
      this.stepper = stepperTick(
        { ...this.stepper, rpm: this.motorSpeed, enabled: true },
        this.millis
      );
    } else {
      this.stepper = {
        ...this.stepper,
        rpm: 0,
        stepToggle: false,
        flowRateL_h: 0,
      };
    }

    // ── Switch edge detect (Pin 15) ───────────────────────────
    const curSwitch = (this.pins[15] ?? 0) === 1;
    if (curSwitch !== this.prevSwitch) {
      this.prevSwitch = curSwitch;
      this.motorRunning = !this.motorRunning;
      if (this.motorRunning) {
        if (this.motorSpeed < 40 || this.motorSpeed > 300) {
          this.cb.onSerial(
            '<Err> Invalid RPM value. Please enter a value between 40 and 300'
          );
          this.motorRunning = false;
        } else {
          const interval = Math.round(
            (60 * 1_000_000) / (this.motorSpeed * 200 * 4 * 2)
          );
          this.timer1.initialize(interval);
          this.timer1.start();
          this.pins[5] = 0; // ENABLE LOW
          this.cb.onPinChange(5, 0);
          this.cb.onSerial(`<Inf> Motor speed set to: ${this.motorSpeed}`);
        }
      } else {
        this.timer1.stop();
        this.pins[5] = 1; // ENABLE HIGH
        this.cb.onPinChange(5, 1);
        this.cb.onSerial('<Inf> Motor stopped.');
      }
    }

    // ── Serial command dispatch ───────────────────────────────
    while (this.rxQueue.length > 0) {
      const b = this.rxQueue.shift()!;
      const ch = String.fromCharCode(b);
      if (ch === '\n') {
        const cmd = this.rxBuffer.trim();
        this.rxBuffer = '';
        if (cmd) this.dispatchCommand(cmd);
      } else {
        this.rxBuffer += ch;
      }
    }

    // ── Periodic report ───────────────────────────────────────
    if (this.millis - this.lastReportMs >= this.reportInterval) {
      this.lastReportMs = this.millis;
      this.emitReport();
    }
  }

  // ── Serial command handler — mirrors command_handler.h exactly ─
  private dispatchCommand(cmd: string) {
    // SS:<rpm> — set motor speed
    if (cmd.startsWith('SS:')) {
      const rpm = parseInt(cmd.substring(3));
      if (isNaN(rpm)) {
        this.cb.onSerial('<Err> SS: invalid value');
        return;
      }
      this.motorSpeed = rpm;
      if (!this.motorRunning) {
        this.cb.onSerial(`<Inf> Motor speed stored: ${rpm} RPM (motor off)`);
      } else if (rpm < 40 || rpm > 300) {
        this.cb.onSerial(
          `<Err> Invalid RPM value. Please enter a value between 40 and 300`
        );
      } else {
        const interval = Math.round((60 * 1_000_000) / (rpm * 200 * 4 * 2));
        this.timer1.initialize(interval);
        this.cb.onSerial(`<Inf> Motor speed set to: ${rpm}`);
      }
      return;
    }

    // SF:<flow> — set target flow
    if (cmd.startsWith('SF:')) {
      this.targetFlow = parseFloat(cmd.substring(3));
      this.cb.onSerial(
        `<Inf> Target flow set to: ${this.targetFlow.toFixed(2)}`
      );
      return;
    }

    // Tare — zero all scales
    if (cmd === 'Tare') {
      for (let i = 0; i < 3; i++) {
        this.hx711[i] = { ...this.hx711[i], offset: this.hx711[i].rawAdc };
        this.scaleOffset[i] = this.hx711[i].rawAdc;
      }
      this.eepromSave();
      this.cb.onSerial('<Inf> Scales tared and offsets saved to EEPROM.');
      return;
    }

    // Tare:<n> — zero single scale
    if (cmd.startsWith('Tare:')) {
      const idx = parseInt(cmd.substring(5));
      if (idx < 0 || idx > 2) {
        this.cb.onSerial(`<Err> Tare: index ${idx} out of range (0-2).`);
        return;
      }
      this.hx711[idx] = { ...this.hx711[idx], offset: this.hx711[idx].rawAdc };
      this.scaleOffset[idx] = this.hx711[idx].rawAdc;
      this.eepromSave();
      this.cb.onSerial(`<Inf> Scale ${idx} tared and offset saved to EEPROM.`);
      return;
    }

    // SetScale:<n>:<factor>
    if (cmd.startsWith('SetScale:')) {
      const parts = cmd.substring(9).split(':');
      if (parts.length < 2) {
        this.cb.onSerial("<Err> SetScale: missing ':' separator.");
        return;
      }
      const idx = parseInt(parts[0]);
      const factor = parseFloat(parts[1]);
      if (idx < 0 || idx > 2) {
        this.cb.onSerial(`<Err> SetScale: index ${idx} out of range (0-2).`);
        return;
      }
      this.scaleFactor[idx] = factor;
      this.hx711[idx].scaleFactor = factor;
      this.cb.onSerial(`<Inf> Scale ${idx} factor set to ${factor}`);
      return;
    }

    // ReadRaw:<n> — raw 24-bit ADC
    if (cmd.startsWith('ReadRaw:')) {
      const idx = parseInt(cmd.substring(8));
      if (idx < 0 || idx > 2) {
        this.cb.onSerial(`<Err> ReadRaw: index ${idx} out of range (0-2).`);
        return;
      }
      // Average 10 readings like the real firmware
      let sum = 0;
      for (let k = 0; k < 10; k++) {
        const temp = hx711Tick(
          this.hx711[idx],
          this.inputs.scaleWeightG[idx],
          this.inputs.ambientTempC
        );
        sum += temp.rawAdc;
      }
      this.cb.onSerial(`<Raw>${idx},${Math.round(sum / 10)}`);
      return;
    }

    // Relay controls
    if (cmd === 'Relay1_ON') {
      this.relay1 = true;
      this.pins[6] = 0;
      this.cb.onPinChange(6, 0);
      return;
    }
    if (cmd === 'Relay1_OFF') {
      this.relay1 = false;
      this.pins[6] = 1;
      this.cb.onPinChange(6, 1);
      return;
    }
    if (cmd === 'Relay2_ON') {
      this.relay2 = true;
      this.pins[7] = 0;
      this.cb.onPinChange(7, 0);
      return;
    }
    if (cmd === 'Relay2_OFF') {
      this.relay2 = false;
      this.pins[7] = 1;
      this.cb.onPinChange(7, 1);
      return;
    }

    this.cb.onSerial(`<Err> Unknown command: ${cmd}`);
  }

  // ── Periodic report — mirrors main.ino loop() exactly ─────────
  private emitReport() {
    // 5× NTC analog readings (A0–A4)
    const ntcVals = this.ntc.map((n) => n.adcRaw);

    // 3× scale readings
    const scaleVals = this.hx711.map((h) => Math.round(hx711GetValue(h)));

    // 2× rainmeter raw tips
    const rainVals = this.rain.map((r) => r.rawTips);

    // INA260
    const cur = this.ina260.current.toFixed(2);
    const vol = this.ina260.busVoltage.toFixed(2);
    const pow = this.ina260.power.toFixed(2);

    // Motor state
    const motorStr = this.motorRunning ? 'true' : 'false';

    // Relay 1: digitalRead(RELAY1_PIN) == LOW ? "ON" : "OFF"
    const relay1Str = (this.pins[6] ?? 1) === 0 ? 'ON' : 'OFF';

    const parts = [
      ...ntcVals,
      ...scaleVals,
      ...rainVals,
      cur,
      vol,
      pow,
      motorStr,
      this.motorSpeed,
      relay1Str,
      this.targetFlow.toFixed(2),
    ];
    this.cb.onSerial(parts.join(','));
  }

  // ── EEPROM helpers — mirrors eeprom_store.h ────────────────────
  private eepromSave() {
    this.eeprom.write(0, 0xa5);
    this.eeprom.write(1, 0x5a);
    for (let i = 0; i < 3; i++) {
      this.eepromPutFloat(2 + i * 4, this.scaleOffset[i]);
      this.eepromPutFloat(14 + i * 4, this.scaleFactor[i]);
    }
  }
  private eepromGetFloat(addr: number): number {
    const buf = new ArrayBuffer(4);
    const u8 = new Uint8Array(buf);
    for (let i = 0; i < 4; i++) u8[i] = this.eeprom.read(addr + i);
    return new Float32Array(buf)[0];
  }
  private eepromPutFloat(addr: number, val: number) {
    const buf = new ArrayBuffer(4);
    new Float32Array(buf)[0] = val;
    const u8 = new Uint8Array(buf);
    for (let i = 0; i < 4; i++) this.eeprom.write(addr + i, u8[i]);
  }

  // ── Defaults ──────────────────────────────────────────────────
  private defaultInputs(): SensorInputs {
    return {
      scaleWeightG: [500, 750, 300],
      inaVoltage: 12100,
      inaCurrent: 320,
      rainTips: [0, 0],
      ntcTempC: [25, 25, 25, 25, 25],
      ambientTempC: 25,
    };
  }
}
