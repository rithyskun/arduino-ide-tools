/**
 * Rainfall Sensor Behavior
 * 
 * This device simulates a rainfall sensor (tipping bucket rain gauge)
 * with realistic tip counting and rainfall calculations.
 */

import { DeviceBehavior, DeviceRegistry } from '../device-driven-simulator';
import type { Board } from '@/types';

export class RainmeterBehavior implements DeviceBehavior {
  public deviceId = '';
  public deviceType = 'rainmeter';
  public category = 'sensor' as const;
  
  private tipPin = 9;
  private tipCount = 0;
  private calibration = 0.2794; // mm per tip (standard)
  private rainfall = 0.0;
  private lastTipTime = 0;
  private tipInterval = 1000; // Minimum time between tips (ms)
  private isTipping = false;
  
  initialize(board: Board, pinMapping: Record<string, number>) {
    this.tipPin = pinMapping['TIP'] || 9;
    this.tipCount = 0;
    this.rainfall = 0.0;
    this.lastTipTime = Date.now();
  }
  
  tick(millis: number, deltaTime: number) {
    // Simulate random rainfall events
    if (Math.random() < 0.001) { // 0.1% chance per tick (simulating light rain)
      this.addTip();
    }
    
    // Reset tipping state after debounce
    if (this.isTipping && millis - this.lastTipTime >= 100) {
      this.isTipping = false;
    }
  }
  
  handleArduinoCall(functionName: string, args: any[]): any {
    switch (functionName) {
      case 'digitalRead':
        if (args[0] === this.tipPin) {
          return this.isTipping ? 0 : 1; // Active low when tipping
        }
        return undefined;
      case 'attachInterrupt':
        // Handle interrupt attachment for tip counting
        if (args[1] && args[1].toString().includes('tip')) {
          // Simulate interrupt callback
          this.addTip();
        }
        return true;
      case 'getTipCount':
        return this.tipCount;
      case 'getRainfall':
        return this.rainfall;
      case 'reset':
        return this.reset();
      case 'setCalibration':
        return this.setCalibration(args[0]);
      case 'addTip':
        return this.addTip();
      default:
        return undefined;
    }
  }
  
  getState(): Record<string, any> {
    return {
      tipCount: this.tipCount,
      rainfall: this.rainfall.toFixed(2),
      calibration: this.calibration.toFixed(4),
      isTipping: this.isTipping,
      tipInterval: this.tipInterval,
      pin: this.tipPin
    };
  }
  
  setState(state: Record<string, any>) {
    if (state.tipCount !== undefined) {
      this.tipCount = parseInt(state.tipCount);
      this.rainfall = this.tipCount * this.calibration;
    }
    if (state.rainfall !== undefined) {
      this.rainfall = parseFloat(state.rainfall);
      this.tipCount = Math.round(this.rainfall / this.calibration);
    }
    if (state.calibration !== undefined) {
      this.calibration = parseFloat(state.calibration);
      this.rainfall = this.tipCount * this.calibration;
    }
  }
  
  cleanup() {
    // No cleanup needed for rainmeter
  }
  
  private addTip(): void {
    const now = Date.now();
    
    // Prevent too rapid tipping (debounce)
    if (now - this.lastTipTime < this.tipInterval) {
      return;
    }
    
    this.tipCount++;
    this.rainfall = this.tipCount * this.calibration;
    this.lastTipTime = now;
    this.isTipping = true;
    
    // Simulate the tip pulse duration
    setTimeout(() => {
      this.isTipping = false;
    }, 50);
  }
  
  private reset(): void {
    this.tipCount = 0;
    this.rainfall = 0.0;
    this.lastTipTime = Date.now();
    this.isTipping = false;
  }
  
  private setCalibration(calibration: number): void {
    this.calibration = calibration;
    this.rainfall = this.tipCount * this.calibration;
  }
}

// Register the device behavior
DeviceRegistry.register('rainmeter', () => new RainmeterBehavior());
