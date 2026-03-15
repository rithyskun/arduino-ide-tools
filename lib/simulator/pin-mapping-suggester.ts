/**
 * Pin Mapping Suggester — Intelligent pin assignment recommendations
 *
 * Provides smart pin mapping suggestions based on:
 * - Device requirements and capabilities
 * - Board pin layouts and constraints
 * - Communication protocols (I2C, SPI, UART)
 * - Power requirements and limitations
 * - User preferences and project context
 * - Historical usage patterns
 */

import type { DeviceInstance, Board, Device } from '@/types';
import { ProjectAnalysis, LogicPattern } from './project-analyzer';
import type { InitializationResult } from './device-initializer';

export interface PinMappingSuggestion {
  id: string;
  deviceId: string;
  deviceName: string;
  devicePin: string;
  suggestedPin: number;
  confidence: number; // 0-1
  reasoning: PinReasoning;
  alternatives: PinAlternative[];
  warnings: string[];
  benefits: string[];
  tradeoffs: string[];
}

export interface PinReasoning {
  primary: string;
  technical: string[];
  contextual: string[];
  constraints: string[];
}

export interface PinAlternative {
  pin: number;
  confidence: number;
  reasoning: string;
  pros: string[];
  cons: string[];
  compatibility: 'full' | 'partial' | 'limited';
}

export interface PinMappingStrategy {
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  constraints: StrategyConstraint[];
  optimizations: StrategyOptimization[];
}

export interface StrategyConstraint {
  type: 'pin_availability' | 'protocol_compatibility' | 'power_limitation' | 'signal_integrity';
  description: string;
  impact: 'blocking' | 'warning' | 'info';
}

export interface StrategyOptimization {
  type: 'signal_quality' | 'power_efficiency' | 'ease_of_wiring' | 'future_expansion';
  description: string;
  value: number; // 0-1
}

export interface PinMappingResult {
  strategy: PinMappingStrategy;
  suggestions: PinMappingSuggestion[];
  conflicts: PinConflict[];
  optimizations: PinOptimization[];
  summary: MappingSummary;
  recommendations: MappingRecommendation[];
}

export interface PinConflict {
  type: 'direct_conflict' | 'protocol_conflict' | 'power_conflict' | 'signal_conflict';
  pins: number[];
  devices: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolution: ConflictResolution[];
}

export interface ConflictResolution {
  type: 'reassign_pins' | 'use_multiplexer' | 'change_device' | 'add_adapter';
  description: string;
  effort: 'low' | 'medium' | 'high';
  effectiveness: number; // 0-1
  cost: 'low' | 'medium' | 'high';
}

export interface PinOptimization {
  type: 'signal_grouping' | 'power_grouping' | 'protocol_grouping' | 'function_grouping';
  description: string;
  affectedPins: number[];
  benefit: string;
  implementation: string;
}

export interface MappingSummary {
  totalPinsUsed: number;
  pinsByType: Record<string, number>;
  utilizationRate: number; // 0-1
  conflictCount: number;
  optimizationPotential: number; // 0-1
  wiringComplexity: 'simple' | 'moderate' | 'complex';
}

export interface MappingRecommendation {
  type: 'immediate' | 'short_term' | 'long_term';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
}

export class PinMappingSuggester {
  private board?: Board;
  private analysis?: ProjectAnalysis;
  private initResult?: InitializationResult;
  private pinPreferences = new Map<number, PinPreference>();
  private usageHistory = new Map<string, PinUsageHistory>();

  constructor() {
    this.initializePinPreferences();
  }

  generateSuggestions(
    devices: DeviceInstance[],
    board: Board,
    analysis: ProjectAnalysis,
    initResult: InitializationResult
  ): PinMappingResult {
    this.board = board;
    this.analysis = analysis;
    this.initResult = initResult;

    // Determine optimal mapping strategy
    const strategy = this.determineStrategy(devices, analysis);

    // Generate pin suggestions
    const suggestions = this.generateDeviceSuggestions(devices, strategy);

    // Detect and analyze conflicts
    const conflicts = this.analyzeConflicts(suggestions, devices);

    // Identify optimization opportunities
    const optimizations = this.identifyOptimizations(suggestions, devices);

    // Generate summary
    const summary = this.generateSummary(suggestions, conflicts, optimizations);

    // Create recommendations
    const recommendations = this.generateRecommendations(conflicts, optimizations, summary);

    return {
      strategy,
      suggestions,
      conflicts,
      optimizations,
      summary,
      recommendations
    };
  }

  private determineStrategy(devices: DeviceInstance[], analysis: ProjectAnalysis): PinMappingStrategy {
    // Analyze project requirements to determine best strategy
    const hasI2CDevices = devices.some(d => this.requiresI2C(d));
    const hasSPIDevices = devices.some(d => this.requiresSPI(d));
    const hasPowerHungryDevices = devices.some(d => this.isPowerHungry(d));
    const hasHighSpeedDevices = devices.some(d => this.isHighSpeed(d));

    let strategyName = 'balanced';
    let priority: 'high' | 'medium' | 'low' = 'medium';
    let description = 'Balanced approach for general-purpose projects';

    if (analysis.type === 'robotics') {
      strategyName = 'performance_optimized';
      priority = 'high';
      description = 'Optimized for high-speed communication and precise timing';
    } else if (analysis.type === 'iot_sensor') {
      strategyName = 'power_efficient';
      priority = 'high';
      description = 'Optimized for low power consumption and reliable sensing';
    } else if (hasI2CDevices && hasSPIDevices) {
      strategyName = 'protocol_separation';
      priority = 'medium';
      description = 'Separate I2C and SPI buses to avoid interference';
    }

    const constraints: StrategyConstraint[] = [];
    const optimizations: StrategyOptimization[] = [];

    // Add constraints based on board limitations
    if (this.board) {
      if (this.board.analogPins.length < devices.filter(d => this.requiresAnalog(d)).length) {
        constraints.push({
          type: 'pin_availability',
          description: 'Limited analog pins available',
          impact: 'warning'
        });
      }
    }

    // Add optimizations based on project analysis
    if (analysis.patterns.includes(LogicPattern.INTERRUPT_DRIVEN)) {
      optimizations.push({
        type: 'signal_quality',
        description: 'Prioritize pins with interrupt capability',
        value: 0.9
      });
    }

    return {
      name: strategyName,
      description,
      priority,
      constraints,
      optimizations
    };
  }

  private generateDeviceSuggestions(devices: DeviceInstance[], strategy: PinMappingStrategy): PinMappingSuggestion[] {
    const suggestions: PinMappingSuggestion[] = [];
    const usedPins = new Set<number>();

    // Sort devices by priority
    const sortedDevices = this.prioritizeDevices(devices);

    sortedDevices.forEach(device => {
      const deviceDef = this.getDeviceDefinition(device.deviceType);
      if (!deviceDef) return;

      deviceDef.pins.forEach(pin => {
        if (!pin.required) return;

        const suggestion = this.suggestPinForDevicePin(device, pin, usedPins, strategy);
        if (suggestion) {
          suggestions.push(suggestion);
          usedPins.add(suggestion.suggestedPin);
        }
      });
    });

    return suggestions;
  }

  private prioritizeDevices(devices: DeviceInstance[]): DeviceInstance[] {
    return devices.sort((a, b) => {
      // Priority: Communication devices > Sensors > Actuators > Input devices
      const priorityMap: Record<string, number> = {
        'communication': 4,
        'sensor': 3,
        'motor': 2,
        'input': 1
      };

      const deviceA = this.getDeviceDefinition(a.deviceType);
      const deviceB = this.getDeviceDefinition(b.deviceType);

      const priorityA = priorityMap[deviceA?.category || 'input'] || 0;
      const priorityB = priorityMap[deviceB?.category || 'input'] || 0;

      return priorityB - priorityA;
    });
  }

  private suggestPinForDevicePin(
    device: DeviceInstance,
    devicePin: any,
    usedPins: Set<number>,
    strategy: PinMappingStrategy
  ): PinMappingSuggestion | null {
    if (!this.board) return null;

    const candidates = this.findCandidatePins(devicePin, usedPins);
    if (candidates.length === 0) return null;

    // Score candidates based on multiple factors
    const scoredCandidates = candidates.map(pin => ({
      pin,
      score: this.scorePin(pin, devicePin, device, strategy)
    }));

    // Sort by score (highest first)
    scoredCandidates.sort((a, b) => b.score - a.score);

    const best = scoredCandidates[0];
    const alternatives = scoredCandidates.slice(1, 3).map(c => ({
      pin: c.pin,
      confidence: c.score,
      reasoning: this.generateAlternativeReasoning(c.pin, devicePin),
      pros: this.generatePinPros(c.pin, devicePin),
      cons: this.generatePinCons(c.pin, devicePin),
      compatibility: this.checkCompatibility(c.pin, devicePin) as 'full' | 'partial' | 'limited'
    }));

    return {
      id: `${device.instanceId}_${devicePin.name}`,
      deviceId: device.instanceId,
      deviceName: device.label,
      devicePin: devicePin.name,
      suggestedPin: best.pin,
      confidence: best.score,
      reasoning: this.generateReasoning(best.pin, devicePin, device, strategy),
      alternatives,
      warnings: this.generateWarnings(best.pin, devicePin, device),
      benefits: this.generateBenefits(best.pin, devicePin, device),
      tradeoffs: this.generateTradeoffs(best.pin, devicePin, device)
    };
  }

  private findCandidatePins(devicePin: any, usedPins: Set<number>): number[] {
    if (!this.board) return [];

    return this.board.pins
      .filter(boardPin => !usedPins.has(boardPin.number))
      .filter(boardPin => this.isPinCompatible(boardPin, devicePin))
      .map(boardPin => boardPin.number)
      .sort((a, b) => this.comparePinPriority(a, b));
  }

  private isPinCompatible(boardPin: any, devicePin: any): boolean {
    // Check basic type compatibility
    if (devicePin.type === 'power') return true;
    if (devicePin.type === 'digital' && boardPin.type !== 'analog') return true;
    if (devicePin.type === 'analog' && boardPin.type === 'analog') return true;
    if (devicePin.type === 'i2c' && this.isI2CPin(boardPin.number)) return true;
    if (devicePin.type === 'spi' && this.isSPIPin(boardPin.number)) return true;
    if (devicePin.type === 'uart' && this.isUARTPin(boardPin.number)) return true;

    return false;
  }

  private scorePin(pin: number, devicePin: any, device: DeviceInstance, strategy: PinMappingStrategy): number {
    let score = 0.5; // Base score

    // Protocol compatibility bonus
    if (devicePin.type === 'i2c' && this.isI2CPin(pin)) score += 0.3;
    if (devicePin.type === 'spi' && this.isSPIPin(pin)) score += 0.3;
    if (devicePin.type === 'uart' && this.isUARTPin(pin)) score += 0.3;

    // Strategy-specific scoring
    strategy.optimizations.forEach(opt => {
      if (opt.type === 'signal_quality' && this.hasHighSignalIntegrity(pin)) {
        score += opt.value * 0.2;
      }
      if (opt.type === 'ease_of_wiring' && this.isEasyToWire(pin)) {
        score += opt.value * 0.1;
      }
    });

    // Project context scoring
    if (this.analysis?.patterns.includes(LogicPattern.INTERRUPT_DRIVEN) && this.isInterruptCapable(pin)) {
      score += 0.2;
    }

    // Historical preference scoring
    const preference = this.pinPreferences.get(pin);
    if (preference && preference.preferredFor.includes(devicePin.type)) {
      score += 0.1;
    }

    // Penalty for reserved pins
    if ([0, 1].includes(pin)) score -= 0.4; // Serial pins
    if (this.board?.builtinLed === pin) score -= 0.1; // Built-in LED

    return Math.max(0, Math.min(1, score));
  }

  private generateReasoning(pin: number, devicePin: any, device: DeviceInstance, strategy: PinMappingStrategy): PinReasoning {
    const primary = this.getPrimaryReasoning(pin, devicePin, device);
    const technical = this.getTechnicalReasoning(pin, devicePin);
    const contextual = this.getContextualReasoning(pin, devicePin, device);
    const constraints = this.getConstraintReasoning(pin, devicePin);

    return {
      primary,
      technical,
      contextual,
      constraints
    };
  }

  private getPrimaryReasoning(pin: number, devicePin: any, device: DeviceInstance): string {
    if (devicePin.type === 'i2c') {
      return `Pin ${pin} is part of the I2C bus and supports the required communication protocol`;
    }
    if (devicePin.type === 'spi') {
      return `Pin ${pin} is part of the SPI bus for high-speed serial communication`;
    }
    if (devicePin.type === 'analog') {
      return `Pin ${pin} has analog input capability required for ${device.deviceType}`;
    }
    return `Pin ${pin} is compatible with ${devicePin.type} signal requirements`;
  }

  private getTechnicalReasoning(pin: number, devicePin: any): string[] {
    const reasons: string[] = [];

    if (this.isInterruptCapable(pin)) {
      reasons.push('Supports external interrupts for event-driven programming');
    }
    if (this.hasPWM(pin)) {
      reasons.push('Supports PWM output for analog-like control');
    }
    if (this.hasPullup(pin)) {
      reasons.push('Built-in pull-up resistor available');
    }

    return reasons;
  }

  private getContextualReasoning(pin: number, devicePin: any, device: DeviceInstance): string[] {
    const reasons: string[] = [];

    if (this.analysis?.type === 'robotics' && this.isHighSpeedPin(pin)) {
      reasons.push('High-speed pin suitable for robotics applications');
    }
    if (this.analysis?.type === 'iot_sensor' && this.isLowPowerPin(pin)) {
      reasons.push('Low-power pin suitable for IoT sensor applications');
    }

    return reasons;
  }

  private getConstraintReasoning(pin: number, devicePin: any): string[] {
    const constraints: string[] = [];

    if ([0, 1].includes(pin)) {
      constraints.push('Reserved for Serial communication - use with caution');
    }
    if (this.board?.builtinLed === pin) {
      constraints.push('Controls built-in LED - may affect visual feedback');
    }

    return constraints;
  }

  private analyzeConflicts(suggestions: PinMappingSuggestion[], devices: DeviceInstance[]): PinConflict[] {
    const conflicts: PinConflict[] = [];
    const pinUsage = new Map<number, PinMappingSuggestion[]>();

    // Group suggestions by pin
    suggestions.forEach(suggestion => {
      if (!pinUsage.has(suggestion.suggestedPin)) {
        pinUsage.set(suggestion.suggestedPin, []);
      }
      pinUsage.get(suggestion.suggestedPin)!.push(suggestion);
    });

    // Detect conflicts
    pinUsage.forEach((suggestionsForPin, pin) => {
      if (suggestionsForPin.length > 1) {
        conflicts.push({
          type: 'direct_conflict',
          pins: [pin],
          devices: suggestionsForPin.map(s => s.deviceName),
          severity: this.calculateConflictSeverity(suggestionsForPin),
          resolution: this.generateConflictResolutions(suggestionsForPin, pin)
        });
      }
    });

    return conflicts;
  }

  private identifyOptimizations(suggestions: PinMappingSuggestion[], devices: DeviceInstance[]): PinOptimization[] {
    const optimizations: PinOptimization[] = [];

    // Group pins by protocol
    const i2cPins = suggestions.filter(s => this.isI2CPin(s.suggestedPin));
    const spiPins = suggestions.filter(s => this.isSPIPin(s.suggestedPin));
    const analogPins = suggestions.filter(s => this.isAnalogPin(s.suggestedPin));

    // Suggest protocol grouping optimizations
    if (i2cPins.length > 1) {
      optimizations.push({
        type: 'protocol_grouping',
        description: 'Group I2C devices on contiguous pins for easier wiring',
        affectedPins: i2cPins.map(s => s.suggestedPin),
        benefit: 'Simplified wiring and reduced interference',
        implementation: 'Use I2C bus expander or reassign pins to be contiguous'
      });
    }

    return optimizations;
  }

  private generateSummary(suggestions: PinMappingSuggestion[], conflicts: PinConflict[], optimizations: PinOptimization[]): MappingSummary {
    const totalPinsUsed = suggestions.length;
    const pinsByType: Record<string, number> = {};
    const utilizationRate = this.board ? totalPinsUsed / this.board.pins.length : 0;
    const conflictCount = conflicts.length;
    const optimizationPotential = optimizations.length > 0 ? 0.7 : 0.3;
    const wiringComplexity = this.calculateWiringComplexity(suggestions);

    // Count pins by type
    suggestions.forEach(suggestion => {
      const pinType = this.getPinType(suggestion.suggestedPin);
      pinsByType[pinType] = (pinsByType[pinType] || 0) + 1;
    });

    return {
      totalPinsUsed,
      pinsByType,
      utilizationRate,
      conflictCount,
      optimizationPotential,
      wiringComplexity
    };
  }

  private generateRecommendations(conflicts: PinConflict[], optimizations: PinOptimization[], summary: MappingSummary): MappingRecommendation[] {
    const recommendations: MappingRecommendation[] = [];

    // Conflict resolution recommendations
    conflicts.forEach(conflict => {
      if (conflict.severity === 'critical' || conflict.severity === 'high') {
        recommendations.push({
          type: 'immediate',
          priority: 'high',
          title: `Resolve Pin Conflict on ${conflict.pins.join(', ')}`,
          description: `Multiple devices trying to use the same pins: ${conflict.devices.join(', ')}`,
          impact: 'high',
          effort: 'medium'
        });
      }
    });

    // Optimization recommendations
    optimizations.forEach(optimization => {
      recommendations.push({
        type: 'short_term',
        priority: 'medium',
        title: `Implement ${optimization.type}`,
        description: optimization.description,
        impact: 'medium',
        effort: 'low'
      });
    });

    return recommendations;
  }

  // Helper methods
  private initializePinPreferences(): void {
    // Initialize common pin preferences
    this.pinPreferences.set(2, { preferredFor: ['interrupt', 'digital'], priority: 'high' });
    this.pinPreferences.set(3, { preferredFor: ['interrupt', 'pwm'], priority: 'high' });
  }

  private requiresI2C(device: DeviceInstance): boolean {
    const deviceDef = this.getDeviceDefinition(device.deviceType);
    return deviceDef?.pins.some(p => p.type === 'i2c') || false;
  }

  private requiresSPI(device: DeviceInstance): boolean {
    const deviceDef = this.getDeviceDefinition(device.deviceType);
    return deviceDef?.pins.some(p => p.type === 'spi') || false;
  }

  private requiresAnalog(device: DeviceInstance): boolean {
    const deviceDef = this.getDeviceDefinition(device.deviceType);
    return deviceDef?.pins.some(p => p.type === 'analog') || false;
  }

  private isPowerHungry(device: DeviceInstance): boolean {
    const deviceDef = this.getDeviceDefinition(device.deviceType);
    return deviceDef?.category === 'motor' || deviceDef?.category === 'display';
  }

  private isHighSpeed(device: DeviceInstance): boolean {
    const deviceDef = this.getDeviceDefinition(device.deviceType);
    return deviceDef?.category === 'communication' || deviceDef?.type === 'stepper_a4988';
  }

  private getDeviceDefinition(deviceType: string): Device | undefined {
    // This would typically import from devices/index.ts
    return undefined; // Placeholder
  }

  private comparePinPriority(pinA: number, pinB: number): number {
    // Prefer lower pin numbers for digital pins
    return pinA - pinB;
  }

  private isI2CPin(pin: number): boolean {
    return this.board?.i2cPins.some(ip => ip.sda === pin || ip.scl === pin) || false;
  }

  private isSPIPin(pin: number): boolean {
    return this.board?.spiPins.some(sp => 
      sp.mosi === pin || sp.miso === pin || sp.sck === pin || sp.ss === pin
    ) || false;
  }

  private isUARTPin(pin: number): boolean {
    return this.board?.uartPins.some(up => up.tx === pin || up.rx === pin) || false;
  }

  private isInterruptCapable(pin: number): boolean {
    // Most Arduino pins support interrupts, but some have limitations
    return pin <= 21; // Simplified for Arduino boards
  }

  private hasPWM(pin: number): boolean {
    // Arduino PWM pins (varies by board)
    return [3, 5, 6, 9, 10, 11].includes(pin);
  }

  private hasPullup(pin: number): boolean {
    // Most Arduino pins have pull-up capability
    return true;
  }

  private isHighSpeedPin(pin: number): boolean {
    return this.isInterruptCapable(pin);
  }

  private isLowPowerPin(pin: number): boolean {
    return true; // Most pins can be configured for low power
  }

  private isEasyToWire(pin: number): boolean {
    // Prefer pins that are easily accessible
    return pin < 20;
  }

  private hasHighSignalIntegrity(pin: number): boolean {
    return !this.isPowerPin(pin);
  }

  private isPowerPin(pin: number): boolean {
    return false; // Simplified - would check actual power pins
  }

  private isAnalogPin(pin: number): boolean {
    return this.board?.analogPins.includes(pin) || false;
  }

  private getPinType(pin: number): string {
    if (this.isI2CPin(pin)) return 'i2c';
    if (this.isSPIPin(pin)) return 'spi';
    if (this.isUARTPin(pin)) return 'uart';
    if (this.isAnalogPin(pin)) return 'analog';
    return 'digital';
  }

  private calculateConflictSeverity(suggestions: PinMappingSuggestion[]): 'low' | 'medium' | 'high' | 'critical' {
    if (suggestions.length > 3) return 'critical';
    if (suggestions.length > 2) return 'high';
    return 'medium';
  }

  private generateConflictResolutions(suggestions: PinMappingSuggestion[], pin: number): ConflictResolution[] {
    return [
      {
        type: 'reassign_pins',
        description: 'Reassign one or more devices to alternative pins',
        effort: 'medium',
        effectiveness: 0.8,
        cost: 'low'
      },
      {
        type: 'use_multiplexer',
        description: 'Use I2C or SPI multiplexer to share pins',
        effort: 'high',
        effectiveness: 0.9,
        cost: 'medium'
      }
    ];
  }

  private calculateWiringComplexity(suggestions: PinMappingSuggestion[]): 'simple' | 'moderate' | 'complex' {
    const i2cCount = suggestions.filter(s => this.isI2CPin(s.suggestedPin)).length;
    const spiCount = suggestions.filter(s => this.isSPIPin(s.suggestedPin)).length;
    
    if (i2cCount > 0 && spiCount > 0) return 'complex';
    if (suggestions.length > 8) return 'moderate';
    return 'simple';
  }

  private generateAlternativeReasoning(pin: number, devicePin: any): string {
    return `Pin ${pin} is a viable alternative with ${this.getPinType(pin)} capability`;
  }

  private generatePinPros(pin: number, devicePin: any): string[] {
    const pros: string[] = [];
    if (this.isInterruptCapable(pin)) pros.push('Interrupt capable');
    if (this.hasPWM(pin)) pros.push('PWM support');
    return pros;
  }

  private generatePinCons(pin: number, devicePin: any): string[] {
    const cons: string[] = [];
    if ([0, 1].includes(pin)) cons.push('Reserved for Serial');
    return cons;
  }

  private checkCompatibility(pin: number, devicePin: any): 'full' | 'partial' | 'limited' {
    if (this.isPinCompatible({ number: pin, type: devicePin.type }, devicePin)) {
      return 'full';
    }
    return 'limited';
  }

  private generateWarnings(pin: number, devicePin: any, device: DeviceInstance): string[] {
    const warnings: string[] = [];
    if ([0, 1].includes(pin)) {
      warnings.push('Pin is reserved for Serial communication');
    }
    return warnings;
  }

  private generateBenefits(pin: number, devicePin: any, device: DeviceInstance): string[] {
    const benefits: string[] = [];
    benefits.push(`Optimal ${devicePin.type} connectivity`);
    if (this.isInterruptCapable(pin)) {
      benefits.push('Supports event-driven programming');
    }
    return benefits;
  }

  private generateTradeoffs(pin: number, devicePin: any, device: DeviceInstance): string[] {
    const tradeoffs: string[] = [];
    if ([0, 1].includes(pin)) {
      tradeoffs.push('Cannot use Serial communication simultaneously');
    }
    return tradeoffs;
  }
}

interface PinPreference {
  preferredFor: string[];
  priority: 'high' | 'medium' | 'low';
}

interface PinUsageHistory {
  deviceId: string;
  pin: number;
  success: boolean;
  timestamp: number;
}
