/**
 * Buzzer/Beeper Behavior
 * 
 * This device simulates a buzzer with tone generation, frequency control,
 * and realistic sound characteristics.
 */

import { DeviceBehavior, DeviceRegistry } from '../device-driven-simulator';
import type { Board } from '@/types';

export class BuzzerBehavior implements DeviceBehavior {
  public deviceId = '';
  public deviceType = 'buzzer';
  public category = 'actuator' as const;
  
  private pin = 11;
  private frequency = 0; // Hz (0 = off)
  private duration = 0; // ms
  private isPlaying = false;
  private startTime = 0;
  private volume = 50; // 0-100%
  private isPWM = true; // PWM capability for tone generation
  private powerConsumption = 0; // mW
  
  initialize(board: Board, pinMapping: Record<string, number>) {
    this.pin = pinMapping['PIN'] || 11;
    this.isPWM = pinMapping['pwm'] !== 0;
    this.volume = pinMapping['volume'] || 50;
    
    // Start with buzzer off
    this.frequency = 0;
    this.duration = 0;
    this.isPlaying = false;
    this.powerConsumption = 0;
  }
  
  tick(millis: number, deltaTime: number) {
    // Check if tone should stop
    if (this.isPlaying && this.duration > 0) {
      const elapsed = millis - this.startTime;
      if (elapsed >= this.duration) {
        this.stopTone();
      }
    }
    
    // Update power consumption
    if (this.isPlaying && this.frequency > 0) {
      // Typical buzzer: 15-30mA at 5V = 75-150mW
      const basePower = 100; // mW
      const volumeFactor = this.volume / 100;
      const frequencyFactor = Math.min(1.5, this.frequency / 1000); // Higher freq uses more power
      this.powerConsumption = basePower * volumeFactor * frequencyFactor;
    } else {
      this.powerConsumption = 0;
    }
  }
  
  handleArduinoCall(functionName: string, args: any[]): any {
    switch (functionName) {
      case 'tone':
        return this.tone(args[0], args[1], args[2]); // pin, frequency, duration
      case 'noTone':
        return this.noTone(args[0]);
      case 'digitalWrite':
        if (args[0] === this.pin) {
          this.handleDigitalWrite(args[1]);
        }
        return undefined;
      case 'analogWrite':
        if (args[0] === this.pin && this.isPWM) {
          this.handleAnalogWrite(args[1]);
        }
        return undefined;
      case 'digitalRead':
        if (args[0] === this.pin) {
          return this.isPlaying ? 1 : 0;
        }
        return undefined;
      case 'playTone':
        return this.playTone(args[0], args[1]);
      case 'stopTone':
        return this.stopTone();
      case 'setVolume':
        return this.setVolume(args[0]);
      case 'isPlaying':
        return this.isPlaying;
      default:
        return undefined;
    }
  }
  
  getState(): Record<string, any> {
    return {
      frequency: this.frequency,
      duration: this.duration,
      isPlaying: this.isPlaying,
      volume: this.volume,
      isPWM: this.isPWM,
      powerConsumption: this.powerConsumption.toFixed(2),
      pin: this.pin,
      timeRemaining: this.isPlaying && this.duration > 0 ? Math.max(0, this.duration - (Date.now() - this.startTime)) : 0
    };
  }
  
  setState(state: Record<string, any>) {
    if (state.frequency !== undefined) {
      this.frequency = parseFloat(state.frequency);
      this.isPlaying = this.frequency > 0;
    }
    if (state.volume !== undefined) {
      this.setVolume(parseFloat(state.volume));
    }
    if (state.isPlaying !== undefined && !state.isPlaying) {
      this.stopTone();
    }
  }
  
  cleanup() {
    this.stopTone();
  }
  
  private tone(pin: number, frequency: number, duration?: number): void {
    if (pin !== this.pin) return;
    
    this.frequency = Math.max(0, frequency);
    this.duration = duration || 0;
    this.startTime = Date.now();
    this.isPlaying = this.frequency > 0;
  }
  
  private noTone(pin: number): void {
    if (pin !== this.pin) return;
    this.stopTone();
  }
  
  private handleDigitalWrite(pinState: number): void {
    if (pinState === 1) {
      // Digital on - play default tone (440Hz A note)
      this.playTone(440, 0);
    } else {
      this.stopTone();
    }
  }
  
  private handleAnalogWrite(value: number): void {
    // Use PWM value to control volume/frequency
    if (value === 0) {
      this.stopTone();
    } else {
      // Map PWM value to frequency (255 = 2000Hz, 1 = 100Hz)
      this.frequency = Math.round(100 + (value / 255) * 1900);
      this.isPlaying = true;
      this.duration = 0; // Continuous
    }
  }
  
  private playTone(frequency: number, duration: number): void {
    this.frequency = Math.max(0, frequency);
    this.duration = duration;
    this.startTime = Date.now();
    this.isPlaying = this.frequency > 0;
  }
  
  private stopTone(): void {
    this.frequency = 0;
    this.duration = 0;
    this.isPlaying = false;
    this.powerConsumption = 0;
  }
  
  private setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(100, volume));
  }
}

// Register the device behavior
DeviceRegistry.register('buzzer', () => new BuzzerBehavior());
