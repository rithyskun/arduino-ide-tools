/**
 * Smart Error Detection and Feedback System
 *
 * Provides intelligent error detection and helpful feedback for:
 * - Code syntax and logic errors
 * - Hardware configuration issues
 * - Runtime simulation problems
 * - Performance bottlenecks
 * - Best practice violations
 */

import type { ProjectFile, DeviceInstance, Board } from '@/types';
import { ProjectAnalysis, LogicPattern } from './project-analyzer';
import type { CodeAnalysisResult } from './code-analyzer';
import type { InitializationResult } from './device-initializer';

export interface SmartError {
  id: string;
  type: ErrorType;
  category: ErrorCategory;
  severity: ErrorSeverity;
  title: string;
  message: string;
  description: string;
  location?: ErrorLocation;
  suggestions: ErrorSuggestion[];
  autoFixable: boolean;
  confidence: number; // 0-1
  context?: ErrorContext;
}

export type ErrorType = 
  | 'syntax_error'
  | 'compile_error'
  | 'runtime_error'
  | 'logic_error'
  | 'hardware_error'
  | 'performance_issue'
  | 'best_practice'
  | 'security_issue'
  | 'compatibility_issue';

export type ErrorCategory = 
  | 'code_structure'
  | 'device_configuration'
  | 'pin_management'
  | 'timing_synchronization'
  | 'memory_management'
  | 'communication'
  | 'power_management'
  | 'user_interface';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ErrorLocation {
  file: string;
  line: number;
  column?: number;
  function?: string;
  codeSnippet?: string;
}

export interface ErrorSuggestion {
  type: 'fix' | 'improvement' | 'alternative' | 'explanation';
  title: string;
  description: string;
  codeExample?: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

export interface ErrorContext {
  relatedDevices?: string[];
  relatedCode?: string[];
  projectType?: string;
  similarErrors?: string[];
  userHistory?: UserErrorHistory;
}

export interface UserErrorHistory {
  errorType: string;
  frequency: number;
  lastOccurrence: number;
  resolved: boolean;
}

export interface ErrorDetectionResult {
  errors: SmartError[];
  summary: ErrorSummary;
  recommendations: ErrorRecommendation[];
  learningInsights: LearningInsight[];
}

export interface ErrorSummary {
  total: number;
  bySeverity: Record<ErrorSeverity, number>;
  byCategory: Record<ErrorCategory, number>;
  byType: Record<ErrorType, number>;
  autoFixable: number;
  criticalIssues: number;
}

export interface ErrorRecommendation {
  type: 'immediate' | 'short_term' | 'long_term';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedErrors: string[];
  estimatedEffort: 'minutes' | 'hours' | 'days';
}

export interface LearningInsight {
  type: 'pattern' | 'improvement' | 'achievement';
  title: string;
  description: string;
  actionable: boolean;
  resources?: LearningResource[];
}

export interface LearningResource {
  type: 'documentation' | 'tutorial' | 'example' | 'video';
  title: string;
  url: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export class SmartErrorDetector {
  private errorPatterns = new Map<RegExp, ErrorPattern>();
  private userHistory = new Map<string, UserErrorHistory>();
  private commonErrors = new Map<string, CommonErrorInfo>();

  constructor() {
    this.initializeErrorPatterns();
    this.initializeCommonErrors();
  }

  detectErrors(
    files: ProjectFile[],
    devices: DeviceInstance[],
    board: Board,
    projectAnalysis: ProjectAnalysis,
    codeAnalysis: CodeAnalysisResult,
    initResult: InitializationResult
  ): ErrorDetectionResult {
    const errors: SmartError[] = [];

    // Detect code errors
    this.detectCodeErrors(files, codeAnalysis, errors);

    // Detect hardware errors
    this.detectHardwareErrors(devices, board, initResult, errors);

    // Detect logic errors
    this.detectLogicErrors(projectAnalysis, codeAnalysis, errors);

    // Detect performance issues
    this.detectPerformanceIssues(projectAnalysis, codeAnalysis, initResult, errors);

    // Detect best practice violations
    this.detectBestPracticeViolations(files, projectAnalysis, errors);

    // Apply user history and learning
    this.applyUserContext(errors);

    const summary = this.generateErrorSummary(errors);
    const recommendations = this.generateRecommendations(errors, projectAnalysis);
    const learningInsights = this.generateLearningInsights(errors, projectAnalysis);

    return {
      errors,
      summary,
      recommendations,
      learningInsights
    };
  }

  private detectCodeErrors(files: ProjectFile[], codeAnalysis: CodeAnalysisResult, errors: SmartError[]): void {
    files.forEach(file => {
      if (file.language !== 'cpp') return;

      const lines = file.content.split('\n');
      
      // Check for syntax issues
      lines.forEach((line, index) => {
        this.errorPatterns.forEach((pattern, regex) => {
          if (regex.test(line)) {
            const error = this.createErrorFromPattern(pattern, file.name, index + 1, line);
            if (error) errors.push(error);
          }
        });
      });
    });

    // Add code analysis issues
    codeAnalysis.issues.forEach(issue => {
      errors.push(this.convertCodeAnalysisError(issue));
    });
  }

  private detectHardwareErrors(
    devices: DeviceInstance[],
    board: Board,
    initResult: InitializationResult,
    errors: SmartError[]
  ): void {
    // Check device initialization issues
    initResult.devices.forEach(deviceInit => {
      deviceInit.issues.forEach(issue => {
        errors.push(this.convertDeviceInitError(deviceInit.instance, issue));
      });
    });

    // Check global hardware issues
    initResult.globalIssues.forEach(issue => {
      errors.push(this.convertGlobalHardwareError(issue, devices));
    });

    // Check pin conflicts
    this.detectPinConflicts(devices, board, errors);

    // Check power issues
    this.detectPowerIssues(devices, board, initResult.performanceProfile, errors);
  }

  private detectLogicErrors(
    projectAnalysis: ProjectAnalysis,
    codeAnalysis: CodeAnalysisResult,
    errors: SmartError[]
  ): void {
    // Check for timing issues
    codeAnalysis.timing.realTimeIssues.forEach(issue => {
      errors.push(this.convertTimingError(issue));
    });

    // Check for device usage issues
    codeAnalysis.devices.forEach(device => {
      device.issues.forEach(issue => {
        errors.push(this.convertDeviceUsageError(device, issue));
      });
    });

    // Check for logic pattern issues
    this.detectLogicPatternIssues(projectAnalysis, errors);
  }

  private detectPerformanceIssues(
    projectAnalysis: ProjectAnalysis,
    codeAnalysis: CodeAnalysisResult,
    initResult: InitializationResult,
    errors: SmartError[]
  ): void {
    // Check for performance bottlenecks
    if (initResult.performanceProfile.bottleneckDevice) {
      errors.push(this.createPerformanceBottleneckError(initResult.performanceProfile));
    }

    // Check for inefficient code patterns
    codeAnalysis.patterns.forEach(pattern => {
      if (pattern.type === 'polling_loop' && pattern.confidence > 0.8) {
        errors.push(this.createInefficientPatternError(pattern));
      }
    });

    // Check for memory issues
    if (codeAnalysis.metrics.cyclomaticComplexity > 20) {
      errors.push(this.createComplexityError(codeAnalysis.metrics));
    }
  }

  private detectBestPracticeViolations(
    files: ProjectFile[],
    projectAnalysis: ProjectAnalysis,
    errors: SmartError[]
  ): void {
    files.forEach(file => {
      if (file.language !== 'cpp') return;

      // Check for naming conventions
      this.checkNamingConventions(file, errors);

      // Check for magic numbers
      this.checkMagicNumbers(file, errors);

      // Check for function length
      this.checkFunctionLength(file, errors);

      // Check for comment coverage
      this.checkCommentCoverage(file, (error) => errors.push(error));
    });
  }

  private initializeErrorPatterns(): void {
    // Missing includes
    this.errorPatterns.set(/Serial\./g, {
      type: 'compile_error',
      category: 'communication',
      severity: 'error',
      title: 'Missing Serial Library',
      message: 'Serial communication used without including the library',
      suggestions: [{
        type: 'fix',
        title: 'Add Serial Include',
        description: 'Add #include <Arduino.h> or #include <HardwareSerial.h>',
        codeExample: '#include <Arduino.h>',
        effort: 'low',
        impact: 'high'
      }],
      autoFixable: true
    });

    // Pin mode not set
    this.errorPatterns.set(/digitalWrite\([^,]+,\s*\d+\)/g, {
      type: 'logic_error',
      category: 'code_structure',
      severity: 'warning',
      title: 'Pin Mode Not Set',
      message: 'digitalWrite used without setting pinMode',
      suggestions: [{
        type: 'fix',
        title: 'Set Pin Mode',
        description: 'Add pinMode() before digitalWrite()',
        codeExample: 'pinMode(pin, OUTPUT);',
        effort: 'low',
        impact: 'medium'
      }],
      autoFixable: false
    });

    // String comparison issues
    this.errorPatterns.set(/==\s*"[^"]*"/g, {
      type: 'logic_error',
      category: 'code_structure',
      severity: 'warning',
      title: 'String Comparison Issue',
      message: 'Comparing string literals with == may not work as expected',
      suggestions: [{
        type: 'fix',
        title: 'Use String Comparison',
        description: 'Use strcmp() or String.equals() for proper comparison',
        codeExample: 'if (strcmp(str1, str2) == 0) { ... }',
        effort: 'low',
        impact: 'medium'
      }],
      autoFixable: false
    });

    // Delay in interrupt
    this.errorPatterns.set(/delay\s*\(/g, {
      type: 'runtime_error',
      category: 'timing_synchronization',
      severity: 'critical',
      title: 'Delay in Interrupt Context',
      message: 'Using delay() in interrupt service routine can cause system lockup',
      suggestions: [{
        type: 'fix',
        title: 'Remove Delay from ISR',
        description: 'Use timer-based approach or flags instead of delay',
        codeExample: 'volatile bool flag = false;\n// In ISR: flag = true;\n// In loop: if (flag) { ...; flag = false; }',
        effort: 'medium',
        impact: 'high'
      }],
      autoFixable: false
    });
  }

  private initializeCommonErrors(): void {
    this.commonErrors.set('pin_conflict', {
      frequency: 0.3,
      commonCauses: ['Multiple devices using same pin', 'Reserved pins used for other purposes'],
      solutions: ['Use pin mapping suggestions', 'Check board pin layout'],
      prevention: ['Review pin assignments before adding devices']
    });

    this.commonErrors.set('memory_overflow', {
      frequency: 0.2,
      commonCauses: ['Large arrays', 'Too many global variables', 'String memory fragmentation'],
      solutions: ['Use PROGMEM', 'Reduce variable scope', 'Use F() macro for strings'],
      prevention: ['Monitor memory usage', 'Use static allocation']
    });
  }

  private createErrorFromPattern(
    pattern: ErrorPattern,
    file: string,
    line: number,
    code: string
  ): SmartError | null {
    return {
      id: `${pattern.type}_${file}_${line}`,
      type: pattern.type,
      category: pattern.category,
      severity: pattern.severity,
      title: pattern.title,
      message: pattern.message,
      description: pattern.message,
      location: {
        file,
        line,
        codeSnippet: code.trim()
      },
      suggestions: pattern.suggestions,
      autoFixable: pattern.autoFixable,
      confidence: 0.8
    };
  }

  private convertCodeAnalysisError(issue: any): SmartError {
    return {
      id: `code_${issue.type}_${issue.line}`,
      type: 'logic_error',
      category: 'code_structure',
      severity: issue.severity,
      title: `Code Issue: ${issue.type}`,
      message: issue.message,
      description: issue.message,
      location: {
        file: 'unknown',
        line: issue.line
      },
      suggestions: issue.suggestion ? [{
        type: 'fix',
        title: 'Suggested Fix',
        description: issue.suggestion,
        effort: 'low',
        impact: 'medium'
      }] : [],
      autoFixable: issue.autoFixable,
      confidence: 0.7
    };
  }

  private convertDeviceInitError(device: DeviceInstance, issue: any): SmartError {
    return {
      id: `device_${device.instanceId}_${issue.type}`,
      type: 'hardware_error',
      category: 'device_configuration',
      severity: issue.severity,
      title: `Device Error: ${device.deviceType}`,
      message: issue.message,
      description: issue.message,
      suggestions: issue.suggestion ? [{
        type: 'fix',
        title: 'Device Fix',
        description: issue.suggestion,
        effort: 'low',
        impact: 'medium'
      }] : [],
      autoFixable: issue.autoFixable,
      confidence: 0.9,
      context: {
        relatedDevices: [device.instanceId]
      }
    };
  }

  private convertGlobalHardwareError(issue: any, devices: DeviceInstance[]): SmartError {
    return {
      id: `global_${issue.type}`,
      type: 'hardware_error',
      category: 'device_configuration',
      severity: issue.severity,
      title: `Hardware Issue: ${issue.type}`,
      message: issue.message,
      description: issue.message,
      suggestions: [{
        type: 'fix',
        title: 'Hardware Solution',
        description: issue.suggestion,
        effort: 'medium',
        impact: 'high'
      }],
      autoFixable: false,
      confidence: 0.8,
      context: {
        relatedDevices: issue.affectedDevices
      }
    };
  }

  private convertTimingError(issue: any): SmartError {
    return {
      id: `timing_${issue.type}_${issue.line}`,
      type: 'runtime_error',
      category: 'timing_synchronization',
      severity: issue.severity,
      title: `Timing Issue: ${issue.type}`,
      message: issue.description,
      description: issue.description,
      location: {
        file: 'unknown',
        line: issue.line
      },
      suggestions: [{
        type: 'fix',
        title: 'Timing Fix',
        description: issue.suggestion,
        effort: 'low',
        impact: 'high'
      }],
      autoFixable: false,
      confidence: 0.9
    };
  }

  private convertDeviceUsageError(device: any, issue: any): SmartError {
    return {
      id: `usage_${device.deviceType}_${issue.type}`,
      type: 'logic_error',
      category: 'device_configuration',
      severity: issue.severity,
      title: `Device Usage Error: ${device.deviceType}`,
      message: issue.description,
      description: issue.description,
      location: {
        file: 'unknown',
        line: issue.line
      },
      suggestions: [{
        type: 'fix',
        title: 'Usage Fix',
        description: issue.suggestion,
        effort: 'low',
        impact: 'medium'
      }],
      autoFixable: false,
      confidence: 0.8,
      context: {
        relatedDevices: [device.deviceType]
      }
    };
  }

  private detectPinConflicts(devices: DeviceInstance[], board: Board, errors: SmartError[]): void {
    const pinUsage = new Map<number, string[]>();

    devices.forEach(device => {
      Object.entries(device.pinMapping).forEach(([pinName, pinNumber]) => {
        if (!pinUsage.has(pinNumber)) {
          pinUsage.set(pinNumber, []);
        }
        pinUsage.get(pinNumber)!.push(`${device.deviceType}:${pinName}`);
      });
    });

    pinUsage.forEach((deviceList, pin) => {
      if (deviceList.length > 1) {
        errors.push({
          id: `pin_conflict_${pin}`,
          type: 'hardware_error',
          category: 'pin_management',
          severity: 'warning',
          title: 'Pin Conflict Detected',
          message: `Pin ${pin} is used by multiple devices: ${deviceList.join(', ')}`,
          description: `Multiple devices are trying to use the same physical pin ${pin}, which will cause conflicts.`,
          suggestions: [{
            type: 'fix',
            title: 'Resolve Pin Conflict',
            description: 'Use different pins for each device or consider using a multiplexer',
            effort: 'medium',
            impact: 'high'
          }],
          autoFixable: false,
          confidence: 1.0,
          context: {
            relatedDevices: deviceList
          }
        });
      }
    });
  }

  private detectPowerIssues(
    devices: DeviceInstance[],
    board: Board,
    profile: any,
    errors: SmartError[]
  ): void {
    if (profile.totalPowerConsumption > 1000) { // 1W limit
      errors.push({
        id: 'power_budget_exceeded',
        type: 'hardware_error',
        category: 'power_management',
        severity: 'error',
        title: 'Power Budget Exceeded',
        message: `Total power consumption (${profile.totalPowerConsumption}mW) exceeds safe limits`,
        description: 'The combined power consumption of all devices may exceed the power supply capacity.',
        suggestions: [{
          type: 'fix',
          title: 'Reduce Power Consumption',
          description: 'Consider using external power supply or reducing device count',
          effort: 'medium',
          impact: 'high'
        }],
        autoFixable: false,
        confidence: 0.8
      });
    }
  }

  private detectLogicPatternIssues(projectAnalysis: ProjectAnalysis, errors: SmartError[]): void {
    // Check for interrupt timing issues
    if (projectAnalysis.patterns.includes(LogicPattern.INTERRUPT_DRIVEN) && 
        projectAnalysis.patterns.includes(LogicPattern.POLLING_LOOP)) {
      errors.push({
        id: 'mixed_timing_patterns',
        type: 'logic_error',
        category: 'timing_synchronization',
        severity: 'warning',
        title: 'Mixed Timing Patterns',
        message: 'Both interrupt-driven and polling patterns detected',
        description: 'Mixing different timing approaches can lead to unpredictable behavior.',
        suggestions: [{
          type: 'improvement',
          title: 'Standardize Timing Approach',
          description: 'Choose either interrupt-driven or polling approach for consistency',
          effort: 'medium',
          impact: 'medium'
        }],
        autoFixable: false,
        confidence: 0.7
      });
    }
  }

  private createPerformanceBottleneckError(profile: any): SmartError {
    return {
      id: 'performance_bottleneck',
      type: 'performance_issue',
      category: 'code_structure',
      severity: 'warning',
      title: 'Performance Bottleneck Detected',
      message: `Device ${profile.bottleneckDevice} is limiting overall performance`,
      description: `The slowest device update rate is limiting the entire simulation performance.`,
      suggestions: [{
        type: 'improvement',
        title: 'Optimize Bottleneck Device',
        description: 'Consider optimizing the device configuration or reducing update frequency',
        effort: 'medium',
        impact: 'high'
      }],
      autoFixable: false,
      confidence: 0.8,
      context: {
        relatedDevices: [profile.bottleneckDevice]
      }
    };
  }

  private createInefficientPatternError(pattern: any): SmartError {
    return {
      id: 'inefficient_pattern',
      type: 'performance_issue',
      category: 'code_structure',
      severity: 'warning',
      title: 'Inefficient Code Pattern',
      message: `Inefficient ${pattern.type} pattern detected`,
      description: pattern.description,
      location: {
        file: 'unknown',
        line: pattern.lineNumbers[0]
      },
      suggestions: pattern.suggestions || [],
      autoFixable: false,
      confidence: pattern.confidence
    };
  }

  private createComplexityError(metrics: any): SmartError {
    return {
      id: 'high_complexity',
      type: 'logic_error',
      category: 'code_structure',
      severity: 'warning',
      title: 'High Code Complexity',
      message: `Cyclomatic complexity (${metrics.cyclomaticComplexity}) is too high`,
      description: 'High complexity makes code difficult to maintain and debug.',
      suggestions: [{
        type: 'improvement',
        title: 'Reduce Complexity',
        description: 'Break down complex functions into smaller, simpler ones',
        effort: 'medium',
        impact: 'medium'
      }],
      autoFixable: false,
      confidence: 0.8
    };
  }

  private checkNamingConventions(file: ProjectFile, errors: SmartError[]): void {
    const lines = file.content.split('\n');
    lines.forEach((line, index) => {
      // Check for variable naming
      const varMatch = line.match(/\b(int|float|double|bool|char|long)\s+([a-z]+[A-Z][a-zA-Z]*)\s*[=;]/);
      if (varMatch) {
        errors.push({
          id: `naming_${file.name}_${index}`,
          type: 'best_practice',
          category: 'code_structure',
          severity: 'info',
          title: 'Naming Convention',
          message: `Variable '${varMatch[2]}' uses camelCase instead of snake_case`,
          description: 'Consider using snake_case for variable names in Arduino projects.',
          suggestions: [{
            type: 'improvement',
            title: 'Use Snake Case',
            description: `Change ${varMatch[2]} to ${varMatch[2].replace(/([A-Z])/g, '_$1').toLowerCase()}`,
            effort: 'low',
            impact: 'low'
          }],
          autoFixable: false,
          confidence: 0.6,
          location: {
            file: file.name,
            line: index + 1,
            codeSnippet: line.trim()
          }
        });
      }
    });
  }

  private checkMagicNumbers(file: ProjectFile, errors: SmartError[]): void {
    const lines = file.content.split('\n');
    lines.forEach((line, index) => {
      // Look for magic numbers (excluding common values)
      const magicNumberMatch = line.match(/\b(?!0|1|2|10|100|1000)\d{2,}\b/);
      if (magicNumberMatch) {
        errors.push({
          id: `magic_number_${file.name}_${index}`,
          type: 'best_practice',
          category: 'code_structure',
          severity: 'info',
          title: 'Magic Number Detected',
          message: `Magic number ${magicNumberMatch[1]} found in code`,
          description: 'Consider using named constants for magic numbers to improve code readability.',
          suggestions: [{
            type: 'improvement',
            title: 'Define Constant',
            description: `Replace ${magicNumberMatch[1]} with a named constant`,
            codeExample: `const int MY_CONSTANT = ${magicNumberMatch[1]};`,
            effort: 'low',
            impact: 'low'
          }],
          autoFixable: false,
          confidence: 0.5,
          location: {
            file: file.name,
            line: index + 1,
            codeSnippet: line.trim()
          }
        });
      }
    });
  }

  private checkFunctionLength(file: ProjectFile, errors: SmartError[]): void {
    const functions = this.extractFunctions(file.content);
    functions.forEach(func => {
      if (func.lines > 50) {
        errors.push({
          id: `long_function_${file.name}_${func.line}`,
          type: 'best_practice',
          category: 'code_structure',
          severity: 'warning',
          title: 'Long Function',
          message: `Function '${func.name}' is ${func.lines} lines long`,
          description: 'Long functions are harder to understand and maintain.',
          suggestions: [{
            type: 'improvement',
            title: 'Break Down Function',
            description: 'Split the function into smaller, more focused functions',
            effort: 'medium',
            impact: 'medium'
          }],
          autoFixable: false,
          confidence: 0.7,
          location: {
            file: file.name,
            line: func.line
          }
        });
      }
    });
  }

  private checkCommentCoverage(file: ProjectFile, callback: (error: SmartError) => void): void {
    const lines = file.content.split('\n');
    const codeLines = lines.filter(line => line.trim() && !line.trim().startsWith('//'));
    const commentLines = lines.filter(line => line.trim().startsWith('//'));
    const commentRatio = commentLines.length / lines.length;

    if (commentRatio < 0.1) {
      callback({
        id: `low_comments_${file.name}`,
        type: 'best_practice',
        category: 'code_structure',
        severity: 'info',
        title: 'Low Comment Coverage',
        message: `Only ${Math.round(commentRatio * 100)}% of lines are commented`,
        description: 'Adding comments can improve code understanding and maintenance.',
        suggestions: [{
          type: 'improvement',
          title: 'Add Comments',
          description: 'Add comments to explain complex logic and function purposes',
          effort: 'medium',
          impact: 'low'
        }],
        autoFixable: false,
        confidence: 0.6
      });
    }
  }

  private extractFunctions(code: string): Array<{name: string, line: number, lines: number}> {
    const functions: Array<{name: string, line: number, lines: number}> = [];
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      const match = line.match(/^\s*\w+\s+(\w+)\s*\([^)]*\)\s*{/);
      if (match) {
        const funcEnd = this.findFunctionEnd(lines, index);
        functions.push({
          name: match[1],
          line: index + 1,
          lines: funcEnd - index + 1
        });
      }
    });
    
    return functions;
  }

  private findFunctionEnd(lines: string[], startLine: number): number {
    let braceCount = 1;
    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i];
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      if (braceCount === 0) return i;
    }
    return lines.length - 1;
  }

  private applyUserContext(errors: SmartError[]): void {
    errors.forEach(error => {
      const history = this.userHistory.get(error.type);
      if (history) {
        error.context = {
          ...error.context,
          userHistory: history
        };
        
        // Increase confidence for recurring errors
        if (history.frequency > 2) {
          error.confidence = Math.min(1.0, error.confidence + 0.1);
        }
      }
    });
  }

  private generateErrorSummary(errors: SmartError[]): ErrorSummary {
    const summary: ErrorSummary = {
      total: errors.length,
      bySeverity: { info: 0, warning: 0, error: 0, critical: 0 },
      byCategory: {} as Record<ErrorCategory, number>,
      byType: {} as Record<ErrorType, number>,
      autoFixable: 0,
      criticalIssues: 0
    };

    errors.forEach(error => {
      summary.bySeverity[error.severity]++;
      summary.byCategory[error.category] = (summary.byCategory[error.category] || 0) + 1;
      summary.byType[error.type] = (summary.byType[error.type] || 0) + 1;
      if (error.autoFixable) summary.autoFixable++;
      if (error.severity === 'critical' || error.severity === 'error') summary.criticalIssues++;
    });

    return summary;
  }

  private generateRecommendations(errors: SmartError[], projectAnalysis: ProjectAnalysis): ErrorRecommendation[] {
    const recommendations: ErrorRecommendation[] = [];

    // Group errors by type for recommendations
    const errorGroups = new Map<ErrorType, SmartError[]>();
    errors.forEach(error => {
      if (!errorGroups.has(error.type)) {
        errorGroups.set(error.type, []);
      }
      errorGroups.get(error.type)!.push(error);
    });

    errorGroups.forEach((groupErrors, type) => {
      if (groupErrors.length > 2) {
        recommendations.push({
          type: 'short_term',
          priority: 'high',
          title: `Fix Multiple ${type} Issues`,
          description: `Address ${groupErrors.length} ${type} errors to improve code quality`,
          affectedErrors: groupErrors.map(e => e.id),
          estimatedEffort: 'hours'
        });
      }
    });

    return recommendations;
  }

  private generateLearningInsights(errors: SmartError[], projectAnalysis: ProjectAnalysis): LearningInsight[] {
    const insights: LearningInsight[] = [];

    // Analyze error patterns
    const errorPatterns = new Map<ErrorType, number>();
    errors.forEach(error => {
      errorPatterns.set(error.type, (errorPatterns.get(error.type) || 0) + 1);
    });

    // Generate insights based on patterns
    if (errorPatterns.get('hardware_error')! > 3) {
      insights.push({
        type: 'pattern',
        title: 'Hardware Configuration Learning Opportunity',
        description: 'You\'re encountering multiple hardware-related issues. This is a great opportunity to learn about device configuration!',
        actionable: true,
        resources: [{
          type: 'tutorial',
          title: 'Arduino Device Configuration Guide',
          url: 'https://example.com/arduino-device-config',
          difficulty: 'beginner'
        }]
      });
    }

    return insights;
  }
}

interface ErrorPattern {
  type: ErrorType;
  category: ErrorCategory;
  severity: ErrorSeverity;
  title: string;
  message: string;
  suggestions: ErrorSuggestion[];
  autoFixable: boolean;
}

interface CommonErrorInfo {
  frequency: number;
  commonCauses: string[];
  solutions: string[];
  prevention: string[];
}
