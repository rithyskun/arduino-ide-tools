/**
 * DHT22 Temperature/Humidity Sensor Behavior
 * 
 * This device simulates a DHT22 sensor with realistic timing and data patterns.
 * It responds to user code calls and provides temperature/humidity readings.
 */

import { DeviceBehavior, DeviceRegistry } from '../device-driven-simulator';
import type { Board } from '@/types';

export class DHT22Behavior implements DeviceBehavior {
  public deviceId = '';
  public deviceType = 'dht22';
  public category = 'sensor' as const;
  
  private pin = 2;
  private lastReadTime = 0;
  private readInterval = 2000; // DHT22 requires 2 seconds between reads
  private temperature = 25.0;
  private humidity = 60.0;
  private isReading = false;
  private readStartTime = 0;
  
  initialize(board: Board, pinMapping: Record<string, number>) {
    this.pin = pinMapping['DATA'] || 2;
    this.generateRandomReadings(); // Start with realistic values
  }
  
  tick(millis: number, deltaTime: number) {
    // Simulate slow temperature/humidity changes
    if (Math.random() < 0.01) { // 1% chance per tick
      this.temperature += (Math.random() - 0.5) * 0.5; // ±0.5°C change
      this.humidity += (Math.random() - 0.5) * 2.0; // ±2% change
      
      // Keep values in realistic ranges
      this.temperature = Math.max(-40, Math.min(80, this.temperature));
      this.humidity = Math.max(0, Math.min(100, this.humidity));
    }
    
    // Handle ongoing read operation
    if (this.isReading && millis - this.readStartTime >= 50) { // DHT22 takes ~50ms to read
      this.isReading = false;
      this.lastReadTime = millis;
    }
  }
  
  handleArduinoCall(functionName: string, args: any[]): any {
    switch (functionName) {
      case 'readTemperature':
        return this.readTemperature();
      case 'readHumidity':
        return this.readHumidity();
      case 'begin':
        return true; // DHT22 initialization always succeeds
      default:
        return undefined;
    }
  }
  
  getState(): Record<string, any> {
    return {
      temperature: this.temperature.toFixed(1),
      humidity: this.humidity.toFixed(1),
      lastReadTime: this.lastReadTime,
      isReading: this.isReading,
      pin: this.pin
    };
  }
  
  setState(state: Record<string, any>) {
    if (state.temperature !== undefined) this.temperature = parseFloat(state.temperature);
    if (state.humidity !== undefined) this.humidity = parseFloat(state.humidity);
  }
  
  cleanup() {
    // No cleanup needed for DHT22
  }
  
  private readTemperature(): number | null {
    if (this.isReading) return null; // Can't read while reading
    if (Date.now() - this.lastReadTime < this.readInterval) return null; // Too soon
    
    this.isReading = true;
    this.readStartTime = Date.now();
    
    // Return the cached value immediately (real DHT22 would return after reading)
    return this.temperature;
  }
  
  private readHumidity(): number | null {
    if (this.isReading) return null; // Can't read while reading
    if (Date.now() - this.lastReadTime < this.readInterval) return null; // Too soon
    
    this.isReading = true;
    this.readStartTime = Date.now();
    
    // Return the cached value immediately
    return this.humidity;
  }
  
  private generateRandomReadings() {
    // Generate realistic initial readings
    this.temperature = 20 + Math.random() * 15; // 20-35°C
    this.humidity = 40 + Math.random() * 40; // 40-80%
  }
}

// Register the device behavior
DeviceRegistry.register('dht22', () => new DHT22Behavior());
