/**
 * LED Behavior
 * 
 * This device simulates an LED with PWM brightness control, color support,
 * and realistic power consumption characteristics.
 */

import { DeviceBehavior, DeviceRegistry } from '../device-driven-simulator';
import type { Board } from '@/types';

export class LEDBehavior implements DeviceBehavior {
  public deviceId = '';
  public deviceType = 'led';
  public category = 'actuator' as const;
  
  private pin = 13;
  private brightness = 0; // 0-255
  private state = false; // On/off state
  private pwm = true; // PWM capability
  private color = { r: 255, g: 255, b: 255 }; // RGB color (for RGB LEDs)
  private isRGB = false; // Whether this is an RGB LED
  private powerConsumption = 0; // mW
  
  initialize(board: Board, pinMapping: Record<string, number>) {
    this.pin = pinMapping['PIN'] || 13;
    this.pwm = pinMapping['pwm'] !== 0; // Default to PWM enabled (0 = false, non-zero = true)
    this.isRGB = pinMapping['isRGB'] === 1;
    
    if (this.isRGB) {
      this.pin = pinMapping['RED'] || 9;
      // RGB LEDs have multiple pins
    }
    
    // Start with LED off
    this.brightness = 0;
    this.state = false;
    this.updatePowerConsumption();
  }
  
  tick(millis: number, deltaTime: number) {
    // Simulate LED behavior
    if (this.state && this.brightness > 0) {
      // LED is on, calculate power consumption
      this.updatePowerConsumption();
    } else {
      this.powerConsumption = 0;
    }
  }
  
  handleArduinoCall(functionName: string, args: any[]): any {
    switch (functionName) {
      case 'digitalWrite':
        if (args[0] === this.pin) {
          this.handleDigitalWrite(args[1]);
        }
        return undefined;
      case 'analogWrite':
        if (args[0] === this.pin) {
          this.handleAnalogWrite(args[1]);
        }
        return undefined;
      case 'digitalRead':
        if (args[0] === this.pin) {
          return this.state ? 1 : 0;
        }
        return undefined;
      case 'on':
        return this.turnOn();
      case 'off':
        return this.turnOff();
      case 'setBrightness':
        return this.setBrightness(args[0]);
      case 'getBrightness':
        return this.brightness;
      case 'setColor':
        return this.setColor(args[0], args[1], args[2]);
      case 'getState':
        return this.state;
      case 'getPowerConsumption':
        return this.powerConsumption;
      default:
        return undefined;
    }
  }
  
  getState(): Record<string, any> {
    return {
      state: this.state,
      brightness: this.brightness,
      brightnessPercent: Math.round((this.brightness / 255) * 100),
      pwm: this.pwm,
      isRGB: this.isRGB,
      color: this.isRGB ? this.color : undefined,
      powerConsumption: this.powerConsumption.toFixed(2),
      pin: this.pin,
      pinState: this.state ? 1 : 0
    };
  }
  
  setState(state: Record<string, any>) {
    if (state.state !== undefined) {
      this.state = state.state;
      this.brightness = this.state ? 255 : 0;
      this.updatePowerConsumption();
    }
    if (state.brightness !== undefined) {
      this.setBrightness(parseInt(state.brightness));
    }
    if (state.color !== undefined && this.isRGB) {
      this.setColor(state.color.r, state.color.g, state.color.b);
    }
  }
  
  cleanup() {
    // Turn off LED on cleanup
    this.turnOff();
  }
  
  private handleDigitalWrite(pinState: number): void {
    if (this.pwm) {
      // For PWM pins, digitalWrite sets full brightness
      this.state = pinState === 1;
      this.brightness = this.state ? 255 : 0;
    } else {
      // For non-PWM pins, just on/off
      this.state = pinState === 1;
      this.brightness = this.state ? 255 : 0;
    }
    this.updatePowerConsumption();
  }
  
  private handleAnalogWrite(value: number): void {
    if (this.pwm) {
      this.brightness = Math.max(0, Math.min(255, value));
      this.state = this.brightness > 0;
      this.updatePowerConsumption();
    }
  }
  
  private turnOn(): void {
    this.state = true;
    this.brightness = 255;
    this.updatePowerConsumption();
  }
  
  private turnOff(): void {
    this.state = false;
    this.brightness = 0;
    this.powerConsumption = 0;
  }
  
  private setBrightness(brightness: number): void {
    this.brightness = Math.max(0, Math.min(255, brightness));
    this.state = this.brightness > 0;
    this.updatePowerConsumption();
  }
  
  private setColor(r: number, g: number, b: number): void {
    if (this.isRGB) {
      this.color = {
        r: Math.max(0, Math.min(255, r)),
        g: Math.max(0, Math.min(255, g)),
        b: Math.max(0, Math.min(255, b))
      };
    }
  }
  
  private updatePowerConsumption(): void {
    if (this.state && this.brightness > 0) {
      // Simulate LED power consumption (typical LED: 20mA at 5V = 100mW)
      const basePower = 100; // mW at full brightness
      const brightnessRatio = this.brightness / 255;
      
      if (this.isRGB) {
        // RGB LED consumes more power
        this.powerConsumption = basePower * 3 * brightnessRatio; // 3 LEDs
      } else {
        this.powerConsumption = basePower * brightnessRatio;
      }
    } else {
      this.powerConsumption = 0;
    }
  }
}

// Register the device behavior
DeviceRegistry.register('led', () => new LEDBehavior());
