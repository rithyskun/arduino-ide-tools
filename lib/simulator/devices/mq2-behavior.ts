/**
 * MQ-2 Gas / Smoke Sensor Behavior
 * Analog output proportional to gas concentration. Simulates LPG, smoke, CO, methane.
 */
import { DeviceBehavior, DeviceRegistry } from '../device-driven-simulator';
import type { Board } from '@/types';

export class MQ2Behavior implements DeviceBehavior {
  public deviceId = '';
  public deviceType = 'mq2';
  public category = 'sensor' as const;

  private analogPin = 0;
  private digitalPin = 7;   // D0 threshold pin
  private threshold = 400;  // ADC threshold for digital out
  private baselineADC = 120; // clean air ~120 ADC
  private currentADC = 120;
  private gasPresent = false;
  private warmupDone = false;
  private startTime = 0;
  private warmupMs = 20000; // MQ sensors need ~20s warmup

  initialize(board: Board, pinMapping: Record<string, number>) {
    this.analogPin = pinMapping['AO'] ?? 0;
    this.digitalPin = pinMapping['DO'] ?? 7;
    this.threshold = pinMapping['threshold'] ?? 400;
    this.startTime = 0;
    this.currentADC = this.baselineADC;
  }

  tick(millis: number, _dt: number) {
    if (this.startTime === 0) this.startTime = millis;
    this.warmupDone = millis - this.startTime >= this.warmupMs;
    if (!this.warmupDone) { this.currentADC = this.baselineADC; return; }

    // Slow drift + occasional spikes to simulate real environment
    this.currentADC += (Math.random() - 0.5) * 4;
    this.currentADC = Math.max(this.baselineADC, Math.min(1023, this.currentADC));

    // Gradual decay if gas not sustained
    if (this.currentADC > this.baselineADC + 20) {
      this.currentADC = Math.max(this.baselineADC, this.currentADC - 1);
    }
    this.gasPresent = this.currentADC >= this.threshold;
  }

  handleArduinoCall(fn: string, args: unknown[]): unknown {
    if (fn === 'analogRead' && args[0] === this.analogPin) return Math.round(this.currentADC);
    if (fn === 'digitalRead' && args[0] === this.digitalPin) return this.gasPresent ? 0 : 1; // active LOW
    if (fn === 'setGasLevel') {
      this.currentADC = Math.max(0, Math.min(1023, Number(args[0])));
      this.gasPresent = this.currentADC >= this.threshold;
    }
    return undefined;
  }

  getState() {
    return {
      adcValue: Math.round(this.currentADC),
      gasPresent: this.gasPresent,
      warmupDone: this.warmupDone,
      analogPin: this.analogPin,
      digitalPin: this.digitalPin,
      threshold: this.threshold,
    };
  }

  setState(s: Record<string, unknown>) {
    if (s.adcValue !== undefined) this.currentADC = Number(s.adcValue);
  }

  cleanup() { this.currentADC = this.baselineADC; }
}

DeviceRegistry.register('mq2', () => new MQ2Behavior());
