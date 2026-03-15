/**
 * Relay Module Behavior
 * 
 * This device simulates a relay module with active-low control
 * and realistic switching characteristics.
 */

import { DeviceBehavior, DeviceRegistry } from '../device-driven-simulator';
import type { Board } from '@/types';

export class RelayBehavior implements DeviceBehavior {
  public deviceId = '';
  public deviceType = 'relay';
  public category = 'actuator' as const;
  
  private inPin = 22;
  private state = false; // Relay state (true = on, false = off)
  private activeLow = true; // Most relay modules are active-low
  private switchTime = 10; // ms switching time
  private lastSwitchTime = 0;
  private isSwitching = false;
  
  initialize(board: Board, pinMapping: Record<string, number>) {
    this.inPin = pinMapping['IN'] || 22;
    this.state = false; // Start with relay off
    this.lastSwitchTime = Date.now();
  }
  
  tick(millis: number, deltaTime: number) {
    // Handle switching delay
    if (this.isSwitching && millis - this.lastSwitchTime >= this.switchTime) {
      this.isSwitching = false;
    }
  }
  
  handleArduinoCall(functionName: string, args: any[]): any {
    switch (functionName) {
      case 'digitalWrite':
        if (args[0] === this.inPin) {
          this.setRelayState(args[1]);
        }
        return undefined;
      case 'digitalRead':
        if (args[0] === this.inPin) {
          return this.activeLow ? (this.state ? 0 : 1) : (this.state ? 1 : 0);
        }
        return undefined;
      case 'on':
        return this.turnOn();
      case 'off':
        return this.turnOff();
      case 'toggle':
        return this.toggle();
      case 'getState':
        return this.state;
      case 'isSwitching':
        return this.isSwitching;
      default:
        return undefined;
    }
  }
  
  getState(): Record<string, any> {
    return {
      state: this.state,
      isSwitching: this.isSwitching,
      activeLow: this.activeLow,
      switchTime: this.switchTime,
      pin: this.inPin,
      pinState: this.activeLow ? (this.state ? 0 : 1) : (this.state ? 1 : 0)
    };
  }
  
  setState(state: Record<string, any>) {
    if (state.state !== undefined) {
      this.setRelayState(state.state);
    }
  }
  
  cleanup() {
    // Turn off relay on cleanup
    this.turnOff();
  }
  
  private setRelayState(pinState: number): void {
    const targetState = this.activeLow ? (pinState === 0) : (pinState === 1);
    
    if (targetState !== this.state) {
      this.state = targetState;
      this.lastSwitchTime = Date.now();
      this.isSwitching = true;
    }
  }
  
  private turnOn(): void {
    if (!this.state) {
      this.state = true;
      this.lastSwitchTime = Date.now();
      this.isSwitching = true;
    }
  }
  
  private turnOff(): void {
    if (this.state) {
      this.state = false;
      this.lastSwitchTime = Date.now();
      this.isSwitching = true;
    }
  }
  
  private toggle(): void {
    this.state = !this.state;
    this.lastSwitchTime = Date.now();
    this.isSwitching = true;
  }
}

// Register the device behavior
DeviceRegistry.register('relay', () => new RelayBehavior());
