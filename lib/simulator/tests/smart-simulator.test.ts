/**
 * Smart Simulator Test Suite
 * 
 * Comprehensive tests for the smart simulator engine components
 */

import { ProjectAnalyzer, ProjectType, LogicPattern } from '../project-analyzer';
import { SimulationProfileManager } from '../simulation-profiles';
import { CodeAnalyzer } from '../code-analyzer';
import { DynamicDeviceInitializer } from '../device-initializer';
import { SmartErrorDetector } from '../error-detector';
import { PinMappingSuggester } from '../pin-mapping-suggester';
import { SmartSimulatorFactory, SmartSimulatorUtils } from '../index';
import type { Project, DeviceInstance } from '@/types';
import { getBoardById } from '@/lib/boards';

// Mock data for testing
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

describe('Smart Simulator Components', () => {
  let board: any;

  beforeEach(() => {
    board = getBoardById('arduino-uno');
  });

  describe('ProjectAnalyzer', () => {
    let analyzer: ProjectAnalyzer;

    beforeEach(() => {
      analyzer = new ProjectAnalyzer();
    });

    test('should detect IoT sensor project type', () => {
      const analysis = analyzer.analyzeProject(mockProject, board, mockDevices);
      expect(analysis.type).toBe(ProjectType.IOT_SENSOR);
    });

    test('should detect polling loop pattern', () => {
      const analysis = analyzer.analyzeProject(mockProject, board, mockDevices);
      expect(analysis.patterns).toContain(LogicPattern.POLLING_LOOP);
    });

    test('should analyze devices correctly', () => {
      const analysis = analyzer.analyzeProject(mockProject, board, mockDevices);
      expect(analysis.devices).toHaveLength(1);
      expect(analysis.devices[0].deviceType).toBe('dht22');
    });

    test('should assess complexity as simple', () => {
      const analysis = analyzer.analyzeProject(mockProject, board, mockDevices);
      expect(analysis.complexity).toBe('simple');
    });

    test('should provide recommendations', () => {
      const analysis = analyzer.analyzeProject(mockProject, board, mockDevices);
      expect(analysis.recommendations).toBeDefined();
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('SimulationProfileManager', () => {
    let profileManager: SimulationProfileManager;

    beforeEach(() => {
      profileManager = new SimulationProfileManager();
    });

    test('should return correct profile for IoT sensor', () => {
      const profile = profileManager.getProfile(ProjectType.IOT_SENSOR);
      expect(profile.name).toBe('IoT Sensor Network');
      expect(profile.settings.accuracy).toBe('high');
      expect(profile.settings.noiseEnabled).toBe(true);
    });

    test('should return correct profile for robotics', () => {
      const profile = profileManager.getProfile(ProjectType.ROBOTICS);
      expect(profile.name).toBe('Robotics Control');
      expect(profile.settings.realTime).toBe(true);
      expect(profile.settings.timingPrecision).toBe('ultra-precise');
    });

    test('should adapt profile based on devices and patterns', () => {
      const baseProfile = profileManager.getProfile(ProjectType.IOT_SENSOR);
      const adaptedProfile = profileManager.adaptProfile(
        ProjectType.IOT_SENSOR,
        mockDevices,
        [LogicPattern.POLLING_LOOP],
        'simple'
      );
      
      expect(adaptedProfile.settings).toBeDefined();
      expect(adaptedProfile.deviceSettings).toBeDefined();
    });

    test('should have all required project types', () => {
      const allProfiles = profileManager.getAllProfiles();
      expect(allProfiles.size).toBeGreaterThan(0);
      expect(allProfiles.has(ProjectType.IOT_SENSOR)).toBe(true);
      expect(allProfiles.has(ProjectType.ROBOTICS)).toBe(true);
      expect(allProfiles.has(ProjectType.HOME_AUTOMATION)).toBe(true);
    });
  });

  describe('CodeAnalyzer', () => {
    let analyzer: CodeAnalyzer;

    beforeEach(() => {
      analyzer = new CodeAnalyzer();
    });

    test('should analyze code patterns', () => {
      const result = analyzer.analyzeCode(mockProject.files);
      expect(result.patterns).toBeDefined();
      expect(result.patterns.length).toBeGreaterThan(0);
    });

    test('should detect delay usage', () => {
      const result = analyzer.analyzeCode(mockProject.files);
      expect(result.timing.delays.length).toBeGreaterThan(0);
    });

    test('should analyze functions', () => {
      const result = analyzer.analyzeCode(mockProject.files);
      expect(result.functions).toBeDefined();
      expect(result.functions.length).toBeGreaterThan(0);
    });

    test('should calculate metrics', () => {
      const result = analyzer.analyzeCode(mockProject.files);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.linesOfCode).toBeGreaterThan(0);
      expect(result.metrics.functionCount).toBeGreaterThan(0);
    });

    test('should generate recommendations', () => {
      const result = analyzer.analyzeCode(mockProject.files);
      expect(result.recommendations).toBeDefined();
    });
  });

  describe('DynamicDeviceInitializer', () => {
    let initializer: DynamicDeviceInitializer;

    beforeEach(() => {
      initializer = new DynamicDeviceInitializer();
    });

    test('should initialize devices successfully', () => {
      const mockAnalysis = {
        type: ProjectType.IOT_SENSOR,
        patterns: [LogicPattern.POLLING_LOOP],
        devices: [],
        pins: { used: [], conflicts: [], suggestions: [], available: [] },
        libraries: ['DHT.h'],
        complexity: 'simple' as const,
        recommendations: []
      };

      const mockProfile = {
        name: 'Test Profile',
        description: 'Test',
        settings: {
          defaultSpeed: 5,
          accuracy: 'medium' as const,
          realTime: false,
          physicsEnabled: true,
          noiseEnabled: true,
          timingPrecision: 'precise' as const,
          powerSimulation: false
        },
        deviceSettings: {
          'dht22': {
            updateRate: 2000,
            accuracy: 'medium' as const,
            noise: 0.2,
            responseTime: 500,
            powerConsumption: 2,
            customSettings: {}
          }
        },
        performance: {
          maxUpdateRate: 60,
          batchSize: 10,
          prioritizeAccuracy: false,
          memoryOptimization: true,
          cpuOptimization: false
        },
        ui: {
          showPowerConsumption: false,
          showTimingDiagram: false,
          showDeviceStates: true,
          showCommunicationBus: false,
          recommendedPanels: ['serial-monitor']
        },
        errorHandling: {
          detectPinConflicts: true,
          detectTimingIssues: false,
          detectMemoryIssues: false,
          detectLogicErrors: true,
          helpfulHints: true,
          autoFix: false
        }
      };

      const result = initializer.initializeDevices(
        mockDevices,
        'arduino-uno',
        mockAnalysis,
        mockProfile
      );

      expect(result.success).toBe(true);
      expect(result.devices).toHaveLength(1);
      expect(result.devices[0].initialized).toBe(true);
    });

    test('should detect pin conflicts', () => {
      const conflictingDevices: DeviceInstance[] = [
        {
          instanceId: 'device1',
          deviceType: 'dht22',
          label: 'Device 1',
          config: { pin: 2 },
          pinMapping: { 'DATA': 2 },
          values: {}
        },
        {
          instanceId: 'device2',
          deviceType: 'dht22',
          label: 'Device 2',
          config: { pin: 2 },
          pinMapping: { 'DATA': 2 },
          values: {}
        }
      ];

      const mockAnalysis = {
        type: ProjectType.IOT_SENSOR,
        patterns: [],
        devices: [],
        pins: { used: [], conflicts: [], suggestions: [], available: [] },
        libraries: [],
        complexity: 'simple' as const,
        recommendations: []
      };

      const mockProfile = {
        name: 'Test',
        description: 'Test',
        settings: {
          defaultSpeed: 5,
          accuracy: 'medium' as const,
          realTime: false,
          physicsEnabled: true,
          noiseEnabled: true,
          timingPrecision: 'precise' as const,
          powerSimulation: false
        },
        deviceSettings: {},
        performance: {
          maxUpdateRate: 60,
          batchSize: 10,
          prioritizeAccuracy: false,
          memoryOptimization: true,
          cpuOptimization: false
        },
        ui: {
          showPowerConsumption: false,
          showTimingDiagram: false,
          showDeviceStates: true,
          showCommunicationBus: false,
          recommendedPanels: []
        },
        errorHandling: {
          detectPinConflicts: true,
          detectTimingIssues: false,
          detectMemoryIssues: false,
          detectLogicErrors: true,
          helpfulHints: true,
          autoFix: false
        }
      };

      const result = initializer.initializeDevices(
        conflictingDevices,
        'arduino-uno',
        mockAnalysis,
        mockProfile
      );

      expect(result.globalIssues.some(issue => issue.type === 'pin_conflict')).toBe(true);
    });
  });

  describe('SmartErrorDetector', () => {
    let detector: SmartErrorDetector;

    beforeEach(() => {
      detector = new SmartErrorDetector();
    });

    test('should detect errors in code', () => {
      const mockCodeAnalysis = {
        patterns: [],
        functions: [],
        timing: { delays: [], timers: [], interrupts: [], realTimeIssues: [] },
        devices: [],
        issues: [{
          type: 'logic_error',
          line: 10,
          severity: 'warning',
          message: 'Test error',
          suggestion: 'Fix it',
          autoFixable: false
        }],
        metrics: {
          linesOfCode: 50,
          cyclomaticComplexity: 5,
          maintainabilityIndex: 70,
          duplicateCode: 0,
          commentRatio: 0.1,
          functionCount: 3,
          globalVariables: 2,
          libraryDependencies: 2
        },
        recommendations: []
      };

      const mockInitResult = {
        success: true,
        devices: [],
        globalIssues: [],
        systemRecommendations: [],
        performanceProfile: {
          totalPowerConsumption: 100,
          totalPinUsage: 5,
          memoryUsage: 512,
          updateRate: 10,
          optimizationPotential: 0.5
        }
      };

      const result = detector.detectErrors(
        mockProject.files,
        mockDevices,
        board,
        {} as any,
        mockCodeAnalysis,
        mockInitResult
      );

      expect(result.errors).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.total).toBeGreaterThan(0);
    });

    test('should categorize errors correctly', () => {
      const mockCodeAnalysis = {
        patterns: [],
        functions: [],
        timing: { delays: [], timers: [], interrupts: [], realTimeIssues: [] },
        devices: [],
        issues: [],
        metrics: {
          linesOfCode: 50,
          cyclomaticComplexity: 5,
          maintainabilityIndex: 70,
          duplicateCode: 0,
          commentRatio: 0.1,
          functionCount: 3,
          globalVariables: 2,
          libraryDependencies: 2
        },
        recommendations: []
      };

      const mockInitResult = {
        success: true,
        devices: [],
        globalIssues: [],
        systemRecommendations: [],
        performanceProfile: {
          totalPowerConsumption: 100,
          totalPinUsage: 5,
          memoryUsage: 512,
          updateRate: 10,
          optimizationPotential: 0.5
        }
      };

      const result = detector.detectErrors(
        mockProject.files,
        mockDevices,
        board,
        {} as any,
        mockCodeAnalysis,
        mockInitResult
      );

      expect(result.summary.byCategory).toBeDefined();
      expect(result.summary.bySeverity).toBeDefined();
    });
  });

  describe('PinMappingSuggester', () => {
    let suggester: PinMappingSuggester;

    beforeEach(() => {
      suggester = new PinMappingSuggester();
    });

    test('should generate pin suggestions', () => {
      const mockAnalysis = {
        type: ProjectType.IOT_SENSOR,
        patterns: [],
        devices: [],
        pins: { used: [], conflicts: [], suggestions: [], available: [] },
        libraries: [],
        complexity: 'simple' as const,
        recommendations: []
      };

      const mockInitResult = {
        success: true,
        devices: [],
        globalIssues: [],
        systemRecommendations: [],
        performanceProfile: {
          totalPowerConsumption: 100,
          totalPinUsage: 5,
          memoryUsage: 512,
          updateRate: 10,
          optimizationPotential: 0.5
        }
      };

      const result = suggester.generateSuggestions(
        mockDevices,
        board,
        mockAnalysis,
        mockInitResult
      );

      expect(result.strategy).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    test('should detect pin conflicts', () => {
      const conflictingDevices: DeviceInstance[] = [
        {
          instanceId: 'device1',
          deviceType: 'dht22',
          label: 'Device 1',
          config: { pin: 2 },
          pinMapping: { 'DATA': 2 },
          values: {}
        },
        {
          instanceId: 'device2',
          deviceType: 'dht22',
          label: 'Device 2',
          config: { pin: 2 },
          pinMapping: { 'DATA': 2 },
          values: {}
        }
      ];

      const mockAnalysis = {
        type: ProjectType.IOT_SENSOR,
        patterns: [],
        devices: [],
        pins: { used: [], conflicts: [], suggestions: [], available: [] },
        libraries: [],
        complexity: 'simple' as const,
        recommendations: []
      };

      const mockInitResult = {
        success: true,
        devices: [],
        globalIssues: [],
        systemRecommendations: [],
        performanceProfile: {
          totalPowerConsumption: 100,
          totalPinUsage: 5,
          memoryUsage: 512,
          updateRate: 10,
          optimizationPotential: 0.5
        }
      };

      const result = suggester.generateSuggestions(
        conflictingDevices,
        board,
        mockAnalysis,
        mockInitResult
      );

      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0].type).toBe('direct_conflict');
    });
  });

  describe('SmartSimulatorUtils', () => {
    test('should detect project type correctly', () => {
      const projectType = SmartSimulatorUtils.detectProjectType(mockProject, mockDevices);
      expect(projectType).toBe('iot_sensor');
    });

    test('should perform quick error check', () => {
      const errorCheck = SmartSimulatorUtils.quickErrorCheck(mockProject, mockDevices);
      expect(errorCheck).toBeDefined();
      expect(errorCheck.errors).toBeDefined();
      expect(errorCheck.summary).toBeDefined();
    });

    test('should get recommended profile', () => {
      const profile = SmartSimulatorUtils.getRecommendedProfile(mockProject, mockDevices);
      expect(profile).toBeDefined();
      expect(profile.name).toBeDefined();
    });
  });

  describe('SmartSimulatorFactory', () => {
    let factory: SmartSimulatorFactory;

    beforeEach(() => {
      factory = SmartSimulatorFactory.getInstance();
    });

    test('should be singleton', () => {
      const factory2 = SmartSimulatorFactory.getInstance();
      expect(factory).toBe(factory2);
    });

    test('should create simulator instance', async () => {
      const mockCallbacks = {
        onSerial: () => {},
        onPinChange: () => {},
        onAnalogChange: () => {},
        onMillisUpdate: () => {},
        onStop: () => {},
        onI2CScan: () => {}
      };

      const simulator = await factory.createSimulator({
        project: mockProject,
        devices: mockDevices,
        callbacks: mockCallbacks,
        options: {
          enableCodeAnalysis: true,
          enableErrorDetection: true,
          enablePinSuggestions: true
        }
      });

      expect(simulator).toBeDefined();
      expect(simulator.getProjectAnalysis).toBeDefined();
      expect(simulator.getCodeAnalysis).toBeDefined();
      expect(simulator.getErrorAnalysis).toBeDefined();
      expect(simulator.getPinMappingSuggestions).toBeDefined();
    });
  });
});

// Integration tests
describe('Smart Simulator Integration', () => {
  test('should work end-to-end with IoT project', async () => {
    const mockCallbacks = {
      onSerial: jest.fn(),
      onPinChange: jest.fn(),
      onAnalogChange: jest.fn(),
      onMillisUpdate: jest.fn(),
      onStop: jest.fn(),
      onI2CScan: jest.fn()
    };

    const simulator = await SmartSimulatorFactory.getInstance().createSimulator({
      project: mockProject,
      devices: mockDevices,
      callbacks: mockCallbacks,
      options: {
        enableCodeAnalysis: true,
        enableErrorDetection: true,
        enablePinSuggestions: true,
        logLevel: 'none'
      }
    });

    // Test project analysis
    const projectAnalysis = simulator.getProjectAnalysis();
    expect(projectAnalysis.type).toBe(ProjectType.IOT_SENSOR);
    expect(projectAnalysis.patterns).toContain(LogicPattern.POLLING_LOOP);

    // Test code analysis
    const codeAnalysis = simulator.getCodeAnalysis();
    expect(codeAnalysis).toBeDefined();
    expect(codeAnalysis.functions.length).toBeGreaterThan(0);

    // Test error analysis
    const errorAnalysis = simulator.getErrorAnalysis();
    expect(errorAnalysis).toBeDefined();
    expect(errorAnalysis.summary).toBeDefined();

    // Test pin suggestions
    const pinSuggestions = simulator.getPinMappingSuggestions();
    expect(pinSuggestions).toBeDefined();
    expect(pinSuggestions.strategy).toBeDefined();

    // Test simulation lifecycle
    await simulator.start();
    simulator.sendSerial('STATUS');
    simulator.setDeviceInput('dht22', 'temperature', 25.5);
    simulator.stop();

    expect(mockCallbacks.onSerial).toHaveBeenCalled();
    simulator.destroy();
  });

  test('should handle complex robotics project', async () => {
    const roboticsProject: Project = {
      id: 'robot-test',
      name: 'Robot Test',
      boardId: 'arduino-mega',
      files: [
        {
          name: 'main.ino',
          content: `
#include <TimerOne.h>
#include <MPU6050.h>

volatile bool motorEnabled = false;

void setup() {
  Serial.begin(115200);
  Timer1.initialize(1000);
  Timer1.attachInterrupt(motorISR);
}

void motorISR() {
  // Motor control logic
}

void loop() {
  // Main control loop
}
          `,
          language: 'cpp',
          modified: false
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const roboticsDevices: DeviceInstance[] = [
      {
        instanceId: 'stepper-1',
        deviceType: 'stepper_a4988',
        label: 'Motor',
        config: { stepsPerRev: 200 },
        pinMapping: { 'STEP': 2, 'DIR': 3, 'ENABLE': 4 },
        values: {}
      },
      {
        instanceId: 'mpu6050-1',
        deviceType: 'mpu6050',
        label: 'IMU',
        config: { i2cAddress: 0x68 },
        pinMapping: { 'SDA': 20, 'SCL': 21 },
        values: {}
      }
    ];

    const mockCallbacks = {
      onSerial: () => {},
      onPinChange: () => {},
      onAnalogChange: () => {},
      onMillisUpdate: () => {},
      onStop: () => {},
      onI2CScan: () => {}
    };

    const simulator = await SmartSimulatorFactory.getInstance().createSimulator({
      project: roboticsProject,
      devices: roboticsDevices,
      callbacks: mockCallbacks,
      options: {
        enableCodeAnalysis: true,
        enableErrorDetection: true,
        enablePinSuggestions: true,
        logLevel: 'none'
      }
    });

    const projectAnalysis = simulator.getProjectAnalysis();
    expect(projectAnalysis.type).toBe(ProjectType.ROBOTICS);
    expect(projectAnalysis.patterns).toContain(LogicPattern.INTERRUPT_DRIVEN);

    simulator.destroy();
  });
});

// Performance tests
describe('Smart Simulator Performance', () => {
  test('should handle large projects efficiently', async () => {
    const largeProject: Project = {
      id: 'large-project',
      name: 'Large Project',
      boardId: 'arduino-mega',
      files: [
        {
          name: 'main.ino',
          content: `
// Large project with many functions and devices
#include <DHT.h>
#include <Wire.h>
#include <SPI.h>
#include <TimerOne.h>
#include <MPU6050.h>
#include <Adafruit_SSD1306.h>

DHT dht1(2, DHT22);
DHT dht2(3, DHT22);
DHT dht3(4, DHT22);
MPU6050 mpu;
Adafruit_SSD1306 display(128, 64, &Wire, -1);

void setup() {
  Serial.begin(115200);
  Wire.begin();
  dht1.begin();
  dht2.begin();
  dht3.begin();
  mpu.initialize();
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  Timer1.initialize(1000);
  Timer1.attachInterrupt(timerISR);
}

void timerISR() {
  // Timer interrupt service
}

void loop() {
  readAllSensors();
  processData();
  updateDisplay();
  handleCommunication();
  delay(100);
}

void readAllSensors() {
  // Read multiple sensors
}

void processData() {
  // Process sensor data
}

void updateDisplay() {
  // Update OLED display
}

void handleCommunication() {
  // Handle serial communication
}
          `,
          language: 'cpp',
          modified: false
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const manyDevices: DeviceInstance[] = [];
    for (let i = 0; i < 10; i++) {
      manyDevices.push({
        instanceId: `device-${i}`,
        deviceType: 'dht22',
        label: `Sensor ${i}`,
        config: { pin: 2 + i },
        pinMapping: { 'DATA': 2 + i },
        values: {}
      });
    }

    const startTime = Date.now();
    
    const projectType = SmartSimulatorUtils.detectProjectType(largeProject, manyDevices);
    const errorCheck = SmartSimulatorUtils.quickErrorCheck(largeProject, manyDevices);
    const profile = SmartSimulatorUtils.getRecommendedProfile(largeProject, manyDevices);
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;

    expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
    expect(projectType).toBeDefined();
    expect(errorCheck).toBeDefined();
    expect(profile).toBeDefined();
  });
});
