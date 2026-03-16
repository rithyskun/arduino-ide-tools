/**
 * PIR Motion Sensor (HC-SR501) Behavior
 * Simulates passive infrared motion detection with warmup, hold time, and retrigger.
 */
import { DeviceBehavior, DeviceRegistry } from '../device-driven-simulator';
import type { Board } from '@/types';

export class PIRBehavior implements DeviceBehavior {
  public deviceId = '';
  public deviceType = 'pir';
  public category = 'sensor' as const;

  private pin = 2;
  private motionDetected = false;
  private lastTriggerTime = 0;
  private holdTime = 5000;       // ms motion stays HIGH after detection
  private warmupTime = 30000;    // HC-SR501 needs ~30s warmup
  private startTime = 0;
  private warmedUp = false;
  private autoTrigger = true;    // simulate random motion events in demo
  private nextTriggerTime = 0;

  initialize(board: Board, pinMapping: Record<string, number>) {
    this.pin = pinMapping['OUT'] ?? 2;
    this.holdTime = (pinMapping['holdMs'] ?? 5000);
    this.startTime = 0; // set on first tick
    this.warmedUp = false;
    this.motionDetected = false;
  }

  tick(millis: number, _dt: number) {
    if (this.startTime === 0) {
      this.startTime = millis;
      this.nextTriggerTime = millis + this.warmupTime + 2000;
    }

    // Warmup
    if (!this.warmedUp) {
      if (millis - this.startTime >= this.warmupTime) {
        this.warmedUp = true;
      }
      return;
    }

    // Auto-simulate random motion for demo
    if (this.autoTrigger && millis >= this.nextTriggerTime) {
      this.motionDetected = true;
      this.lastTriggerTime = millis;
      // Next random trigger 8-20s later
      this.nextTriggerTime = millis + 8000 + Math.random() * 12000;
    }

    // Clear motion after holdTime
    if (this.motionDetected && millis - this.lastTriggerTime >= this.holdTime) {
      this.motionDetected = false;
    }
  }

  handleArduinoCall(fn: string, args: unknown[]): unknown {
    if (fn === 'digitalRead' && args[0] === this.pin) return this.motionDetected ? 1 : 0;
    if (fn === 'triggerMotion') { this.motionDetected = true; this.lastTriggerTime = Date.now(); }
    if (fn === 'setAutoTrigger') this.autoTrigger = !!args[0];
    return undefined;
  }

  getState() {
    return {
      motionDetected: this.motionDetected,
      warmedUp: this.warmedUp,
      pin: this.pin,
      pinState: this.motionDetected ? 1 : 0,
    };
  }

  setState(state: Record<string, unknown>) {
    if (state.motionDetected !== undefined) this.motionDetected = !!state.motionDetected;
  }

  cleanup() { this.motionDetected = false; }
}

DeviceRegistry.register('pir', () => new PIRBehavior());
