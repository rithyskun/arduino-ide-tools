/**
 * MPU-6050 6-axis IMU Behavior (I2C)
 * Simulates accelerometer (±2g default) and gyroscope (±250°/s default).
 */
import { DeviceBehavior, DeviceRegistry } from '../device-driven-simulator';
import type { Board } from '@/types';

export class MPU6050Behavior implements DeviceBehavior {
  public deviceId = '';
  public deviceType = 'mpu6050';
  public category = 'sensor' as const;

  private i2cAddr = 0x68;
  // Accelerometer raw (±2g → 16384 LSB/g)
  private ax = 0; private ay = 0; private az = 16384; // flat, Z = 1g
  // Gyroscope raw (±250°/s → 131 LSB/°/s)
  private gx = 0; private gy = 0; private gz = 0;
  // Temperature
  private temp = 25.0;
  private initialized = false;
  private simulateMotion = false;
  private motionPhase = 0;

  initialize(board: Board, pinMapping: Record<string, number>) {
    this.i2cAddr = pinMapping['addr'] ?? 0x68;
    this.simulateMotion = !!(pinMapping['simulateMotion'] ?? 1);
    this.initialized = false;
  }

  tick(millis: number, dt: number) {
    if (!this.initialized) return;
    this.motionPhase += dt * 0.001; // rads/s

    if (this.simulateMotion) {
      // Simulate gentle tilt and vibration
      this.ax = Math.round(1000 * Math.sin(this.motionPhase * 0.3));
      this.ay = Math.round(800 * Math.cos(this.motionPhase * 0.2));
      this.az = Math.round(16384 + 500 * Math.sin(this.motionPhase * 0.7));
      this.gx = Math.round(200 * Math.sin(this.motionPhase));
      this.gy = Math.round(150 * Math.cos(this.motionPhase * 1.3));
      this.gz = Math.round(80 * Math.sin(this.motionPhase * 0.5));
    }

    // Add sensor noise
    this.ax += Math.round((Math.random()-0.5) * 20);
    this.ay += Math.round((Math.random()-0.5) * 20);
    this.gx += Math.round((Math.random()-0.5) * 5);

    // Temperature drift
    this.temp += (Math.random()-0.5) * 0.02;
    this.temp = Math.max(20, Math.min(40, this.temp));
  }

  handleArduinoCall(fn: string, _args: unknown[]): unknown {
    switch (fn) {
      case 'begin': this.initialized = true; return true;
      case 'initialize': this.initialized = true; return undefined;
      case 'testConnection': return this.initialized ? 1 : 0;
      case 'getAcceleration': return { x: this.ax, y: this.ay, z: this.az };
      case 'getRotation': return { x: this.gx, y: this.gy, z: this.gz };
      case 'getAccelerationX': return this.ax;
      case 'getAccelerationY': return this.ay;
      case 'getAccelerationZ': return this.az;
      case 'getRotationX': return this.gx;
      case 'getRotationY': return this.gy;
      case 'getRotationZ': return this.gz;
      case 'getTemperature': return Math.round(this.temp * 340 + 36530); // raw temp register
      default: return undefined;
    }
  }

  getState() {
    const scale = 16384;
    return {
      ax: this.ax, ay: this.ay, az: this.az,
      gx: this.gx, gy: this.gy, gz: this.gz,
      accelX_g: parseFloat((this.ax / scale).toFixed(3)),
      accelY_g: parseFloat((this.ay / scale).toFixed(3)),
      accelZ_g: parseFloat((this.az / scale).toFixed(3)),
      gyroX_dps: parseFloat((this.gx / 131).toFixed(2)),
      gyroY_dps: parseFloat((this.gy / 131).toFixed(2)),
      gyroZ_dps: parseFloat((this.gz / 131).toFixed(2)),
      temperature: parseFloat(this.temp.toFixed(1)),
      initialized: this.initialized,
      i2cAddr: '0x' + this.i2cAddr.toString(16).toUpperCase(),
    };
  }

  setState(s: Record<string, unknown>) {
    if (s.ax !== undefined) this.ax = Number(s.ax);
    if (s.ay !== undefined) this.ay = Number(s.ay);
    if (s.az !== undefined) this.az = Number(s.az);
  }

  cleanup() { this.initialized = false; }
}

DeviceRegistry.register('mpu6050', () => new MPU6050Behavior());
