import type { Project, DeviceInstance } from '@/types';

export interface SimCallbacks {
  onSerial: (text: string) => void;
  onPinChange: (pin: number, val: number) => void;
  onAnalogChange: (pin: number, val: number) => void;
  onMillisUpdate: (ms: number) => void;
  onStop: () => void;
}

// ── Interpreted firmware state (mirrors main.ino globals) ────────
interface FirmwareState {
  motorSpeed: number;
  motorRunning: boolean;
  targetFlow: number;
  relay1: boolean;
  relay2: boolean;
  scaleFactor: number[];
  scaleOffset: number[];
  lastTime: number;
  interval: number;
  prevSwitch: boolean;
  eepromValid: boolean;
  millis: number;
  // pin states
  pins: Record<number, number>;
  analog: Record<number, number>;
}

export class InterpretedSimulator {
  private state: FirmwareState;
  private rxQueue: number[] = [];
  private rxBuffer = '';
  private running = false;
  private speedMult = 5;
  private lastRealTime = 0;
  private accumMs = 0;
  private handle: ReturnType<typeof setTimeout> | null = null;
  private cb: SimCallbacks;
  private devices: DeviceInstance[] = [];

  constructor(cb: SimCallbacks) {
    this.cb = cb;
    this.state = this.freshState();
  }

  private freshState(): FirmwareState {
    return {
      motorSpeed: 0,
      motorRunning: false,
      targetFlow: 0,
      relay1: false,
      relay2: false,
      scaleFactor: [-46.5, -29.11, -46.5],
      scaleOffset: [0, 0, 0],
      lastTime: 0,
      interval: 5000,
      prevSwitch: false,
      eepromValid: false,
      millis: 0,
      pins: {},
      analog: {},
    };
  }

  setDevices(devices: DeviceInstance[]) {
    this.devices = devices;
  }
  setSpeed(mult: number) {
    this.speedMult = mult;
  }
  setPin(pin: number, val: number) {
    this.state.pins[pin] = val;
  }
  setAnalog(pin: number, val: number) {
    this.state.analog[pin] = val;
  }

  sendSerial(text: string) {
    for (const ch of text + '\n') this.rxQueue.push(ch.charCodeAt(0));
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.state = this.freshState();
    this.rxQueue = [];
    this.rxBuffer = '';
    this.accumMs = 0;
    this.lastRealTime = Date.now();
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

  setInputs(inputs: any) {
    // Interpreted simulator doesn't use sensor inputs, but implement for compatibility
  }

  private bootSequence() {
    const log = (t: string) => this.cb.onSerial(t);
    log('<Inf> Arduino starting...');
    log('<Inf> Arduino firmware version: 1.1.2');
    log('<Inf> Calibrating scales...');
    for (let i = 0; i < 3; i++) {
      log(
        `<Inf> PCA9685 channel selected: 0b${(1 << i).toString(2).padStart(8, '0')}`
      );
      log(
        `<Inf> Scale ${i} initialized with calibration factor: ${this.state.scaleFactor[i]}`
      );
    }
    log('<Inf> Scales initialized.');
    log('<Inf> No EEPROM data found, using default calibration factors.');
    log(
      '<Inf> Rainmeter 0 initialized successfully. Firmware version: V1.0-stub'
    );
    log(
      '<Inf> Rainmeter 1 initialized successfully. Firmware version: V1.0-stub'
    );
    log('<Inf> INA260 initialized successfully.');
    log('<Inf> Stepper motor initialized.');
    log('<Inf> Arduino setup complete. Ready to receive commands.');
  }

  private tick() {
    if (!this.running) return;
    const now = Date.now();
    const realDelta = now - this.lastRealTime;
    this.lastRealTime = now;
    this.accumMs += realDelta * this.speedMult;

    while (this.accumMs >= 10) {
      this.state.millis += 10;
      this.accumMs -= 10;
      this.loopTick();
    }

    this.cb.onMillisUpdate(this.state.millis);
    this.handle = setTimeout(() => this.tick(), 16);
  }

  private loopTick() {
    const st = this.state;

    // Switch toggle (mirrors loop())
    const curSwitch = (st.pins[15] ?? 0) === 1;
    if (curSwitch !== st.prevSwitch) {
      st.prevSwitch = curSwitch;
      st.motorRunning = !st.motorRunning;
      if (st.motorRunning) {
        if (st.motorSpeed < 40 || st.motorSpeed > 300) {
          this.cb.onSerial(
            '<Err> Invalid RPM value. Please enter a value between 40 and 300'
          );
          st.motorRunning = false;
        } else {
          this.cb.onSerial(`<Inf> Motor speed set to: ${st.motorSpeed}`);
          this.cb.onPinChange(5, 0); // ENABLE LOW
        }
      } else {
        this.cb.onSerial('<Inf> Motor stopped.');
        this.cb.onPinChange(5, 1); // ENABLE HIGH
      }
    }

    // Serial RX dispatch
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

    // Periodic report (every 5000ms)
    if (st.millis - st.lastTime >= st.interval) {
      st.lastTime = st.millis;
      this.emitReport();
    }
  }

  private getDeviceValue(type: string, key: string): number {
    const dev = this.devices.find((d) => d.deviceType === type);
    return dev?.values[key] ?? 0;
  }

  private dispatchCommand(cmd: string) {
    const st = this.state;
    if (cmd.startsWith('SS:')) {
      const rpm = parseInt(cmd.substring(3));
      st.motorSpeed = rpm;
      if (!st.motorRunning)
        this.cb.onSerial(`<Inf> Motor speed stored: ${rpm} (motor off)`);
      else if (rpm < 40 || rpm > 300)
        this.cb.onSerial(
          '<Err> Invalid RPM value. Please enter a value between 40 and 300'
        );
      else {
        this.cb.onSerial(`<Inf> Motor speed set to: ${rpm}`);
        this.cb.onPinChange(3, 1);
      }
    } else if (cmd.startsWith('SF:')) {
      st.targetFlow = parseFloat(cmd.substring(3));
      this.cb.onSerial(`<Inf> Target flow set to: ${st.targetFlow.toFixed(2)}`);
    } else if (cmd === 'Tare') {
      st.scaleOffset = [0, 1, 2].map((i) =>
        this.getDeviceValue('hx711_' + i, 'rawAdc')
      );
      st.eepromValid = true;
      this.cb.onSerial('<Inf> Scales tared and offsets saved to EEPROM.');
    } else if (cmd.startsWith('Tare:')) {
      const idx = parseInt(cmd.substring(5));
      if (idx < 0 || idx > 2) {
        this.cb.onSerial(`<Err> Tare: index ${idx} out of range (0-2).`);
        return;
      }
      st.scaleOffset[idx] = this.getDeviceValue('hx711_' + idx, 'rawAdc');
      this.cb.onSerial(`<Inf> Scale ${idx} tared and offset saved to EEPROM.`);
    } else if (cmd.startsWith('SetScale:')) {
      const parts = cmd.substring(9).split(':');
      if (parts.length < 2) {
        this.cb.onSerial("<Err> SetScale: missing ':' separator.");
        return;
      }
      const idx = parseInt(parts[0]),
        factor = parseFloat(parts[1]);
      if (idx < 0 || idx > 2) {
        this.cb.onSerial(`<Err> SetScale: index ${idx} out of range (0-2).`);
        return;
      }
      st.scaleFactor[idx] = factor;
      this.cb.onSerial(`<Inf> Scale ${idx} factor set to ${factor}`);
    } else if (cmd.startsWith('ReadRaw:')) {
      const idx = parseInt(cmd.substring(8));
      if (idx < 0 || idx > 2) {
        this.cb.onSerial(`<Err> ReadRaw: index ${idx} out of range (0-2).`);
        return;
      }
      const raw = Math.round(
        this.getDeviceValue('hx711', 'weight') * st.scaleFactor[idx] +
          (Math.random() - 0.5) * 200
      );
      this.cb.onSerial(`<Raw>${idx},${raw}`);
    } else if (cmd === 'Relay1_ON') {
      st.relay1 = true;
      this.cb.onPinChange(6, 0);
    } else if (cmd === 'Relay1_OFF') {
      st.relay1 = false;
      this.cb.onPinChange(6, 1);
    } else if (cmd === 'Relay2_ON') {
      st.relay2 = true;
      this.cb.onPinChange(7, 0);
    } else if (cmd === 'Relay2_OFF') {
      st.relay2 = false;
      this.cb.onPinChange(7, 1);
    } else {
      this.cb.onSerial(`<Err> Unknown command: ${cmd}`);
    }
  }

  private emitReport() {
    const st = this.state;
    // NTC readings from analog state
    const ntc = [0, 1, 2, 3, 4].map((i) => st.analog[54 + i] ?? 512);
    // Scale readings from device values
    const scales = [0, 1, 2].map((i) => {
      const w = this.getDeviceValue('hx711', 'weight_' + i) || 500 - i * 100;
      return Math.round(w);
    });
    // Rain from device values
    const rain = [0, 1].map(
      (i) => this.getDeviceValue('dfrobot_rain', 'tips_' + i) || i * 5
    );
    // INA260
    const voltage = this.getDeviceValue('ina260', 'voltage') || 12100;
    const current = this.getDeviceValue('ina260', 'current') || 320;
    const power = (voltage * current) / 1000;

    const parts = [
      ...ntc,
      ...scales,
      ...rain,
      current.toFixed(2),
      voltage.toFixed(2),
      power.toFixed(2),
      st.motorRunning ? 'true' : 'false',
      st.motorSpeed,
      st.relay1 ? 'ON' : 'OFF',
      st.targetFlow.toFixed(2),
    ];
    this.cb.onSerial(parts.join(','));
  }
}
