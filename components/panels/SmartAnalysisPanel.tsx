'use client';
import { useState, useEffect } from 'react';
import {
  Brain,
  Zap,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Settings,
  Activity,
  Target,
  TrendingUp,
  Shield,
  Radio,
  Cpu,
  Database,
  BarChart3,
  Info,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { createSmartSimulator, SmartSimulatorUtils } from '@/lib/simulator';
import type { Project, DeviceInstance } from '@/types';
import { useIDEStore } from '@/lib/store';

interface SmartAnalysisPanelProps {
  project: Project;
  devices: DeviceInstance[];
  onApplySuggestions?: (suggestions: any) => void;
}

interface AnalysisData {
  projectAnalysis: any;
  codeAnalysis: any;
  errorAnalysis: any;
  pinSuggestions: any;
  isAnalyzing: boolean;
  lastAnalyzed: number;
}

export default function SmartAnalysisPanel({
  project,
  devices,
  onApplySuggestions,
}: SmartAnalysisPanelProps) {
  const [analysisData, setAnalysisData] = useState<AnalysisData>({
    projectAnalysis: null,
    codeAnalysis: null,
    errorAnalysis: null,
    pinSuggestions: null,
    isAnalyzing: false,
    lastAnalyzed: 0,
  });

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    errors: false,
    suggestions: false,
    performance: false,
  });

  const { activeProjectId, projects, simStatus } = useIDEStore();

  // Auto-analyze when project or devices change
  useEffect(() => {
    if (project && devices.length > 0) {
      analyzeProject();
    }
  }, [project, devices]);

  async function analyzeProject() {
    setAnalysisData(prev => ({ ...prev, isAnalyzing: true }));

    try {
      // Quick analysis without starting simulation
      const projectType = SmartSimulatorUtils.detectProjectType(project, devices);
      const errorCheck = SmartSimulatorUtils.quickErrorCheck(project, devices);
      const recommendedProfile = SmartSimulatorUtils.getRecommendedProfile(project, devices);

      setAnalysisData({
        projectAnalysis: {
          type: projectType,
          complexity: 'simple', // Would be calculated by full analyzer
          deviceCount: devices.length,
          fileCount: project.files.length,
          recommendedProfile: recommendedProfile?.name || 'Default',
        },
        codeAnalysis: {
          patterns: ['polling_loop'], // Would be detected by full analyzer
          functions: project.files.length,
          linesOfCode: project.files.reduce((sum, f) => sum + f.content.split('\n').length, 0),
          complexity: 'simple',
        },
        errorAnalysis: {
          total: errorCheck.summary.total,
          critical: errorCheck.summary.criticalIssues,
          warnings: errorCheck.summary.total - errorCheck.summary.criticalIssues,
          errors: errorCheck.errors.slice(0, 5), // Show first 5 errors
        },
        pinSuggestions: {
          conflicts: [], // Would be calculated by full analyzer
          suggestions: [], // Would be calculated by full analyzer
          optimizationPotential: 0.7,
        },
        isAnalyzing: false,
        lastAnalyzed: Date.now(),
      });
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysisData(prev => ({ ...prev, isAnalyzing: false }));
    }
  }

  function toggleSection(section: string) {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  const getProjectTypeIcon = (type: string) => {
    switch (type) {
      case 'iot_sensor': return <Radio size={14} />;
      case 'robotics': return <Cpu size={14} />;
      case 'home_automation': return <Settings size={14} />;
      case 'data_logger': return <Database size={14} />;
      default: return <Activity size={14} />;
    }
  };

  const getProjectTypeColor = (type: string) => {
    switch (type) {
      case 'iot_sensor': return 'var(--accent-blue)';
      case 'robotics': return 'var(--accent-green)';
      case 'home_automation': return 'var(--accent-amber)';
      case 'data_logger': return 'var(--accent-purple)';
      default: return 'var(--fg-subtle)';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'var(--accent-red)';
      case 'error': return 'var(--accent-red)';
      case 'warning': return 'var(--accent-amber)';
      case 'info': return 'var(--accent-blue)';
      default: return 'var(--fg-subtle)';
    }
  };

  if (analysisData.isAnalyzing) {
    return (
      <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Brain className="animate-pulse" size={32} style={{ color: 'var(--accent-blue)' }} />
            <p className="font-mono text-xs" style={{ color: 'var(--fg-subtle)' }}>
              Analyzing project...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <Brain size={14} style={{ color: 'var(--accent-blue)' }} />
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--fg-subtle)' }}>
            Smart Analysis
          </span>
        </div>
        <button
          onClick={analyzeProject}
          className="font-mono text-[9px] px-2 py-0.5 rounded transition-colors"
          style={{
            color: 'var(--accent-blue)',
            border: '1px solid var(--border-blue)',
            background: 'var(--tint-blue)',
          }}
        >
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Overview Section */}
        <div className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={() => toggleSection('overview')}
            className="w-full flex items-center justify-between px-3 py-2 text-left"
            style={{ background: 'var(--bg-surface)' }}
          >
            <div className="flex items-center gap-2">
              {expandedSections.overview ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Target size={12} style={{ color: 'var(--fg-subtle)' }} />
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--fg-subtle)' }}>
                Overview
              </span>
            </div>
          </button>

          {expandedSections.overview && analysisData.projectAnalysis && (
            <div className="px-3 py-2 space-y-2">
              {/* Project Type */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                  Project Type
                </span>
                <div className="flex items-center gap-1">
                  {getProjectTypeIcon(analysisData.projectAnalysis.type)}
                  <span
                    className="font-mono text-[10px] font-bold capitalize"
                    style={{ color: getProjectTypeColor(analysisData.projectAnalysis.type) }}
                  >
                    {analysisData.projectAnalysis.type.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Complexity */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                  Complexity
                </span>
                <span
                  className="font-mono text-[10px] font-bold capitalize"
                  style={{ color: 'var(--accent-green)' }}
                >
                  {analysisData.projectAnalysis.complexity}
                </span>
              </div>

              {/* Recommended Profile */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                  Recommended Profile
                </span>
                <span
                  className="font-mono text-[10px]"
                  style={{ color: 'var(--accent-blue)' }}
                >
                  {analysisData.projectAnalysis.recommendedProfile}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="text-center p-2 rounded" style={{ background: 'var(--bg-raised)' }}>
                  <div className="font-mono text-lg font-bold" style={{ color: 'var(--accent-blue)' }}>
                    {analysisData.projectAnalysis.deviceCount}
                  </div>
                  <div className="font-mono text-[9px]" style={{ color: 'var(--fg-subtle)' }}>
                    Devices
                  </div>
                </div>
                <div className="text-center p-2 rounded" style={{ background: 'var(--bg-raised)' }}>
                  <div className="font-mono text-lg font-bold" style={{ color: 'var(--accent-green)' }}>
                    {analysisData.projectAnalysis.fileCount}
                  </div>
                  <div className="font-mono text-[9px]" style={{ color: 'var(--fg-subtle)' }}>
                    Files
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Code Analysis Section */}
        <div className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={() => toggleSection('code')}
            className="w-full flex items-center justify-between px-3 py-2 text-left"
            style={{ background: 'var(--bg-surface)' }}
          >
            <div className="flex items-center gap-2">
              {expandedSections.code ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <BarChart3 size={12} style={{ color: 'var(--fg-subtle)' }} />
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--fg-subtle)' }}>
                Code Analysis
              </span>
            </div>
          </button>

          {expandedSections.code && analysisData.codeAnalysis && (
            <div className="px-3 py-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                  Lines of Code
                </span>
                <span className="font-mono text-[10px]" style={{ color: 'var(--fg-default)' }}>
                  {analysisData.codeAnalysis.linesOfCode}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                  Functions
                </span>
                <span className="font-mono text-[10px]" style={{ color: 'var(--fg-default)' }}>
                  {analysisData.codeAnalysis.functions}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                  Patterns Detected
                </span>
                <div className="flex items-center gap-1">
                  {analysisData.codeAnalysis.patterns.map((pattern: string, i: number) => (
                    <span
                      key={i}
                      className="font-mono text-[9px] px-1 py-0.5 rounded"
                      style={{
                        background: 'var(--tint-blue)',
                        color: 'var(--accent-blue)',
                        border: '1px solid var(--border-blue)',
                      }}
                    >
                      {pattern.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Analysis Section */}
        <div className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={() => toggleSection('errors')}
            className="w-full flex items-center justify-between px-3 py-2 text-left"
            style={{ background: 'var(--bg-surface)' }}
          >
            <div className="flex items-center gap-2">
              {expandedSections.errors ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <AlertTriangle size={12} style={{ color: 'var(--fg-subtle)' }} />
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--fg-subtle)' }}>
                Issues ({analysisData.errorAnalysis?.total || 0})
              </span>
            </div>
            <div className="flex items-center gap-1">
              {analysisData.errorAnalysis?.critical > 0 && (
                <span
                  className="font-mono text-[9px] px-1 py-0.5 rounded"
                  style={{
                    background: 'var(--tint-red)',
                    color: 'var(--accent-red)',
                    border: '1px solid var(--border-red)',
                  }}
                >
                  {analysisData.errorAnalysis.critical} Critical
                </span>
              )}
              {analysisData.errorAnalysis?.warnings > 0 && (
                <span
                  className="font-mono text-[9px] px-1 py-0.5 rounded"
                  style={{
                    background: 'var(--tint-amber)',
                    color: 'var(--accent-amber)',
                    border: '1px solid var(--border-amber)',
                  }}
                >
                  {analysisData.errorAnalysis.warnings} Warnings
                </span>
              )}
            </div>
          </button>

          {expandedSections.errors && analysisData.errorAnalysis && (
            <div className="px-3 py-2 space-y-2">
              {analysisData.errorAnalysis.errors.length === 0 ? (
                <div className="flex items-center gap-2 py-2">
                  <CheckCircle size={14} style={{ color: 'var(--accent-green)' }} />
                  <span className="font-mono text-[10px]" style={{ color: 'var(--accent-green)' }}>
                    No issues detected
                  </span>
                </div>
              ) : (
                analysisData.errorAnalysis.errors.map((error: any, index: number) => (
                  <div key={index} className="border-l-2 pl-2" style={{ borderColor: getSeverityColor(error.severity) }}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold" style={{ color: getSeverityColor(error.severity) }}>
                        {error.title}
                      </span>
                      <span className="font-mono text-[9px]" style={{ color: 'var(--fg-subtle)' }}>
                        Line {error.line}
                      </span>
                    </div>
                    <p className="font-mono text-[9px] mt-1" style={{ color: 'var(--fg-subtle)' }}>
                      {error.message}
                    </p>
                    {error.suggestion && (
                      <div className="flex items-start gap-1 mt-1">
                        <Lightbulb size={10} style={{ color: 'var(--accent-amber)' }} />
                        <p className="font-mono text-[9px]" style={{ color: 'var(--fg-subtle)' }}>
                          {error.suggestion}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Performance Section */}
        <div className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={() => toggleSection('performance')}
            className="w-full flex items-center justify-between px-3 py-2 text-left"
            style={{ background: 'var(--bg-surface)' }}
          >
            <div className="flex items-center gap-2">
              {expandedSections.performance ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <TrendingUp size={12} style={{ color: 'var(--fg-subtle)' }} />
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--fg-subtle)' }}>
                Performance
              </span>
            </div>
          </button>

          {expandedSections.performance && (
            <div className="px-3 py-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                  Optimization Potential
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${(analysisData.pinSuggestions?.optimizationPotential || 0) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px]" style={{ color: 'var(--accent-green)' }}>
                    {Math.round((analysisData.pinSuggestions?.optimizationPotential || 0) * 100)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                  Simulation Mode
                </span>
                <span className="font-mono text-[10px]" style={{ color: 'var(--accent-blue)' }}>
                  {simStatus === 'running' ? 'Smart Mode' : 'Ready'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                  Last Analyzed
                </span>
                <span className="font-mono text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                  {new Date(analysisData.lastAnalyzed).toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Smart Suggestions */}
        <div>
          <button
            onClick={() => toggleSection('suggestions')}
            className="w-full flex items-center justify-between px-3 py-2 text-left"
            style={{ background: 'var(--bg-surface)' }}
          >
            <div className="flex items-center gap-2">
              {expandedSections.suggestions ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Lightbulb size={12} style={{ color: 'var(--fg-subtle)' }} />
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--fg-subtle)' }}>
                Smart Suggestions
              </span>
            </div>
          </button>

          {expandedSections.suggestions && (
            <div className="px-3 py-2 space-y-2">
              <div className="p-2 rounded" style={{ background: 'var(--tint-blue)', border: '1px solid var(--border-blue)' }}>
                <div className="flex items-start gap-2">
                  <Info size={12} style={{ color: 'var(--accent-blue)' }} />
                  <div>
                    <p className="font-mono text-[10px] font-bold" style={{ color: 'var(--accent-blue)' }}>
                      Enable Smart Simulation
                    </p>
                    <p className="font-mono text-[9px] mt-1" style={{ color: 'var(--fg-subtle)' }}>
                      Use the smart simulator for automatic optimization and intelligent error detection.
                    </p>
                  </div>
                </div>
              </div>

              {analysisData.errorAnalysis?.critical > 0 && (
                <div className="p-2 rounded" style={{ background: 'var(--tint-red)', border: '1px solid var(--border-red)' }}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={12} style={{ color: 'var(--accent-red)' }} />
                    <div>
                      <p className="font-mono text-[10px] font-bold" style={{ color: 'var(--accent-red)' }}>
                        Fix Critical Issues
                      </p>
                      <p className="font-mono text-[9px] mt-1" style={{ color: 'var(--fg-subtle)' }}>
                        Address critical errors before running simulation for best results.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-2 rounded" style={{ background: 'var(--tint-green)', border: '1px solid var(--border-green)' }}>
                <div className="flex items-start gap-2">
                  <Zap size={12} style={{ color: 'var(--accent-green)' }} />
                  <div>
                    <p className="font-mono text-[10px] font-bold" style={{ color: 'var(--accent-green)' }}>
                      Performance Tips
                    </p>
                    <p className="font-mono text-[9px] mt-1" style={{ color: 'var(--fg-subtle)' }}>
                      Consider using interrupts instead of delays for better responsiveness.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
