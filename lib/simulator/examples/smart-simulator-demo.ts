/**
 * Smart Simulator Demo - Practical Examples
 * 
 * This file demonstrates how the smart simulator adapts to different project types
 * and provides intelligent analysis and optimization.
 */

import { createSmartSimulator, SmartSimulatorUtils } from '../index';
import type { Project, DeviceInstance } from '@/types';
import type { SimCallbacks } from '../smart-engine';

// Example 1: IoT Weather Station Project
export async function demoIoTWeatherStation() {
  console.log('🌤️  IoT Weather Station Demo');
  console.log('================================');

  const project: Project = {
    id: 'weather-station-v1',
    name: 'IoT Weather Station',
    boardId: 'arduino-uno',
    files: [
      {
        name: 'main.ino',
        content: `
#include <DHT.h>
#include <Adafruit_BMP280.h>
#include <SoftwareSerial.h>

DHT dht(2, DHT22);
Adafruit_BMP280 bmp;
SoftwareSerial bluetooth(10, 11); // RX, TX

struct WeatherData {
  float temperature;
  float humidity;
  float pressure;
  unsigned long timestamp;
};

WeatherData currentData;
bool newDataAvailable = false;

void setup() {
  Serial.begin(9600);
  bluetooth.begin(9600);
  
  if (!bmp.begin(0x76)) {
    Serial.println("BMP280 initialization failed!");
    while (1);
  }
  
  dht.begin();
  
  Serial.println("Weather Station initialized");
  delay(1000);
}

void loop() {
  static unsigned long lastRead = 0;
  const unsigned long readInterval = 5000; // Read every 5 seconds
  
  if (millis() - lastRead >= readInterval) {
    readSensors();
    lastRead = millis();
  }
  
  if (newDataAvailable) {
    transmitData();
    newDataAvailable = false;
  }
  
  // Check for Bluetooth commands
  if (bluetooth.available()) {
    handleBluetoothCommand();
  }
  
  delay(100);
}

void readSensors() {
  currentData.temperature = dht.readTemperature();
  currentData.humidity = dht.readHumidity();
  currentData.pressure = bmp.readPressure() / 100.0; // Convert to hPa
  currentData.timestamp = millis();
  
  if (!isnan(currentData.temperature) && !isnan(currentData.humidity)) {
    newDataAvailable = true;
    
    Serial.print("Temp: ");
    Serial.print(currentData.temperature);
    Serial.print("°C, Hum: ");
    Serial.print(currentData.humidity);
    Serial.print("%, Pressure: ");
    Serial.print(currentData.pressure);
    Serial.println(" hPa");
  }
}

void transmitData() {
  String data = String(currentData.temperature) + "," + 
                String(currentData.humidity) + "," + 
                String(currentData.pressure) + "," +
                String(currentData.timestamp);
  
  bluetooth.println(data);
  Serial.println("Data transmitted: " + data);
}

void handleBluetoothCommand() {
  String command = bluetooth.readStringUntil('\\n');
  command.trim();
  
  if (command == "STATUS") {
    bluetooth.println("OK");
  } else if (command == "DATA") {
    transmitData();
  }
}
        `,
        language: 'cpp',
        modified: false
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const devices: DeviceInstance[] = [
    {
      instanceId: 'dht22-1',
      deviceType: 'dht22',
      label: 'DHT22 Temperature/Humidity',
      config: { pin: 2 },
      pinMapping: { 'DATA': 2 },
      values: {}
    },
    {
      instanceId: 'bmp280-1',
      deviceType: 'bmp280',
      label: 'BMP280 Pressure Sensor',
      config: { i2cAddress: 0x76 },
      pinMapping: { 'SDA': 18, 'SCL': 19 },
      values: {}
    },
    {
      instanceId: 'bluetooth-1',
      deviceType: 'hc-05',
      label: 'Bluetooth Module',
      config: { baudRate: 9600 },
      pinMapping: { 'RX': 10, 'TX': 11 },
      values: {}
    }
  ];

  const callbacks: SimCallbacks = {
    onSerial: (text: string) => console.log(`Serial: ${text}`),
    onPinChange: (pin: number, val: number) => console.log(`Pin ${pin} -> ${val}`),
    onAnalogChange: (pin: number, val: number) => console.log(`Analog ${pin} -> ${val}`),
    onMillisUpdate: (ms: number) => {}, // Silent for demo
    onStop: () => console.log('Simulation stopped'),
    onI2CScan: (addresses: number[]) => console.log(`I2C devices: ${addresses.join(', ')}`)
  };

  // Quick project type detection
  const detectedType = SmartSimulatorUtils.detectProjectType(project, devices);
  console.log(`📊 Detected Project Type: ${detectedType}`);

  // Quick error check
  const errorCheck = SmartSimulatorUtils.quickErrorCheck(project, devices);
  console.log(`🔍 Quick Error Check: ${errorCheck.summary.total} issues found`);

  // Get recommended profile
  const recommendedProfile = SmartSimulatorUtils.getRecommendedProfile(project, devices);
  console.log(`⚡ Recommended Profile: ${recommendedProfile?.name}`);

  try {
    const simulator = await createSmartSimulator(project, devices, callbacks, {
      enableCodeAnalysis: true,
      enableErrorDetection: true,
      enablePinSuggestions: true,
      logLevel: 'detailed'
    });

    console.log('\n🧠 Smart Analysis Results:');
    const analysis = simulator.getProjectAnalysis();
    console.log(`  Type: ${analysis.type}`);
    console.log(`  Complexity: ${analysis.complexity}`);
    console.log(`  Patterns: ${analysis.patterns.join(', ')}`);
    console.log(`  Devices: ${analysis.devices.length}`);

    console.log('\n⚠️  Error Analysis:');
    const errorAnalysis = simulator.getErrorAnalysis();
    if (errorAnalysis) {
      console.log(`  Total Errors: ${errorAnalysis.summary.total}`);
      console.log(`  Critical: ${errorAnalysis.summary.criticalIssues}`);
      console.log(`  Auto-fixable: ${errorAnalysis.summary.autoFixable}`);
      
      errorAnalysis.errors.slice(0, 3).forEach((error: any, index: number) => {
        console.log(`  ${index + 1}. [${error.severity.toUpperCase()}] ${error.title}`);
        if (error.suggestion) {
          console.log(`     💡 ${error.suggestion}`);
        }
      });
    }

    console.log('\n📍 Pin Mapping Suggestions:');
    const pinSuggestions = simulator.getPinMappingSuggestions();
    if (pinSuggestions) {
      console.log(`  Strategy: ${pinSuggestions.strategy.name}`);
      console.log(`  Suggestions: ${pinSuggestions.suggestions.length}`);
      
      pinSuggestions.suggestions.slice(0, 3).forEach((suggestion: any, index: number) => {
        console.log(`  ${index + 1}. ${suggestion.deviceName} (${suggestion.devicePin}) -> Pin ${suggestion.suggestedPin}`);
        console.log(`     Confidence: ${(suggestion.confidence * 100).toFixed(1)}%`);
        console.log(`     Reason: ${suggestion.reasoning.primary}`);
      });
    }

    console.log('\n🚀 Starting Simulation...');
    await simulator.start();

    // Simulate some sensor data changes
    setTimeout(() => {
      simulator.setDeviceInput('dht22', 'temperature', 25.5);
      simulator.setDeviceInput('dht22', 'humidity', 65.2);
      simulator.setDeviceInput('bmp280', 'pressure', 1013.25);
    }, 2000);

    // Send some serial commands
    setTimeout(() => {
      simulator.sendSerial('STATUS');
    }, 3000);

    setTimeout(() => {
      simulator.sendSerial('DATA');
    }, 4000);

    // Stop after 6 seconds
    setTimeout(() => {
      simulator.stop();
      console.log('\n✅ Demo completed successfully!');
    }, 6000);

    return simulator;

  } catch (error) {
    console.error('❌ Demo failed:', error);
    throw error;
  }
}

// Example 2: Robotics Arm Controller
export async function demoRoboticsArm() {
  console.log('\n🤖 Robotics Arm Controller Demo');
  console.log('===============================');

  const project: Project = {
    id: 'robot-arm-v2',
    name: 'Robotics Arm Controller',
    boardId: 'arduino-mega',
    files: [
      {
        name: 'main.ino',
        content: `
#include <TimerOne.h>
#include <MPU6050.h>
#include <AccelStepper.h>

// Motor configuration
#define STEP_PIN 2
#define DIR_PIN 3
#define ENABLE_PIN 4
#define LIMIT_SWITCH_PIN 5

// IMU configuration
MPU6050 mpu;

// Stepper motor
AccelStepper stepper(AccelStepper::DRIVER, STEP_PIN, DIR_PIN);

// Control variables
volatile bool motorEnabled = false;
volatile bool limitSwitchTriggered = false;
int targetPosition = 0;
int currentPosition = 0;
float currentAngle = 0.0;

// IMU data
int16_t ax, ay, az, gx, gy, gz;
float angleX = 0, angleY = 0, angleZ = 0;

void setup() {
  Serial.begin(115200);
  
  // Initialize motor
  pinMode(ENABLE_PIN, OUTPUT);
  pinMode(LIMIT_SWITCH_PIN, INPUT_PULLUP);
  digitalWrite(ENABLE_PIN, HIGH); // Disable motor initially
  
  stepper.setMaxSpeed(1000);
  stepper.setAcceleration(500);
  
  // Initialize IMU
  mpu.initialize();
  
  // Set up timer interrupt for precise motor control
  Timer1.initialize(100); // 100μs = 10kHz
  Timer1.attachInterrupt(motorISR);
  
  // Set up limit switch interrupt
  attachInterrupt(digitalPinToInterrupt(LIMIT_SWITCH_PIN), limitSwitchISR, FALLING);
  
  Serial.println("Robotics Arm Controller initialized");
  Serial.println("Commands: MOVE<degrees>, HOME, STOP, STATUS");
}

void loop() {
  // Read IMU data
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
  
  // Calculate angles (simplified)
  angleX = atan2(ay, az) * 180.0 / PI;
  angleY = atan2(ax, az) * 180.0 / PI;
  
  // Handle serial commands
  if (Serial.available()) {
    handleCommand();
  }
  
  // Update motor position
  if (motorEnabled) {
    stepper.run();
    currentPosition = stepper.currentPosition();
    currentAngle = (currentPosition * 1.8); // 200 steps/rev, 1.8° per step
    
    // Safety check based on IMU
    if (abs(angleX) > 45 || abs(angleY) > 45) {
      emergencyStop();
      Serial.println("EMERGENCY STOP: Angle limit exceeded!");
    }
  }
  
  // Status reporting every 1 second
  static unsigned long lastStatus = 0;
  if (millis() - lastStatus >= 1000) {
    reportStatus();
    lastStatus = millis();
  }
  
  delay(10);
}

void motorISR() {
  if (motorEnabled && !limitSwitchTriggered) {
    // This interrupt handles the stepper motor stepping
    // The AccelStepper library handles the actual timing
  }
}

void limitSwitchISR() {
  limitSwitchTriggered = true;
  motorEnabled = false;
  stepper.setCurrentPosition(0);
  digitalWrite(ENABLE_PIN, HIGH);
  Serial.println("Limit switch triggered - motor homed");
}

void handleCommand() {
  String command = Serial.readStringUntil('\\n');
  command.trim();
  
  if (command.startsWith("MOVE")) {
    int degrees = command.substring(4).toInt();
    moveToAngle(degrees);
  } else if (command == "HOME") {
    homeMotor();
  } else if (command == "STOP") {
    emergencyStop();
  } else if (command == "STATUS") {
    reportStatus();
  }
}

void moveToAngle(int degrees) {
  if (degrees < -90 || degrees > 90) {
    Serial.println("Error: Angle must be between -90 and 90 degrees");
    return;
  }
  
  targetPosition = degrees / 1.8; // Convert to steps
  stepper.moveTo(targetPosition);
  
  if (!motorEnabled) {
    motorEnabled = true;
    limitSwitchTriggered = false;
    digitalWrite(ENABLE_PIN, LOW);
    Serial.println("Motor enabled");
  }
  
  Serial.print("Moving to ");
  Serial.print(degrees);
  Serial.println(" degrees");
}

void homeMotor() {
  Serial.println("Homing motor...");
  motorEnabled = true;
  limitSwitchTriggered = false;
  digitalWrite(ENABLE_PIN, LOW);
  
  // Move slowly towards limit switch
  stepper.setSpeed(-100);
  stepper.runSpeed();
  
  // Wait for limit switch (handled in interrupt)
  unsigned long timeout = millis() + 5000;
  while (!limitSwitchTriggered && millis() < timeout) {
    stepper.runSpeed();
    delay(10);
  }
  
  if (!limitSwitchTriggered) {
    Serial.println("Homing failed - timeout");
    emergencyStop();
  }
}

void emergencyStop() {
  motorEnabled = false;
  stepper.stop();
  digitalWrite(ENABLE_PIN, HIGH);
  Serial.println("Emergency stop activated");
}

void reportStatus() {
  Serial.print("Status: ");
  Serial.print(motorEnabled ? "RUNNING" : "STOPPED");
  Serial.print(", Position: ");
  Serial.print(currentPosition);
  Serial.print(" steps (");
  Serial.print(currentAngle);
  Serial.print("°), Target: ");
  Serial.print(targetPosition);
  Serial.print(" steps, IMU: X=");
  Serial.print(angleX);
  Serial.print("° Y=");
  Serial.print(angleY);
  Serial.println("°");
}
        `,
        language: 'cpp',
        modified: false
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const devices: DeviceInstance[] = [
    {
      instanceId: 'stepper-1',
      deviceType: 'stepper_a4988',
      label: 'Arm Motor',
      config: { stepsPerRev: 200, microStep: 1 },
      pinMapping: { 'STEP': 2, 'DIR': 3, 'ENABLE': 4 },
      values: {}
    },
    {
      instanceId: 'mpu6050-1',
      deviceType: 'mpu6050',
      label: 'IMU Sensor',
      config: { i2cAddress: 0x68 },
      pinMapping: { 'SDA': 20, 'SCL': 21 },
      values: {}
    },
    {
      instanceId: 'limit-switch-1',
      deviceType: 'push_button',
      label: 'Limit Switch',
      config: { pin: 5, pullUp: true },
      pinMapping: { 'OUT': 5 },
      values: {}
    }
  ];

  const callbacks: SimCallbacks = {
    onSerial: (text: string) => console.log(`Serial: ${text}`),
    onPinChange: (pin: number, val: number) => console.log(`Pin ${pin} -> ${val}`),
    onAnalogChange: (pin: number, val: number) => console.log(`Analog ${pin} -> ${val}`),
    onMillisUpdate: (ms: number) => {},
    onStop: () => console.log('Robotics simulation stopped'),
    onI2CScan: (addresses: number[]) => console.log(`I2C devices: ${addresses.join(', ')}`)
  };

  const detectedType = SmartSimulatorUtils.detectProjectType(project, devices);
  console.log(`📊 Detected Project Type: ${detectedType}`);

  const errorCheck = SmartSimulatorUtils.quickErrorCheck(project, devices);
  console.log(`🔍 Quick Error Check: ${errorCheck.summary.total} issues found`);

  try {
    const simulator = await createSmartSimulator(project, devices, callbacks, {
      enableCodeAnalysis: true,
      enableErrorDetection: true,
      enablePinSuggestions: true,
      logLevel: 'basic'
    });

    console.log('\n🧠 Smart Analysis Results:');
    const analysis = simulator.getProjectAnalysis();
    console.log(`  Type: ${analysis.type}`);
    console.log(`  Complexity: ${analysis.complexity}`);
    console.log(`  Patterns: ${analysis.patterns.join(', ')}`);

    console.log('\n⚠️  Critical Issues Found:');
    const errorAnalysis = simulator.getErrorAnalysis();
    if (errorAnalysis) {
      const criticalErrors = errorAnalysis.errors.filter((e: any) => 
        e.severity === 'critical' || e.severity === 'error'
      );
      criticalErrors.forEach((error: any) => {
        console.log(`  ❌ ${error.title}: ${error.message}`);
        if (error.suggestion) {
          console.log(`     💡 ${error.suggestion}`);
        }
      });
    }

    console.log('\n🚀 Starting Robotics Simulation...');
    await simulator.start();

    // Simulate robot arm movements
    setTimeout(() => {
      console.log('📡 Sending MOVE command...');
      simulator.sendSerial('MOVE45');
    }, 1000);

    setTimeout(() => {
      console.log('📡 Sending STATUS command...');
      simulator.sendSerial('STATUS');
    }, 2000);

    setTimeout(() => {
      console.log('📡 Sending HOME command...');
      simulator.sendSerial('HOME');
    }, 3000);

    // Simulate IMU data changes
    setTimeout(() => {
      simulator.setDeviceInput('mpu6050', 'accelX', 100);
      simulator.setDeviceInput('mpu6050', 'accelY', -50);
      simulator.setDeviceInput('mpu6050', 'gyroZ', 25);
    }, 1500);

    // Simulate limit switch trigger
    setTimeout(() => {
      simulator.setDeviceInput('limit-switch-1', 'pressed', 1);
    }, 3500);

    setTimeout(() => {
      simulator.stop();
      console.log('\n✅ Robotics demo completed!');
    }, 5000);

    return simulator;

  } catch (error) {
    console.error('❌ Robotics demo failed:', error);
    throw error;
  }
}

// Example 3: Home Automation System
export async function demoHomeAutomation() {
  console.log('\n🏠 Home Automation System Demo');
  console.log('==============================');

  const project: Project = {
    id: 'smart-home-v1',
    name: 'Smart Home Controller',
    boardId: 'arduino-uno',
    files: [
      {
        name: 'main.ino',
        content: `
#include <DHT.h>
#include <SoftwareSerial.h>

#define DHT_PIN 2
#define RELAY1_PIN 7
#define RELAY2_PIN 8
#define MOTION_PIN 3
#define LIGHT_PIN A0

DHT dht(DHT_PIN, DHT22);
SoftwareSerial espSerial(10, 11); // RX, TX

struct SensorData {
  float temperature;
  float humidity;
  int motion;
  int lightLevel;
  unsigned long timestamp;
};

struct AutomationRule {
  bool enabled;
  float tempThreshold;
  int lightThreshold;
  bool autoLights;
  bool autoFan;
};

SensorData currentData;
AutomationRule rules = {
  true,    // enabled
  25.0,    // tempThreshold
  300,     // lightThreshold
  true,    // autoLights
  true     // autoFan
};

bool relay1State = false;
bool relay2State = false;
bool lastMotionState = false;
unsigned long lastMotionTime = 0;

void setup() {
  Serial.begin(9600);
  espSerial.begin(9600);
  
  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);
  pinMode(MOTION_PIN, INPUT);
  
  digitalWrite(RELAY1_PIN, HIGH); // OFF (active LOW)
  digitalWrite(RELAY2_PIN, HIGH); // OFF (active LOW)
  
  dht.begin();
  
  Serial.println("Smart Home Controller initialized");
  delay(1000);
}

void loop() {
  readSensors();
  applyAutomationRules();
  handleSerialCommands();
  sendStatusToESP();
  
  delay(1000);
}

void readSensors() {
  currentData.temperature = dht.readTemperature();
  currentData.humidity = dht.readHumidity();
  currentData.motion = digitalRead(MOTION_PIN);
  currentData.lightLevel = analogRead(LIGHT_PIN);
  currentData.timestamp = millis();
  
  // Motion detection
  if (currentData.motion == HIGH && lastMotionState == LOW) {
    lastMotionTime = millis();
    Serial.println("Motion detected!");
  }
  lastMotionState = currentData.motion;
}

void applyAutomationRules() {
  if (!rules.enabled) return;
  
  // Temperature control (fan)
  if (rules.autoFan && currentData.temperature > rules.tempThreshold) {
    if (!relay2State) {
      turnOnFan();
    }
  } else if (rules.autoFan && currentData.temperature < rules.tempThreshold - 2) {
    if (relay2State) {
      turnOffFan();
    }
  }
  
  // Light control
  if (rules.autoLights) {
    bool shouldTurnOnLights = false;
    
    // Turn on lights if motion detected within last 5 minutes and it's dark
    if (currentData.motion == HIGH || (millis() - lastMotionTime < 300000)) {
      if (currentData.lightLevel < rules.lightThreshold) {
        shouldTurnOnLights = true;
      }
    }
    
    if (shouldTurnOnLights && !relay1State) {
      turnOnLights();
    } else if (!shouldTurnOnLights && relay1State) {
      turnOffLights();
    }
  }
}

void handleSerialCommands() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\\n');
    command.trim();
    
    if (command == "LIGHTS ON") {
      turnOnLights();
    } else if (command == "LIGHTS OFF") {
      turnOffLights();
    } else if (command == "FAN ON") {
      turnOnFan();
    } else if (command == "FAN OFF") {
      turnOffFan();
    } else if (command.startsWith("TEMP ")) {
      float temp = command.substring(5).toFloat();
      rules.tempThreshold = temp;
      Serial.print("Temperature threshold set to ");
      Serial.println(temp);
    } else if (command == "STATUS") {
      printStatus();
    } else if (command == "AUTO ON") {
      rules.enabled = true;
      Serial.println("Automation enabled");
    } else if (command == "AUTO OFF") {
      rules.enabled = false;
      Serial.println("Automation disabled");
    }
  }
}

void turnOnLights() {
  digitalWrite(RELAY1_PIN, LOW);
  relay1State = true;
  Serial.println("Lights turned ON");
}

void turnOffLights() {
  digitalWrite(RELAY1_PIN, HIGH);
  relay1State = false;
  Serial.println("Lights turned OFF");
}

void turnOnFan() {
  digitalWrite(RELAY2_PIN, LOW);
  relay2State = true;
  Serial.println("Fan turned ON");
}

void turnOffFan() {
  digitalWrite(RELAY2_PIN, HIGH);
  relay2State = false;
  Serial.println("Fan turned OFF");
}

void printStatus() {
  Serial.print("Status: Lights ");
  Serial.print(relay1State ? "ON" : "OFF");
  Serial.print(", Fan ");
  Serial.print(relay2State ? "ON" : "OFF");
  Serial.print(", Temp: ");
  Serial.print(currentData.temperature);
  Serial.print("°C, Humidity: ");
  Serial.print(currentData.humidity);
  Serial.print("%, Light: ");
  Serial.print(currentData.lightLevel);
  Serial.print(", Motion: ");
  Serial.println(currentData.motion ? "YES" : "NO");
}

void sendStatusToESP() {
  static unsigned long lastSend = 0;
  if (millis() - lastSend < 10000) return; // Send every 10 seconds
  
  String status = String(currentData.temperature) + "," + 
                 String(currentData.humidity) + "," +
                 String(currentData.lightLevel) + "," +
                 String(relay1State ? 1 : 0) + "," +
                 String(relay2State ? 1 : 0);
  
  espSerial.println(status);
  lastSend = millis();
}
        `,
        language: 'cpp',
        modified: false
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const devices: DeviceInstance[] = [
    {
      instanceId: 'dht22-1',
      deviceType: 'dht22',
      label: 'Temperature/Humidity',
      config: { pin: 2 },
      pinMapping: { 'DATA': 2 },
      values: {}
    },
    {
      instanceId: 'relay1-1',
      deviceType: 'relay_module',
      label: 'Lights Relay',
      config: { pin: 7, activeLow: true },
      pinMapping: { 'IN': 7 },
      values: {}
    },
    {
      instanceId: 'relay2-1',
      deviceType: 'relay_module',
      label: 'Fan Relay',
      config: { pin: 8, activeLow: true },
      pinMapping: { 'IN': 8 },
      values: {}
    },
    {
      instanceId: 'motion-1',
      deviceType: 'push_button',
      label: 'Motion Sensor',
      config: { pin: 3, pullUp: true },
      pinMapping: { 'OUT': 3 },
      values: {}
    },
    {
      instanceId: 'ldr-1',
      deviceType: 'photoresistor',
      label: 'Light Sensor',
      config: { pin: 14 }, // A0
      pinMapping: { 'OUT': 14 },
      values: {}
    }
  ];

  const callbacks: SimCallbacks = {
    onSerial: (text: string) => console.log(`Serial: ${text}`),
    onPinChange: (pin: number, val: number) => console.log(`Pin ${pin} -> ${val}`),
    onAnalogChange: (pin: number, val: number) => console.log(`Analog A${pin-14} -> ${val}`),
    onMillisUpdate: (ms: number) => {},
    onStop: () => console.log('Home automation simulation stopped'),
    onI2CScan: (addresses: number[]) => {}
  };

  const detectedType = SmartSimulatorUtils.detectProjectType(project, devices);
  console.log(`📊 Detected Project Type: ${detectedType}`);

  try {
    const simulator = await createSmartSimulator(project, devices, callbacks, {
      enableCodeAnalysis: true,
      enableErrorDetection: true,
      enablePinSuggestions: true,
      logLevel: 'basic'
    });

    console.log('\n🧠 Smart Analysis Results:');
    const analysis = simulator.getProjectAnalysis();
    console.log(`  Type: ${analysis.type}`);
    console.log(`  Complexity: ${analysis.complexity}`);
    console.log(`  Patterns: ${analysis.patterns.join(', ')}`);

    console.log('\n🚀 Starting Home Automation Simulation...');
    await simulator.start();

    // Simulate sensor data changes
    setTimeout(() => {
      console.log('🌡️  Simulating warm temperature...');
      simulator.setDeviceInput('dht22', 'temperature', 28.5);
      simulator.setDeviceInput('dht22', 'humidity', 45.0);
    }, 1000);

    setTimeout(() => {
      console.log('💡 Simulating dark room...');
      simulator.setDeviceInput('ldr-1', 'resistance', 800);
    }, 1500);

    setTimeout(() => {
      console.log('👤 Simulating motion detection...');
      simulator.setDeviceInput('motion-1', 'pressed', 1);
    }, 2000);

    setTimeout(() => {
      console.log('📡 Sending STATUS command...');
      simulator.sendSerial('STATUS');
    }, 2500);

    setTimeout(() => {
      console.log('📡 Sending automation commands...');
      simulator.sendSerial('TEMP 26.0');
      simulator.sendSerial('AUTO ON');
    }, 3000);

    setTimeout(() => {
      simulator.stop();
      console.log('\n✅ Home automation demo completed!');
    }, 5000);

    return simulator;

  } catch (error) {
    console.error('❌ Home automation demo failed:', error);
    throw error;
  }
}

// Main demo runner
export async function runAllDemos() {
  console.log('🎯 Smart Simulator Engine - Complete Demo Suite');
  console.log('==============================================\n');

  try {
    await demoIoTWeatherStation();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await demoRoboticsArm();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await demoHomeAutomation();
    
    console.log('\n🎉 All demos completed successfully!');
    console.log('\nKey Features Demonstrated:');
    console.log('✅ Automatic project type detection');
    console.log('✅ Intelligent code analysis');
    console.log('✅ Smart error detection and feedback');
    console.log('✅ Adaptive simulation profiles');
    console.log('✅ Automatic pin mapping suggestions');
    console.log('✅ Dynamic device initialization');
    console.log('✅ Context-aware optimization');
    
  } catch (error) {
    console.error('❌ Demo suite failed:', error);
  }
}
