/**
 * SSD1306 OLED Display Behavior (I2C, 128×64)
 * Tracks display buffer, text, and drawing commands via Adafruit_SSD1306 API.
 */
import { DeviceBehavior, DeviceRegistry } from '../device-driven-simulator';
import type { Board } from '@/types';

interface TextEntry { x: number; y: number; text: string; size: number; }

export class OLEDBehavior implements DeviceBehavior {
  public deviceId = '';
  public deviceType = 'oled';
  public category = 'display' as const;

  private i2cAddr = 0x3C;
  private width = 128;
  private height = 64;
  private initialized = false;
  private displayOn = true;
  private cursorX = 0;
  private cursorY = 0;
  private textSize = 1;
  private textEntries: TextEntry[] = [];
  private printBuffer = '';
  private contrast = 128;

  initialize(board: Board, pinMapping: Record<string, number>) {
    this.i2cAddr = pinMapping['addr'] ?? 0x3C;
    this.width = pinMapping['width'] ?? 128;
    this.height = pinMapping['height'] ?? 64;
    this.textEntries = [];
    this.initialized = false;
  }

  tick(_millis: number, _dt: number) {}

  handleArduinoCall(fn: string, args: unknown[]): unknown {
    switch (fn) {
      case 'begin': this.initialized = true; this.textEntries = []; return 1;
      case 'clearDisplay': this.textEntries = []; this.printBuffer = ''; return undefined;
      case 'display': return undefined; // commit buffer — we track in real time
      case 'setTextSize': this.textSize = Number(args[0]) || 1; return undefined;
      case 'setCursor': this.cursorX = Number(args[0]); this.cursorY = Number(args[1]); return undefined;
      case 'setTextColor': return undefined; // always white in sim
      case 'setContrast': this.contrast = Number(args[0]); return undefined;
      case 'ssd1306_command': return undefined;
      case 'print':
      case 'println': {
        const text = String(args[0] ?? '');
        this.textEntries.push({ x: this.cursorX, y: this.cursorY, text, size: this.textSize });
        this.cursorY += 8 * this.textSize;
        if (fn === 'println') this.cursorX = 0;
        return undefined;
      }
      case 'drawRect':
      case 'fillRect':
      case 'drawCircle':
      case 'fillCircle':
      case 'drawLine':
        return undefined; // shapes tracked structurally if needed
      case 'invertDisplay': this.displayOn = !args[0]; return undefined;
      case 'dim': return undefined;
      default: return undefined;
    }
  }

  getState() {
    return {
      initialized: this.initialized,
      displayOn: this.displayOn,
      width: this.width,
      height: this.height,
      i2cAddr: '0x' + this.i2cAddr.toString(16).toUpperCase(),
      cursorX: this.cursorX,
      cursorY: this.cursorY,
      textSize: this.textSize,
      contrast: this.contrast,
      textEntries: this.textEntries.slice(-16), // last 16 writes
    };
  }

  setState(s: Record<string, unknown>) {
    if (s.displayOn !== undefined) this.displayOn = !!s.displayOn;
  }

  cleanup() { this.textEntries = []; this.initialized = false; }
}

DeviceRegistry.register('oled', () => new OLEDBehavior());
