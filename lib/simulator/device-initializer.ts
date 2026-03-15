/**
 * Dynamic Device Initializer — Smart device setup based on project configuration
 *
 * Automatically initializes devices based on:
 * - Project device instances
 * - Detected code patterns
 * - Board capabilities
 * - Device compatibility
 * - Pin availability and conflicts
 */

import type { DeviceInstance, Board, Device } from '@/types';
import { ProjectAnalysis, LogicPattern } from './project-analyzer';
import type { SimulationProfile } from './simulation-profiles';
import { getDeviceById, getDevicesByCategory } from '@/lib/devices';
import { getBoardById } from '@/lib/boards';

export interface DeviceInitialization {
  instance: DeviceInstance;
  initialized: boolean;
  settings: DeviceSettings;
  pinMapping: PinMappingResult;
  issues: DeviceInitIssue[];
  recommendations: DeviceRecommendation[];
}

export interface DeviceSettings {
  updateRate: number;
  accuracy: 'low' | 'medium' | 'high';
  noiseLevel: number;
  responseTime: number;
  powerConsumption: number;
  customSettings: Record<string, any>;
}

export interface PinMappingResult {
  success: boolean;
  mapping: Record<string, number>;
  conflicts: PinConflict[];
  alternatives: PinAlternative[];
  warnings: string[];
}

export interface PinConflict {
  pin: number;
  devices: string[];
  severity: 'warning' | 'error';
  resolution?: string;
}

export interface PinAlternative {
  devicePin: string;
  suggestedPin: number;
  reason: string;
  confidence: number;
}

export interface DeviceInitIssue {
  type: 'pin_conflict' | 'missing_library' | 'incompatible_board' | 'power_issue' | 'configuration_error';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  suggestion?: string;
  autoFixable: boolean;
}

export interface DeviceRecommendation {
  type: 'pin_optimization' | 'power_optimization' | 'performance_optimization' | 'feature_enhancement';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
}

export interface InitializationResult {
  success: boolean;
  devices: DeviceInitialization[];
  globalIssues: GlobalIssue[];
  systemRecommendations: SystemRecommendation[];
  performanceProfile: PerformanceProfile;
}

export interface GlobalIssue {
  type: 'power_budget' | 'pin_exhaustion' | 'memory_limit' | 'timing_conflict';
  severity: 'warning' | 'error' | 'critical';
  message: string;
  affectedDevices: string[];
  suggestion: string;
}

export interface SystemRecommendation {
  type: 'hardware_upgrade' | 'code_refactoring' | 'device_replacement' | 'pin_multiplexing';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  cost: 'low' | 'medium' | 'high';
}

export interface PerformanceProfile {
  totalPowerConsumption: number; // mW
  totalPinUsage: number;
  memoryUsage: number; // bytes
  updateRate: number; // Hz
  bottleneckDevice?: string;
  optimizationPotential: number; // 0-1
}

export class DynamicDeviceInitializer {
  private board?: Board;
  private analysis?: ProjectAnalysis;
  private profile?: SimulationProfile;
  private usedPins = new Set<number>();
  private powerBudget = 0;

  initializeDevices(
    devices: DeviceInstance[],
    boardId: string,
    analysis: ProjectAnalysis,
    profile: SimulationProfile
  ): InitializationResult {
    this.board = getBoardById(boardId);
    this.analysis = analysis;
    this.profile = profile;
    this.usedPins.clear();
    this.powerBudget = this.calculatePowerBudget();

    if (!this.board) {
      throw new Error(`Board not found: ${boardId}`);
    }

    const initializations: DeviceInitialization[] = [];
    const globalIssues: GlobalIssue[] = [];

    // Initialize each device
    devices.forEach(device => {
      const init = this.initializeDevice(device, devices);
      initializations.push(init);
    });

    // Detect global issues
    this.detectGlobalIssues(initializations, globalIssues);

    // Generate system recommendations
    const systemRecommendations = this.generateSystemRecommendations(initializations, globalIssues);

    // Calculate performance profile
    const performanceProfile = this.calculatePerformanceProfile(initializations);

    const success = globalIssues.filter(i => i.severity === 'critical' || i.severity === 'error').length === 0;

    return {
      success,
      devices: initializations,
      globalIssues,
      systemRecommendations,
      performanceProfile
    };
  }

  private initializeDevice(device: DeviceInstance, allDevices: DeviceInstance[]): DeviceInitialization {
    const deviceDef = getDeviceById(device.deviceType);
    if (!deviceDef) {
      return this.createFailedInitialization(device, 'Unknown device type');
    }

    const settings = this.determineDeviceSettings(device, deviceDef);
    const pinMapping = this.resolvePinMapping(device, deviceDef, allDevices);
    const issues = this.detectDeviceIssues(device, deviceDef, pinMapping);
    const recommendations = this.generateDeviceRecommendations(device, deviceDef, settings, pinMapping);

    return {
      instance: device,
      initialized: pinMapping.success && issues.filter(i => i.severity === 'error').length === 0,
      settings,
      pinMapping,
      issues,
      recommendations
    };
  }

  private determineDeviceSettings(device: DeviceInstance, deviceDef: Device): DeviceSettings {
    const profileSettings = this.profile?.deviceSettings[device.deviceType];
    
    const baseSettings: DeviceSettings = {
      updateRate: 100,
      accuracy: 'medium',
      noiseLevel: 0.1,
      responseTime: 10,
      powerConsumption: 10,
      customSettings: {}
    };

    // Apply profile settings
    if (profileSettings) {
      baseSettings.updateRate = profileSettings.updateRate;
      baseSettings.accuracy = profileSettings.accuracy;
      baseSettings.noiseLevel = profileSettings.noise;
      baseSettings.responseTime = profileSettings.responseTime;
      baseSettings.powerConsumption = profileSettings.powerConsumption;
    }

    // Apply device-specific custom settings
    if (profileSettings?.customSettings) {
      baseSettings.customSettings = { ...profileSettings.customSettings };
    }

    // Apply instance configuration
    Object.entries(device.config).forEach(([key, value]) => {
      baseSettings.customSettings[key] = value;
    });

    // Adapt based on project analysis
    this.adaptSettingsForProject(baseSettings, device.deviceType);

    return baseSettings;
  }

  private adaptSettingsForProject(settings: DeviceSettings, deviceType: string): void {
    if (!this.analysis) return;

    // Adapt based on project type
    switch (this.analysis.type) {
      case 'iot_sensor':
        if (['hx711', 'ina260', 'dht22', 'bmp280'].includes(deviceType)) {
          settings.accuracy = 'high';
          settings.noiseLevel = Math.max(0.05, settings.noiseLevel);
        }
        break;
      case 'robotics':
        if (['stepper_a4988', 'mpu6050', 'hc_sr04'].includes(deviceType)) {
          settings.updateRate = Math.max(10, settings.updateRate);
          settings.responseTime = Math.min(5, settings.responseTime);
        }
        break;
      case 'home_automation':
        if (['relay_module', 'dht22'].includes(deviceType)) {
          settings.responseTime = Math.max(20, settings.responseTime);
        }
        break;
    }

    // Adapt based on logic patterns
    if (this.analysis.patterns.includes(LogicPattern.INTERRUPT_DRIVEN)) {
      settings.responseTime = Math.min(1, settings.responseTime);
      settings.updateRate = Math.max(100, settings.updateRate);
    }

    if (this.analysis.patterns.includes(LogicPattern.POLLING_LOOP)) {
      settings.updateRate = Math.min(50, settings.updateRate);
    }
  }

  private resolvePinMapping(
    device: DeviceInstance,
    deviceDef: Device,
    allDevices: DeviceInstance[]
  ): PinMappingResult {
    const mapping: Record<string, number> = {};
    const conflicts: PinConflict[] = [];
    const alternatives: PinAlternative[] = [];
    const warnings: string[] = [];
    let success = true;

    // Start with existing mapping if provided
    if (device.pinMapping && Object.keys(device.pinMapping).length > 0) {
      Object.assign(mapping, device.pinMapping);
    } else {
      // Generate automatic mapping
      this.generateAutomaticMapping(device, deviceDef, mapping);
    }

    // Check for conflicts
    this.checkPinConflicts(device, mapping, allDevices, conflicts);

    // Generate alternatives for conflicting pins
    conflicts.forEach(conflict => {
      const devicePin = this.findDevicePinForBoardPin(device, conflict.pin);
      if (devicePin) {
        const alternative = this.findAlternativePin(devicePin, deviceDef, mapping);
        if (alternative) {
          alternatives.push(alternative);
        }
      }
    });

    // Validate mapping against device requirements
    const validation = this.validatePinMapping(device, deviceDef, mapping);
    if (!validation.valid) {
      success = false;
      warnings.push(...validation.errors);
    }

    // Add warnings for reserved pins
    this.checkReservedPins(mapping, warnings);

    return {
      success,
      mapping,
      conflicts,
      alternatives,
      warnings
    };
  }

  private generateAutomaticMapping(device: DeviceInstance, deviceDef: Device, mapping: Record<string, number>): void {
    if (!this.board) return;

    deviceDef.pins.forEach(pin => {
      if (!pin.required) return;

      const suggestedPin = this.findBestPinForDevicePin(pin, mapping);
      if (suggestedPin !== null) {
        mapping[pin.name] = suggestedPin;
        this.usedPins.add(suggestedPin);
      }
    });
  }

  private findBestPinForDevicePin(pin: any, currentMapping: Record<string, number>): number | null {
    if (!this.board) return null;

    const usedPins = new Set(Object.values(currentMapping));

    // Filter available pins by type
    const availablePins = this.board.pins.filter(boardPin => 
      !usedPins.has(boardPin.number) && 
      (pin.type === 'power' || boardPin.type === pin.type || pin.type === 'digital')
    );

    if (availablePins.length === 0) return null;

    // Priority mapping for common pin types
    if (pin.type === 'i2c') {
      const i2cPin = availablePins.find(p => 
        this.board?.i2cPins.some(ip => ip.sda === p.number || ip.scl === p.number)
      );
      if (i2cPin) return i2cPin.number;
    }

    if (pin.type === 'spi') {
      const spiPin = availablePins.find(p => 
        this.board?.spiPins.some(sp => 
          sp.mosi === p.number || sp.miso === p.number || sp.sck === p.number
        )
      );
      if (spiPin) return spiPin.number;
    }

    if (pin.type === 'analog') {
      const analogPin = availablePins.find(p => 
        this.board?.analogPins.includes(p.number)
      );
      if (analogPin) return analogPin.number;
    }

    // Avoid reserved pins
    const nonReservedPins = availablePins.filter(p => ![0, 1].includes(p.number));
    return nonReservedPins.length > 0 ? nonReservedPins[0].number : availablePins[0].number;
  }

  private checkPinConflicts(
    device: DeviceInstance,
    mapping: Record<string, number>,
    allDevices: DeviceInstance[],
    conflicts: PinConflict[]
  ): void {
    Object.entries(mapping).forEach(([devicePinName, boardPin]) => {
      const conflictingDevices = allDevices
        .filter(d => d.instanceId !== device.instanceId)
        .filter(d => Object.values(d.pinMapping).includes(boardPin))
        .map(d => `${d.deviceType}:${d.label}`);

      if (conflictingDevices.length > 0) {
        conflicts.push({
          pin: boardPin,
          devices: [`${device.deviceType}:${device.label}`, ...conflictingDevices],
          severity: 'warning',
          resolution: 'Use alternative pins or multiplexer'
        });
      }
    });
  }

  private findDevicePinForBoardPin(device: DeviceInstance, boardPin: number): string | null {
    const deviceDef = getDeviceById(device.deviceType);
    if (!deviceDef) return null;

    const entry = Object.entries(device.pinMapping).find(([_, pin]) => pin === boardPin);
    return entry ? entry[0] : null;
  }

  private findAlternativePin(devicePin: string, deviceDef: Device, currentMapping: Record<string, number>): PinAlternative | null {
    const pinDef = deviceDef.pins.find(p => p.name === devicePin);
    if (!pinDef) return null;

    const alternativePin = this.findBestPinForDevicePin(pinDef, currentMapping);
    if (alternativePin === null) return null;

    return {
      devicePin,
      suggestedPin: alternativePin,
      reason: `Alternative to conflicting pin ${currentMapping[devicePin]}`,
      confidence: 0.8
    };
  }

  private validatePinMapping(device: DeviceInstance, deviceDef: Device, mapping: Record<string, number>): {valid: boolean, errors: string[]} {
    const errors: string[] = [];
    let valid = true;

    deviceDef.pins.forEach(pin => {
      if (pin.required && !mapping[pin.name]) {
        errors.push(`Required pin ${pin.name} not mapped`);
        valid = false;
      }
    });

    return { valid, errors };
  }

  private checkReservedPins(mapping: Record<string, number>, warnings: string[]): void {
    Object.entries(mapping).forEach(([devicePin, boardPin]) => {
      if ([0, 1].includes(boardPin)) {
        warnings.push(`Pin ${boardPin} (${devicePin}) is reserved for Serial communication`);
      }
    });
  }

  private detectDeviceIssues(
    device: DeviceInstance,
    deviceDef: Device,
    pinMapping: PinMappingResult
  ): DeviceInitIssue[] {
    const issues: DeviceInitIssue[] = [];

    // Check for pin mapping issues
    if (!pinMapping.success) {
      issues.push({
        type: 'pin_conflict',
        severity: 'error',
        message: 'Failed to resolve pin mapping',
        suggestion: 'Check pin conflicts and availability',
        autoFixable: false
      });
    }

    // Check for power issues
    const devicePower = this.estimateDevicePower(deviceDef);
    if (devicePower > this.powerBudget * 0.1) { // Device uses more than 10% of budget
      issues.push({
        type: 'power_issue',
        severity: 'warning',
        message: `High power consumption device: ${devicePower}mW`,
        suggestion: 'Consider power optimization or external supply',
        autoFixable: false
      });
    }

    // Check for board compatibility
    if (!this.isBoardCompatible(deviceDef)) {
      issues.push({
        type: 'incompatible_board',
        severity: 'error',
        message: 'Device not compatible with selected board',
        suggestion: 'Choose compatible device or board',
        autoFixable: false
      });
    }

    return issues;
  }

  private generateDeviceRecommendations(
    device: DeviceInstance,
    deviceDef: Device,
    settings: DeviceSettings,
    pinMapping: PinMappingResult
  ): DeviceRecommendation[] {
    const recommendations: DeviceRecommendation[] = [];

    // Pin optimization recommendations
    if (pinMapping.conflicts.length > 0) {
      recommendations.push({
        type: 'pin_optimization',
        title: 'Resolve Pin Conflicts',
        description: 'Use suggested alternative pins to resolve conflicts',
        priority: 'high',
        effort: 'low'
      });
    }

    // Performance optimization recommendations
    if (settings.updateRate > 100 && deviceDef.category === 'sensor') {
      recommendations.push({
        type: 'performance_optimization',
        title: 'Optimize Update Rate',
        description: 'Consider reducing update rate to save power',
        priority: 'medium',
        effort: 'low'
      });
    }

    // Feature enhancement recommendations
    if (deviceDef.category === 'sensor' && settings.accuracy !== 'high') {
      recommendations.push({
        type: 'feature_enhancement',
        title: 'Improve Sensor Accuracy',
        description: 'Enable high accuracy mode for better measurements',
        priority: 'medium',
        effort: 'low'
      });
    }

    return recommendations;
  }

  private detectGlobalIssues(initializations: DeviceInitialization[], globalIssues: GlobalIssue[]): void {
    if (!this.board) return;

    // Check power budget
    const totalPower = initializations.reduce((sum, init) => sum + init.settings.powerConsumption, 0);
    if (totalPower > this.powerBudget) {
      globalIssues.push({
        type: 'power_budget',
        severity: 'error',
        message: `Total power consumption (${totalPower}mW) exceeds budget (${this.powerBudget}mW)`,
        affectedDevices: initializations.map(i => i.instance.instanceId),
        suggestion: 'Reduce device count or use external power supply'
      });
    }

    // Check pin exhaustion
    const usedPins = new Set<number>();
    initializations.forEach(init => {
      Object.values(init.pinMapping.mapping).forEach(pin => usedPins.add(pin));
    });

    if (usedPins.size > this.board.pins.length * 0.8) {
      globalIssues.push({
        type: 'pin_exhaustion',
        severity: 'warning',
        message: 'High pin usage detected',
        affectedDevices: initializations.map(i => i.instance.instanceId),
        suggestion: 'Consider using I2C/SPI to reduce pin count'
      });
    }
  }

  private generateSystemRecommendations(
    initializations: DeviceInitialization[],
    globalIssues: GlobalIssue[]
  ): SystemRecommendation[] {
    const recommendations: SystemRecommendation[] = [];

    // Hardware upgrade recommendations
    if (globalIssues.some(i => i.type === 'pin_exhaustion')) {
      recommendations.push({
        type: 'hardware_upgrade',
        title: 'Upgrade to Board with More Pins',
        description: 'Consider Arduino Mega 2560 for more I/O pins',
        impact: 'high',
        cost: 'low'
      });
    }

    // Code refactoring recommendations
    const highPowerDevices = initializations.filter(i => i.settings.powerConsumption > 100);
    if (highPowerDevices.length > 0) {
      recommendations.push({
        type: 'code_refactoring',
        title: 'Implement Power Management',
        description: 'Add sleep modes and power-saving features',
        impact: 'medium',
        cost: 'low'
      });
    }

    return recommendations;
  }

  private calculatePerformanceProfile(initializations: DeviceInitialization[]): PerformanceProfile {
    const totalPowerConsumption = initializations.reduce((sum, init) => sum + init.settings.powerConsumption, 0);
    const totalPinUsage = new Set(
      initializations.flatMap(init => Object.values(init.pinMapping.mapping))
    ).size;
    const memoryUsage = initializations.reduce((sum, init) => sum + this.estimateDeviceMemory(init.instance.deviceType), 0);
    const updateRate = Math.min(...initializations.map(init => init.settings.updateRate));

    // Find bottleneck device (lowest update rate)
    const bottleneckDevice = initializations
      .sort((a, b) => a.settings.updateRate - b.settings.updateRate)[0]?.instance.instanceId;

    // Calculate optimization potential
    const optimizationPotential = this.calculateOptimizationPotential(initializations);

    return {
      totalPowerConsumption,
      totalPinUsage,
      memoryUsage,
      updateRate,
      bottleneckDevice,
      optimizationPotential
    };
  }

  private calculatePowerBudget(): number {
    if (!this.board) return 1000; // Default 1W

    // Estimate based on board type
    switch (this.board.id) {
      case 'arduino-uno':
      case 'arduino-nano':
        return 500; // 500mW via USB
      case 'arduino-mega':
        return 1000; // 1W via USB
      case 'esp32':
      case 'esp8266':
        return 2000; // 2W with external power
      default:
        return 1000;
    }
  }

  private estimateDevicePower(deviceDef: Device): number {
    // Estimate power consumption based on device type
    const powerMap: Record<string, number> = {
      'hx711': 15,
      'ina260': 5,
      'dht22': 2,
      'mpu6050': 10,
      'ssd1306_oled': 50,
      'stepper_a4988': 500,
      'relay_module': 50,
      'led': 20,
      'push_button': 1
    };

    return powerMap[deviceDef.type] || 10;
  }

  private estimateDeviceMemory(deviceType: string): number {
    const memoryMap: Record<string, number> = {
      'hx711': 64,
      'ina260': 32,
      'dht22': 48,
      'mpu6050': 128,
      'ssd1306_oled': 1024,
      'stepper_a4988': 96
    };

    return memoryMap[deviceType] || 64;
  }

  private isBoardCompatible(deviceDef: Device): boolean {
    if (!this.board) return false;

    // Check voltage compatibility
    if (this.board.id.startsWith('arduino-') && deviceDef.category === 'motor') {
      return true; // Most motor drivers work with Arduino
    }

    // Check communication interface compatibility
    if (deviceDef.pins.some(p => p.type === 'i2c') && this.board.i2cPins.length === 0) {
      return false;
    }

    return true;
  }

  private calculateOptimizationPotential(initializations: DeviceInitialization[]): number {
    let potential = 0;
    const count = initializations.length;

    initializations.forEach(init => {
      // Power optimization potential
      if (init.settings.powerConsumption > 100) potential += 0.2;
      
      // Update rate optimization potential
      if (init.settings.updateRate > 100) potential += 0.1;
      
      // Accuracy optimization potential
      if (init.settings.accuracy !== 'high') potential += 0.1;
    });

    return Math.min(1, potential / count);
  }

  private createFailedInitialization(device: DeviceInstance, reason: string): DeviceInitialization {
    return {
      instance: device,
      initialized: false,
      settings: {
        updateRate: 0,
        accuracy: 'low',
        noiseLevel: 0,
        responseTime: 0,
        powerConsumption: 0,
        customSettings: {}
      },
      pinMapping: {
        success: false,
        mapping: {},
        conflicts: [],
        alternatives: [],
        warnings: [reason]
      },
      issues: [{
        type: 'configuration_error',
        severity: 'critical',
        message: reason,
        suggestion: 'Check device configuration',
        autoFixable: false
      }],
      recommendations: []
    };
  }
}
