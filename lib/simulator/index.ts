/**
 * Smart Simulator Engine - Main Integration
 *
 * This is the main entry point for the smart simulator system that:
 * - Analyzes projects and detects patterns
 * - Adapts simulation behavior to user logic
 * - Provides intelligent error detection and feedback
 * - Offers automatic pin mapping suggestions
 * - Optimizes performance based on project type
 */

export { ProjectAnalyzer, type ProjectAnalysis, type DeviceAnalysis, type LogicPattern } from './project-analyzer';
export { SimulationProfileManager, type SimulationProfile, type ProfileSettings } from './simulation-profiles';
export { SmartSimulatorEngine, type SmartSimulatorConfig, type SmartSimulatorState } from './smart-simulator-engine';
export { CodeAnalyzer, type CodeAnalysisResult, type CodePattern, type FunctionAnalysis } from './code-analyzer';
export { DynamicDeviceInitializer, type InitializationResult, type DeviceInitialization } from './device-initializer';
export { SmartErrorDetector, type SmartError, type ErrorDetectionResult } from './error-detector';
export { PinMappingSuggester, type PinMappingSuggestion, type PinMappingResult } from './pin-mapping-suggester';

// Legacy exports for backward compatibility
export { SmartSimulator } from './smart-engine';
export { InterpretedSimulator } from './engine';
export * from './physics';

/**
 * Main Smart Simulator Factory
 * 
 * This is the primary interface for creating and using the smart simulator.
 * It orchestrates all the components to provide a seamless experience.
 */

import type { Project, DeviceInstance, Board } from '@/types';
import type { SimCallbacks } from './smart-engine';
import { ProjectAnalyzer } from './project-analyzer';
import { SimulationProfileManager } from './simulation-profiles';
import { SmartSimulatorEngine } from './smart-simulator-engine';
import { CodeAnalyzer } from './code-analyzer';
import { DynamicDeviceInitializer } from './device-initializer';
import { SmartErrorDetector } from './error-detector';
import { PinMappingSuggester } from './pin-mapping-suggester';
import { getBoardById } from '@/lib/boards';

export interface SmartSimulatorFactoryConfig {
  project: Project;
  devices: DeviceInstance[];
  callbacks: SimCallbacks;
  options?: SmartSimulatorOptions;
}

export interface SmartSimulatorOptions {
  enableCodeAnalysis?: boolean;
  enableErrorDetection?: boolean;
  enablePinSuggestions?: boolean;
  enablePerformanceOptimization?: boolean;
  customProfile?: Partial<any>; // SimulationProfile
  logLevel?: 'none' | 'basic' | 'detailed' | 'debug';
}

export interface SmartSimulatorInstance {
  // Core simulation
  start(): Promise<void>;
  stop(): void;
  reset(): void;
  
  // State and diagnostics
  getState(): any;
  getDiagnostics(): any;
  
  // Configuration
  updateSpeed(speed: number): void;
  sendSerial(command: string): void;
  setDeviceInput(deviceType: string, key: string, value: number): void;
  
  // Analysis and feedback
  getProjectAnalysis(): any;
  getCodeAnalysis(): any;
  getErrorAnalysis(): any;
  getPinMappingSuggestions(): any;
  
  // Cleanup
  destroy(): void;
}

export class SmartSimulatorFactory {
  private static instance?: SmartSimulatorFactory;
  
  static getInstance(): SmartSimulatorFactory {
    if (!SmartSimulatorFactory.instance) {
      SmartSimulatorFactory.instance = new SmartSimulatorFactory();
    }
    return SmartSimulatorFactory.instance;
  }

  async createSimulator(config: SmartSimulatorFactoryConfig): Promise<SmartSimulatorInstance> {
    const {
      project,
      devices,
      callbacks,
      options = {}
    } = config;

    // Validate inputs
    const board = getBoardById(project.boardId);
    if (!board) {
      throw new Error(`Board not found: ${project.boardId}`);
    }

    // Initialize components
    const analyzer = new ProjectAnalyzer();
    const profileManager = new SimulationProfileManager();
    const codeAnalyzer = new CodeAnalyzer();
    const deviceInitializer = new DynamicDeviceInitializer();
    const errorDetector = new SmartErrorDetector();
    const pinSuggester = new PinMappingSuggester();

    // Perform analysis
    const projectAnalysis = analyzer.analyzeProject(project, board, devices);
    
    let codeAnalysis: any = null;
    if (options.enableCodeAnalysis !== false) {
      codeAnalysis = codeAnalyzer.analyzeCode(project.files);
    }

    // Get and adapt simulation profile
    const baseProfile = profileManager.getProfile(projectAnalysis.type);
    const adaptedProfile = profileManager.adaptProfile(
      projectAnalysis.type,
      projectAnalysis.devices,
      projectAnalysis.patterns,
      projectAnalysis.complexity
    );

    // Apply custom profile if provided
    const finalProfile = options.customProfile 
      ? { ...adaptedProfile, ...options.customProfile }
      : adaptedProfile;

    // Initialize devices
    const initResult = deviceInitializer.initializeDevices(
      devices,
      project.boardId,
      projectAnalysis,
      finalProfile
    );

    // Create smart simulator engine
    const engine = new SmartSimulatorEngine();
    await engine.initialize({
      project,
      devices,
      callbacks,
      customProfile: finalProfile
    });

    // Perform error detection if enabled
    let errorAnalysis: any = null;
    if (options.enableErrorDetection !== false) {
      errorAnalysis = errorDetector.detectErrors(
        project.files,
        devices,
        board,
        projectAnalysis,
        codeAnalysis,
        initResult
      );
    }

    // Generate pin mapping suggestions if enabled
    let pinSuggestions: any = null;
    if (options.enablePinSuggestions !== false) {
      pinSuggestions = pinSuggester.generateSuggestions(
        devices,
        board,
        projectAnalysis,
        initResult
      );
    }

    // Log results if requested
    if (options.logLevel && options.logLevel !== 'none') {
      this.logResults(projectAnalysis, codeAnalysis, errorAnalysis, pinSuggestions, options.logLevel);
    }

    // Return integrated simulator instance
    return new IntegratedSmartSimulator(
      engine,
      projectAnalysis,
      codeAnalysis,
      errorAnalysis,
      pinSuggestions,
      initResult,
      options
    );
  }

  private logResults(
    projectAnalysis: any,
    codeAnalysis: any,
    errorAnalysis: any,
    pinSuggestions: any,
    logLevel: string
  ): void {
    if (logLevel === 'basic' || logLevel === 'detailed' || logLevel === 'debug') {
      console.log('🧠 Smart Simulator Analysis Results:');
      console.log(`  Project Type: ${projectAnalysis.type}`);
      console.log(`  Complexity: ${projectAnalysis.complexity}`);
      console.log(`  Devices: ${projectAnalysis.devices.length}`);
      console.log(`  Patterns: ${projectAnalysis.patterns.join(', ')}`);
    }

    if (logLevel === 'detailed' || logLevel === 'debug') {
      if (errorAnalysis) {
        console.log(`  Errors: ${errorAnalysis.summary.total} (${errorAnalysis.summary.criticalIssues} critical)`);
      }
      if (pinSuggestions) {
        console.log(`  Pin Suggestions: ${pinSuggestions.suggestions.length}`);
      }
    }

    if (logLevel === 'debug') {
      console.log('📊 Detailed Analysis:', {
        projectAnalysis,
        codeAnalysis,
        errorAnalysis,
        pinSuggestions
      });
    }
  }
}

/**
 * Integrated Smart Simulator Instance
 * 
 * This class provides a unified interface to all the smart simulator
 * components while maintaining clean separation of concerns.
 */
class IntegratedSmartSimulator implements SmartSimulatorInstance {
  private engine: SmartSimulatorEngine;
  private projectAnalysis: any;
  private codeAnalysis: any;
  private errorAnalysis: any;
  private pinSuggestions: any;
  private initResult: any;
  private options: SmartSimulatorOptions;
  private destroyed = false;

  constructor(
    engine: SmartSimulatorEngine,
    projectAnalysis: any,
    codeAnalysis: any,
    errorAnalysis: any,
    pinSuggestions: any,
    initResult: any,
    options: SmartSimulatorOptions
  ) {
    this.engine = engine;
    this.projectAnalysis = projectAnalysis;
    this.codeAnalysis = codeAnalysis;
    this.errorAnalysis = errorAnalysis;
    this.pinSuggestions = pinSuggestions;
    this.initResult = initResult;
    this.options = options;
  }

  async start(): Promise<void> {
    if (this.destroyed) {
      throw new Error('Simulator has been destroyed');
    }
    
    this.engine.start();
  }

  stop(): void {
    if (this.destroyed) return;
    this.engine.stop();
  }

  reset(): void {
    if (this.destroyed) return;
    this.stop();
    // Reset would be implemented in the engine if needed
  }

  getState(): any {
    if (this.destroyed) return null;
    return this.engine.getState();
  }

  getDiagnostics(): any {
    if (this.destroyed) return null;
    return this.engine.getDiagnostics();
  }

  updateSpeed(speed: number): void {
    if (this.destroyed) return;
    this.engine.updateSpeed(speed);
  }

  sendSerial(command: string): void {
    if (this.destroyed) return;
    this.engine.sendSerial(command);
  }

  setDeviceInput(deviceType: string, key: string, value: number): void {
    if (this.destroyed) return;
    this.engine.setDeviceInput(deviceType, key, value);
  }

  getProjectAnalysis(): any {
    return this.projectAnalysis;
  }

  getCodeAnalysis(): any {
    return this.codeAnalysis;
  }

  getErrorAnalysis(): any {
    return this.errorAnalysis;
  }

  getPinMappingSuggestions(): any {
    return this.pinSuggestions;
  }

  destroy(): void {
    this.stop();
    this.destroyed = true;
    
    // Clean up resources
    this.engine = null as any;
    this.projectAnalysis = null;
    this.codeAnalysis = null;
    this.errorAnalysis = null;
    this.pinSuggestions = null;
    this.initResult = null;
  }
}

/**
 * Convenience function for quick simulator creation
 */
export async function createSmartSimulator(
  project: Project,
  devices: DeviceInstance[],
  callbacks: SimCallbacks,
  options?: SmartSimulatorOptions
): Promise<SmartSimulatorInstance> {
  const factory = SmartSimulatorFactory.getInstance();
  return factory.createSimulator({
    project,
    devices,
    callbacks,
    options
  });
}

/**
 * Utility functions for common operations
 */
export const SmartSimulatorUtils = {
  /**
   * Quick project type detection
   */
  detectProjectType(project: Project, devices: DeviceInstance[]): string {
    const analyzer = new ProjectAnalyzer();
    const board = getBoardById(project.boardId);
    if (!board) return 'unknown';
    
    const analysis = analyzer.analyzeProject(project, board, devices);
    return analysis.type;
  },

  /**
   * Quick error check
   */
  quickErrorCheck(project: Project, devices: DeviceInstance[]): any {
    const analyzer = new ProjectAnalyzer();
    const codeAnalyzer = new CodeAnalyzer();
    const errorDetector = new SmartErrorDetector();
    const board = getBoardById(project.boardId);
    
    if (!board) return { errors: [], summary: { total: 0 } };
    
    const projectAnalysis = analyzer.analyzeProject(project, board, devices);
    const codeAnalysis = codeAnalyzer.analyzeCode(project.files);
    
    // Mock init result for quick check
    const mockInitResult = {
      success: true,
      devices: [],
      globalIssues: [],
      systemRecommendations: [],
      performanceProfile: {
        totalPowerConsumption: 0,
        totalPinUsage: 0,
        memoryUsage: 0,
        updateRate: 0,
        optimizationPotential: 0
      }
    };
    
    return errorDetector.detectErrors(
      project.files,
      devices,
      board,
      projectAnalysis,
      codeAnalysis,
      mockInitResult
    );
  },

  /**
   * Get recommended simulation profile
   */
  getRecommendedProfile(project: Project, devices: DeviceInstance[]): any {
    const analyzer = new ProjectAnalyzer();
    const profileManager = new SimulationProfileManager();
    const board = getBoardById(project.boardId);
    
    if (!board) return null;
    
    const analysis = analyzer.analyzeProject(project, board, devices);
    return profileManager.getProfile(analysis.type);
  }
};
