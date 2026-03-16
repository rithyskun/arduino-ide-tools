/**
 * Push Button Behavior
 * Debounced digital input. Supports active-HIGH and active-LOW wiring.
 */
import { DeviceBehavior, DeviceRegistry } from '../device-driven-simulator';
import type { Board } from '@/types';

export class ButtonBehavior implements DeviceBehavior {
  public deviceId = '';
  public deviceType = 'button';
  public category = 'input' as const;

  private pin = 3;
  private pressed = false;
  private activeLow = true;   // INPUT_PULLUP wiring (common)
  private pressCount = 0;
  private lastPressTime = 0;
  private debounceMs = 50;

  initialize(board: Board, pinMapping: Record<string, number>) {
    this.pin = pinMapping['PIN'] ?? 3;
    this.activeLow = (pinMapping['activeLow'] ?? 1) === 1;
    this.pressed = false;
    this.pressCount = 0;
  }

  tick(_millis: number, _dt: number) {}

  handleArduinoCall(fn: string, args: unknown[]): unknown {
    if (fn === 'digitalRead' && args[0] === this.pin) {
      if (this.activeLow) return this.pressed ? 0 : 1;
      return this.pressed ? 1 : 0;
    }
    if (fn === 'press') {
      this.pressed = true;
      this.pressCount++;
      this.lastPressTime = Date.now();
    }
    if (fn === 'release') this.pressed = false;
    return undefined;
  }

  getState() {
    return {
      pressed: this.pressed,
      pressCount: this.pressCount,
      pin: this.pin,
      activeLow: this.activeLow,
      pinState: this.activeLow ? (this.pressed ? 0 : 1) : (this.pressed ? 1 : 0),
    };
  }

  setState(s: Record<string, unknown>) {
    if (s.pressed !== undefined) {
      const wasPressed = this.pressed;
      this.pressed = !!s.pressed;
      if (this.pressed && !wasPressed) this.pressCount++;
    }
  }

  cleanup() { this.pressed = false; }
}

DeviceRegistry.register('button', () => new ButtonBehavior());
