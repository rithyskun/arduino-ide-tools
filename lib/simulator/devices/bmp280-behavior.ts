/**
 * BMP280 Pressure Sensor Behavior
 * 
 * This device simulates a BMP280 barometric pressure sensor with realistic
 * pressure, temperature, and altitude calculations.
 */

import { DeviceBehavior, DeviceRegistry } from '../device-driven-simulator';
import type { Board } from '@/types';

export class BMP280Behavior implements DeviceBehavior {
  public deviceId = '';
  public deviceType = 'bmp280';
  public category = 'sensor' as const;
  
  private sdaPin = 20;
  private sclPin = 21;
  private i2cAddress = 0x76;
  private pressure = 101325; // Pa (sea level)
  private temperature = 20.0; // °C
  private altitude = 0.0; // meters
  private humidity = 50.0; // % (for BMP280/BME280)
  private isBME280 = false; // BME280 has humidity
  private lastReadTime = 0;
  private readInterval = 1000; // 1 second between reads
  
  initialize(board: Board, pinMapping: Record<string, number>) {
    this.sdaPin = pinMapping['SDA'] || 20;
    this.sclPin = pinMapping['SCL'] || 21;
    this.i2cAddress = pinMapping['address'] || 0x76;
    
    // Add realistic initial values
    this.pressure = 101325 + (Math.random() - 0.5) * 1000; // ±500 Pa variation
    this.temperature = 20.0 + (Math.random() - 0.5) * 5; // ±2.5°C variation
    this.calculateAltitude();
    
    // Check if this is BME280 (has humidity) based on address
    this.isBME280 = this.i2cAddress === 0x76 || this.i2cAddress === 0x77;
  }
  
  tick(millis: number, deltaTime: number) {
    // Simulate atmospheric pressure changes (weather patterns)
    if (Math.random() < 0.01) { // 1% chance per tick
      this.pressure += (Math.random() - 0.5) * 50; // ±25 Pa change
      this.calculateAltitude();
    }
    
    // Temperature fluctuations
    if (Math.random() < 0.02) { // 2% chance per tick
      this.temperature += (Math.random() - 0.5) * 0.5; // ±0.25°C change
    }
    
    // Humidity changes (BME280 only)
    if (this.isBME280 && Math.random() < 0.02) {
      this.humidity += (Math.random() - 0.5) * 2; // ±1% change
      this.humidity = Math.max(0, Math.min(100, this.humidity));
    }
  }
  
  handleArduinoCall(functionName: string, args: any[]): any {
    switch (functionName) {
      case 'i2cWrite':
        return this.handleI2CWrite(args[0], args[1]);
      case 'i2cRead':
        return this.handleI2CRead(args[0], args[1]);
      case 'readPressure':
        return this.readPressure();
      case 'readTemperature':
        return this.readTemperature();
      case 'readAltitude':
        return this.readAltitude();
      case 'readHumidity':
        return this.readHumidity();
      case 'begin':
        return true; // Always successful
      case 'setSampling':
        return true; // Accept any sampling settings
      default:
        return undefined;
    }
  }
  
  getState(): Record<string, any> {
    return {
      pressure: (this.pressure / 100).toFixed(2), // hPa
      temperature: this.temperature.toFixed(2), // °C
      altitude: this.altitude.toFixed(1), // meters
      humidity: this.isBME280 ? this.humidity.toFixed(1) : 'N/A',
      isBME280: this.isBME280,
      i2cAddress: `0x${this.i2cAddress.toString(16).toUpperCase()}`,
      pins: {
        sda: this.sdaPin,
        scl: this.sclPin
      }
    };
  }
  
  setState(state: Record<string, any>) {
    if (state.pressure !== undefined) {
      this.pressure = parseFloat(state.pressure) * 100; // Convert hPa to Pa
      this.calculateAltitude();
    }
    if (state.temperature !== undefined) {
      this.temperature = parseFloat(state.temperature);
    }
    if (state.altitude !== undefined) {
      this.altitude = parseFloat(state.altitude);
      // Recalculate pressure based on altitude
      this.pressure = 101325 * Math.pow(1 - this.altitude / 44330, 5.255);
    }
    if (state.humidity !== undefined && this.isBME280) {
      this.humidity = parseFloat(state.humidity);
    }
  }
  
  cleanup() {
    // No cleanup needed for BMP280
  }
  
  private handleI2CWrite(address: number, data: number): boolean {
    if (address !== this.i2cAddress) return false;
    
    // BMP280 register handling (simplified)
    const register = (data >> 8) & 0xFF;
    const value = data & 0xFF;
    
    switch (register) {
      case 0xF4: // CTRL_MEAS register
        this.lastReadTime = Date.now();
        break;
      case 0xF5: // CONFIG register
        // Handle configuration
        break;
      default:
        // Other registers
        break;
    }
    
    return true;
  }
  
  private handleI2CRead(address: number, length: number): number[] {
    if (address !== this.i2cAddress) return [];
    
    // Return sensor data (simplified)
    const results: number[] = [];
    
    if (length >= 3) {
      // Return pressure data (MSB, LSB, XLSB)
      const pressureRaw = Math.round(this.pressure);
      results.push((pressureRaw >> 16) & 0xFF);
      results.push((pressureRaw >> 8) & 0xFF);
      results.push(pressureRaw & 0xFF);
    }
    
    if (length >= 6) {
      // Return temperature data (MSB, LSB)
      const tempRaw = Math.round(this.temperature * 100);
      results.push((tempRaw >> 8) & 0xFF);
      results.push(tempRaw & 0xFF);
    }
    
    return results;
  }
  
  private readPressure(): number {
    return this.pressure; // Pa
  }
  
  private readTemperature(): number {
    return this.temperature; // °C
  }
  
  private readAltitude(): number {
    return this.altitude; // meters
  }
  
  private readHumidity(): number {
    return this.isBME280 ? this.humidity : 0;
  }
  
  private calculateAltitude(): void {
    // Calculate altitude from pressure using barometric formula
    this.altitude = 44330 * (1 - Math.pow(this.pressure / 101325, 0.1903));
  }
}

// Register the device behavior
DeviceRegistry.register('bmp280', () => new BMP280Behavior());
