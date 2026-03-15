/**
 * INA260 Power Monitor Behavior
 * 
 * This device simulates an INA260 power monitor with realistic
 * voltage, current, and power readings via I2C communication.
 */

import { DeviceBehavior, DeviceRegistry } from '../device-driven-simulator';
import type { Board } from '@/types';

export class INA260Behavior implements DeviceBehavior {
  public deviceId = '';
  public deviceType = 'ina260';
  public category = 'sensor' as const;
  
  private sdaPin = 20;
  private sclPin = 21;
  private i2cAddress = 0x40;
  private voltage = 12100; // mV
  private current = 320; // mA
  private power = 3872; // mW
  private conversionTime = 858; // μs
  private averagingCount = 4;
  private lastConversionTime = 0;
  private isConverting = false;
  
  initialize(board: Board, pinMapping: Record<string, number>) {
    this.sdaPin = pinMapping['SDA'] || 20;
    this.sclPin = pinMapping['SCL'] || 21;
    this.i2cAddress = pinMapping['address'] || 0x40;
    
    // Add realistic power consumption patterns
    this.voltage = 12000 + (Math.random() - 0.5) * 200; // 12V ± 0.1V
    this.current = 300 + (Math.random() - 0.5) * 40; // 300mA ± 20mA
    this.power = Math.round((this.voltage * this.current) / 1000); // mW
  }
  
  tick(millis: number, deltaTime: number) {
    // Simulate power fluctuations
    if (Math.random() < 0.02) { // 2% chance per tick
      this.voltage += (Math.random() - 0.5) * 10; // ±5mV change
      this.current += (Math.random() - 0.5) * 5; // ±2.5mA change
      this.power = Math.round((this.voltage * this.current) / 1000);
      
      // Keep values in realistic ranges
      this.voltage = Math.max(11000, Math.min(13000, this.voltage));
      this.current = Math.max(0, Math.min(1000, this.current));
    }
    
    // Handle conversion timing
    if (this.isConverting && millis - this.lastConversionTime >= this.conversionTime / 1000) {
      this.isConverting = false;
    }
  }
  
  handleArduinoCall(functionName: string, args: any[]): any {
    switch (functionName) {
      case 'i2cWrite':
        return this.handleI2CWrite(args[0], args[1]); // address, data
      case 'i2cRead':
        return this.handleI2CRead(args[0], args[1]); // address, length
      case 'getBusVoltage':
        return this.getBusVoltage();
      case 'getCurrent':
        return this.getCurrent();
      case 'getPower':
        return this.getPower();
      case 'isConversionReady':
        return !this.isConverting;
      default:
        return undefined;
    }
  }
  
  getState(): Record<string, any> {
    return {
      voltage: (this.voltage / 1000).toFixed(2), // V
      current: (this.current / 1000).toFixed(3), // A
      power: (this.power / 1000).toFixed(2), // W
      isConverting: this.isConverting,
      conversionTime: this.conversionTime,
      averagingCount: this.averagingCount,
      i2cAddress: `0x${this.i2cAddress.toString(16).toUpperCase()}`,
      pins: {
        sda: this.sdaPin,
        scl: this.sclPin
      }
    };
  }
  
  setState(state: Record<string, any>) {
    if (state.voltage !== undefined) {
      this.voltage = parseFloat(state.voltage) * 1000; // Convert V to mV
    }
    if (state.current !== undefined) {
      this.current = parseFloat(state.current) * 1000; // Convert A to mA
    }
    // Power is calculated from voltage and current
    this.power = Math.round((this.voltage * this.current) / 1000);
  }
  
  cleanup() {
    // No cleanup needed for INA260
  }
  
  private handleI2CWrite(address: number, data: number): boolean {
    if (address !== this.i2cAddress) return false;
    
    // INA260 register handling (simplified)
    const register = (data >> 8) & 0xFF;
    const value = data & 0xFF;
    
    switch (register) {
      case 0x00: // CONFIG register
        this.handleConfigWrite(value);
        break;
      case 0x05: // CALIBRATION register
        // Handle calibration if needed
        break;
      default:
        // Other registers
        break;
    }
    
    return true;
  }
  
  private handleI2CRead(address: number, length: number): number[] {
    if (address !== this.i2cAddress) return [];
    
    // Return register values (simplified)
    const results: number[] = [];
    
    if (length >= 2) {
      // Return 16-bit values (MSB first)
      results.push(0x12); // MSB
      results.push(0x34); // LSB
    }
    
    return results;
  }
  
  private getBusVoltage(): number {
    // Return voltage in V
    return this.voltage / 1000;
  }
  
  private getCurrent(): number {
    // Return current in A
    return this.current / 1000;
  }
  
  private getPower(): number {
    // Return power in W
    return this.power / 1000;
  }
  
  private handleConfigWrite(value: number): void {
    // Handle configuration register writes
    // Bit 9-11: Conversion time
    // Bit 6-7: Averaging count
    // etc.
    this.isConverting = true;
    this.lastConversionTime = Date.now();
  }
}

// Register the device behavior
DeviceRegistry.register('ina260', () => new INA260Behavior());
