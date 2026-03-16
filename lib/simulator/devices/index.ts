/**
 * Device Registry - Auto-imports all device behaviors
 * 
 * This file imports all device behaviors to register them with the DeviceRegistry.
 * New device behaviors should be added to the imports below.
 */

import { DeviceRegistry } from '../device-driven-simulator';

// Import all device behaviors to register them
import './dht22-behavior';
import './stepper-behavior';
import './lcd-behavior';
import './hx711-behavior';
import './ina260-behavior';
import './rainmeter-behavior';
import './relay-behavior';
import './bmp280-behavior';
import './ultrasonic-behavior';
import './led-behavior';
import './servo-behavior';
import './buzzer-behavior';
import './soil-moisture-behavior';

// Export registry for easy access
export { DeviceRegistry };

// Export all device behaviors for direct use if needed
export { DHT22Behavior } from './dht22-behavior';
export { StepperBehavior } from './stepper-behavior';
export { LCDBehavior } from './lcd-behavior';
export { HX711Behavior } from './hx711-behavior';
export { INA260Behavior } from './ina260-behavior';
export { RainmeterBehavior } from './rainmeter-behavior';
export { RelayBehavior } from './relay-behavior';
export { BMP280Behavior } from './bmp280-behavior';
export { UltrasonicBehavior } from './ultrasonic-behavior';
export { LEDBehavior } from './led-behavior';
export { ServoBehavior } from './servo-behavior';
export { BuzzerBehavior } from './buzzer-behavior';
export { SoilMoistureBehavior } from './soil-moisture-behavior';

// Get list of all supported device types
export function getSupportedDeviceTypes(): string[] {
  return DeviceRegistry.getRegisteredTypes();
}

// Get device categories
export function getDeviceCategories(): Array<{type: string, category: string, description: string}> {
  return [
    {
      type: 'dht22',
      category: 'sensor',
      description: 'DHT22 Temperature/Humidity Sensor - Realistic sensor readings with timing constraints'
    },
    {
      type: 'stepper',
      category: 'actuator',
      description: 'Stepper Motor - Physics-based motion with acceleration and velocity limits'
    },
    {
      type: 'lcd1602',
      category: 'display',
      description: '16x2 LCD Display - I2C communication with realistic text rendering'
    },
    {
      type: 'hx711',
      category: 'sensor',
      description: 'HX711 Load Cell Amplifier - Weight measurement with calibration and noise'
    },
    {
      type: 'ina260',
      category: 'sensor',
      description: 'INA260 Power Monitor - Voltage, current, and power monitoring via I2C'
    },
    {
      type: 'rainmeter',
      category: 'sensor',
      description: 'Rainfall Sensor - Tipping bucket rain gauge with tip counting'
    },
    {
      type: 'relay',
      category: 'actuator',
      description: 'Relay Module - Active-low relay with switching delays'
    },
    {
      type: 'bmp280',
      category: 'sensor',
      description: 'BMP280 Pressure Sensor - Barometric pressure, temperature, and altitude measurements'
    },
    {
      type: 'ultrasonic',
      category: 'sensor',
      description: 'HC-SR04 Ultrasonic Sensor - Distance measurement with realistic echo timing'
    },
    {
      type: 'led',
      category: 'actuator',
      description: 'LED - Single or RGB LED with PWM brightness control and power monitoring'
    },
    {
      type: 'servo',
      category: 'actuator',
      description: 'Servo Motor - Precise angle control with smooth movement and torque simulation'
    },
    {
      type: 'buzzer',
      category: 'actuator',
      description: 'Buzzer/Beep - Tone generation with frequency control and volume adjustment'
    },
    {
      type: 'soil-moisture',
      category: 'sensor',
      description: 'Soil Moisture Sensor - Analog and digital moisture readings with calibration'
    }
  ];
}
