/**
 * Project Analyzer — Smart detection of project types and user logic patterns
 *
 * Analyzes Arduino code and device configurations to determine:
 * - Project type (IoT sensor, robotics, automation, etc.)
 * - Device usage patterns
 * - Code structure and logic patterns
 * - Pin mapping requirements
 * - Simulation optimization opportunities
 */

import type { Project, DeviceInstance, Board } from '@/types';

export enum ProjectType {
  IOT_SENSOR = 'iot_sensor',
  ROBOTICS = 'robotics',
  HOME_AUTOMATION = 'home_automation',
  DATA_LOGGER = 'data_logger',
  MOTOR_CONTROL = 'motor_control',
  DISPLAY_PROJECT = 'display_project',
  COMMUNICATION = 'communication',
  GENERIC = 'generic'
}

export enum LogicPattern {
  POLLING_LOOP = 'polling_loop',
  INTERRUPT_DRIVEN = 'interrupt_driven',
  STATE_MACHINE = 'state_machine',
  TIMED_OPERATIONS = 'timed_operations',
  EVENT_DRIVEN = 'event_driven',
  SEQUENTIAL = 'sequential'
}

export interface ProjectAnalysis {
  type: ProjectType;
  patterns: LogicPattern[];
  devices: DeviceAnalysis[];
  pins: PinAnalysis;
  libraries: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  recommendations: SimulationRecommendation[];
}

export interface DeviceAnalysis {
  deviceType: string;
  count: number;
  pins: number[];
  communication: 'i2c' | 'spi' | 'digital' | 'analog' | 'custom';
  usage: 'input' | 'output' | 'bidirectional';
  frequency?: 'low' | 'medium' | 'high'; // for communication devices
}

export interface PinAnalysis {
  used: number[];
  conflicts: number[];
  suggestions: PinSuggestion[];
  available: number[];
}

export interface PinSuggestion {
  pin: number;
  reason: string;
  alternatives?: number[];
}

export interface SimulationRecommendation {
  type: 'speed' | 'accuracy' | 'features' | 'optimization';
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export class ProjectAnalyzer {
  private readonly devicePatterns = new Map<string, ProjectType[]>([
    ['hx711', [ProjectType.IOT_SENSOR, ProjectType.DATA_LOGGER]],
    ['ina260', [ProjectType.IOT_SENSOR, ProjectType.DATA_LOGGER]],
    ['dht22', [ProjectType.IOT_SENSOR, ProjectType.HOME_AUTOMATION]],
    ['bmp280', [ProjectType.IOT_SENSOR, ProjectType.DATA_LOGGER]],
    ['mpu6050', [ProjectType.ROBOTICS, ProjectType.IOT_SENSOR]],
    ['stepper_a4988', [ProjectType.ROBOTICS, ProjectType.MOTOR_CONTROL]],
    ['ssd1306_oled', [ProjectType.DISPLAY_PROJECT, ProjectType.IOT_SENSOR]],
    ['relay_module', [ProjectType.HOME_AUTOMATION, ProjectType.MOTOR_CONTROL]],
    ['hc_sr04', [ProjectType.ROBOTICS, ProjectType.IOT_SENSOR]],
  ]);

  private readonly codePatterns = new Map<RegExp, LogicPattern[]>([
    [/loop\s*\(\s*\)\s*{[^}]*delay\s*\(/g, [LogicPattern.POLLING_LOOP]],
    [/attachInterrupt\s*\(/g, [LogicPattern.INTERRUPT_DRIVEN]],
    [/switch\s*\([^)]+\)\s*{[^}]*case[^}]*break/g, [LogicPattern.STATE_MACHINE]],
    [/millis\s*\(\s*\)[^}]*>/g, [LogicPattern.TIMED_OPERATIONS]],
    [/Serial\.available\s*\(\s*\)/g, [LogicPattern.EVENT_DRIVEN]],
    [/for\s*\([^)]*\)[^}]*{[^}]*delay/g, [LogicPattern.SEQUENTIAL]]
  ]);

  private readonly libraryPatterns = new Map<string, ProjectType[]>([
    ['Wire.h', [ProjectType.IOT_SENSOR, ProjectType.ROBOTICS]],
    ['SPI.h', [ProjectType.ROBOTICS, ProjectType.COMMUNICATION]],
    ['TimerOne.h', [ProjectType.MOTOR_CONTROL, ProjectType.ROBOTICS]],
    ['DHT.h', [ProjectType.IOT_SENSOR, ProjectType.HOME_AUTOMATION]],
    ['Adafruit_GFX', [ProjectType.DISPLAY_PROJECT]],
    ['Servo.h', [ProjectType.ROBOTICS, ProjectType.MOTOR_CONTROL]],
    ['Ethernet.h', [ProjectType.COMMUNICATION]],
    ['WiFi.h', [ProjectType.IOT_SENSOR, ProjectType.COMMUNICATION]],
  ]);

  analyzeProject(project: Project, board: Board, devices: DeviceInstance[]): ProjectAnalysis {
    const code = this.extractCode(project);
    const deviceAnalysis = this.analyzeDevices(devices);
    const detectedPatterns = this.analyzeCodePatterns(code);
    const libraries = this.extractLibraries(code);
    const pinAnalysis = this.analyzePins(devices, board);

    const type = this.determineProjectType(deviceAnalysis, libraries, detectedPatterns);
    const complexity = this.assessComplexity(code, deviceAnalysis, detectedPatterns);
    const recommendations = this.generateRecommendations(type, deviceAnalysis, detectedPatterns, complexity);

    return {
      type,
      patterns: detectedPatterns,
      devices: deviceAnalysis,
      pins: pinAnalysis,
      libraries,
      complexity,
      recommendations
    };
  }

  private extractCode(project: Project): string {
    return project.files
      .filter(f => f.language === 'cpp')
      .map(f => f.content)
      .join('\n');
  }

  private analyzeDevices(devices: DeviceInstance[]): DeviceAnalysis[] {
    const deviceMap = new Map<string, DeviceAnalysis>();

    devices.forEach(device => {
      const existing = deviceMap.get(device.deviceType) || {
        deviceType: device.deviceType,
        count: 0,
        pins: [],
        communication: 'digital' as const,
        usage: 'input' as const
      };

      existing.count++;
      existing.pins.push(...Object.values(device.pinMapping));

      // Determine communication type based on device pins
      if (device.pinMapping.SDA !== undefined && device.pinMapping.SCL !== undefined) {
        existing.communication = 'i2c';
      } else if (device.pinMapping.MOSI !== undefined || device.pinMapping.MISO !== undefined) {
        existing.communication = 'spi';
      } else if (device.pinMapping.DOUT !== undefined && device.pinMapping.SCK !== undefined) {
        existing.communication = 'custom';
      }

      deviceMap.set(device.deviceType, existing);
    });

    return Array.from(deviceMap.values());
  }

  private analyzeCodePatterns(code: string): LogicPattern[] {
    const patterns = new Set<LogicPattern>();

    this.codePatterns.forEach((detectedPatterns, regex) => {
      if (regex.test(code)) {
        detectedPatterns.forEach(pattern => patterns.add(pattern));
      }
    });

    return Array.from(patterns);
  }

  private extractLibraries(code: string): string[] {
    const libraries: string[] = [];
    const includeRegex = /#include\s*[<"]([^>"]+)[>"]/g;
    let match;

    while ((match = includeRegex.exec(code)) !== null) {
      libraries.push(match[1]);
    }

    return libraries;
  }

  private analyzePins(devices: DeviceInstance[], board: Board): PinAnalysis {
    const usedPins = new Set<number>();
    const conflicts = new Set<number>();
    const suggestions: PinSuggestion[] = [];

    devices.forEach(device => {
      Object.values(device.pinMapping).forEach(pin => {
        if (usedPins.has(pin)) {
          conflicts.add(pin);
        } else {
          usedPins.add(pin);
        }
      });
    });

    // Generate suggestions for common conflicts
    if (conflicts.has(0) || conflicts.has(1)) {
      suggestions.push({
        pin: 0,
        reason: 'Pins 0/1 used for Serial communication, consider alternative pins',
        alternatives: [2, 3, 4]
      });
    }

    const allPins = new Set(board.pins.map(p => p.number));
    const available = Array.from(allPins).filter(pin => !usedPins.has(pin));

    return {
      used: Array.from(usedPins),
      conflicts: Array.from(conflicts),
      suggestions,
      available
    };
  }

  private determineProjectType(
    deviceAnalysis: DeviceAnalysis[],
    libraries: string[],
    patterns: LogicPattern[]
  ): ProjectType {
    const typeScores = new Map<ProjectType, number>();

    // Score based on devices
    deviceAnalysis.forEach(device => {
      const deviceTypes = this.devicePatterns.get(device.deviceType) || [];
      deviceTypes.forEach(type => {
        typeScores.set(type, (typeScores.get(type) || 0) + 2);
      });
    });

    // Score based on libraries
    libraries.forEach(lib => {
      const libTypes = this.libraryPatterns.get(lib) || [];
      libTypes.forEach(type => {
        typeScores.set(type, (typeScores.get(type) || 0) + 1);
      });
    });

    // Bonus points for specific patterns
    if (patterns.includes(LogicPattern.INTERRUPT_DRIVEN)) {
      typeScores.set(ProjectType.ROBOTICS, (typeScores.get(ProjectType.ROBOTICS) || 0) + 1);
      typeScores.set(ProjectType.MOTOR_CONTROL, (typeScores.get(ProjectType.MOTOR_CONTROL) || 0) + 1);
    }

    if (patterns.includes(LogicPattern.POLLING_LOOP)) {
      typeScores.set(ProjectType.IOT_SENSOR, (typeScores.get(ProjectType.IOT_SENSOR) || 0) + 1);
      typeScores.set(ProjectType.DATA_LOGGER, (typeScores.get(ProjectType.DATA_LOGGER) || 0) + 1);
    }

    // Find the highest scoring type
    let maxScore = 0;
    let resultType = ProjectType.GENERIC;

    typeScores.forEach((score, type) => {
      if (score > maxScore) {
        maxScore = score;
        resultType = type;
      }
    });

    return resultType;
  }

  private assessComplexity(
    code: string,
    deviceAnalysis: DeviceAnalysis[],
    patterns: LogicPattern[]
  ): 'simple' | 'moderate' | 'complex' {
    let complexity = 0;

    // Device count contributes to complexity
    complexity += deviceAnalysis.length;
    complexity += deviceAnalysis.filter(d => d.count > 1).length;

    // Code patterns
    if (patterns.includes(LogicPattern.STATE_MACHINE)) complexity += 2;
    if (patterns.includes(LogicPattern.INTERRUPT_DRIVEN)) complexity += 2;
    if (patterns.includes(LogicPattern.TIMED_OPERATIONS)) complexity += 1;

    // Code length and structure
    const lineCount = code.split('\n').length;
    if (lineCount > 200) complexity += 2;
    else if (lineCount > 100) complexity += 1;

    // Function count
    const functionCount = (code.match(/\w+\s*\([^)]*\)\s*{/g) || []).length;
    complexity += Math.min(functionCount, 3);

    if (complexity <= 3) return 'simple';
    if (complexity <= 7) return 'moderate';
    return 'complex';
  }

  private generateRecommendations(
    type: ProjectType,
    devices: DeviceAnalysis[],
    patterns: LogicPattern[],
    complexity: 'simple' | 'moderate' | 'complex'
  ): SimulationRecommendation[] {
    const recommendations: SimulationRecommendation[] = [];

    // Type-specific recommendations
    switch (type) {
      case ProjectType.IOT_SENSOR:
        recommendations.push({
          type: 'accuracy',
          description: 'Enable realistic sensor noise and drift modeling',
          priority: 'high'
        });
        recommendations.push({
          type: 'features',
          description: 'Simulate network communication and data transmission',
          priority: 'medium'
        });
        break;

      case ProjectType.ROBOTICS:
        recommendations.push({
          type: 'speed',
          description: 'Use high-speed simulation for motor control responsiveness',
          priority: 'high'
        });
        recommendations.push({
          type: 'accuracy',
          description: 'Enable precise timing for interrupt-driven operations',
          priority: 'high'
        });
        break;

      case ProjectType.HOME_AUTOMATION:
        recommendations.push({
          type: 'features',
          description: 'Simulate relay switching delays and power consumption',
          priority: 'medium'
        });
        break;
    }

    // Pattern-based recommendations
    if (patterns.includes(LogicPattern.INTERRUPT_DRIVEN)) {
      recommendations.push({
        type: 'accuracy',
        description: 'Enable precise interrupt timing simulation',
        priority: 'high'
      });
    }

    if (patterns.includes(LogicPattern.TIMED_OPERATIONS)) {
      recommendations.push({
        type: 'accuracy',
        description: 'Ensure accurate millis() timing for non-blocking delays',
        priority: 'medium'
      });
    }

    // Complexity-based recommendations
    if (complexity === 'complex') {
      recommendations.push({
        type: 'optimization',
        description: 'Consider reducing simulation speed for stability',
        priority: 'low'
      });
    }

    return recommendations;
  }
}
