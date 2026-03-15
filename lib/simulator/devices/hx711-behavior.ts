/**
 * HX711 Load Cell Amplifier Behavior
 * 
 * This device simulates an HX711 load cell amplifier with realistic
 * weight readings, calibration, and noise characteristics.
 */

import { DeviceBehavior, DeviceRegistry } from '../device-driven-simulator';
import type { Board } from '@/types';

export class HX711Behavior implements DeviceBehavior {
  public deviceId = '';
  public deviceType = 'hx711';
  public category = 'sensor' as const;
  
  private dtPin = 3;
  private sckPin = 4;
  private calibrationFactor = 1000.0;
  private offset = 0.0;
  private currentWeight = 500.0;
  private rawValue = 8589934;
  private isReady = true;
  private lastReadTime = 0;
  private readInterval = 100; // HX711 can read quickly
  
  initialize(board: Board, pinMapping: Record<string, number>) {
    this.dtPin = pinMapping['DT'] || 3;
    this.sckPin = pinMapping['SCK'] || 4;
    
    // Load calibration from config
    if (this.calibrationFactor === 0) this.calibrationFactor = 1000.0;
    
    // Add some realistic noise to the weight
    this.currentWeight += (Math.random() - 0.5) * 2.0; // ±1g noise
    this.rawValue = Math.round(this.currentWeight * this.calibrationFactor + this.offset);
  }
  
  tick(millis: number, deltaTime: number) {
    // Simulate small weight fluctuations (environmental noise, drift)
    if (Math.random() < 0.05) { // 5% chance per tick
      this.currentWeight += (Math.random() - 0.5) * 0.5; // ±0.25g change
      this.rawValue = Math.round(this.currentWeight * this.calibrationFactor + this.offset);
    }
    
    // HX711 is always ready after initialization
    this.isReady = true;
  }
  
  handleArduinoCall(functionName: string, args: any[]): any {
    switch (functionName) {
      case 'read':
        return this.read();
      case 'is_ready':
        return this.isReady;
      case 'tare':
        return this.tare();
      case 'set_calibration_factor':
        return this.setCalibrationFactor(args[0]);
      case 'set_offset':
        return this.setOffset(args[0]);
      case 'get_units':
        return this.getUnits(args[0]); // times argument
      case 'digitalRead':
        if (args[0] === this.dtPin) {
          return this.isReady ? 1 : 0; // DT high when ready
        }
        return undefined;
      case 'digitalWrite':
        if (args[0] === this.sckPin) {
          // Handle SCK pulses for reading (simplified)
          this.handleSCKPulse(args[1]);
        }
        return undefined;
      default:
        return undefined;
    }
  }
  
  getState(): Record<string, any> {
    return {
      weight: this.currentWeight.toFixed(1),
      raw: this.rawValue,
      calibrationFactor: this.calibrationFactor.toFixed(2),
      offset: this.offset.toFixed(0),
      isReady: this.isReady,
      pins: {
        dt: this.dtPin,
        sck: this.sckPin
      }
    };
  }
  
  setState(state: Record<string, any>) {
    if (state.weight !== undefined) {
      this.currentWeight = parseFloat(state.weight);
      this.rawValue = Math.round(this.currentWeight * this.calibrationFactor + this.offset);
    }
    if (state.calibrationFactor !== undefined) {
      this.calibrationFactor = parseFloat(state.calibrationFactor);
    }
    if (state.offset !== undefined) {
      this.offset = parseFloat(state.offset);
    }
  }
  
  cleanup() {
    // No cleanup needed for HX711
  }
  
  private read(): number {
    if (!this.isReady) return 0;
    
    // Simulate reading process
    this.lastReadTime = Date.now();
    this.isReady = false;
    
    // Add some noise to the reading
    const noise = (Math.random() - 0.5) * 100; // ±50 raw units noise
    const reading = this.rawValue + noise;
    
    // Simulate HX711 becoming ready again after a short delay
    setTimeout(() => {
      this.isReady = true;
    }, 10);
    
    return reading;
  }
  
  private tare(): void {
    this.offset = this.rawValue;
    this.currentWeight = 0;
  }
  
  private setCalibrationFactor(factor: number): void {
    this.calibrationFactor = factor;
    // Recalculate current weight with new factor
    this.currentWeight = (this.rawValue - this.offset) / this.calibrationFactor;
  }
  
  private setOffset(offset: number): void {
    this.offset = offset;
    this.currentWeight = (this.rawValue - this.offset) / this.calibrationFactor;
  }
  
  private getUnits(times: number = 1): number {
    let sum = 0;
    for (let i = 0; i < times; i++) {
      sum += this.read();
    }
    return (sum / times - this.offset) / this.calibrationFactor;
  }
  
  private handleSCKPulse(value: number): void {
    // Simplified SCK handling - in reality this would be more complex
    // For simulation purposes, we just acknowledge the pulse
    if (value === 0) {
      // SCK falling edge - could trigger read process
    }
  }
}

// Register the device behavior
DeviceRegistry.register('hx711', () => new HX711Behavior());
