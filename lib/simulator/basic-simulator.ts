import type { SimCallbacks } from './engine';

// ── Basic firmware state for simple projects ───────────────────────
interface BasicFirmwareState {
  millis: number;
  pins: Record<number, number>;
  analog: Record<number, number>;
}

export class BasicSimulator {
  private state: BasicFirmwareState;
  private running = false;
  private speedMult = 5;
  private lastRealTime = 0;
  private accumMs = 0;
  private handle: ReturnType<typeof setTimeout> | null = null;
  private cb: SimCallbacks;

  constructor(cb: SimCallbacks) {
    this.cb = cb;
    this.state = this.freshState();
  }

  private freshState(): BasicFirmwareState {
    return {
      millis: 0,
      pins: {},
      analog: {},
    };
  }

  start() {
    if (this.running) return;
    this.running = true;
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
    this.state = this.freshState();
  }

  setSpeed(mult: number) {
    this.speedMult = mult;
  }

  setInputs(inputs: any) {
    // Basic simulator doesn't use sensor inputs, but implement for compatibility
    // Could be extended to handle basic sensor simulation
  }

  setPin(pin: number, val: number) {
    this.state.pins[pin] = val;
    this.cb.onPinChange(pin, val);
  }

  sendSerial(cmd: string) {
    // Basic serial echo for debugging
    this.cb.onSerial(`<Echo> Received: ${cmd}`);
  }

  private bootSequence() {
    const log = (t: string) => this.cb.onSerial(t);
    log('<Inf> Arduino starting...');
    log('<Inf> Arduino firmware version: 1.1.2');
    log('<Inf> Basic simulator ready.');
    log('<Inf> Ready to receive commands.');
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
    // Basic loop tick - can be extended based on user code analysis
    // For now, just update pin states if they change
    Object.entries(this.state.pins).forEach(([pin, val]) => {
      this.cb.onPinChange(Number(pin), val);
    });

    // Update analog reads
    Object.entries(this.state.analog).forEach(([pin, val]) => {
      this.cb.onAnalogChange(Number(pin), val);
    });
  }

  // Simple digital read/write simulation
  digitalWrite(pin: number, val: number) {
    this.state.pins[pin] = val;
    this.cb.onPinChange(pin, val);
  }

  digitalRead(pin: number): number {
    return this.state.pins[pin] ?? 0;
  }

  analogWrite(pin: number, val: number) {
    this.state.analog[pin] = val;
    this.cb.onAnalogChange(pin, val);
  }

  analogRead(pin: number): number {
    return this.state.analog[pin] ?? 512; // Default analog value
  }
}
