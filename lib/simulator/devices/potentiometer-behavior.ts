/**
 * Potentiometer Behavior
 * Analog input 0–1023. Simulates user turning the knob.
 */
import { DeviceBehavior, DeviceRegistry } from '../device-driven-simulator';
import type { Board } from '@/types';

export class PotentiometerBehavior implements DeviceBehavior {
  public deviceId = '';
  public deviceType = 'potentiometer';
  public category = 'input' as const;

  private pin = 0;
  private value = 512;       // 0–1023
  private sweepDirection = 1;
  private autoSweep = false;

  initialize(board: Board, pinMapping: Record<string, number>) {
    this.pin = pinMapping['AO'] ?? 0;
    this.value = pinMapping['initialValue'] ?? 512;
    this.autoSweep = !!(pinMapping['autoSweep'] ?? 0);
  }

  tick(_millis: number, dt: number) {
    if (this.autoSweep) {
      this.value += this.sweepDirection * dt * 0.1;
      if (this.value >= 1023) { this.value = 1023; this.sweepDirection = -1; }
      if (this.value <= 0)    { this.value = 0;    this.sweepDirection =  1; }
    }
    // Small noise
    this.value += (Math.random() - 0.5) * 0.5;
    this.value = Math.max(0, Math.min(1023, this.value));
  }

  handleArduinoCall(fn: string, args: unknown[]): unknown {
    if (fn === 'analogRead' && args[0] === this.pin) return Math.round(this.value);
    if (fn === 'setValue') this.value = Math.max(0, Math.min(1023, Number(args[0])));
    return undefined;
  }

  getState() {
    return {
      value: Math.round(this.value),
      valuePercent: Math.round(this.value / 10.23),
      voltage: parseFloat((this.value * 5 / 1023).toFixed(3)),
      pin: this.pin,
    };
  }

  setState(s: Record<string, unknown>) {
    if (s.value !== undefined) this.value = Math.max(0, Math.min(1023, Number(s.value)));
  }

  cleanup() {}
}

DeviceRegistry.register('potentiometer', () => new PotentiometerBehavior());
