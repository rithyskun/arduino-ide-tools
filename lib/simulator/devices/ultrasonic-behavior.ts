/**
 * HC-SR04 Ultrasonic Sensor Behavior
 * 
 * This device simulates an HC-SR04 ultrasonic distance sensor with realistic
 * distance measurements, timing, and echo characteristics.
 */

import { DeviceBehavior, DeviceRegistry } from '../device-driven-simulator';
import type { Board } from '@/types';

export class UltrasonicBehavior implements DeviceBehavior {
  public deviceId = '';
  public deviceType = 'ultrasonic';
  public category = 'sensor' as const;
  
  private trigPin = 7;
  private echoPin = 8;
  private distance = 100.0; // cm
  private maxDistance = 400.0; // cm (HC-SR04 max range)
  private minDistance = 2.0; // cm (HC-SR04 min range)
  private lastTriggerTime = 0;
  private triggerInterval = 60; // ms minimum between measurements
  private isTriggered = false;
  private echoDuration = 0; // μs
  private soundSpeed = 343.0; // m/s at 20°C
  
  initialize(board: Board, pinMapping: Record<string, number>) {
    this.trigPin = pinMapping['TRIG'] || 7;
    this.echoPin = pinMapping['ECHO'] || 8;
    this.maxDistance = pinMapping['maxDistance'] || 400.0;
    this.minDistance = pinMapping['minDistance'] || 2.0;
    
    // Add realistic initial distance
    this.distance = 50 + Math.random() * 200; // Random distance 50-250cm
    this.updateEchoDuration();
  }
  
  tick(millis: number, deltaTime: number) {
    // Simulate distance changes (moving objects)
    if (Math.random() < 0.05) { // 5% chance per tick
      this.distance += (Math.random() - 0.5) * 10; // ±5cm change
      this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance));
      this.updateEchoDuration();
    }
    
    // Reset trigger state after interval
    if (this.isTriggered && millis - this.lastTriggerTime >= this.triggerInterval) {
      this.isTriggered = false;
    }
  }
  
  handleArduinoCall(functionName: string, args: any[]): any {
    switch (functionName) {
      case 'digitalWrite':
        if (args[0] === this.trigPin) {
          this.handleTrigger(args[1]);
        }
        return undefined;
      case 'digitalRead':
        if (args[0] === this.echoPin) {
          return this.readEcho();
        }
        return undefined;
      case 'pulseIn':
        if (args[0] === this.echoPin) {
          return this.pulseIn();
        }
        return undefined;
      case 'readDistance':
        return this.readDistance();
      case 'setDistance':
        return this.setDistance(args[0]);
      default:
        return undefined;
    }
  }
  
  getState(): Record<string, any> {
    return {
      distance: this.distance.toFixed(1),
      echoDuration: this.echoDuration,
      maxDistance: this.maxDistance,
      minDistance: this.minDistance,
      isTriggered: this.isTriggered,
      soundSpeed: this.soundSpeed,
      pins: {
        trig: this.trigPin,
        echo: this.echoPin
      }
    };
  }
  
  setState(state: Record<string, any>) {
    if (state.distance !== undefined) {
      this.distance = parseFloat(state.distance);
      this.updateEchoDuration();
    }
    if (state.soundSpeed !== undefined) {
      this.soundSpeed = parseFloat(state.soundSpeed);
      this.updateEchoDuration();
    }
  }
  
  cleanup() {
    // No cleanup needed for ultrasonic sensor
  }
  
  private handleTrigger(pinState: number): void {
    if (pinState === 1 && !this.isTriggered) {
      this.isTriggered = true;
      this.lastTriggerTime = Date.now();
      this.updateEchoDuration();
    }
  }
  
  private readEcho(): number {
    if (this.isTriggered) {
      // Simulate echo pulse timing
      const now = Date.now();
      const timeSinceTrigger = now - this.lastTriggerTime;
      
      // Echo goes high after a short delay, then low after echo duration
      if (timeSinceTrigger < 1) {
        return 0; // Initial delay
      } else if (timeSinceTrigger < this.echoDuration / 1000) {
        return 1; // Echo pulse active
      } else {
        return 0; // Echo pulse ended
      }
    }
    return 0;
  }
  
  private pulseIn(): number {
    // Simulate pulseIn function
    if (this.isTriggered) {
      return this.echoDuration; // Return echo duration in microseconds
    }
    return 0;
  }
  
  private readDistance(): number {
    return this.distance; // cm
  }
  
  private setDistance(distance: number): void {
    this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, distance));
    this.updateEchoDuration();
  }
  
  private updateEchoDuration(): void {
    // Calculate echo duration based on distance
    // Sound travels to object and back, so divide by 2
    const distanceMeters = this.distance / 100; // Convert cm to m
    const travelTimeSeconds = (distanceMeters * 2) / this.soundSpeed;
    this.echoDuration = Math.round(travelTimeSeconds * 1000000); // Convert to microseconds
    
    // Add some noise to make it realistic
    this.echoDuration += Math.round((Math.random() - 0.5) * 100); // ±50μs noise
  }
}

// Register the device behavior
DeviceRegistry.register('ultrasonic', () => new UltrasonicBehavior());
