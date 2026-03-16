/**
 * Device-Driven Simulator Architecture
 * 
 * This simulator is completely driven by the devices selected in the project.
 * Each device has its own behavior, physics, and response to user code.
 * The simulation adapts dynamically based on what devices are actually present.
 */

import type { Project, DeviceInstance, Board } from '@/types';
import type { SimCallbacks } from './engine';

// ── Device Behavior Interface ───────────────────────────────────────
export interface DeviceBehavior {
  deviceId: string;
  deviceType: string;
  category: 'sensor' | 'actuator' | 'communication' | 'power' | 'storage' | 'display' | 'input';
  
  // Device initialization
  initialize(board: Board, pinMapping: Record<string, number>): void;
  
  // Simulation tick (called every simulation cycle)
  tick(millis: number, deltaTime: number): void;
  
  // Handle Arduino function calls from user code
  handleArduinoCall(functionName: string, args: any[]): any;
  
  // Get device state for UI display
  getState(): Record<string, any>;
  
  // Set device state from UI controls
  setState(state: Record<string, any>): void;
  
  // Device cleanup
  cleanup(): void;
}

// ── Device Registry ───────────────────────────────────────────────
export class DeviceRegistry {
  private static deviceBehaviors = new Map<string, () => DeviceBehavior>();
  
  static register(deviceType: string, behaviorFactory: () => DeviceBehavior) {
    this.deviceBehaviors.set(deviceType, behaviorFactory);
  }
  
  static create(deviceType: string): DeviceBehavior | null {
    const factory = this.deviceBehaviors.get(deviceType);
    return factory ? factory() : null;
  }
  
  static getRegisteredTypes(): string[] {
    return Array.from(this.deviceBehaviors.keys());
  }
}

// ── Device-Driven Simulator ───────────────────────────────────────
export class DeviceDrivenSimulator {
  private devices: DeviceBehavior[] = [];
  private board: Board | null = null;
  private running = false;
  private speedMult = 5;
  private lastRealTime = 0;
  private accumMs = 0;
  private handle: ReturnType<typeof setTimeout> | null = null;
  private cb: SimCallbacks;
  private millis = 0;
  private pinStates: Record<number, number> = {};
  private analogStates: Record<number, number> = {};
  
  constructor(private project: Project, cb: SimCallbacks) {
    this.cb = cb;
    this.initializeFromProject();
  }
  
  private initializeFromProject() {
    // Find the board
    // In a real implementation, you'd have a board registry
    this.board = {
      id: this.project.boardId,
      name: 'Arduino Board',
      mcu: 'ATmega328P',
      fcpu: 16000000,
      flashKB: 32,
      ramKB: 2,
      eepromKB: 1,
      pins: [],
      analogPins: [0, 1, 2, 3, 4, 5],
      uartPins: [{ tx: 1, rx: 0 }],
      i2cPins: [{ sda: 18, scl: 19 }],
      spiPins: [{ mosi: 11, miso: 12, sck: 13, ss: 10 }],
      icon: '🎯'
    };
    
    this.cb.onSerial(`<Inf> Device-driven simulator initializing for project: ${this.project.name}`);
    
    // Load devices from project
    const devicesFile = this.project.files.find(f => f.name === '__devices.json');
    if (devicesFile) {
      try {
        const deviceInstances: DeviceInstance[] = JSON.parse(devicesFile.content);
        this.cb.onSerial(`<Inf> Found ${deviceInstances.length} devices in project`);
        
        deviceInstances.forEach(instance => {
          this.cb.onSerial(`<Inf> Creating device: ${instance.deviceType} (${instance.label})`);
          
          const behavior = DeviceRegistry.create(instance.deviceType);
          if (behavior) {
            // Set the device ID to the instance ID for tracking
            Object.defineProperty(behavior, 'deviceId', {
              value: instance.instanceId,
              writable: false
            });
            
            behavior.initialize(this.board!, instance.pinMapping);
            this.devices.push(behavior);
            
            this.cb.onSerial(`<Inf> ✓ Initialized: ${instance.label} (${instance.deviceType})`);
          } else {
            this.cb.onSerial(`<Warn> ✗ Unknown device type: ${instance.deviceType}`);
            this.cb.onSerial(`<Inf> Available device types: ${DeviceRegistry.getRegisteredTypes().join(', ')}`);
          }
        });
      } catch (error) {
        this.cb.onSerial(`<Err> Failed to load devices: ${error}`);
      }
    } else {
      this.cb.onSerial(`<Inf> No devices file found (__devices.json)`);
    }
    
    this.cb.onSerial(`<Inf> Device-driven simulator ready with ${this.devices.length} devices`);
  }
  
  start() {
    if (this.running) return;
    this.running = true;
    this.lastRealTime = Date.now();
    this.bootSequence();
    this.tick();
  }
  
  stop() {
    this.running = false;
    if (this.handle) {
      clearTimeout(this.handle);
      this.handle = null;
    }
    this.devices.forEach(device => device.cleanup());
    this.cb.onStop();
  }
  
  reset() {
    this.stop();
    this.millis = 0;
    this.pinStates = {};
    this.analogStates = {};
    this.devices = [];
    this.initializeFromProject();
  }
  
  setSpeed(mult: number) {
    this.speedMult = mult;
  }
  
  setInputs(inputs: any) {
    // Forward inputs to relevant devices
    this.devices.forEach(device => {
      if (device.category === 'sensor') {
        device.setState(inputs);
      }
    });
  }
  
  setPin(pin: number, val: number) {
    this.pinStates[pin] = val;
    this.cb.onPinChange(pin, val);
    
    // Notify devices of pin change
    this.devices.forEach(device => {
      device.handleArduinoCall('pinChange', [pin, val]);
    });
  }
  
  sendSerial(cmd: string) {
    this.cb.onSerial(`<TX> ${cmd}`);
    
    // Let communication devices handle serial data
    this.devices.forEach(device => {
      if (device.category === 'communication') {
        device.handleArduinoCall('serialData', [cmd]);
      }
    });
  }
  
  private bootSequence() {
    this.cb.onSerial('<Inf> Arduino starting...');
    this.cb.onSerial('<Inf> Device-driven simulation booting...');
    
    // Initialize each device
    this.devices.forEach(device => {
      try {
        device.initialize(this.board!, {});
      } catch (error) {
        this.cb.onSerial(`<Err> Failed to initialize ${device.deviceType}: ${error}`);
      }
    });
    
    this.cb.onSerial(`<Inf> Ready with ${this.devices.length} active devices`);
  }
  
  private tick() {
    if (!this.running) return;
    
    const now = Date.now();
    const realDelta = now - this.lastRealTime;
    this.lastRealTime = now;
    this.accumMs += realDelta * this.speedMult;
    
    while (this.accumMs >= 10) {
      this.millis += 10;
      this.accumMs -= 10;
      
      // Tick all devices
      this.devices.forEach(device => {
        try {
          device.tick(this.millis, 10);
        } catch (error) {
          this.cb.onSerial(`<Err> Device ${device.deviceType} tick failed: ${error}`);
        }
      });
    }
    
    this.cb.onMillisUpdate(this.millis);
    this.handle = setTimeout(() => this.tick(), 16);
  }
  
  // Arduino function interceptors
  digitalWrite(pin: number, val: number) {
    this.setPin(pin, val);
    
    // Let devices handle the digitalWrite
    this.devices.forEach(device => {
      device.handleArduinoCall('digitalWrite', [pin, val]);
    });
  }
  
  digitalRead(pin: number): number {
    // Ask devices for pin state
    for (const device of this.devices) {
      const result = device.handleArduinoCall('digitalRead', [pin]);
      if (result !== undefined) return result;
    }
    
    return this.pinStates[pin] ?? 0;
  }
  
  analogWrite(pin: number, val: number) {
    this.analogStates[pin] = val;
    this.cb.onAnalogChange(pin, val);
    
    // Let devices handle the analogWrite
    this.devices.forEach(device => {
      device.handleArduinoCall('analogWrite', [pin, val]);
    });
  }
  
  analogRead(pin: number): number {
    // Ask devices for analog value
    for (const device of this.devices) {
      const result = device.handleArduinoCall('analogRead', [pin]);
      if (result !== undefined) return result;
    }
    
    return this.analogStates[pin] ?? 512;
  }
  
  // Get combined device states for UI
  getDeviceStates(): Record<string, any> {
    const states: Record<string, any> = {};
    this.devices.forEach(device => {
      states[device.deviceId] = device.getState();
    });
    return states;
  }
}
