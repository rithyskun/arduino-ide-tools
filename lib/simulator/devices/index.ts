/**
 * Device Registry — imports all device behaviors to auto-register them.
 * Add new device behavior imports here.
 */
import { DeviceRegistry } from '../device-driven-simulator';

// ── Existing devices ─────────────────────────────────────────────
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

// ── New devices ──────────────────────────────────────────────────
import './pir-behavior';
import './mq2-behavior';
import './ds18b20-behavior';
import './mpu6050-behavior';
import './neopixel-behavior';
import './button-behavior';
import './potentiometer-behavior';
import './oled-behavior';

export { DeviceRegistry };

// Named exports
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
export { PIRBehavior } from './pir-behavior';
export { MQ2Behavior } from './mq2-behavior';
export { DS18B20Behavior } from './ds18b20-behavior';
export { MPU6050Behavior } from './mpu6050-behavior';
export { NeoPixelBehavior } from './neopixel-behavior';
export { ButtonBehavior } from './button-behavior';
export { PotentiometerBehavior } from './potentiometer-behavior';
export { OLEDBehavior } from './oled-behavior';

export function getSupportedDeviceTypes(): string[] {
  return DeviceRegistry.getRegisteredTypes();
}

export function getDeviceCategories() {
  return [
    // ── Sensors ───────────────────────────────────────────────
    { type: 'dht22',         category: 'sensor',   description: 'DHT22 Temperature/Humidity — 2s read interval, realistic drift' },
    { type: 'bmp280',        category: 'sensor',   description: 'BMP280 Barometric Pressure/Temperature — I2C, altitude calc' },
    { type: 'hx711',         category: 'sensor',   description: 'HX711 Load Cell — 24-bit ADC, calibration, tare support' },
    { type: 'ina260',        category: 'sensor',   description: 'INA260 Power Monitor — I2C current/voltage/power' },
    { type: 'ultrasonic',    category: 'sensor',   description: 'HC-SR04 Ultrasonic — echo-based distance measurement' },
    { type: 'soil-moisture', category: 'sensor',   description: 'Soil Moisture — analog + digital output with calibration' },
    { type: 'rainmeter',     category: 'sensor',   description: 'Tipping Bucket Rain Gauge — I2C tip counting, mm output' },
    { type: 'pir',           category: 'sensor',   description: 'PIR HC-SR501 — motion detection, warmup, hold time' },
    { type: 'mq2',           category: 'sensor',   description: 'MQ-2 Gas/Smoke — analog ADC + digital threshold output' },
    { type: 'ds18b20',       category: 'sensor',   description: 'DS18B20 One-Wire Temp — multi-sensor, 12-bit, async conversion' },
    { type: 'mpu6050',       category: 'sensor',   description: 'MPU-6050 IMU — 3-axis accel + gyro via I2C, motion sim' },
    // ── Actuators ────────────────────────────────────────────
    { type: 'led',           category: 'actuator', description: 'LED — PWM brightness, RGB mode, power tracking' },
    { type: 'relay',         category: 'actuator', description: 'Relay Module — active-low, switching delay sim' },
    { type: 'servo',         category: 'actuator', description: 'Servo Motor — 0–180° angle, smooth motion, torque' },
    { type: 'buzzer',        category: 'actuator', description: 'Buzzer — tone frequency, duration, volume control' },
    { type: 'stepper',       category: 'actuator', description: 'Stepper Motor — steps, RPM, acceleration physics' },
    { type: 'neopixel',      category: 'actuator', description: 'NeoPixel WS2812B — per-pixel RGB, brightness, up to 256px' },
    // ── Displays ─────────────────────────────────────────────
    { type: 'lcd1602',       category: 'display',  description: 'LCD 16×2 — I2C, text rendering, cursor, backlight' },
    { type: 'oled',          category: 'display',  description: 'OLED SSD1306 128×64 — I2C, text/shapes, contrast' },
    // ── Inputs ───────────────────────────────────────────────
    { type: 'button',        category: 'input',    description: 'Push Button — debounced, active-HIGH or active-LOW' },
    { type: 'potentiometer', category: 'input',    description: 'Potentiometer — analog 0–1023, optional auto-sweep' },
  ];
}
