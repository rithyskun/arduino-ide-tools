// Test script to verify simulator selection logic
// This can be run in the browser console to test the getSimulatorType function

import type { Project } from '@/types';

// Copy of the function from IDE.tsx for testing
function getSimulatorType(project: Project): 'basic' | 'interpreted' | 'smart' {
  const content = project.files.map((f: any) => f.content).join('').toLowerCase();
  
  // Check for weather station specific keywords
  const weatherKeywords = [
    'hx711', 'scale', 'ina260', 'rain', 'rainmeter', 'pca9685', 'eeprom_store',
    'command_handler', 'target_flow', 'stepper', 'relay'
  ];
  
  // Check for complex Arduino features
  const complexKeywords = [
    'timer1', 'interrupt', 'eeprom', 'wire.begin', 'i2c', 'spi'
  ];
  
  const hasWeatherFeatures = weatherKeywords.some(keyword => content.includes(keyword));
  const hasComplexFeatures = complexKeywords.some(keyword => content.includes(keyword));
  
  if (hasWeatherFeatures) {
    return 'smart'; // Use smart simulator for weather station projects
  } else if (hasComplexFeatures) {
    return 'interpreted'; // Use interpreted simulator for complex projects
  } else {
    return 'basic'; // Use basic simulator for simple projects
  }
}

// Test cases
const testProjects = [
  {
    name: 'Simple LED Blink',
    files: [{ content: 'const int LED = 13; void setup() { pinMode(LED, OUTPUT); } void loop() { digitalWrite(LED, HIGH); delay(1000); digitalWrite(LED, LOW); delay(1000); }' }],
    expected: 'basic'
  },
  {
    name: 'Weather Station',
    files: [{ content: '#include "HX711-CUSTOM.h" #include "Adafruit_INA260.h" void setup() { scale.begin(); ina260.begin(); }' }],
    expected: 'smart'
  },
  {
    name: 'I2C Scanner',
    files: [{ content: '#include <Wire.h> void setup() { Wire.begin(); } void loop() { Wire.beginTransmission(0x40); }' }],
    expected: 'interpreted'
  },
  {
    name: 'Timer Interrupt',
    files: [{ content: '#include <TimerOne.h> void setup() { Timer1.initialize(1000); Timer1.attachInterrupt(timerISR); }' }],
    expected: 'interpreted'
  }
];

// Run tests
testProjects.forEach(test => {
  const project = { id: 'test', name: test.name, boardId: 'arduino-uno', files: test.files, createdAt: Date.now(), updatedAt: Date.now() };
  const result = getSimulatorType(project);
  console.log(`${test.name}: Expected ${test.expected}, Got ${result} - ${result === test.expected ? '✅' : '❌'}`);
});

export { getSimulatorType };
