import type { ProjectFile } from '@/types';

/**
 * Minimal demo sketch loaded into every new project.
 * Users import or write their own files — this is just a starting point.
 */
export const DEMO_PROJECT_FILES: ProjectFile[] = [
  {
    name: 'main.ino',
    language: 'cpp',
    modified: false,
    readonly: false,
    content: `// ── ArduinoSim Demo Sketch ───────────────────────────────────
// Replace this with your own code, or import your .ino / .h files
// using the "Import Files" button in the toolbar.

const int LED_PIN     = 13;   // built-in LED on most boards
const int BLINK_MS    = 500;  // blink interval
unsigned long lastMs  = 0;
bool ledState         = false;

void setup() {
  Serial.begin(9600);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("<Inf> ArduinoSim ready.");
  Serial.println("<Inf> Edit main.ino or import your project files.");
}

void loop() {
  unsigned long now = millis();

  // Non-blocking blink
  if (now - lastMs >= BLINK_MS) {
    lastMs   = now;
    ledState = !ledState;
    digitalWrite(LED_PIN, ledState ? HIGH : LOW);
    Serial.print("<Data> millis=");
    Serial.print(now);
    Serial.print(", led=");
    Serial.println(ledState ? "ON" : "OFF");
  }
}
`,
  },
];

// Keep the old name as an alias so any remaining references compile
// (they will be cleaned up — this just prevents hard build errors)
export const DEFAULT_PROJECT_FILES = DEMO_PROJECT_FILES;

// ─────────────────────────────────────────────────────────────────
// Sample demo sketches — shown in guest/demo IDE for new users
// ─────────────────────────────────────────────────────────────────
export interface DemoSketch {
  id: string;
  name: string;
  board: string;
  description: string;
  tags: string[];
  files: ProjectFile[];
}

export const DEMO_SKETCHES: DemoSketch[] = [
  // ── 1. Blink ──────────────────────────────────────────────────
  {
    id: 'blink',
    name: 'LED Blink',
    board: 'arduino-uno',
    description:
      'Classic Hello World — blink the built-in LED and print status to Serial.',
    tags: ['starter', 'led'],
    files: [
      {
        name: 'main.ino',
        language: 'cpp',
        modified: false,
        readonly: false,
        content: `// LED Blink — starter sketch
const int LED_PIN = 13;
const long BLINK_MS = 500;
unsigned long lastMs = 0;
bool ledState = false;

void setup() {
  Serial.begin(9600);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("<Inf> LED Blink ready.");
}

void loop() {
  unsigned long now = millis();
  if (now - lastMs >= BLINK_MS) {
    lastMs = now;
    ledState = !ledState;
    digitalWrite(LED_PIN, ledState ? HIGH : LOW);
    Serial.print("<Data> t="); Serial.print(now);
    Serial.print(", led="); Serial.println(ledState ? "ON" : "OFF");
  }
}
`,
      },
    ],
  },

  // ── 2. Environmental Monitor ───────────────────────────────────
  {
    id: 'env-monitor',
    name: 'Environmental Monitor',
    board: 'arduino-mega',
    description:
      'HX711 scales + INA260 power + DFRobot rainfall + NTC thermistors. CSV report every 5s.',
    tags: ['mega', 'hx711', 'ina260', 'sensors', 'i2c'],
    files: [
      {
        name: 'main.ino',
        language: 'cpp',
        modified: false,
        readonly: false,
        content: `// Environmental Monitor — Arduino MEGA
// Reads 3 HX711 scales, INA260, 2 rainfall sensors, 5 NTC thermistors
// Reports CSV every 5 seconds. Serial commands: SS: SF: Tare SetScale: ReadRaw:
#include <Wire.h>
#include <EEPROM.h>
#include "config.h"
#include "Adafruit_INA260.h"
#include "DFRobot_RainfallSensor.h"
#include "HX711-CUSTOM.h"
#include "stepper.h"
#include "pca_mux.h"
#include "eeprom_store.h"
#include "command_handler.h"

HX711 scale0, scale1, scale2;
HX711 scales[NUM_SCALES] = {scale0, scale1, scale2};
float scale_calibration_factor[NUM_SCALES] = {
  SCALE0_DEFAULT_FACTOR, SCALE1_DEFAULT_FACTOR, SCALE2_DEFAULT_FACTOR
};
Adafruit_INA260 ina260;
DFRobot_RainfallSensor_I2C rainmeter1(&Wire), rainmeter2(&Wire);
DFRobot_RainfallSensor_I2C rainmeters[2] = {rainmeter1, rainmeter2};
unsigned long motor_speed = 0;
bool motor_running = false;
float target_flow = 0;
unsigned long last_time = 0;
bool prev_state_switch = LOW;

void setup() {
  pinMode(SWITCH_VCC_PIN, OUTPUT); digitalWrite(SWITCH_VCC_PIN, HIGH);
  pinMode(SWITCH_GND_PIN, OUTPUT); digitalWrite(SWITCH_GND_PIN, LOW);
  pinMode(SWITCH_READ_PIN, INPUT);
  Wire.begin(); Wire.setClock(I2C_CLOCK_HZ);
  Serial.begin(SERIAL_BAUD);
  Serial.println("<Inf> Arduino starting...");
  for (int i = 0; i < NUM_SCALES; i++) {
    pca_select_verbose(i); scales[i].begin(); delay(200);
    scales[i].setScale(scale_calibration_factor[i]);
  }
  eeprom_load() ? Serial.println("<Inf> EEPROM loaded.") : Serial.println("<Inf> Using defaults.");
  for (int i = 0; i < 2; i++) { pca_select_verbose(i); rainmeters[i].begin(); }
  pinMode(RELAY1_PIN, OUTPUT); digitalWrite(RELAY1_PIN, HIGH);
  pinMode(RELAY2_PIN, OUTPUT); digitalWrite(RELAY2_PIN, HIGH);
  ina260.begin();
  Timer1.initialize(STEP_INTERVAL_US); Timer1.attachInterrupt(toggle_step); Timer1.stop();
  Serial.println("<Inf> Ready."); last_time = millis();
}

void loop() {
  bool sw = digitalRead(SWITCH_READ_PIN);
  if (sw != prev_state_switch) { prev_state_switch = sw; motor_running = !motor_running; set_motor_speed(motor_running ? motor_speed : 0); }
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\\n'); cmd.trim();
    if (cmd.startsWith("SS:"))       handle_set_speed(cmd.substring(3));
    else if (cmd.startsWith("SF:")) handle_set_flow(cmd.substring(3));
    else if (cmd.startsWith("Tare:")) handle_tare_single(cmd.substring(5));
    else if (cmd == "Tare")          handle_tare();
    else if (cmd.startsWith("SetScale:")) handle_set_scale(cmd.substring(9));
    else if (cmd.startsWith("ReadRaw:")) handle_read_raw(cmd.substring(8));
    else if (cmd == "Relay1_ON") handle_relay1(true); else if (cmd == "Relay1_OFF") handle_relay1(false);
    else if (cmd == "Relay2_ON") handle_relay2(true); else if (cmd == "Relay2_OFF") handle_relay2(false);
    else { Serial.print("<Err> Unknown: "); Serial.println(cmd); }
  }
  if (millis() - last_time >= REPORT_INTERVAL_MS) {
    last_time = millis();
    for (int i = 0; i < NUM_NTC; i++) { Serial.print(analogRead(NTC_PINS[i])); Serial.print(","); }
    for (int i = 0; i < NUM_SCALES; i++) { pca_select(i); Serial.print(scales[i].get_value(1)); Serial.print(","); }
    for (int i = 0; i < 2; i++) { pca_select(i); Serial.print(rainmeters[i].getRawData()); Serial.print(","); }
    Serial.print(ina260.readCurrent(),2); Serial.print(",");
    Serial.print(ina260.readBusVoltage(),2); Serial.print(",");
    Serial.print(ina260.readPower(),2); Serial.print(",");
    Serial.print(motor_running ? "true" : "false"); Serial.print(",");
    Serial.print(motor_speed); Serial.print(",");
    Serial.print(digitalRead(RELAY1_PIN)==LOW?"ON":"OFF"); Serial.print(",");
    Serial.println(target_flow,2);
  }
}
`,
      },
    ],
  },

  // ── 3. Stepper Flow Controller ─────────────────────────────────
  {
    id: 'stepper-flow',
    name: 'Stepper Flow Control',
    board: 'arduino-mega',
    description:
      'Timer1 ISR drives STEP pin at precise µs intervals. SS: sets RPM, derives flow rate from linear model.',
    tags: ['stepper', 'timer1', 'motor', 'flow'],
    files: [
      {
        name: 'main.ino',
        language: 'cpp',
        modified: false,
        readonly: false,
        content: `// Stepper Flow Controller
// SS:<rpm> to set speed (40–300 RPM)
// Switch on Pin 15 to enable/disable motor
#include <TimerOne.h>
const int STEP_PIN=3, DIR_PIN=4, ENABLE_PIN=5, SWITCH_PIN=15;
const unsigned long MIN_RPM=40, MAX_RPM=300, STEPS_PER_REV=200, MICROSTEP=4;
const float FLOW_M=0.0359f, FLOW_C=0.18f;
unsigned long motorRpm=0; bool motorRunning=false, prevSw=false;
unsigned long lastPrint=0; float targetFlow=0;

void toggleStep(){ digitalWrite(STEP_PIN,!digitalRead(STEP_PIN)); }

void setSpeed(unsigned long rpm){
  if(rpm==0){ digitalWrite(ENABLE_PIN,HIGH); Timer1.stop(); Serial.println("<Inf> Motor stopped."); return; }
  if(rpm<MIN_RPM||rpm>MAX_RPM){ Serial.println("<Err> RPM out of range"); return; }
  digitalWrite(ENABLE_PIN,LOW);
  Timer1.initialize((60UL*1000000UL)/(rpm*STEPS_PER_REV*MICROSTEP*2UL));
  Timer1.start();
  Serial.print("<Inf> Motor speed set to: "); Serial.println(rpm);
}

void setup(){
  Serial.begin(9600);
  pinMode(STEP_PIN,OUTPUT); pinMode(DIR_PIN,OUTPUT);
  pinMode(ENABLE_PIN,OUTPUT); pinMode(SWITCH_PIN,INPUT);
  digitalWrite(ENABLE_PIN,LOW); digitalWrite(DIR_PIN,HIGH);
  Timer1.initialize(62500); Timer1.attachInterrupt(toggleStep); Timer1.stop();
  Serial.println("<Inf> Stepper flow controller ready. Commands: SS:<rpm> SF:<L/h>");
  prevSw=digitalRead(SWITCH_PIN);
}

void loop(){
  bool sw=digitalRead(SWITCH_PIN);
  if(sw!=prevSw){ prevSw=sw; motorRunning=!motorRunning; setSpeed(motorRunning?motorRpm:0); }
  if(Serial.available()){
    String cmd=Serial.readStringUntil('\\n'); cmd.trim();
    if(cmd.startsWith("SS:")){ motorRpm=cmd.substring(3).toInt(); if(motorRunning) setSpeed(motorRpm); else{ Serial.print("<Inf> Speed stored: "); Serial.println(motorRpm); }}
    else if(cmd.startsWith("SF:")){ targetFlow=cmd.substring(3).toFloat(); Serial.print("<Inf> Target flow: "); Serial.println(targetFlow,2); }
    else { Serial.print("<Err> Unknown: "); Serial.println(cmd); }
  }
  if(millis()-lastPrint>=1000){
    lastPrint=millis();
    float flow=motorRunning?FLOW_M*motorRpm+FLOW_C:0;
    Serial.print("<Data> t="); Serial.print(millis());
    Serial.print(", rpm="); Serial.print(motorRunning?motorRpm:0);
    Serial.print(", flow="); Serial.print(flow,3); Serial.println(" L/h");
  }
}
`,
      },
    ],
  },

  // ── 4. I2C Scanner ─────────────────────────────────────────────
  {
    id: 'i2c-scanner',
    name: 'I2C Bus Scanner',
    board: 'arduino-mega',
    description:
      'Scans all I2C addresses and reports found devices. Try it in the simulator — finds INA260, PCA9685A, and rainfall sensors.',
    tags: ['i2c', 'diagnostic', 'scanner'],
    files: [
      {
        name: 'main.ino',
        language: 'cpp',
        modified: false,
        readonly: false,
        content: `// I2C Bus Scanner
// Scans 0x08–0x77 and reports responding devices.
// In ArduinoSim finds: 0x40 INA260, 0x70 PCA9685A, 0x1D/0x1E rainfall
#include <Wire.h>

void scan(){
  int n=0;
  for(byte a=8;a<120;a++){
    Wire.beginTransmission(a);
    byte e=Wire.endTransmission();
    if(e==0){
      Serial.print("<Data> Found 0x");
      if(a<16) Serial.print("0");
      Serial.println(a,HEX); n++;
    }
  }
  Serial.print("<Inf> "); Serial.print(n); Serial.println(" device(s) found.");
}

void setup(){
  Wire.begin(); Wire.setClock(100000);
  Serial.begin(9600);
  Serial.println("<Inf> I2C Scanner. Scanning 0x08–0x77...");
  scan();
}

void loop(){ delay(5000); Serial.println("<Inf> Rescanning..."); scan(); }
`,
      },
    ],
  },
];
