/**
 * Simulation Profiles — Adaptive configurations for different project types
 *
 * Each profile defines:
 * - Default simulation parameters (speed, accuracy, features)
 * - Device-specific settings
 * - Error handling behavior
 * - Performance optimizations
 * - User interface recommendations
 */

import { ProjectType, LogicPattern, type DeviceAnalysis } from './project-analyzer';
import type { DeviceInstance } from '@/types';

export interface SimulationProfile {
  name: string;
  description: string;
  settings: ProfileSettings;
  deviceSettings: DeviceProfileSettings;
  performance: PerformanceSettings;
  ui: UISettings;
  errorHandling: ErrorHandlingSettings;
}

export interface ProfileSettings {
  defaultSpeed: number;
  accuracy: 'low' | 'medium' | 'high';
  realTime: boolean;
  physicsEnabled: boolean;
  noiseEnabled: boolean;
  timingPrecision: 'approximate' | 'precise' | 'ultra-precise';
  powerSimulation: boolean;
}

export interface DeviceProfileSettings {
  [deviceType: string]: DeviceSettings;
}

export interface DeviceSettings {
  updateRate: number; // ms between updates
  accuracy: 'low' | 'medium' | 'high';
  noise: number; // noise factor (0-1)
  responseTime: number; // device response time in ms
  powerConsumption: number; // mW
  customSettings?: Record<string, any>;
}

export interface PerformanceSettings {
  maxUpdateRate: number; // Hz
  batchSize: number;
  prioritizeAccuracy: boolean;
  memoryOptimization: boolean;
  cpuOptimization: boolean;
}

export interface UISettings {
  showPowerConsumption: boolean;
  showTimingDiagram: boolean;
  showDeviceStates: boolean;
  showCommunicationBus: boolean;
  recommendedPanels: string[];
}

export interface ErrorHandlingSettings {
  detectPinConflicts: boolean;
  detectTimingIssues: boolean;
  detectMemoryIssues: boolean;
  detectLogicErrors: boolean;
  helpfulHints: boolean;
  autoFix: boolean;
}

export class SimulationProfileManager {
  private profiles = new Map<ProjectType, SimulationProfile>();

  constructor() {
    this.initializeProfiles();
  }

  private initializeProfiles() {
    // IoT Sensor Profile
    this.profiles.set(ProjectType.IOT_SENSOR, {
      name: 'IoT Sensor Network',
      description: 'Optimized for sensor data collection and transmission',
      settings: {
        defaultSpeed: 5,
        accuracy: 'high',
        realTime: false,
        physicsEnabled: true,
        noiseEnabled: true,
        timingPrecision: 'precise',
        powerSimulation: true
      },
      deviceSettings: {
        'hx711': {
          updateRate: 100,
          accuracy: 'high',
          noise: 0.3,
          responseTime: 50,
          powerConsumption: 15,
          customSettings: {
            temperatureDrift: true,
            calibrationDrift: true
          }
        },
        'ina260': {
          updateRate: 50,
          accuracy: 'high',
          noise: 0.1,
          responseTime: 10,
          powerConsumption: 5
        },
        'dht22': {
          updateRate: 2000,
          accuracy: 'medium',
          noise: 0.2,
          responseTime: 500,
          powerConsumption: 2
        },
        'bmp280': {
          updateRate: 1000,
          accuracy: 'high',
          noise: 0.15,
          responseTime: 100,
          powerConsumption: 3
        }
      },
      performance: {
        maxUpdateRate: 60,
        batchSize: 10,
        prioritizeAccuracy: true,
        memoryOptimization: true,
        cpuOptimization: false
      },
      ui: {
        showPowerConsumption: true,
        showTimingDiagram: false,
        showDeviceStates: true,
        showCommunicationBus: true,
        recommendedPanels: ['serial-monitor', 'sensor-dashboard', 'data-logger']
      },
      errorHandling: {
        detectPinConflicts: true,
        detectTimingIssues: true,
        detectMemoryIssues: false,
        detectLogicErrors: true,
        helpfulHints: true,
        autoFix: false
      }
    });

    // Robotics Profile
    this.profiles.set(ProjectType.ROBOTICS, {
      name: 'Robotics Control',
      description: 'Optimized for motor control and real-time operations',
      settings: {
        defaultSpeed: 10,
        accuracy: 'high',
        realTime: true,
        physicsEnabled: true,
        noiseEnabled: false,
        timingPrecision: 'ultra-precise',
        powerSimulation: true
      },
      deviceSettings: {
        'stepper_a4988': {
          updateRate: 1,
          accuracy: 'high',
          noise: 0.05,
          responseTime: 1,
          powerConsumption: 500,
          customSettings: {
            microstepping: true,
            torqueSimulation: true,
            backEMF: true
          }
        },
        'mpu6050': {
          updateRate: 10,
          accuracy: 'high',
          noise: 0.1,
          responseTime: 5,
          powerConsumption: 10
        },
        'hc_sr04': {
          updateRate: 50,
          accuracy: 'medium',
          noise: 0.2,
          responseTime: 20,
          powerConsumption: 20
        },
        'servo': {
          updateRate: 20,
          accuracy: 'high',
          noise: 0.1,
          responseTime: 10,
          powerConsumption: 100
        }
      },
      performance: {
        maxUpdateRate: 1000,
        batchSize: 1,
        prioritizeAccuracy: true,
        memoryOptimization: false,
        cpuOptimization: true
      },
      ui: {
        showPowerConsumption: true,
        showTimingDiagram: true,
        showDeviceStates: true,
        showCommunicationBus: false,
        recommendedPanels: ['motor-control', 'timing-analyzer', 'imu-visualizer']
      },
      errorHandling: {
        detectPinConflicts: true,
        detectTimingIssues: true,
        detectMemoryIssues: true,
        detectLogicErrors: true,
        helpfulHints: true,
        autoFix: true
      }
    });

    // Home Automation Profile
    this.profiles.set(ProjectType.HOME_AUTOMATION, {
      name: 'Home Automation',
      description: 'Optimized for relay control and environmental monitoring',
      settings: {
        defaultSpeed: 3,
        accuracy: 'medium',
        realTime: false,
        physicsEnabled: true,
        noiseEnabled: true,
        timingPrecision: 'precise',
        powerSimulation: true
      },
      deviceSettings: {
        'relay_module': {
          updateRate: 100,
          accuracy: 'medium',
          noise: 0.1,
          responseTime: 20,
          powerConsumption: 50,
          customSettings: {
            switchingDelay: true,
            contactBounce: true
          }
        },
        'dht22': {
          updateRate: 5000,
          accuracy: 'medium',
          noise: 0.3,
          responseTime: 1000,
          powerConsumption: 2
        },
        'push_button': {
          updateRate: 10,
          accuracy: 'high',
          noise: 0.1,
          responseTime: 1,
          powerConsumption: 1
        },
        'led': {
          updateRate: 50,
          accuracy: 'low',
          noise: 0,
          responseTime: 1,
          powerConsumption: 20
        }
      },
      performance: {
        maxUpdateRate: 30,
        batchSize: 20,
        prioritizeAccuracy: false,
        memoryOptimization: true,
        cpuOptimization: false
      },
      ui: {
        showPowerConsumption: true,
        showTimingDiagram: false,
        showDeviceStates: true,
        showCommunicationBus: false,
        recommendedPanels: ['relay-panel', 'environmental-dashboard', 'schedule-viewer']
      },
      errorHandling: {
        detectPinConflicts: true,
        detectTimingIssues: false,
        detectMemoryIssues: false,
        detectLogicErrors: true,
        helpfulHints: true,
        autoFix: false
      }
    });

    // Data Logger Profile
    this.profiles.set(ProjectType.DATA_LOGGER, {
      name: 'Data Logger',
      description: 'Optimized for high-frequency data collection and storage',
      settings: {
        defaultSpeed: 8,
        accuracy: 'high',
        realTime: false,
        physicsEnabled: true,
        noiseEnabled: true,
        timingPrecision: 'precise',
        powerSimulation: false
      },
      deviceSettings: {
        'hx711': {
          updateRate: 50,
          accuracy: 'high',
          noise: 0.2,
          responseTime: 25,
          powerConsumption: 15
        },
        'ina260': {
          updateRate: 25,
          accuracy: 'high',
          noise: 0.05,
          responseTime: 5,
          powerConsumption: 5
        },
        'bmp280': {
          updateRate: 500,
          accuracy: 'high',
          noise: 0.1,
          responseTime: 50,
          powerConsumption: 3
        },
        'sd_card': {
          updateRate: 1000,
          accuracy: 'high',
          noise: 0,
          responseTime: 100,
          powerConsumption: 30
        }
      },
      performance: {
        maxUpdateRate: 100,
        batchSize: 50,
        prioritizeAccuracy: true,
        memoryOptimization: true,
        cpuOptimization: false
      },
      ui: {
        showPowerConsumption: false,
        showTimingDiagram: false,
        showDeviceStates: true,
        showCommunicationBus: false,
        recommendedPanels: ['data-logger', 'storage-monitor', 'sensor-graphs']
      },
      errorHandling: {
        detectPinConflicts: true,
        detectTimingIssues: false,
        detectMemoryIssues: true,
        detectLogicErrors: true,
        helpfulHints: true,
        autoFix: false
      }
    });

    // Motor Control Profile
    this.profiles.set(ProjectType.MOTOR_CONTROL, {
      name: 'Motor Control',
      description: 'Optimized for precise motor control and feedback',
      settings: {
        defaultSpeed: 15,
        accuracy: 'high',
        realTime: true,
        physicsEnabled: true,
        noiseEnabled: false,
        timingPrecision: 'ultra-precise',
        powerSimulation: true
      },
      deviceSettings: {
        'stepper_a4988': {
          updateRate: 0.5,
          accuracy: 'high',
          noise: 0.02,
          responseTime: 0.5,
          powerConsumption: 500,
          customSettings: {
            microstepping: true,
            torqueSimulation: true,
            thermalSimulation: true
          }
        },
        'encoder': {
          updateRate: 1,
          accuracy: 'high',
          noise: 0.05,
          responseTime: 1,
          powerConsumption: 20
        },
        'motor_driver': {
          updateRate: 1,
          accuracy: 'high',
          noise: 0.1,
          responseTime: 2,
          powerConsumption: 200
        }
      },
      performance: {
        maxUpdateRate: 2000,
        batchSize: 1,
        prioritizeAccuracy: true,
        memoryOptimization: false,
        cpuOptimization: true
      },
      ui: {
        showPowerConsumption: true,
        showTimingDiagram: true,
        showDeviceStates: true,
        showCommunicationBus: false,
        recommendedPanels: ['motor-control', 'pid-tuner', 'oscilloscope']
      },
      errorHandling: {
        detectPinConflicts: true,
        detectTimingIssues: true,
        detectMemoryIssues: false,
        detectLogicErrors: true,
        helpfulHints: true,
        autoFix: true
      }
    });

    // Display Project Profile
    this.profiles.set(ProjectType.DISPLAY_PROJECT, {
      name: 'Display Project',
      description: 'Optimized for graphics and user interface projects',
      settings: {
        defaultSpeed: 5,
        accuracy: 'medium',
        realTime: false,
        physicsEnabled: false,
        noiseEnabled: false,
        timingPrecision: 'precise',
        powerSimulation: false
      },
      deviceSettings: {
        'ssd1306_oled': {
          updateRate: 30,
          accuracy: 'medium',
          noise: 0,
          responseTime: 10,
          powerConsumption: 50
        },
        'tft_lcd': {
          updateRate: 30,
          accuracy: 'medium',
          noise: 0,
          responseTime: 20,
          powerConsumption: 100
        },
        'touchscreen': {
          updateRate: 60,
          accuracy: 'medium',
          noise: 0.2,
          responseTime: 5,
          powerConsumption: 30
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
        showCommunicationBus: true,
        recommendedPanels: ['display-preview', 'graphics-editor', 'touch-simulator']
      },
      errorHandling: {
        detectPinConflicts: true,
        detectTimingIssues: false,
        detectMemoryIssues: true,
        detectLogicErrors: true,
        helpfulHints: true,
        autoFix: false
      }
    });

    // Generic Profile
    this.profiles.set(ProjectType.GENERIC, {
      name: 'Generic Arduino',
      description: 'Balanced settings for general-purpose projects',
      settings: {
        defaultSpeed: 5,
        accuracy: 'medium',
        realTime: false,
        physicsEnabled: true,
        noiseEnabled: true,
        timingPrecision: 'precise',
        powerSimulation: false
      },
      deviceSettings: {
        'led': {
          updateRate: 50,
          accuracy: 'low',
          noise: 0,
          responseTime: 1,
          powerConsumption: 20
        },
        'push_button': {
          updateRate: 10,
          accuracy: 'medium',
          noise: 0.1,
          responseTime: 1,
          powerConsumption: 1
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
        recommendedPanels: ['serial-monitor', 'pin-viewer', 'basic-controls']
      },
      errorHandling: {
        detectPinConflicts: true,
        detectTimingIssues: false,
        detectMemoryIssues: false,
        detectLogicErrors: true,
        helpfulHints: true,
        autoFix: false
      }
    });
  }

  getProfile(type: ProjectType): SimulationProfile {
    return this.profiles.get(type) || this.profiles.get(ProjectType.GENERIC)!;
  }

  adaptProfile(
    baseType: ProjectType,
    devices: DeviceAnalysis[],
    patterns: LogicPattern[],
    complexity: 'simple' | 'moderate' | 'complex'
  ): SimulationProfile {
    const baseProfile = this.getProfile(baseType);
    const adapted = JSON.parse(JSON.stringify(baseProfile)) as SimulationProfile;

    // Adapt based on devices
    devices.forEach(device => {
      if (!adapted.deviceSettings[device.deviceType]) {
        adapted.deviceSettings[device.deviceType] = {
          updateRate: 100,
          accuracy: 'medium',
          noise: 0.1,
          responseTime: 10,
          powerConsumption: 10
        };
      }
    });

    // Adapt based on patterns
    if (patterns.includes(LogicPattern.INTERRUPT_DRIVEN)) {
      adapted.settings.timingPrecision = 'ultra-precise';
      adapted.performance.maxUpdateRate = Math.max(adapted.performance.maxUpdateRate, 1000);
    }

    if (patterns.includes(LogicPattern.POLLING_LOOP)) {
      adapted.settings.realTime = false;
      adapted.performance.batchSize = Math.max(adapted.performance.batchSize, 20);
    }

    // Adapt based on complexity
    if (complexity === 'complex') {
      adapted.settings.defaultSpeed = Math.min(adapted.settings.defaultSpeed, 3);
      adapted.performance.memoryOptimization = true;
    } else if (complexity === 'simple') {
      adapted.settings.defaultSpeed = Math.max(adapted.settings.defaultSpeed, 10);
    }

    return adapted;
  }

  getAllProfiles(): Map<ProjectType, SimulationProfile> {
    return new Map(this.profiles);
  }
}
