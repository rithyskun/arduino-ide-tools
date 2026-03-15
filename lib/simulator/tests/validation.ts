/**
 * Smart Simulator Validation Script
 * 
 * Simple validation tests for the smart simulator components
 * without requiring Jest or other testing frameworks
 */

import { ProjectAnalyzer, ProjectType, LogicPattern } from '../project-analyzer';
import { SimulationProfileManager } from '../simulation-profiles';
import { CodeAnalyzer } from '../code-analyzer';
import { SmartSimulatorUtils } from '../index';
import type { Project, DeviceInstance } from '@/types';
import { getBoardById } from '@/lib/boards';

// Test utilities
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected: ${expected}, Actual: ${actual}`);
  }
}

function assertNotNull<T>(value: T | null | undefined, message: string): void {
  if (value === null || value === undefined) {
    throw new Error(`Assertion failed: ${message}. Value is null or undefined`);
  }
}

// Mock data
const mockProject: Project = {
  id: 'test-project',
  name: 'Test Project',
  boardId: 'arduino-uno',
  files: [
    {
      name: 'main.ino',
      content: `
#include <DHT.h>
#include <Wire.h>

DHT dht(2, DHT22);

void setup() {
  Serial.begin(9600);
  dht.begin();
}

void loop() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  
  Serial.print("Temperature: ");
  Serial.print(temp);
  Serial.print("°C, Humidity: ");
  Serial.print(hum);
  Serial.println("%");
  
  delay(2000);
}
      `,
      language: 'cpp',
      modified: false
    }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

const mockDevices: DeviceInstance[] = [
  {
    instanceId: 'dht22-1',
    deviceType: 'dht22',
    label: 'DHT22 Sensor',
    config: { pin: 2 },
    pinMapping: { 'DATA': 2 },
    values: {}
  }
];

// Validation results
interface ValidationResult {
  passed: boolean;
  total: number;
  failed: number;
  errors: string[];
}

class Validator {
  private results: ValidationResult = {
    passed: true,
    total: 0,
    failed: 0,
    errors: []
  };

  private test(name: string, testFn: () => void): void {
    this.results.total++;
    try {
      testFn();
      console.log(`✅ ${name}`);
    } catch (error) {
      this.results.failed++;
      this.results.passed = false;
      this.results.errors.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
      console.log(`❌ ${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  runAllTests(): ValidationResult {
    console.log('🧪 Smart Simulator Validation Tests');
    console.log('=====================================\n');

    this.testProjectAnalyzer();
    this.testSimulationProfileManager();
    this.testCodeAnalyzer();
    this.testSmartSimulatorUtils();

    this.printSummary();
    return this.results;
  }

  private testProjectAnalyzer(): void {
    console.log('📊 ProjectAnalyzer Tests');
    console.log('------------------------');

    const analyzer = new ProjectAnalyzer();
    const board = getBoardById('arduino-uno');

    this.test('should detect IoT sensor project type', () => {
      assertNotNull(board, 'Board should be found');
      const analysis = analyzer.analyzeProject(mockProject, board, mockDevices);
      assertEqual(analysis.type, ProjectType.IOT_SENSOR, 'Should detect IoT sensor project');
    });

    this.test('should detect polling loop pattern', () => {
      assertNotNull(board, 'Board should be found');
      const analysis = analyzer.analyzeProject(mockProject, board, mockDevices);
      assert(analysis.patterns.includes(LogicPattern.POLLING_LOOP), 'Should detect polling loop pattern');
    });

    this.test('should analyze devices correctly', () => {
      assertNotNull(board, 'Board should be found');
      const analysis = analyzer.analyzeProject(mockProject, board, mockDevices);
      assertEqual(analysis.devices.length, 1, 'Should analyze one device');
      assertEqual(analysis.devices[0].deviceType, 'dht22', 'Should detect DHT22 device');
    });

    this.test('should assess complexity as simple', () => {
      assertNotNull(board, 'Board should be found');
      const analysis = analyzer.analyzeProject(mockProject, board, mockDevices);
      assertEqual(analysis.complexity, 'simple', 'Should assess complexity as simple');
    });

    this.test('should provide recommendations', () => {
      assertNotNull(board, 'Board should be found');
      const analysis = analyzer.analyzeProject(mockProject, board, mockDevices);
      assert(analysis.recommendations.length > 0, 'Should provide recommendations');
    });

    console.log('');
  }

  private testSimulationProfileManager(): void {
    console.log('⚙️ SimulationProfileManager Tests');
    console.log('---------------------------------');

    const profileManager = new SimulationProfileManager();

    this.test('should return correct profile for IoT sensor', () => {
      const profile = profileManager.getProfile(ProjectType.IOT_SENSOR);
      assertEqual(profile.name, 'IoT Sensor Network', 'Should return IoT sensor profile');
      assertEqual(profile.settings.accuracy, 'high', 'Should have high accuracy');
      assert(profile.settings.noiseEnabled, 'Should have noise enabled');
    });

    this.test('should return correct profile for robotics', () => {
      const profile = profileManager.getProfile(ProjectType.ROBOTICS);
      assertEqual(profile.name, 'Robotics Control', 'Should return robotics profile');
      assert(profile.settings.realTime, 'Should have real-time enabled');
      assertEqual(profile.settings.timingPrecision, 'ultra-precise', 'Should have ultra-precise timing');
    });

    this.test('should adapt profile based on patterns', () => {
      const baseProfile = profileManager.getProfile(ProjectType.IOT_SENSOR);
      const adaptedProfile = profileManager.adaptProfile(
        ProjectType.IOT_SENSOR,
        mockDevices,
        [LogicPattern.POLLING_LOOP],
        'simple'
      );
      assertNotNull(adaptedProfile.settings, 'Should have settings');
      assertNotNull(adaptedProfile.deviceSettings, 'Should have device settings');
    });

    this.test('should have all required project types', () => {
      const allProfiles = profileManager.getAllProfiles();
      assert(allProfiles.size > 0, 'Should have profiles');
      assert(allProfiles.has(ProjectType.IOT_SENSOR), 'Should have IoT sensor profile');
      assert(allProfiles.has(ProjectType.ROBOTICS), 'Should have robotics profile');
      assert(allProfiles.has(ProjectType.HOME_AUTOMATION), 'Should have home automation profile');
    });

    console.log('');
  }

  private testCodeAnalyzer(): void {
    console.log('🔍 CodeAnalyzer Tests');
    console.log('---------------------');

    const analyzer = new CodeAnalyzer();

    this.test('should analyze code patterns', () => {
      const result = analyzer.analyzeCode(mockProject.files);
      assert(result.patterns.length > 0, 'Should detect patterns');
    });

    this.test('should detect delay usage', () => {
      const result = analyzer.analyzeCode(mockProject.files);
      assert(result.timing.delays.length > 0, 'Should detect delay usage');
    });

    this.test('should analyze functions', () => {
      const result = analyzer.analyzeCode(mockProject.files);
      assert(result.functions.length > 0, 'Should analyze functions');
    });

    this.test('should calculate metrics', () => {
      const result = analyzer.analyzeCode(mockProject.files);
      assert(result.metrics.linesOfCode > 0, 'Should calculate lines of code');
      assert(result.metrics.functionCount > 0, 'Should calculate function count');
    });

    this.test('should generate recommendations', () => {
      const result = analyzer.analyzeCode(mockProject.files);
      assert(result.recommendations !== undefined, 'Should generate recommendations');
    });

    console.log('');
  }

  private testSmartSimulatorUtils(): void {
    console.log('🛠️ SmartSimulatorUtils Tests');
    console.log('-----------------------------');

    this.test('should detect project type correctly', () => {
      const projectType = SmartSimulatorUtils.detectProjectType(mockProject, mockDevices);
      assertEqual(projectType, 'iot_sensor', 'Should detect IoT sensor project');
    });

    this.test('should perform quick error check', () => {
      const errorCheck = SmartSimulatorUtils.quickErrorCheck(mockProject, mockDevices);
      assertNotNull(errorCheck, 'Should return error check result');
      assertNotNull(errorCheck.errors, 'Should have errors array');
      assertNotNull(errorCheck.summary, 'Should have summary');
    });

    this.test('should get recommended profile', () => {
      const profile = SmartSimulatorUtils.getRecommendedProfile(mockProject, mockDevices);
      assertNotNull(profile, 'Should return recommended profile');
      assertNotNull(profile.name, 'Should have profile name');
    });

    console.log('');
  }

  private printSummary(): void {
    console.log('📈 Test Summary');
    console.log('===============');
    console.log(`Total tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.total - this.results.failed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Status: ${this.results.passed ? '✅ PASSED' : '❌ FAILED'}`);

    if (this.results.failed > 0) {
      console.log('\n❌ Errors:');
      this.results.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }
  }
}

// Performance validation
function performanceValidation(): void {
  console.log('\n⚡ Performance Validation');
  console.log('=========================');

  const startTime = Date.now();

  // Test project type detection performance
  const projectTypeStart = Date.now();
  const projectType = SmartSimulatorUtils.detectProjectType(mockProject, mockDevices);
  const projectTypeTime = Date.now() - projectTypeStart;

  // Test error check performance
  const errorCheckStart = Date.now();
  const errorCheck = SmartSimulatorUtils.quickErrorCheck(mockProject, mockDevices);
  const errorCheckTime = Date.now() - errorCheckStart;

  // Test profile recommendation performance
  const profileStart = Date.now();
  const profile = SmartSimulatorUtils.getRecommendedProfile(mockProject, mockDevices);
  const profileTime = Date.now() - profileStart;

  const totalTime = Date.now() - startTime;

  console.log(`Project type detection: ${projectTypeTime}ms`);
  console.log(`Quick error check: ${errorCheckTime}ms`);
  console.log(`Profile recommendation: ${profileTime}ms`);
  console.log(`Total time: ${totalTime}ms`);

  // Performance assertions
  assert(projectTypeTime < 100, 'Project type detection should be fast (< 100ms)');
  assert(errorCheckTime < 200, 'Error check should be fast (< 200ms)');
  assert(profileTime < 50, 'Profile recommendation should be fast (< 50ms)');
  assert(totalTime < 500, 'Total validation should be fast (< 500ms)');

  console.log('✅ All performance tests passed');
}

// Integration validation
function integrationValidation(): void {
  console.log('\n🔗 Integration Validation');
  console.log('=========================');

  const board = getBoardById('arduino-uno');
  assertNotNull(board, 'Board should be found');

  // Test complete analysis workflow
  const analyzer = new ProjectAnalyzer();
  const analysis = analyzer.analyzeProject(mockProject, board, mockDevices);

  assertEqual(analysis.type, ProjectType.IOT_SENSOR, 'Should detect IoT sensor project');
  assert(analysis.patterns.includes(LogicPattern.POLLING_LOOP), 'Should detect polling loop');
  assert(analysis.devices.length > 0, 'Should analyze devices');

  // Test profile selection and adaptation
  const profileManager = new SimulationProfileManager();
  const baseProfile = profileManager.getProfile(analysis.type);
  const adaptedProfile = profileManager.adaptProfile(
    analysis.type,
    analysis.devices,
    analysis.patterns,
    analysis.complexity
  );

  assertNotNull(baseProfile, 'Should get base profile');
  assertNotNull(adaptedProfile, 'Should adapt profile');

  // Test code analysis integration
  const codeAnalyzer = new CodeAnalyzer();
  const codeAnalysis = codeAnalyzer.analyzeCode(mockProject.files);

  assert(codeAnalysis.patterns.length > 0, 'Should detect code patterns');
  assert(codeAnalysis.functions.length > 0, 'Should analyze functions');

  console.log('✅ Integration validation passed');
}

// Main validation runner
export function runValidation(): ValidationResult {
  try {
    const validator = new Validator();
    const results = validator.runAllTests();

    performanceValidation();
    integrationValidation();

    return results;
  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    return {
      passed: false,
      total: 0,
      failed: 1,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  runValidation();
}
