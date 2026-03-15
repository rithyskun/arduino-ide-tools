/**
 * Stepper Motor Behavior
 * 
 * This device simulates a stepper motor with realistic physics.
 * It responds to step commands and maintains position/velocity.
 */

import { DeviceBehavior, DeviceRegistry } from '../device-driven-simulator';
import type { Board } from '@/types';

export class StepperBehavior implements DeviceBehavior {
  public deviceId = '';
  public deviceType = 'stepper';
  public category = 'actuator' as const;
  
  private stepPin = 3;
  private dirPin = 4;
  private enablePin = 5;
  private position = 0; // Current position in steps
  private targetPosition = 0;
  private velocity = 0; // Steps per second
  private maxVelocity = 1000; // Max steps per second
  private acceleration = 500; // Steps per second²
  private enabled = false;
  private direction = 1; // 1 for forward, -1 for reverse
  private lastStepTime = 0;
  private stepInterval = 0;
  
  initialize(board: Board, pinMapping: Record<string, number>) {
    this.stepPin = pinMapping['STEP'] || 3;
    this.dirPin = pinMapping['DIR'] || 4;
    this.enablePin = pinMapping['ENABLE'] || 5;
  }
  
  tick(millis: number, deltaTime: number) {
    if (!this.enabled) return;
    
    const dt = deltaTime / 1000.0; // Convert to seconds
    
    // Calculate desired velocity based on target position
    const positionError = this.targetPosition - this.position;
    let desiredVelocity = Math.max(-this.maxVelocity, Math.min(this.maxVelocity, positionError * 10));
    
    // Apply acceleration limits
    const velocityError = desiredVelocity - this.velocity;
    const maxVelocityChange = this.acceleration * dt;
    
    if (Math.abs(velocityError) <= maxVelocityChange) {
      this.velocity = desiredVelocity;
    } else {
      this.velocity += Math.sign(velocityError) * maxVelocityChange;
    }
    
    // Update position
    this.position += this.velocity * dt;
    
    // Generate step pulses if moving
    if (Math.abs(this.velocity) > 0.1) {
      const stepPeriod = 1000.0 / Math.abs(this.velocity); // ms per step
      if (millis - this.lastStepTime >= stepPeriod) {
        this.lastStepTime = millis;
        this.position += Math.sign(this.velocity);
        // Step pulse would be generated here
      }
    }
  }
  
  handleArduinoCall(functionName: string, args: any[]): any {
    switch (functionName) {
      case 'step':
        this.step(args[0]); // args[0] = number of steps
        break;
      case 'setSpeed':
        this.setSpeed(args[0]); // args[0] = RPM
        break;
      case 'digitalWrite':
        const pin = args[0];
        const value = args[1];
        if (pin === this.stepPin) {
          // Handle step pulse
          if (value === 1 && this.enabled) {
            this.position += this.direction;
          }
        } else if (pin === this.dirPin) {
          // Handle direction change
          this.direction = value === 1 ? 1 : -1;
        } else if (pin === this.enablePin) {
          // Handle enable/disable
          this.enabled = value === 0; // Usually active-low
        }
        break;
      default:
        return undefined;
    }
  }
  
  getState(): Record<string, any> {
    return {
      position: Math.round(this.position),
      targetPosition: Math.round(this.targetPosition),
      velocity: this.velocity.toFixed(1),
      enabled: this.enabled,
      direction: this.direction,
      rpm: Math.abs(this.velocity * 60 / 200).toFixed(1), // Assuming 200 steps/rev
      pins: {
        step: this.stepPin,
        dir: this.dirPin,
        enable: this.enablePin
      }
    };
  }
  
  setState(state: Record<string, any>) {
    if (state.targetPosition !== undefined) {
      this.targetPosition = parseInt(state.targetPosition);
    }
    if (state.enabled !== undefined) {
      this.enabled = Boolean(state.enabled);
    }
  }
  
  cleanup() {
    // Disable motor on cleanup
    this.enabled = false;
  }
  
  private step(steps: number) {
    this.targetPosition += steps;
  }
  
  private setSpeed(rpm: number) {
    // Convert RPM to steps per second
    const stepsPerSecond = (rpm * 200) / 60; // Assuming 200 steps/rev
    this.velocity = Math.sign(this.velocity) * Math.min(this.maxVelocity, stepsPerSecond);
  }
}

// Register the device behavior
DeviceRegistry.register('stepper', () => new StepperBehavior());
