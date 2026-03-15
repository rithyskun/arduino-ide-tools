import type { Device } from '@/types';

export const DEVICES: Device[] = [
  {
    id: 'hx711',
    type: 'hx711',
    name: 'HX711 Load Cell Amp',
    category: 'sensor',
    description:
      '24-bit ADC for weight scales. Communicates via custom 2-wire protocol (DOUT + SCK).',
    icon: '⚖️',
    library: 'HX711-CUSTOM',
    headerFile: 'HX711-CUSTOM.h',
    pins: [
      { name: 'DOUT', type: 'digital', required: true },
      { name: 'SCK', type: 'digital', required: true },
      { name: 'VCC', type: 'power', required: true },
      { name: 'GND', type: 'power', required: true },
    ],
    defaultConfig: { gain: 128, calibrationFactor: -46.5 },
    stubCode: `HX711 scale(DOUT_PIN, SCK_PIN);
scale.begin();
scale.setScale(-46.5f);
float weight = scale.get_units(10); // grams`,
  },
  {
    id: 'ina260',
    type: 'ina260',
    name: 'INA260 Power Monitor',
    category: 'power',
    description: 'I2C current/voltage/power monitor. Default address 0x40.',
    icon: '⚡',
    library: 'Adafruit_INA260',
    headerFile: 'Adafruit_INA260.h',
    pins: [
      { name: 'SDA', type: 'i2c', required: true },
      { name: 'SCL', type: 'i2c', required: true },
      { name: 'VCC', type: 'power', required: true },
      { name: 'GND', type: 'power', required: true },
    ],
    defaultConfig: { i2cAddress: 0x40 },
    stubCode: `Adafruit_INA260 ina260;
ina260.begin(0x40);
float current = ina260.readCurrent();   // mA
float voltage = ina260.readBusVoltage(); // mV
float power   = ina260.readPower();      // mW`,
  },
  {
    id: 'dfrobot_rain',
    type: 'dfrobot_rain',
    name: 'DFRobot Rainfall Sensor',
    category: 'sensor',
    description:
      'I2C tipping-bucket rain gauge. Reports cumulative tips and rainfall in mm.',
    icon: '🌧️',
    library: 'DFRobot_RainfallSensor',
    headerFile: 'DFRobot_RainfallSensor.h',
    pins: [
      { name: 'SDA', type: 'i2c', required: true },
      { name: 'SCL', type: 'i2c', required: true },
      { name: 'VCC', type: 'power', required: true },
      { name: 'GND', type: 'power', required: true },
    ],
    defaultConfig: { i2cAddress: 0x1d },
    stubCode: `DFRobot_RainfallSensor_I2C rain(&Wire);
rain.begin();
uint32_t tips     = rain.getRawData();
float    rainfall = rain.getRainfall(); // mm`,
  },
  {
    id: 'pca9685_mux',
    type: 'pca9685_mux',
    name: 'PCA9685A I2C Mux',
    category: 'communication',
    description: 'I2C multiplexer / channel expander. Address 0x70.',
    icon: '🔀',
    library: 'Wire',
    headerFile: 'Wire.h',
    pins: [
      { name: 'SDA', type: 'i2c', required: true },
      { name: 'SCL', type: 'i2c', required: true },
      { name: 'VCC', type: 'power', required: true },
      { name: 'GND', type: 'power', required: true },
    ],
    defaultConfig: { i2cAddress: 0x70 },
    stubCode: `// Select channel n (0-3)
Wire.beginTransmission(0x70);
Wire.write(1 << n);
Wire.endTransmission();`,
  },
  {
    id: 'stepper_a4988',
    type: 'stepper_a4988',
    name: 'Stepper Motor (A4988)',
    category: 'motor',
    description:
      'STEP/DIR stepper driver. Uses Timer1 interrupt for precise step timing.',
    icon: '🔄',
    library: 'TimerOne',
    headerFile: 'TimerOne.h',
    pins: [
      { name: 'STEP', type: 'digital', required: true },
      { name: 'DIR', type: 'digital', required: true },
      { name: 'ENABLE', type: 'digital', required: true },
      { name: 'VCC', type: 'power', required: true },
      { name: 'GND', type: 'power', required: true },
    ],
    defaultConfig: { stepsPerRev: 200, microStep: 4, minRpm: 40, maxRpm: 300 },
    stubCode: `#include <TimerOne.h>
const int STEP_PIN = 3, DIR_PIN = 4, EN_PIN = 5;
void setup() {
  pinMode(STEP_PIN, OUTPUT);
  Timer1.initialize(625); // 120 RPM, 1/4 step
  Timer1.attachInterrupt([]{ digitalWrite(STEP_PIN, !digitalRead(STEP_PIN)); });
}`,
  },
  {
    id: 'relay_module',
    type: 'relay_module',
    name: 'Relay Module (Active-LOW)',
    category: 'input',
    description: 'Single-channel relay. Active-LOW: LOW = coil energised (ON).',
    icon: '🔌',
    library: '',
    headerFile: '',
    pins: [
      { name: 'IN', type: 'digital', required: true },
      { name: 'VCC', type: 'power', required: true },
      { name: 'GND', type: 'power', required: true },
    ],
    defaultConfig: { pin: 6, activeLow: true },
    stubCode: `pinMode(RELAY_PIN, OUTPUT);
digitalWrite(RELAY_PIN, HIGH); // OFF (active-LOW)
digitalWrite(RELAY_PIN, LOW);  // ON`,
  },
  {
    id: 'ntc_thermistor',
    type: 'ntc_thermistor',
    name: 'NTC Thermistor',
    category: 'sensor',
    description:
      '10kΩ NTC thermistor on analog pin. Use Steinhart–Hart equation for °C.',
    icon: '🌡️',
    library: '',
    headerFile: '',
    pins: [
      { name: 'OUT', type: 'analog', required: true },
      { name: 'VCC', type: 'power', required: true },
      { name: 'GND', type: 'power', required: true },
    ],
    defaultConfig: {
      pin: 0,
      nominalResistance: 10000,
      nominalTemp: 25,
      bCoefficient: 3950,
    },
    stubCode: `int raw = analogRead(A0);
float resistance = 10000.0 / (1023.0 / raw - 1);
float temp = 1.0 / (log(resistance/10000.0)/3950.0 + 1.0/298.15) - 273.15;`,
  },
  {
    id: 'dht22',
    type: 'dht22',
    name: 'DHT22 Temp/Humidity',
    category: 'sensor',
    description: 'Single-wire digital temperature and humidity sensor.',
    icon: '💧',
    library: 'DHT',
    headerFile: 'DHT.h',
    pins: [
      { name: 'DATA', type: 'digital', required: true },
      { name: 'VCC', type: 'power', required: true },
      { name: 'GND', type: 'power', required: true },
    ],
    defaultConfig: { pin: 2 },
    stubCode: `#include <DHT.h>
DHT dht(2, DHT22);
dht.begin();
float temp = dht.readTemperature();
float humi = dht.readHumidity();`,
  },
  {
    id: 'ssd1306_oled',
    type: 'ssd1306_oled',
    name: 'SSD1306 OLED 128×64',
    category: 'display',
    description: 'I2C 128×64 monochrome OLED display. Address 0x3C.',
    icon: '🖥️',
    library: 'Adafruit_SSD1306',
    headerFile: 'Adafruit_SSD1306.h',
    pins: [
      { name: 'SDA', type: 'i2c', required: true },
      { name: 'SCL', type: 'i2c', required: true },
      { name: 'VCC', type: 'power', required: true },
      { name: 'GND', type: 'power', required: true },
    ],
    defaultConfig: { i2cAddress: 0x3c, width: 128, height: 64 },
    stubCode: `#include <Adafruit_SSD1306.h>
Adafruit_SSD1306 display(128, 64, &Wire, -1);
display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
display.clearDisplay();
display.print("Hello!");
display.display();`,
  },
  {
    id: 'bmp280',
    type: 'bmp280',
    name: 'BMP280 Pressure Sensor',
    category: 'sensor',
    description: 'I2C barometric pressure and temperature sensor.',
    icon: '🌬️',
    library: 'Adafruit_BMP280',
    headerFile: 'Adafruit_BMP280.h',
    pins: [
      { name: 'SDA', type: 'i2c', required: true },
      { name: 'SCL', type: 'i2c', required: true },
      { name: 'VCC', type: 'power', required: true },
      { name: 'GND', type: 'power', required: true },
    ],
    defaultConfig: { i2cAddress: 0x76 },
    stubCode: `#include <Adafruit_BMP280.h>
Adafruit_BMP280 bmp;
bmp.begin(0x76);
float pressure = bmp.readPressure();   // Pa
float temp     = bmp.readTemperature(); // °C`,
  },
  {
    id: 'mpu6050',
    type: 'mpu6050',
    name: 'MPU-6050 IMU',
    category: 'sensor',
    description: '6-axis accelerometer + gyroscope over I2C.',
    icon: '📐',
    library: 'MPU6050',
    headerFile: 'MPU6050.h',
    pins: [
      { name: 'SDA', type: 'i2c', required: true },
      { name: 'SCL', type: 'i2c', required: true },
      { name: 'VCC', type: 'power', required: true },
      { name: 'GND', type: 'power', required: true },
    ],
    defaultConfig: { i2cAddress: 0x68 },
    stubCode: `#include <MPU6050.h>
MPU6050 mpu;
mpu.initialize();
int16_t ax, ay, az, gx, gy, gz;
mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);`,
  },
  {
    id: 'hc_sr04',
    type: 'hc_sr04',
    name: 'HC-SR04 Ultrasonic',
    category: 'sensor',
    description: 'Ultrasonic distance sensor. TRIG + ECHO pins.',
    icon: '📡',
    library: '',
    headerFile: '',
    pins: [
      { name: 'TRIG', type: 'digital', required: true },
      { name: 'ECHO', type: 'digital', required: true },
      { name: 'VCC', type: 'power', required: true },
      { name: 'GND', type: 'power', required: true },
    ],
    defaultConfig: { trigPin: 9, echoPin: 10 },
    stubCode: `pinMode(TRIG, OUTPUT); pinMode(ECHO, INPUT);
digitalWrite(TRIG, LOW); delayMicroseconds(2);
digitalWrite(TRIG, HIGH); delayMicroseconds(10);
digitalWrite(TRIG, LOW);
long duration = pulseIn(ECHO, HIGH);
float distance = duration * 0.034 / 2; // cm`,
  },
  {
    id: 'push_button',
    type: 'push_button',
    name: 'Push Button',
    category: 'input',
    description: 'Simple momentary push button with optional pull-up.',
    icon: '🔘',
    library: '',
    headerFile: '',
    pins: [
      { name: 'OUT', type: 'digital', required: true },
      { name: 'GND', type: 'power', required: true },
    ],
    defaultConfig: { pin: 2, pullUp: true },
    stubCode: `pinMode(BTN_PIN, INPUT_PULLUP);
bool pressed = digitalRead(BTN_PIN) == LOW;`,
  },
  {
    id: 'led',
    type: 'led',
    name: 'LED',
    category: 'input',
    description: 'Single LED with current-limiting resistor.',
    icon: '💡',
    library: '',
    headerFile: '',
    pins: [
      { name: 'ANODE', type: 'digital', required: true },
      { name: 'CATHODE', type: 'power', required: true },
    ],
    defaultConfig: { pin: 13 },
    stubCode: `pinMode(LED_PIN, OUTPUT);
digitalWrite(LED_PIN, HIGH); // ON`,
  },
];

export function getDeviceById(id: string): Device | undefined {
  return DEVICES.find((d) => d.id === id);
}

export function getDevicesByCategory(cat: string): Device[] {
  return DEVICES.filter((d) => d.category === cat);
}
