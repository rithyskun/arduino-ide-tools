/**
 * Code Analyzer — Deep analysis of Arduino code patterns and logic
 *
 * Analyzes Arduino source code to detect:
 * - Logic patterns and structures
 * - Function usage and complexity
 * - Potential issues and optimizations
 * - Device-specific code patterns
 * - Timing and synchronization patterns
 */

import type { ProjectFile } from '@/types';

export interface CodePattern {
  type: string;
  name: string;
  description: string;
  lineNumbers: number[];
  confidence: number; // 0-1
  suggestions?: string[];
}

export interface FunctionAnalysis {
  name: string;
  lineNumbers: number[];
  complexity: 'low' | 'medium' | 'high';
  parameters: ParameterInfo[];
  returnType: string;
  calls: string[];
  variables: VariableInfo[];
  patterns: string[];
}

export interface ParameterInfo {
  name: string;
  type: string;
  isPointer: boolean;
  isConst: boolean;
}

export interface VariableInfo {
  name: string;
  type: string;
  scope: 'local' | 'global';
  isConst: boolean;
  isStatic: boolean;
  usage: number; // number of times used
}

export interface TimingAnalysis {
  delays: DelayInfo[];
  timers: TimerInfo[];
  interrupts: InterruptInfo[];
  realTimeIssues: RealTimeIssue[];
}

export interface DelayInfo {
  type: 'delay' | 'delayMicroseconds';
  line: number;
  value: number | 'variable';
  inInterrupt: boolean;
  problematic: boolean;
}

export interface TimerInfo {
  type: 'millis' | 'micros';
  line: number;
  pattern: 'polling' | 'timeout' | 'periodic';
}

export interface InterruptInfo {
  type: 'attachInterrupt' | 'ISR';
  line: number;
  vector: string;
  mode?: string;
  hasDelay: boolean;
  hasSerial: boolean;
}

export interface RealTimeIssue {
  type: 'delay_in_isr' | 'serial_in_isr' | 'long_isr' | 'blocking_delay';
  line: number;
  severity: 'warning' | 'error' | 'critical';
  description: string;
  suggestion: string;
}

export interface DeviceUsage {
  deviceType: string;
  library: string;
  initialization: InitInfo[];
  usage: UsageInfo[];
  patterns: string[];
  issues: DeviceIssue[];
}

export interface InitInfo {
  line: number;
  method: string;
  parameters: string[];
  success: boolean;
}

export interface UsageInfo {
  line: number;
  method: string;
  frequency: 'low' | 'medium' | 'high';
  context: string;
}

export interface DeviceIssue {
  type: 'missing_init' | 'wrong_parameters' | 'timing_issue' | 'missing_library';
  line: number;
  severity: 'warning' | 'error';
  description: string;
  suggestion: string;
}

export interface CodeAnalysisResult {
  patterns: CodePattern[];
  functions: FunctionAnalysis[];
  timing: TimingAnalysis;
  devices: DeviceUsage[];
  issues: CodeIssue[];
  metrics: CodeMetrics;
  recommendations: CodeRecommendation[];
}

export interface CodeIssue {
  type: 'syntax' | 'logic' | 'performance' | 'style' | 'safety';
  line: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  suggestion?: string;
  autoFixable: boolean;
}

export interface CodeMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  duplicateCode: number;
  commentRatio: number;
  functionCount: number;
  globalVariables: number;
  libraryDependencies: number;
}

export interface CodeRecommendation {
  type: 'optimization' | 'refactoring' | 'safety' | 'style' | 'feature';
  title: string;
  description: string;
  lineNumbers: number[];
  priority: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
}

export class CodeAnalyzer {
  private readonly deviceLibraries = new Map<string, string[]>([
    ['HX711', ['HX711.h', 'HX711-CUSTOM.h']],
    ['Adafruit_INA260', ['Adafruit_INA260.h']],
    ['DHT', ['DHT.h']],
    ['Adafruit_SSD1306', ['Adafruit_SSD1306.h', 'Adafruit_GFX.h']],
    ['MPU6050', ['MPU6050.h']],
    ['Servo', ['Servo.h']],
    ['TimerOne', ['TimerOne.h']],
    ['Wire', ['Wire.h']],
    ['SPI', ['SPI.h']],
    ['Ethernet', ['Ethernet.h']],
    ['WiFi', ['WiFi.h']],
    ['SD', ['SD.h']],
  ]);

  private readonly problematicPatterns = [
    {
      pattern: /delay\s*\(\s*\d+\s*\)\s*;/g,
      type: 'blocking_delay',
      suggestion: 'Consider using millis() for non-blocking timing'
    },
    {
      pattern: /Serial\.print(ln)?\s*\([^)]*\)\s*;/g,
      type: 'serial_in_isr',
      suggestion: 'Avoid Serial operations in interrupt service routines'
    },
    {
      pattern: /digitalWrite\s*\([^)]*\)\s*;\s*delay\s*\([^)]*\)\s*;/g,
      type: 'inefficient_blink',
      suggestion: 'Use millis() for non-blocking LED patterns'
    }
  ];

  analyzeCode(files: ProjectFile[]): CodeAnalysisResult {
    const cppFiles = files.filter(f => f.language === 'cpp');
    const code = cppFiles.map(f => f.content).join('\n');

    const patterns = this.detectPatterns(code);
    const functions = this.analyzeFunctions(code);
    const timing = this.analyzeTiming(code);
    const devices = this.analyzeDeviceUsage(code);
    const issues = this.detectIssues(code);
    const metrics = this.calculateMetrics(code);
    const recommendations = this.generateRecommendations(patterns, timing, devices, issues);

    return {
      patterns,
      functions,
      timing,
      devices,
      issues,
      metrics,
      recommendations
    };
  }

  private detectPatterns(code: string): CodePattern[] {
    const patterns: CodePattern[] = [];

    // State machine pattern
    const stateMachineRegex = /switch\s*\([^)]+\)\s*{[^}]*case[^}]*break[^}]*}/g;
    const stateMatches = this.findAllMatches(code, stateMachineRegex);
    if (stateMatches.length > 0) {
      patterns.push({
        type: 'state_machine',
        name: 'State Machine',
        description: 'Switch-based state machine detected',
        lineNumbers: stateMatches.map(m => m.line),
        confidence: 0.8,
        suggestions: ['Consider using enum for states', 'Add state transition validation']
      });
    }

    // Polling loop pattern
    const pollingRegex = /while\s*\([^)]+\)\s*{[^}]*delay\s*\([^)]*\)[^}]*}/g;
    const pollingMatches = this.findAllMatches(code, pollingRegex);
    if (pollingMatches.length > 0) {
      patterns.push({
        type: 'polling_loop',
        name: 'Polling Loop',
        description: 'Busy-wait polling loop detected',
        lineNumbers: pollingMatches.map(m => m.line),
        confidence: 0.9,
        suggestions: ['Consider using interrupts', 'Add timeout handling']
      });
    }

    // Timer-based pattern
    const timerRegex = /if\s*\([^)]*millis\s*\(\s*\)[^}]*>\s*[^}]+\)\s*{[^}]*}/g;
    const timerMatches = this.findAllMatches(code, timerRegex);
    if (timerMatches.length > 0) {
      patterns.push({
        type: 'timer_based',
        name: 'Timer-based Operations',
        description: 'Non-blocking timer pattern detected',
        lineNumbers: timerMatches.map(m => m.line),
        confidence: 0.85,
        suggestions: ['Good practice for non-blocking code', 'Consider using helper functions']
      });
    }

    // Interrupt pattern
    const interruptRegex = /attachInterrupt\s*\([^)]+\)\s*;/g;
    const interruptMatches = this.findAllMatches(code, interruptRegex);
    if (interruptMatches.length > 0) {
      patterns.push({
        type: 'interrupt_driven',
        name: 'Interrupt-driven',
        description: 'Hardware interrupts detected',
        lineNumbers: interruptMatches.map(m => m.line),
        confidence: 0.95,
        suggestions: ['Keep ISRs short', 'Avoid Serial in ISRs', 'Use volatile for shared variables']
      });
    }

    return patterns;
  }

  private analyzeFunctions(code: string): FunctionAnalysis[] {
    const functions: FunctionAnalysis[] = [];
    
    // Find function definitions
    const functionRegex = /\b\w+\s+\w+\s*\([^)]*\)\s*{/g;
    const matches = this.findAllMatches(code, functionRegex);

    matches.forEach(match => {
      const functionCode = this.extractFunctionCode(code, match.index);
      const analysis = this.analyzeFunction(functionCode, match.line);
      functions.push(analysis);
    });

    return functions;
  }

  private analyzeTiming(code: string): TimingAnalysis {
    const delays: DelayInfo[] = [];
    const timers: TimerInfo[] = [];
    const interrupts: InterruptInfo[] = [];
    const realTimeIssues: RealTimeIssue[] = [];

    // Analyze delays
    const delayRegex = /(delay|delayMicroseconds)\s*\(\s*([^)]*)\s*\)\s*;/g;
    let match;
    while ((match = delayRegex.exec(code)) !== null) {
      const line = this.getLineNumber(code, match.index);
      const value = isNaN(Number(match[2])) ? 'variable' : Number(match[2]);
      const inInterrupt = this.isInInterrupt(code, match.index);

      delays.push({
        type: match[1] as 'delay' | 'delayMicroseconds',
        line,
        value,
        inInterrupt,
        problematic: inInterrupt || (typeof value === 'number' && value > 100)
      });

      if (inInterrupt) {
        realTimeIssues.push({
          type: 'delay_in_isr',
          line,
          severity: 'critical',
          description: 'Delay function used in interrupt service routine',
          suggestion: 'Remove delay from ISR or use timer-based approach'
        });
      }
    }

    // Analyze timer usage
    const timerRegex = /(millis|micros)\s*\(\s*\)/g;
    while ((match = timerRegex.exec(code)) !== null) {
      const line = this.getLineNumber(code, match.index);
      const context = this.getTimerContext(code, match.index);
      
      timers.push({
        type: match[1] as 'millis' | 'micros',
        line,
        pattern: context
      });
    }

    // Analyze interrupts
    const interruptRegex = /attachInterrupt\s*\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\s*\)/g;
    while ((match = interruptRegex.exec(code)) !== null) {
      const line = this.getLineNumber(code, match.index);
      const isrCode = this.findISRCode(code, match[2].trim());
      
      interrupts.push({
        type: 'attachInterrupt',
        line,
        vector: match[1].trim(),
        mode: match[3].trim(),
        hasDelay: /delay\s*\(/.test(isrCode),
        hasSerial: /Serial\./.test(isrCode)
      });
    }

    return {
      delays,
      timers,
      interrupts,
      realTimeIssues
    };
  }

  private analyzeDeviceUsage(code: string): DeviceUsage[] {
    const devices: DeviceUsage[] = [];
    const includes = this.extractIncludes(code);

    this.deviceLibraries.forEach((libs, deviceType) => {
      const hasLibrary = libs.some(lib => includes.includes(lib));
      if (!hasLibrary) return;

      const deviceCode = this.extractDeviceCode(code, deviceType);
      const usage: DeviceUsage = {
        deviceType,
        library: libs[0],
        initialization: this.findInitialization(deviceCode),
        usage: this.findUsagePatterns(deviceCode),
        patterns: this.detectDevicePatterns(deviceCode),
        issues: this.detectDeviceIssues(deviceCode, deviceType)
      };

      devices.push(usage);
    });

    return devices;
  }

  private detectIssues(code: string): CodeIssue[] {
    const issues: CodeIssue[] = [];

    // Check for common issues
    this.problematicPatterns.forEach(({ pattern, type, suggestion }) => {
      const matches = this.findAllMatches(code, pattern);
      matches.forEach(match => {
        issues.push({
          type: 'performance',
          line: match.line,
          severity: 'warning',
          message: `Problematic pattern detected: ${type}`,
          suggestion,
          autoFixable: false
        });
      });
    });

    // Check for missing includes
    const includes = this.extractIncludes(code);
    const wireNeeded = /Wire\./.test(code) && !includes.includes('Wire.h');
    if (wireNeeded) {
      issues.push({
        type: 'syntax',
        line: 1,
        severity: 'error',
        message: 'Wire library used but not included',
        suggestion: 'Add #include <Wire.h>',
        autoFixable: true
      });
    }

    return issues;
  }

  private calculateMetrics(code: string): CodeMetrics {
    const lines = code.split('\n');
    const linesOfCode = lines.filter(line => line.trim() && !line.trim().startsWith('//')).length;
    
    // Simple complexity calculation
    const complexityKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||'];
    let cyclomaticComplexity = 1;
    complexityKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      cyclomaticComplexity += (code.match(regex) || []).length;
    });

    const commentLines = lines.filter(line => line.trim().startsWith('//')).length;
    const commentRatio = lines.length > 0 ? commentLines / lines.length : 0;

    const functionCount = (code.match(/\b\w+\s+\w+\s*\([^)]*\)\s*{/g) || []).length;
    const globalVariables = (code.match(/^(int|float|double|bool|char|long)\s+\w+\s*[=;]/m) || []).length;
    const libraryDependencies = (code.match(/#include\s*[<"][^>"]+[>"]/g) || []).length;

    return {
      linesOfCode,
      cyclomaticComplexity,
      maintainabilityIndex: Math.max(0, 171 - 5.2 * Math.log(cyclomaticComplexity) - 0.23 * cyclomaticComplexity - 16.2 * Math.log(linesOfCode)),
      duplicateCode: 0, // Would need more sophisticated analysis
      commentRatio,
      functionCount,
      globalVariables,
      libraryDependencies
    };
  }

  private generateRecommendations(
    patterns: CodePattern[],
    timing: TimingAnalysis,
    devices: DeviceUsage[],
    issues: CodeIssue[]
  ): CodeRecommendation[] {
    const recommendations: CodeRecommendation[] = [];

    // Pattern-based recommendations
    patterns.forEach(pattern => {
      if (pattern.type === 'polling_loop') {
        recommendations.push({
          type: 'optimization',
          title: 'Convert Polling to Interrupt-driven',
          description: 'Replace busy-wait polling with hardware interrupts for better efficiency',
          lineNumbers: pattern.lineNumbers,
          priority: 'high',
          effort: 'medium'
        });
      }
    });

    // Timing-based recommendations
    timing.realTimeIssues.forEach(issue => {
      recommendations.push({
        type: 'safety',
        title: `Fix Real-time Issue: ${issue.type}`,
        description: issue.description,
        lineNumbers: [issue.line],
        priority: issue.severity === 'critical' ? 'high' : 'medium',
        effort: 'low'
      });
    });

    // Device-specific recommendations
    devices.forEach(device => {
      device.issues.forEach(issue => {
        recommendations.push({
          type: 'optimization',
          title: `Fix ${device.deviceType} Issue`,
          description: issue.description,
          lineNumbers: [issue.line],
          priority: issue.severity === 'error' ? 'high' : 'medium',
          effort: 'low'
        });
      });
    });

    return recommendations;
  }

  // Helper methods
  private findAllMatches(code: string, regex: RegExp): Array<{index: number, line: number, match: string}> {
    const matches: Array<{index: number, line: number, match: string}> = [];
    let match;
    while ((match = regex.exec(code)) !== null) {
      matches.push({
        index: match.index,
        line: this.getLineNumber(code, match.index),
        match: match[0]
      });
    }
    return matches;
  }

  private getLineNumber(code: string, index: number): number {
    return code.substring(0, index).split('\n').length;
  }

  private extractFunctionCode(code: string, startIndex: number): string {
    // Simple extraction - would need more sophisticated parsing for nested functions
    const after = code.substring(startIndex);
    const openBrace = after.indexOf('{');
    if (openBrace === -1) return '';
    
    let braceCount = 1;
    let endIndex = openBrace + 1;
    
    for (let i = openBrace + 1; i < after.length && braceCount > 0; i++) {
      if (after[i] === '{') braceCount++;
      else if (after[i] === '}') braceCount--;
      if (braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
    
    return after.substring(0, endIndex);
  }

  private analyzeFunction(code: string, startLine: number): FunctionAnalysis {
    // Simplified function analysis - would need more sophisticated parsing
    const nameMatch = code.match(/^\s*\w+\s+(\w+)\s*\(/);
    const name = nameMatch ? nameMatch[1] : 'unknown';
    
    return {
      name,
      lineNumbers: [startLine],
      complexity: 'medium',
      parameters: [],
      returnType: 'void',
      calls: [],
      variables: [],
      patterns: []
    };
  }

  private isInInterrupt(code: string, index: number): boolean {
    // Check if the code is within an ISR
    const before = code.substring(0, index);
    const isrStart = before.lastIndexOf('ISR(');
    const isrEnd = before.lastIndexOf('}');
    return isrStart > isrEnd;
  }

  private getTimerContext(code: string, index: number): 'polling' | 'timeout' | 'periodic' {
    const context = code.substring(Math.max(0, index - 200), index + 200);
    if (context.includes('>') && context.includes('previousMillis')) return 'periodic';
    if (context.includes('timeout')) return 'timeout';
    return 'polling';
  }

  private findISRCode(code: string, isrName: string): string {
    const isrRegex = new RegExp(`void\\s+${isrName}\\s*\\([^)]*\\)\\s*{[^}]*}`, 'g');
    const match = isrRegex.exec(code);
    return match ? match[0] : '';
  }

  private extractIncludes(code: string): string[] {
    const includes: string[] = [];
    const regex = /#include\s*[<"]([^>"]+)[>"]/g;
    let match;
    while ((match = regex.exec(code)) !== null) {
      includes.push(match[1]);
    }
    return includes;
  }

  private extractDeviceCode(code: string, deviceType: string): string {
    // Simplified - would need more sophisticated extraction
    return code;
  }

  private findInitialization(code: string): InitInfo[] {
    // Simplified - would need more sophisticated parsing
    return [];
  }

  private findUsagePatterns(code: string): UsageInfo[] {
    // Simplified - would need more sophisticated parsing
    return [];
  }

  private detectDevicePatterns(code: string): string[] {
    // Simplified - would need more sophisticated analysis
    return [];
  }

  private detectDeviceIssues(code: string, deviceType: string): DeviceIssue[] {
    // Simplified - would need device-specific analysis
    return [];
  }
}
