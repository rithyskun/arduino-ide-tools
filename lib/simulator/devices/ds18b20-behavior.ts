/**
 * DS18B20 One-Wire Temperature Sensor Behavior
 * Supports single and multi-sensor bus. Reports temperature in °C with ±0.5°C accuracy sim.
 */
import { DeviceBehavior, DeviceRegistry } from '../device-driven-simulator';
import type { Board } from '@/types';

export class DS18B20Behavior implements DeviceBehavior {
  public deviceId = '';
  public deviceType = 'ds18b20';
  public category = 'sensor' as const;

  private pin = 4;
  private temperature = 24.0;
  private conversionTime = 750; // ms for 12-bit resolution
  private conversionStart = -1;
  private conversionDone = true;
  private sensorCount = 1;

  initialize(board: Board, pinMapping: Record<string, number>) {
    this.pin = pinMapping['DATA'] ?? 4;
    this.sensorCount = pinMapping['count'] ?? 1;
    this.temperature = 20 + Math.random() * 10;
  }

  tick(millis: number, _dt: number) {
    // Simulate temperature drift
    if (Math.random() < 0.005) {
      this.temperature += (Math.random() - 0.5) * 0.3;
      this.temperature = Math.max(-55, Math.min(125, this.temperature));
    }
    // Check conversion done
    if (this.conversionStart >= 0 && millis - this.conversionStart >= this.conversionTime) {
      this.conversionDone = true;
      this.conversionStart = -1;
    }
  }

  handleArduinoCall(fn: string, args: unknown[]): unknown {
    switch (fn) {
      case 'requestTemperatures':
        this.conversionDone = false;
        this.conversionStart = Date.now();
        return undefined;
      case 'isConversionComplete':
        return this.conversionDone ? 1 : 0;
      case 'getTempCByIndex':
        return this.conversionDone ? parseFloat(this.temperature.toFixed(2)) : -127.0;
      case 'getTempFByIndex':
        return this.conversionDone ? parseFloat((this.temperature * 9/5 + 32).toFixed(2)) : -196.6;
      case 'getDeviceCount':
        return this.sensorCount;
      case 'begin':
        return this.sensorCount;
      default:
        return undefined;
    }
  }

  getState() {
    return {
      temperature: parseFloat(this.temperature.toFixed(2)),
      temperatureF: parseFloat((this.temperature * 9/5 + 32).toFixed(2)),
      conversionDone: this.conversionDone,
      sensorCount: this.sensorCount,
      pin: this.pin,
    };
  }

  setState(s: Record<string, unknown>) {
    if (s.temperature !== undefined) this.temperature = Number(s.temperature);
  }

  cleanup() {}
}

DeviceRegistry.register('ds18b20', () => new DS18B20Behavior());
