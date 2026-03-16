/**
 * Servo Motor Behavior
 * 
 * This device simulates a servo motor with realistic angle control,
 * torque characteristics, and power consumption.
 */

import { DeviceBehavior, DeviceRegistry } from '../device-driven-simulator';
import type { Board } from '@/types';

export class ServoBehavior implements DeviceBehavior {
  public deviceId = '';
  public deviceType = 'servo';
  public category = 'actuator' as const;
  
  private pin = 9;
  private angle = 90; // degrees (0-180)
  private targetAngle = 90; // degrees
  private minAngle = 0;
  private maxAngle = 180;
  private speed = 60; // degrees per second
  private isMoving = false;
  private lastUpdateTime = 0;
  private attached = false;
  private powerConsumption = 0; // mW
  private torque = 0; // kg-cm
  
  initialize(board: Board, pinMapping: Record<string, number>) {
    this.pin = pinMapping['PIN'] || 9;
    this.minAngle = pinMapping['minAngle'] || 0;
    this.maxAngle = pinMapping['maxAngle'] || 180;
    this.speed = pinMapping['speed'] || 60;
    this.torque = pinMapping['torque'] || 4.8; // Standard servo torque
    
    // Start at center position
    this.angle = 90;
    this.targetAngle = 90;
    this.attached = true;
    this.lastUpdateTime = Date.now();
    this.updatePowerConsumption();
  }
  
  tick(millis: number, deltaTime: number) {
    if (!this.attached) return;
    
    // Smooth servo movement
    if (this.angle !== this.targetAngle) {
      const angleDiff = this.targetAngle - this.angle;
      const maxMove = (this.speed * deltaTime) / 1000; // Max degrees this tick
      
      if (Math.abs(angleDiff) <= maxMove) {
        this.angle = this.targetAngle;
        this.isMoving = false;
      } else {
        this.angle += Math.sign(angleDiff) * maxMove;
        this.isMoving = true;
      }
      
      this.updatePowerConsumption();
    } else {
      this.isMoving = false;
      this.powerConsumption = 0; // No power when not moving (ideal servo)
    }
  }
  
  handleArduinoCall(functionName: string, args: any[]): any {
    switch (functionName) {
      case 'attach':
        return this.attach(args[0]);
      case 'detach':
        return this.detach();
      case 'write':
        return this.write(args[0]);
      case 'writeMicroseconds':
        return this.writeMicroseconds(args[0]);
      case 'read':
        return this.read();
      case 'attached':
        return this.attached;
      case 'isMoving':
        return this.isMoving;
      default:
        return undefined;
    }
  }
  
  getState(): Record<string, any> {
    return {
      angle: this.angle.toFixed(1),
      targetAngle: this.targetAngle,
      isMoving: this.isMoving,
      attached: this.attached,
      minAngle: this.minAngle,
      maxAngle: this.maxAngle,
      speed: this.speed,
      torque: this.torque,
      powerConsumption: this.powerConsumption.toFixed(2),
      pin: this.pin,
      pulseWidth: this.angleToPulseWidth(this.angle)
    };
  }
  
  setState(state: Record<string, any>) {
    if (state.angle !== undefined) {
      this.targetAngle = Math.max(this.minAngle, Math.min(this.maxAngle, parseFloat(state.angle)));
    }
    if (state.attached !== undefined) {
      if (state.attached) {
        this.attach(this.pin);
      } else {
        this.detach();
      }
    }
  }
  
  cleanup() {
    this.detach();
  }
  
  private attach(pin: number): void {
    this.pin = pin;
    this.attached = true;
    this.lastUpdateTime = Date.now();
  }
  
  private detach(): void {
    this.attached = false;
    this.isMoving = false;
    this.powerConsumption = 0;
  }
  
  private write(angle: number): void {
    if (!this.attached) return;
    
    this.targetAngle = Math.max(this.minAngle, Math.min(this.maxAngle, angle));
    this.isMoving = true;
    this.lastUpdateTime = Date.now();
  }
  
  private writeMicroseconds(pulseWidth: number): void {
    if (!this.attached) return;
    
    // Convert pulse width (1000-2000μs) to angle (0-180°)
    const angle = ((pulseWidth - 1000) / 1000) * 180;
    this.write(angle);
  }
  
  private read(): number {
    return this.angle;
  }
  
  private angleToPulseWidth(angle: number): number {
    // Convert angle (0-180°) to pulse width (1000-2000μs)
    return Math.round(1000 + (angle / 180) * 1000);
  }
  
  private updatePowerConsumption(): void {
    if (!this.attached || !this.isMoving) {
      this.powerConsumption = 0;
      return;
    }
    
    // Simulate servo power consumption
    // Typical servo: 500mA stall, 100mA running at 5V = 500mW stall, 100mW running
    const basePower = 100; // mW when moving
    const loadFactor = Math.abs(this.targetAngle - this.angle) / 180; // Load based on movement
    this.powerConsumption = basePower * (1 + loadFactor * 4); // Up to 5x base power under load
  }
}

// Register the device behavior
DeviceRegistry.register('servo', () => new ServoBehavior());
