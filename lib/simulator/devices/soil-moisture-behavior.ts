/**
 * Soil Moisture Sensor Behavior
 * 
 * This device simulates a soil moisture sensor with realistic moisture readings,
 * calibration, and environmental factors.
 */

import { DeviceBehavior, DeviceRegistry } from '../device-driven-simulator';
import type { Board } from '@/types';

export class SoilMoistureBehavior implements DeviceBehavior {
  public deviceId = '';
  public deviceType = 'soil-moisture';
  public category = 'sensor' as const;
  
  private analogPin = 0;
  private digitalPin = 1;
  private moisture = 50.0; // % (0-100)
  private rawValue = 512; // ADC value (0-1023)
  private threshold = 30; // % for digital output
  private isDry = false;
  private calibrationDry = 0; // ADC value for dry soil
  private calibrationWet = 1023; // ADC value for wet soil
  private lastReadTime = 0;
  private readInterval = 1000; // 1 second between reads
  
  initialize(board: Board, pinMapping: Record<string, number>) {
    this.analogPin = pinMapping['ANALOG'] || 0;
    this.digitalPin = pinMapping['DIGITAL'] || 1;
    this.threshold = pinMapping['threshold'] || 30;
    this.calibrationDry = pinMapping['calibrationDry'] || 0;
    this.calibrationWet = pinMapping['calibrationWet'] || 1023;
    
    // Add realistic initial moisture
    this.moisture = 40 + Math.random() * 40; // 40-80% initial moisture
    this.updateRawValue();
    this.updateDigitalOutput();
  }
  
  tick(millis: number, deltaTime: number) {
    // Simulate moisture changes (evaporation, watering)
    if (Math.random() < 0.02) { // 2% chance per tick
      // Natural evaporation
      this.moisture -= Math.random() * 0.5; // -0.5% max
      
      // Occasional watering (rain, irrigation)
      if (Math.random() < 0.1) { // 10% chance when already changing
        this.moisture += Math.random() * 5; // +5% max
      }
      
      // Keep within bounds
      this.moisture = Math.max(0, Math.min(100, this.moisture));
      this.updateRawValue();
      this.updateDigitalOutput();
    }
  }
  
  handleArduinoCall(functionName: string, args: any[]): any {
    switch (functionName) {
      case 'analogRead':
        if (args[0] === this.analogPin) {
          return this.readAnalog();
        }
        return undefined;
      case 'digitalRead':
        if (args[0] === this.digitalPin) {
          return this.readDigital();
        }
        return undefined;
      case 'readMoisture':
        return this.readMoisture();
      case 'readRaw':
        return this.readRaw();
      case 'isDry':
        return this.isDry;
      case 'setThreshold':
        return this.setThreshold(args[0]);
      case 'setCalibration':
        return this.setCalibration(args[0], args[1]);
      case 'water':
        return this.water(args[0]);
      default:
        return undefined;
    }
  }
  
  getState(): Record<string, any> {
    return {
      moisture: this.moisture.toFixed(1),
      rawValue: this.rawValue,
      isDry: this.isDry,
      threshold: this.threshold,
      calibrationDry: this.calibrationDry,
      calibrationWet: this.calibrationWet,
      lastReadTime: this.lastReadTime,
      pins: {
        analog: this.analogPin,
        digital: this.digitalPin
      }
    };
  }
  
  setState(state: Record<string, any>) {
    if (state.moisture !== undefined) {
      this.moisture = Math.max(0, Math.min(100, parseFloat(state.moisture)));
      this.updateRawValue();
      this.updateDigitalOutput();
    }
    if (state.threshold !== undefined) {
      this.setThreshold(parseFloat(state.threshold));
    }
    if (state.calibrationDry !== undefined) {
      this.calibrationDry = parseInt(state.calibrationDry);
      this.updateRawValue();
    }
    if (state.calibrationWet !== undefined) {
      this.calibrationWet = parseInt(state.calibrationWet);
      this.updateRawValue();
    }
  }
  
  cleanup() {
    // No cleanup needed for soil moisture sensor
  }
  
  private readAnalog(): number {
    this.lastReadTime = Date.now();
    
    // Add some noise to make it realistic
    const noise = (Math.random() - 0.5) * 20; // ±10 ADC units noise
    return Math.max(0, Math.min(1023, this.rawValue + noise));
  }
  
  private readDigital(): number {
    this.lastReadTime = Date.now();
    return this.isDry ? 1 : 0; // High when dry (most sensors are active-low)
  }
  
  private readMoisture(): number {
    this.lastReadTime = Date.now();
    return this.moisture;
  }
  
  private readRaw(): number {
    this.lastReadTime = Date.now();
    return this.rawValue;
  }
  
  private setThreshold(threshold: number): void {
    this.threshold = Math.max(0, Math.min(100, threshold));
    this.updateDigitalOutput();
  }
  
  private setCalibration(dry: number, wet: number): void {
    this.calibrationDry = Math.max(0, Math.min(1023, dry));
    this.calibrationWet = Math.max(0, Math.min(1023, wet));
    this.updateRawValue();
  }
  
  private water(amount: number): void {
    // Simulate watering the plant
    this.moisture = Math.min(100, this.moisture + amount);
    this.updateRawValue();
    this.updateDigitalOutput();
  }
  
  private updateRawValue(): void {
    // Convert moisture percentage to ADC value
    const moistureRatio = this.moisture / 100;
    this.rawValue = Math.round(this.calibrationDry + (this.calibrationWet - this.calibrationDry) * moistureRatio);
  }
  
  private updateDigitalOutput(): void {
    this.isDry = this.moisture < this.threshold;
  }
}

// Register the device behavior
DeviceRegistry.register('soil-moisture', () => new SoilMoistureBehavior());
