/**
 * NeoPixel (WS2812B) LED Strip Behavior
 * Supports up to 256 pixels. Tracks per-pixel RGB color set via setPixelColor().
 */
import { DeviceBehavior, DeviceRegistry } from '../device-driven-simulator';
import type { Board } from '@/types';

interface Pixel { r: number; g: number; b: number; }

export class NeoPixelBehavior implements DeviceBehavior {
  public deviceId = '';
  public deviceType = 'neopixel';
  public category = 'actuator' as const;

  private pin = 6;
  private numPixels = 8;
  private pixels: Pixel[] = [];
  private brightness = 255;
  private shown = false;

  initialize(board: Board, pinMapping: Record<string, number>) {
    this.pin = pinMapping['DIN'] ?? 6;
    this.numPixels = Math.min(256, pinMapping['count'] ?? 8);
    this.pixels = Array.from({ length: this.numPixels }, () => ({ r: 0, g: 0, b: 0 }));
    this.brightness = 255;
    this.shown = false;
  }

  tick(_millis: number, _dt: number) {}

  handleArduinoCall(fn: string, args: unknown[]): unknown {
    switch (fn) {
      case 'begin': return undefined;
      case 'show': this.shown = true; return undefined;
      case 'clear':
        this.pixels = this.pixels.map(() => ({ r: 0, g: 0, b: 0 }));
        return undefined;
      case 'setBrightness':
        this.brightness = Math.max(0, Math.min(255, Number(args[0])));
        return undefined;
      case 'setPixelColor': {
        const idx = Number(args[0]);
        if (idx >= 0 && idx < this.numPixels) {
          if (args.length === 4) {
            // setPixelColor(n, r, g, b)
            this.pixels[idx] = { r: Number(args[1])&0xFF, g: Number(args[2])&0xFF, b: Number(args[3])&0xFF };
          } else if (args.length === 2) {
            // setPixelColor(n, color32)
            const c = Number(args[1]);
            this.pixels[idx] = { r: (c>>16)&0xFF, g: (c>>8)&0xFF, b: c&0xFF };
          }
        }
        return undefined;
      }
      case 'getPixelColor': {
        const idx = Number(args[0]);
        if (idx >= 0 && idx < this.numPixels) {
          const p = this.pixels[idx];
          return (p.r << 16) | (p.g << 8) | p.b;
        }
        return 0;
      }
      case 'Color':
        return ((Number(args[0])&0xFF) << 16) | ((Number(args[1])&0xFF) << 8) | (Number(args[2])&0xFF);
      case 'numPixels': return this.numPixels;
      default: return undefined;
    }
  }

  getState() {
    return {
      numPixels: this.numPixels,
      brightness: this.brightness,
      shown: this.shown,
      pin: this.pin,
      pixels: this.pixels.map((p, i) => ({
        index: i,
        r: p.r, g: p.g, b: p.b,
        hex: '#' + [p.r, p.g, p.b].map(v => v.toString(16).padStart(2,'0')).join(''),
      })),
    };
  }

  setState(s: Record<string, unknown>) {
    if (Array.isArray(s.pixels)) {
      (s.pixels as Pixel[]).forEach((p, i) => {
        if (i < this.numPixels) this.pixels[i] = { r: p.r??0, g: p.g??0, b: p.b??0 };
      });
    }
  }

  cleanup() { this.pixels = this.pixels.map(() => ({ r: 0, g: 0, b: 0 })); }
}

DeviceRegistry.register('neopixel', () => new NeoPixelBehavior());
