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
  // ── New devices ──────────────────────────────────────────────────
  {
    id: 'pir',
    type: 'pir',
    name: 'PIR Motion Sensor',
    category: 'sensor',
    description: 'HC-SR501 passive infrared motion sensor. Digital HIGH when motion detected. 30s warmup.',
    icon: '👁️',
    library: '',
    headerFile: '',
    pins: [
      { name: 'OUT', type: 'digital', required: true },
      { name: 'VCC', type: 'power', required: true },
      { name: 'GND', type: 'power', required: true },
    ],
    defaultConfig: { holdMs: 5000 },
    stubCode: `int pirState = digitalRead(PIR_PIN); // HIGH = motion\nif (pirState == HIGH) { Serial.println("Motion!"); }`,
  },
  {
    id: 'mq2',
    type: 'mq2',
    name: 'MQ-2 Gas/Smoke Sensor',
    category: 'sensor',
    description: 'Analog gas sensor for LPG, smoke, CO, methane. AO = analog level, DO = threshold.',
    icon: '💨',
    library: '',
    headerFile: '',
    pins: [
      { name: 'AO', type: 'analog', required: true },
      { name: 'DO', type: 'digital', required: false },
      { name: 'VCC', type: 'power', required: true },
      { name: 'GND', type: 'power', required: true },
    ],
    defaultConfig: { threshold: 400 },
    stubCode: `int gasLevel = analogRead(MQ2_AO_PIN);\nif (gasLevel > 400) { Serial.println("Gas detected!"); }`,
  },
  {
    id: 'ds18b20',
    type: 'ds18b20',
    name: 'DS18B20 Temperature Sensor',
    category: 'sensor',
    description: 'One-Wire digital temperature sensor. ±0.5°C accuracy, -55 to +125°C range.',
    icon: '🌡️',
    library: 'DallasTemperature',
    headerFile: 'DallasTemperature.h',
    pins: [
      { name: 'DATA', type: 'digital', required: true },
      { name: 'VCC', type: 'power', required: true },
      { name: 'GND', type: 'power', required: true },
    ],
    defaultConfig: { count: 1 },
    stubCode: `#include <OneWire.h>\n#include <DallasTemperature.h>\nOneWire oneWire(DATA_PIN);\nDallasTemperature sensors(&oneWire);\nsensors.begin();\nsensors.requestTemperatures();\nfloat tempC = sensors.getTempCByIndex(0);`,
  },
  {
    id: 'mpu6050',
    type: 'mpu6050',
    name: 'MPU-6050 IMU',
    category: 'sensor',
    description: '6-axis IMU: 3-axis accelerometer + 3-axis gyroscope via I2C (0x68).',
    icon: '🎯',
    library: 'MPU6050',
    headerFile: 'MPU6050.h',
    pins: [
      { name: 'SDA', type: 'i2c', required: true },
      { name: 'SCL', type: 'i2c', required: true },
      { name: 'VCC', type: 'power', required: true },
      { name: 'GND', type: 'power', required: true },
    ],
    defaultConfig: { addr: 0x68, simulateMotion: 1 },
    stubCode: `#include <MPU6050.h>\nMPU6050 mpu;\nmpu.initialize();\nint16_t ax, ay, az, gx, gy, gz;\nmpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);`,
  },
  {
    id: 'neopixel',
    type: 'neopixel',
    name: 'NeoPixel LED Strip',
    category: 'actuator',
    description: 'WS2812B addressable RGB LEDs. Control individual pixels via Adafruit NeoPixel library.',
    icon: '🌈',
    library: 'Adafruit_NeoPixel',
    headerFile: 'Adafruit_NeoPixel.h',
    pins: [
      { name: 'DIN', type: 'digital', required: true },
      { name: 'VCC', type: 'power', required: true },
      { name: 'GND', type: 'power', required: true },
    ],
    defaultConfig: { count: 8 },
    stubCode: `#include <Adafruit_NeoPixel.h>\nAdafruit_NeoPixel strip(8, DIN_PIN, NEO_GRB + NEO_KHZ800);\nstrip.begin();\nstrip.setPixelColor(0, strip.Color(255, 0, 0)); // red\nstrip.show();`,
  },
  {
    id: 'oled',
    type: 'oled',
    name: 'OLED Display SSD1306',
    category: 'display',
    description: '128×64 OLED display via I2C (0x3C). Uses Adafruit_SSD1306 library.',
    icon: '🖥️',
    library: 'Adafruit_SSD1306',
    headerFile: 'Adafruit_SSD1306.h',
    pins: [
      { name: 'SDA', type: 'i2c', required: true },
      { name: 'SCL', type: 'i2c', required: true },
      { name: 'VCC', type: 'power', required: true },
      { name: 'GND', type: 'power', required: true },
    ],
    defaultConfig: { addr: 0x3C, width: 128, height: 64 },
    stubCode: `#include <Adafruit_SSD1306.h>\nAdafruit_SSD1306 display(128, 64, &Wire, -1);\ndisplay.begin(SSD1306_SWITCHCAPVCC, 0x3C);\ndisplay.clearDisplay();\ndisplay.setTextSize(1);\ndisplay.setCursor(0, 0);\ndisplay.println("Hello!");\ndisplay.display();`,
  },
  {
    id: 'button',
    type: 'button',
    name: 'Push Button',
    category: 'input',
    description: 'Momentary push button. Active-LOW with INPUT_PULLUP (most common wiring).',
    icon: '🔘',
    library: '',
    headerFile: '',
    pins: [
      { name: 'PIN', type: 'digital', required: true },
      { name: 'GND', type: 'power', required: true },
    ],
    defaultConfig: { activeLow: 1 },
    stubCode: `pinMode(BUTTON_PIN, INPUT_PULLUP);\nint state = digitalRead(BUTTON_PIN); // LOW when pressed`,
  },
  {
    id: 'potentiometer',
    type: 'potentiometer',
    name: 'Potentiometer',
    category: 'input',
    description: '10kΩ potentiometer. Returns 0–1023 on analog pin. Drag slider in simulator to adjust.',
    icon: '🎛️',
    library: '',
    headerFile: '',
    pins: [
      { name: 'AO', type: 'analog', required: true },
      { name: 'VCC', type: 'power', required: true },
      { name: 'GND', type: 'power', required: true },
    ],
    defaultConfig: { initialValue: 512 },
    stubCode: `int value = analogRead(POT_PIN); // 0–1023\nfloat voltage = value * (5.0 / 1023.0);`,
  },
];

export function getDeviceById(id: string): Device | undefined {
  return DEVICES.find((d) => d.id === id);
}

export function getDevicesByCategory(cat: string): Device[] {
  return DEVICES.filter((d) => d.category === cat);
}