'use client';
import { useCallback, useRef, useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, LogOut, Cloud, CloudOff, Loader2, AlertCircle } from 'lucide-react';
import { useProjectSync } from '@/lib/store/useProjectSync';
import Toolbar from '@/components/toolbar/Toolbar';
import FileTree from '@/components/sidebar/FileTree';
import CodeEditor from '@/components/editor/CodeEditor';
import CompileLog from '@/components/panels/CompileLog';
import SerialMonitor from '@/components/panels/SerialMonitor';
import SmartHardwarePanel from '@/components/panels/SmartHardwarePanel';
import SmartAnalysisPanel from '@/components/panels/SmartAnalysisPanel';
import SimulationPanel from '@/components/simulation/SimulationPanel';
import SmartDeviceCatalog from '@/components/dialogs/SmartDeviceCatalog';
import BoardSelector from '@/components/dialogs/BoardSelector';
import { useIDEStore } from '@/lib/store';
import { useSplitter } from '@/components/editor/useSplitter';
import {
  SmartSimulator,
  type SensorInputs,
  type DiagnosticSnapshot,
} from '@/lib/simulator/smart-engine';
import { InterpretedSimulator } from '@/lib/simulator/engine';
import { BasicSimulator } from '@/lib/simulator/basic-simulator';
import { DeviceDrivenSimulator } from '@/lib/simulator/device-driven-simulator';
import '@/lib/simulator/devices'; // Import to register all device behaviors
import type { SerialLineType, Project } from '@/types';
import { BOARDS } from '@/lib/boards';

export default function IDE({ guestMode = false }: { guestMode?: boolean }) {
  const store = useIDEStore();
  const { data: session } = useSession();
  const router = useRouter();
  const { saveNow, saveStatus } = useProjectSync({ guestMode });
  const hasUnsaved =
    store.projects
      .find((p: any) => p.id === store.activeProjectId)
      ?.files.some((f: any) => f.modified) ?? false;

  const {
    panelSizes,
    setPanelSizes,
    activeProjectId,
    projects,
    boardPanelOpen,
    setBoardPanelOpen,
    devicePanelOpen,
    setDevicePanelOpen,
    setSimStatus,
    setSimMode,
    setSimMillis,
    setSimSpeed,
    simSpeed,
    appendSerial,
    appendLog,
    clearSerial,
    clearLog,
    setPinState,
    setAnalogState,
    pinStates,
    analogStates,
  } = store;

  const simRef = useRef<SmartSimulator | InterpretedSimulator | BasicSimulator | DeviceDrivenSimulator | null>(null);
  const [sensorInputs, setSensorInputs] = useState<SensorInputs>({
    scaleWeightG: [500, 750, 300],
    inaVoltage: 12100,
    inaCurrent: 320,
    rainTips: [0, 0],
    ntcTempC: [25, 25, 25, 25, 25],
    ambientTempC: 25,
  });
  const [diagnostics, setDiagnostics] = useState<DiagnosticSnapshot | null>(
    null
  );
  const diagInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [hwPinStates, setHwPinStates] = useState<Record<number, number>>({});

  // ── Splitter: file tree ↔ editor ──────────────────────────────
  const { onMouseDown: onSplitLeft } = useSplitter({
    direction: 'horizontal',
    onResize: (delta) =>
      setPanelSizes({
        fileTree: Math.max(120, Math.min(400, panelSizes.fileTree + delta)),
      }),
    onEnd: () => window.dispatchEvent(new Event('resize')),
  });

  // ── Splitter: editor ↔ right panel ───────────────────────────
  const { onMouseDown: onSplitRight } = useSplitter({
    direction: 'horizontal',
    onResize: (delta) =>
      setPanelSizes({
        rightPanel: Math.max(220, Math.min(600, panelSizes.rightPanel - delta)),
      }),
    onEnd: () => window.dispatchEvent(new Event('resize')),
  });

  // ── Splitter: editor ↔ compile log ───────────────────────────
  const { onMouseDown: onSplitCompile } = useSplitter({
    direction: 'vertical',
    onResize: (delta) =>
      setPanelSizes({
        compileLog: Math.max(40, Math.min(400, panelSizes.compileLog - delta)),
      }),
  });

  // ── Splitter: hw panel ↔ serial panel ────────────────────────
  const { onMouseDown: onSplitSerial } = useSplitter({
    direction: 'vertical',
    onResize: (delta) =>
      setPanelSizes({
        hwPanel: Math.max(80, Math.min(600, panelSizes.hwPanel + delta)),
      }),
  });

  // ── Serial callbacks for simulator ───────────────────────────
  const handleSerialLine = useCallback(
    (text: string) => {
      let type: SerialLineType = 'data';
      if (text.startsWith('<Inf>')) type = 'inf';
      else if (text.startsWith('<Err>')) type = 'err';
      else if (text.startsWith('<Raw>')) type = 'raw';
      appendSerial(text, type);
    },
    [appendSerial]
  );

  // ── Determine simulator type based on project content ─────────────
  function getSimulatorType(project: Project): 'basic' | 'interpreted' | 'smart' | 'device-driven' {
    const content = project.files.map((f: any) => f.content).join('').toLowerCase();

    // Check if project has devices configured
    const devicesFile = project.files.find((f: any) => f.name === '__devices.json');
    if (devicesFile) {
      try {
        const devices = JSON.parse(devicesFile.content);
        if (devices.length > 0) {
          return 'device-driven'; // Use device-driven simulator when devices are configured
        }
      } catch (error) {
        // Invalid devices file, fall back to other simulators
        console.warn('Invalid devices file:', error);
      }
    } else {
      // No devices file, check if user might want device-driven mode
      // For now, fall back to other simulators
    }

    // Check for weather station specific keywords
    const weatherKeywords = [
      'hx711', 'scale', 'ina260', 'rain', 'rainmeter', 'pca9685', 'eeprom_store',
      'command_handler', 'target_flow', 'stepper', 'relay'
    ];

    // Check for complex Arduino features
    const complexKeywords = [
      'timer1', 'interrupt', 'eeprom', 'wire.begin', 'i2c', 'spi'
    ];

    const hasWeatherFeatures = weatherKeywords.some(keyword => content.includes(keyword));
    const hasComplexFeatures = complexKeywords.some(keyword => content.includes(keyword));

    if (hasWeatherFeatures) {
      return 'smart'; // Use smart simulator for weather station projects
    } else if (hasComplexFeatures) {
      return 'interpreted'; // Use interpreted simulator for complex projects
    } else {
      return 'basic'; // Use basic simulator for simple projects
    }
  }

  // ── Compile & Run ─────────────────────────────────────────────
  async function compileAndRun() {
    if (simRef.current) simRef.current.stop();
    clearSerial();
    clearLog();
    setSimStatus('compiling');

    const project = projects.find((p: any) => p.id === activeProjectId);
    if (!project) {
      setSimStatus('error');
      return;
    }

    appendLog(`Building project: ${project.name}`, 'step');
    appendLog(
      `Board: ${BOARDS.find((b) => b.id === project.boardId)?.name ?? project.boardId}`,
      'info'
    );
    appendLog(
      `Files: ${project.files
        .filter((f: any) => !f.name.startsWith('__'))
        .map((f: any) => f.name)
        .join(', ')}`,
      'info'
    );

    // Try Compiler Explorer API
    try {
      appendLog('Bundling sources…', 'step');
      const board = BOARDS.find((b) => b.id === project.boardId);

      const source = buildBundledSource(project.files);
      appendLog(`Source: ${source.length} chars`, 'info');
      appendLog('Sending to Compiler Explorer (godbolt.org) avr-gcc…', 'step');

      const resp = await fetch(
        'https://godbolt.org/api/compiler/avr-gcc1220/compile',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            source,
            lang: 'c++',
            options: {
              userArguments: `-mmcu=atmega2560 -DF_CPU=16000000UL -Os -std=c++17 -fno-exceptions -ffunction-sections -fdata-sections`,
              filters: {
                binary: false,
                execute: false,
                intel: true,
                demangle: true,
                labels: true,
                directives: true,
                commentOnly: true,
                trim: false,
              },
              tools: [],
              libraries: [],
            },
          }),
        }
      );

      if (resp.ok) {
        const result = await resp.json();
        const errs = (result.stderr ?? []).filter((l: { text: string }) =>
          l.text.includes('error:')
        );
        const warns = (result.stderr ?? []).filter((l: { text: string }) =>
          l.text.includes('warning:')
        );
        (result.stderr ?? []).forEach((l: { text: string }) => {
          appendLog(
            l.text,
            l.text.includes('error:')
              ? 'error'
              : l.text.includes('warning:')
                ? 'warn'
                : 'info'
          );
        });
        appendLog(
          `${errs.length} errors, ${warns.length} warnings`,
          errs.length > 0 ? 'error' : 'ok'
        );

        if (errs.length === 0) {
          appendLog(
            '✓ Compiled successfully! Starting interpreted simulation…',
            'ok'
          );
        } else {
          setSimStatus('error');
          return;
        }
      } else {
        appendLog(
          `Compiler API returned ${resp.status} — falling back to interpreted mode`,
          'warn'
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      appendLog(
        `Compiler API unreachable (${msg}) — using interpreted simulation`,
        'warn'
      );
    }

    // Start appropriate simulator based on project content
    appendLog('Starting simulation…', 'step');
    setSimMode('interpreted');
    setSimStatus('running');

    const simulatorType = getSimulatorType(project);
    appendLog(`Using ${simulatorType} simulator`, 'info');

    let sim: SmartSimulator | InterpretedSimulator | BasicSimulator | DeviceDrivenSimulator;

    switch (simulatorType) {
      case 'smart':
        sim = new SmartSimulator({
          onSerial: handleSerialLine,
          onPinChange: (pin, val) => {
            setPinState(pin, val);
            setHwPinStates((prev) => ({ ...prev, [pin]: val }));
          },
          onAnalogChange: setAnalogState,
          onMillisUpdate: setSimMillis,
          onStop: () => {
            setSimStatus('stopped');
            if (diagInterval.current) {
              clearInterval(diagInterval.current);
              diagInterval.current = null;
            }
          },
          onI2CScan: (addrs) => {
            appendLog(
              `I2C scan: ${addrs.length} device(s) at ${addrs.map((a) => '0x' + a.toString(16).toUpperCase()).join(', ')}`,
              'step'
            );
          },
        });
        break;
      case 'interpreted':
        sim = new InterpretedSimulator({
          onSerial: handleSerialLine,
          onPinChange: (pin, val) => {
            setPinState(pin, val);
            setHwPinStates((prev) => ({ ...prev, [pin]: val }));
          },
          onAnalogChange: setAnalogState,
          onMillisUpdate: setSimMillis,
          onStop: () => {
            setSimStatus('stopped');
            if (diagInterval.current) {
              clearInterval(diagInterval.current);
              diagInterval.current = null;
            }
          },
        });
        break;
      case 'device-driven':
        sim = new DeviceDrivenSimulator(project, {
          onSerial: handleSerialLine,
          onPinChange: (pin, val) => {
            setPinState(pin, val);
            setHwPinStates((prev) => ({ ...prev, [pin]: val }));
          },
          onAnalogChange: setAnalogState,
          onMillisUpdate: setSimMillis,
          onStop: () => {
            setSimStatus('stopped');
            if (diagInterval.current) {
              clearInterval(diagInterval.current);
              diagInterval.current = null;
            }
          },
        });
        break;
      case 'basic':
      default:
        sim = new BasicSimulator({
          onSerial: handleSerialLine,
          onPinChange: (pin, val) => {
            setPinState(pin, val);
            setHwPinStates((prev) => ({ ...prev, [pin]: val }));
          },
          onAnalogChange: setAnalogState,
          onMillisUpdate: setSimMillis,
          onStop: () => {
            setSimStatus('stopped');
            if (diagInterval.current) {
              clearInterval(diagInterval.current);
              diagInterval.current = null;
            }
          },
        });
        break;
    }
    sim.setSpeed(simSpeed);
    // Only set inputs for simulators that support it
    if (sim instanceof SmartSimulator) {
      sim.setInputs(sensorInputs);
    } else if (sim instanceof DeviceDrivenSimulator) {
      sim.setInputs(sensorInputs);
    }
    simRef.current = sim;
    sim.start();
    // Poll diagnostics every 500ms (only for SmartSimulator)
    if (sim instanceof SmartSimulator) {
      diagInterval.current = setInterval(() => {
        if (simRef.current && simRef.current instanceof SmartSimulator) {
          setDiagnostics(simRef.current.getDiagnostics());
        }
      }, 500);
    }
  }

  function stopSim() {
    simRef.current?.stop();
    simRef.current = null;
    if (diagInterval.current) {
      clearInterval(diagInterval.current);
      diagInterval.current = null;
    }
    setDiagnostics(null);
    setSimStatus('stopped');
  }

  function resetSim() {
    stopSim();
    setDiagnostics(null);
    clearSerial();
    clearLog();
    setSimMillis(0);
    setHwPinStates({});
    setSimStatus('idle');
    appendLog('Reset. Click ▶ Compile & Run to start again.', 'info');
  }

  function handleSerialSend(cmd: string) {
    appendSerial(`> ${cmd}`, 'cmd');
    simRef.current?.sendSerial(cmd);
  }

  function handleSwitchToggle(on: boolean) {
    simRef.current?.setPin(15, on ? 1 : 0);
  }

  // Keep sim speed in sync
  useEffect(() => {
    simRef.current?.setSpeed(simSpeed);
  }, [simSpeed]);

  // Push sensor input changes to running sim
  useEffect(() => {
    if (simRef.current && simRef.current instanceof SmartSimulator) {
      simRef.current.setInputs(sensorInputs);
    } else if (simRef.current && simRef.current instanceof DeviceDrivenSimulator) {
      simRef.current.setInputs(sensorInputs);
    }
  }, [sensorInputs]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* User nav bar — hidden in guest mode */}
      {!guestMode && (
        <div
          className="h-8 border-b flex items-center px-3 gap-2 flex-shrink-0 z-30"
          style={{
            background: 'var(--bg-overlay)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <span
            className="font-mono text-[10px]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {session?.user?.name ?? 'User'}
          </span>
          {saveStatus === 'saving' && (
            <span
              className="flex items-center gap-1 font-mono text-[9px]"
              style={{ color: 'var(--fg-subtle)' }}
            >
              <Loader2 size={9} className="animate-spin" /> saving…
            </span>
          )}
          {saveStatus === 'pending' && (
            <span
              className="flex items-center gap-1 font-mono text-[9px]"
              style={{ color: 'var(--accent-amber)' }}
            >
              <CloudOff size={9} /> unsaved
            </span>
          )}
          {saveStatus === 'saved' && store.activeProjectId && (
            <span
              className="flex items-center gap-1 font-mono text-[9px]"
              style={{ color: 'var(--accent-green)' }}
            >
              <Cloud size={9} /> saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span
              className="flex items-center gap-1 font-mono text-[9px]"
              style={{ color: 'var(--accent-red)' }}
            >
              <AlertCircle size={9} /> save failed
            </span>
          )}
          <div className="flex-1" />
          <button
            onClick={() => saveNow()}
            className="font-mono text-[9px] px-1.5 py-0.5 rounded border transition-colors"
            style={{
              color: 'var(--fg-subtle)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            Save now
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1 font-mono text-[9px] px-1.5 py-0.5 rounded border transition-colors"
            style={{
              color: 'var(--fg-subtle)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <LayoutDashboard size={9} /> Dashboard
          </button>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-1 font-mono text-[9px] px-1.5 py-0.5 rounded border transition-colors"
            style={{
              color: 'var(--fg-subtle)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <LogOut size={9} /> Sign Out
          </button>
        </div>
      )}
      <Toolbar
        onCompileRun={compileAndRun}
        onStop={stopSim}
        onReset={resetSim}
        onOpenDevices={() => setDevicePanelOpen(true)}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* File tree */}
        <div
          style={{ width: panelSizes.fileTree }}
          className="flex-shrink-0 min-w-[120px] max-w-[400px]"
        >
          <FileTree />
        </div>

        {/* Splitter: file tree | editor */}
        <div
          className="splitter-h"
          onMouseDown={onSplitLeft}
          onDoubleClick={() => setPanelSizes({ fileTree: 190 })}
          title="Drag to resize · Double-click to reset"
        />

        {/* Editor column */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Monaco */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <CodeEditor />
          </div>

          {/* Splitter: editor | compile log */}
          <div
            className="splitter-v"
            onMouseDown={onSplitCompile}
            onDoubleClick={() => setPanelSizes({ compileLog: 120 })}
            title="Drag to resize · Double-click to reset"
          />

          {/* Compile log */}
          <div
            style={{ height: panelSizes.compileLog }}
            className="flex-shrink-0 min-h-[40px]"
          >
            <CompileLog />
          </div>
        </div>

        {/* Splitter: editor | right panel */}
        <div
          className="splitter-h"
          onMouseDown={onSplitRight}
          onDoubleClick={() => setPanelSizes({ rightPanel: 340 })}
          title="Drag to resize · Double-click to reset"
        />

        {/* Right panel */}
        <div
          style={{
            width: panelSizes.rightPanel,
            borderLeft: '1px solid var(--border-subtle)',
          }}
          className="flex-shrink-0 flex flex-col min-w-[220px] max-w-[600px]"
        >
          {/* Tab selector */}
          <div
            className="flex flex-shrink-0 border-b"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'var(--bg-surface)',
            }}
          >
            {(['simulation', 'hardware', 'analysis', 'serial', 'devices'] as const).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => store.setActiveRightTab(tab)}
                  className="flex-1 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors"
                  style={{
                    color:
                      store.activeRightTab === tab
                        ? 'var(--accent-blue)'
                        : 'var(--fg-subtle)',
                    borderBottom:
                      store.activeRightTab === tab
                        ? '2px solid var(--accent-blue)'
                        : '2px solid transparent',
                    background:
                      store.activeRightTab === tab
                        ? 'var(--bg-base)'
                        : 'transparent',
                  }}
                >
                  {tab}
                </button>
              )
            )}
          </div>

          {store.activeRightTab === 'simulation' && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <SimulationPanel
                pinStates={hwPinStates}
                analogStates={analogStates}
                diagnostics={diagnostics}
                simRunning={store.simStatus === 'running'}
                simMillis={store.simMillis}
              />
            </div>
          )}

          {store.activeRightTab === 'analysis' && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <SmartAnalysisPanel
                project={projects.find((p: any) => p.id === activeProjectId)!}
                devices={
                  (() => {
                    try {
                      const project = projects.find((p: any) => p.id === activeProjectId);
                      const devFile = project?.files.find((f: any) => f.name === '__devices.json');
                      return devFile ? JSON.parse(devFile.content) : [];
                    } catch {
                      return [];
                    }
                  })()
                }
              />
            </div>
          )}

          {store.activeRightTab === 'hardware' && (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Smart Hardware panel */}
              <div
                style={{ height: panelSizes.hwPanel }}
                className="flex-shrink-0 overflow-y-auto min-h-[80px]"
              >
                <SmartHardwarePanel
                  inputs={sensorInputs}
                  diagnostics={diagnostics}
                  onInputChange={(delta) =>
                    setSensorInputs((prev) => ({ ...prev, ...delta }))
                  }
                  onSwitchToggle={handleSwitchToggle}
                  onSendSerial={handleSerialSend}
                  simRunning={store.simStatus === 'running'}
                />
              </div>

              {/* Splitter: hw | serial */}
              <div
                className="splitter-v"
                onMouseDown={onSplitSerial}
                onDoubleClick={() => setPanelSizes({ hwPanel: 320 })}
                title="Drag to resize · Double-click to reset"
              />

              {/* Serial monitor */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <SerialMonitor onSend={handleSerialSend} />
              </div>
            </div>
          )}

          {store.activeRightTab === 'serial' && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <SerialMonitor onSend={handleSerialSend} />
            </div>
          )}

          {store.activeRightTab === 'devices' && (
            <DevicesTab onOpenCatalog={() => setDevicePanelOpen(true)} />
          )}
        </div>
      </div>

      {/* Dialogs */}
      <SmartDeviceCatalog
        isOpen={devicePanelOpen}
        onClose={() => setDevicePanelOpen(false)}
        projectId={activeProjectId!}
      />
      <BoardSelector
        open={boardPanelOpen}
        onClose={() => setBoardPanelOpen(false)}
      />
    </div>
  );
}

// ── Devices tab ───────────────────────────────────────────────────
function DevicesTab({ onOpenCatalog }: { onOpenCatalog: () => void }) {
  const { activeProjectId, projects, removeDevice } = useIDEStore();
  const project = projects.find((p: any) => p.id === activeProjectId);

  const devices: Array<{
    instanceId: string;
    deviceType: string;
    label: string;
  }> = (() => {
    try {
      const devFile = project?.files.find((f: any) => f.name === '__devices.json');
      return devFile ? JSON.parse(devFile.content) : [];
    } catch {
      return [];
    }
  })();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 flex-shrink-0"
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <span
          className="font-mono text-[10px] uppercase tracking-widest"
          style={{ color: 'var(--fg-subtle)' }}
        >
          Devices ({devices.length})
        </span>
        <button
          onClick={onOpenCatalog}
          className="flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded transition-all"
          style={{
            color: 'var(--accent-blue)',
            border: '1px solid var(--border-blue)',
            background: 'var(--tint-blue)',
          }}
        >
          + Add Device
        </button>
      </div>

      {/* Device list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <span className="text-3xl">🔌</span>
            <p
              className="font-mono text-xs"
              style={{ color: 'var(--fg-subtle)' }}
            >
              No devices added yet.
            </p>
            <p
              className="font-mono text-[10px] max-w-[160px] leading-relaxed"
              style={{ color: 'var(--fg-subtle)' }}
            >
              Add sensors, motors, displays and more from the device catalog.
            </p>
            <button
              onClick={onOpenCatalog}
              className="font-mono text-xs px-3 py-1.5 rounded transition-all"
              style={{
                background: 'var(--tint-green)',
                color: 'var(--accent-green)',
                border: '1px solid var(--border-green)',
              }}
            >
              Open Device Catalog
            </button>
          </div>
        ) : (
          devices.map((d) => (
            <div
              key={d.instanceId}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
              style={{
                background: 'var(--bg-raised)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="flex-1 min-w-0">
                <p
                  className="font-mono text-xs font-bold truncate"
                  style={{ color: 'var(--fg-default)' }}
                >
                  {d.label}
                </p>
                <p
                  className="font-mono text-[9px]"
                  style={{ color: 'var(--fg-subtle)' }}
                >
                  {d.deviceType}
                </p>
              </div>
              <button
                onClick={() => removeDevice(d.instanceId)}
                className="font-mono text-[11px] px-1.5 py-0.5 rounded transition-all flex-shrink-0"
                style={{ color: 'var(--fg-subtle)' }}
                title="Remove device"
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = 'var(--accent-red)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = 'var(--fg-subtle)')
                }
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Library stub generator ────────────────────────────────────────
// Returns minimal C++ stubs for each detected #include so avr-gcc
// can compile user code without the actual Arduino libraries installed.
function getLibraryStubs(sources: string): string {
  const inc = (h: string) => sources.includes(`#include`) && sources.includes(h);
  const stubs: string[] = [];

  if (inc('DHT.h') || inc('DHT22') || inc('dht'))
    stubs.push(`class DHT{public:DHT(int,int){}void begin(){}float readTemperature(bool=false){return 25.0;}float readHumidity(){return 60.0;}bool isnan(float f){return false;}};`);

  if (inc('Adafruit_BMP280') || inc('BMP280'))
    stubs.push(`class Adafruit_BMP280{public:bool begin(uint8_t=0x76){return true;}float readTemperature(){return 24.5;}float readPressure(){return 101325.0;}float readAltitude(float=1013.25){return 120.0;}};`);

  if (inc('HX711'))
    stubs.push(`class HX711{public:HX711(){}void begin(int,int){}bool is_ready(){return true;}void set_scale(float=1){}void tare(){}float get_units(int=1){return 100.0;}long read(){return 100000;}void power_down(){}void power_up(){}};`);

  if (inc('Adafruit_INA260') || inc('INA260'))
    stubs.push(`class Adafruit_INA260{public:bool begin(uint8_t=0x40){return true;}float readCurrent(){return 150.0;}float readBusVoltage(){return 5000.0;}float readPower(){return 750.0;}};`);

  if (inc('Servo.h') || inc('<Servo>'))
    stubs.push(`class Servo{public:void attach(int,int=544,int=2400){}void detach(){}void write(int){}void writeMicroseconds(int){}int read(){return 90;}bool attached(){return true;}};`);

  if (inc('Wire.h') || inc('<Wire>'))
    stubs.push(`// Wire already stubbed in ARDUINO_STUBS`);

  if (inc('LiquidCrystal_I2C') || inc('LiquidCrystal'))
    stubs.push(`class LiquidCrystal_I2C{public:LiquidCrystal_I2C(int,int,int){}void begin(int,int){}void init(){}void backlight(){}void noBacklight(){}void clear(){}void setCursor(int,int){}void print(const char*){}template<typename T>void print(T){}void println(const char*){}};`);

  if (inc('Adafruit_SSD1306') || inc('SSD1306'))
    stubs.push(`#define SSD1306_SWITCHCAPVCC 2
class Adafruit_SSD1306{public:Adafruit_SSD1306(int,int,void*,int){}bool begin(int,uint8_t,bool=true){return true;}void clearDisplay(){}void display(){}void setTextSize(int){}void setTextColor(int){}void setCursor(int,int){}void println(const char*){}template<typename T>void println(T){}void print(const char*){}template<typename T>void print(T){}void drawRect(int,int,int,int,int){}void fillRect(int,int,int,int,int){}void drawCircle(int,int,int,int){}void invertDisplay(bool){}};`);

  if (inc('Adafruit_NeoPixel') || inc('NeoPixel'))
    stubs.push(`#define NEO_GRB 6
#define NEO_KHZ800 0x0000
class Adafruit_NeoPixel{public:Adafruit_NeoPixel(int,int,int=NEO_GRB+NEO_KHZ800){}void begin(){}void show(){}void clear(){}void setBrightness(int){}void setPixelColor(int,uint32_t){}void setPixelColor(int,int,int,int){}uint32_t getPixelColor(int){return 0;}uint32_t Color(int r,int g,int b){return((uint32_t)r<<16)|((uint32_t)g<<8)|b;}int numPixels(){return 0;}};`);

  if (inc('MPU6050') || inc('MPU_6050'))
    stubs.push(`class MPU6050{public:MPU6050(uint8_t=0x68){}void initialize(){}bool testConnection(){return true;}void getMotion6(int16_t*ax,int16_t*ay,int16_t*az,int16_t*gx,int16_t*gy,int16_t*gz){*ax=0;*ay=0;*az=16384;*gx=0;*gy=0;*gz=0;}int16_t getAccelerationX(){return 0;}int16_t getAccelerationY(){return 0;}int16_t getAccelerationZ(){return 16384;}int16_t getRotationX(){return 0;}int16_t getRotationY(){return 0;}int16_t getRotationZ(){return 0;}int16_t getTemperature(){return 8224;}};`);

  if (inc('OneWire') || inc('DallasTemperature'))
    stubs.push(`class OneWire{public:OneWire(int){}};class DallasTemperature{public:DallasTemperature(OneWire*){}void begin(){}void requestTemperatures(){}float getTempCByIndex(int){return 24.5;}float getTempFByIndex(int){return 76.1;}int getDeviceCount(){return 1;}bool isConversionComplete(){return true;}};`);

  if (inc('EEPROM'))
    stubs.push(`class EEPROMClass{public:uint8_t read(int){return 0;}void write(int,uint8_t){}void update(int,uint8_t){}template<typename T>T& get(int,T& t){return t;}template<typename T>const T& put(int,const T& t){return t;}int length(){return 4096;}};extern EEPROMClass EEPROM;EEPROMClass EEPROM;`);

  if (inc('SoftwareSerial'))
    stubs.push(`class SoftwareSerial{public:SoftwareSerial(int,int,bool=false){}void begin(long){}bool available(){return false;}int read(){return -1;}void print(const char*){}template<typename T>void print(T){}void println(const char*){}template<typename T>void println(T){}void listen(){}};`);

  if (inc('Stepper') || inc('AccelStepper'))
    stubs.push(`class AccelStepper{public:static const int FULL4WIRE=4;AccelStepper(int,int,int,int,int){}void setMaxSpeed(float){}void setAcceleration(float){}void setSpeed(float){}void moveTo(long){}void move(long){}void run(){} void runSpeed(){}bool runToPosition(){return true;}long currentPosition(){return 0;}void stop(){}};`);

  return stubs.join('\n');
}

// ── Source bundler ────────────────────────────────────────────────
// Bundles ONLY the active project's user files — never demo/default files.
// Detects #include directives and injects matching library stubs so
// avr-gcc can compile without the real Arduino libraries.
function buildBundledSource(
  files: Array<{ name: string; content: string; readonly?: boolean }>
): string {
  // Strip system/internal files (prefixed with __)
  const userFiles = files.filter((f) => !f.name.startsWith('__'));

  if (userFiles.length === 0) {
    return '// No user files found — add a .ino file to your project\n';
  }

  const headerFiles = userFiles.filter((f) => f.name.endsWith('.h') || f.name.endsWith('.hpp'));
  const cppFiles = userFiles.filter((f) => f.name.endsWith('.cpp'));
  const inoFiles = userFiles.filter((f) => f.name.endsWith('.ino'));
  const allSources = userFiles.map((f) => f.content).join('\n');

  const ARDUINO_STUBS = `
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
typedef unsigned char byte;
typedef bool boolean;
#define HIGH 1
#define LOW  0
#define INPUT 0
#define OUTPUT 1
#define INPUT_PULLUP 2
#define INPUT_PULLDOWN 3
#define A0 54
#define A1 55
#define A2 56
#define A3 57
#define A4 58
#define A5 59
#define LED_BUILTIN 13
#define F_CPU 16000000UL
#define PROGMEM
#define pgm_read_byte(x) (*(x))
#define constrain(x,a,b) ((x)<(a)?(a):((x)>(b)?(b):(x)))
#define map(v,il,ih,ol,oh) ((v-il)*(oh-ol)/(ih-il)+ol)
#define abs(x) ((x)>0?(x):-(x))
#define round(x) ((long)((x)+0.5))
#define min(a,b) ((a)<(b)?(a):(b))
#define max(a,b) ((a)>(b)?(a):(b))
#define PI 3.14159265358979323846
#define TWO_PI 6.28318530717958647692
#define DEG_TO_RAD 0.01745329251
#define RAD_TO_DEG 57.2957795131
typedef uint8_t  uint8_t;
typedef uint16_t uint16_t;
typedef uint32_t uint32_t;
typedef int16_t  int16_t;
typedef int32_t  int32_t;
class HardwareSerial {
public:
  void begin(long){}
  template<typename T> void print(T){}
  template<typename T> void print(T,int){}
  template<typename T> void println(T){}
  template<typename T> void println(T,int){}
  void println(){}
  bool available(){return false;}
  int  read(){return -1;}
  void flush(){}
  void write(uint8_t){}
  class String_ { public: void trim(){} bool startsWith(const char*)const{return false;} int toInt()const{return 0;} float toFloat()const{return 0;} int indexOf(char)const{return -1;} };
  String_ readStringUntil(char){return{};}
  int parseInt(){return 0;}
  float parseFloat(){return 0;}
  long parseInt(int){return 0;}
  void setTimeout(long){}
};
extern HardwareSerial Serial; HardwareSerial Serial;
extern HardwareSerial Serial1; HardwareSerial Serial1;
extern HardwareSerial Serial2; HardwareSerial Serial2;
class TwoWire {
public:
  void begin(){}
  void begin(int){}
  void setClock(long){}
  void beginTransmission(int){}
  int  endTransmission(bool=true){return 0;}
  void write(int){}
  void write(const uint8_t*,int){}
  int  requestFrom(int,int,bool=true){return 0;}
  int  available(){return 0;}
  int  read(){return 0;}
  void onReceive(void(*)(int)){}
  void onRequest(void(*)(void)){}
};
extern TwoWire Wire; TwoWire Wire;
extern TwoWire Wire1; TwoWire Wire1;
class SPISettings{public:SPISettings(long,int,int){}};
class SPIClass{public:void begin(){}void beginTransaction(SPISettings){}void endTransaction(){}uint8_t transfer(uint8_t){return 0;}void end(){}};
extern SPIClass SPI; SPIClass SPI;
class String {
public:
  String(){}String(const char*){}String(int){}String(float,int=2){}String(double,int=2){}
  String(long){}String(unsigned long){}String(char){}
  bool   startsWith(const char*)const{return false;}
  bool   endsWith(const char*)const{return false;}
  String substring(int,int=-1)const{return{};}
  void   trim(){}
  int    toInt()const{return 0;}
  float  toFloat()const{return 0;}
  double toDouble()const{return 0;}
  int    indexOf(char)const{return -1;}
  int    indexOf(const char*)const{return -1;}
  int    length()const{return 0;}
  bool   operator==(const char*)const{return false;}
  bool   operator==(const String&)const{return false;}
  bool   operator!=(const char*)const{return true;}
  String operator+(const String&)const{return{};}
  String operator+(const char*)const{return{};}
  String& operator+=(const char*){return *this;}
  String& operator+=(const String&){return *this;}
  char   charAt(int)const{return 0;}
  const  char* c_str()const{return "";}
  void   replace(const char*,const char*){}
  String toLowerCase()const{return{};}
  String toUpperCase()const{return{};}
  bool   isEmpty()const{return true;}
};
void  pinMode(int,int){}
void  digitalWrite(int,int){}
int   digitalRead(int){return 0;}
int   analogRead(int){return 512;}
void  analogWrite(int,int){}
void  analogReference(int){}
void  delay(unsigned long){}
long  millis(){return 0;}
long  micros(){return 0;}
void  noInterrupts(){}
void  interrupts(){}
void  delayMicroseconds(unsigned int){}
void  attachInterrupt(int,void(*)(void),int){}
void  detachInterrupt(int){}
int   digitalPinToInterrupt(int){return 0;}
#define CHANGE  1
#define RISING  2
#define FALLING 3
void  yield(){}
void  setup();
void  loop();
int   main(){ setup(); for(;;) loop(); return 0; }
`;

  // Strip #include lines for libraries we stub — avr-gcc won't find them
  const STRIP_INCLUDES = [
    'DHT.h', 'Adafruit_BMP280', 'HX711', 'Adafruit_INA260', 'Servo.h',
    'LiquidCrystal', 'Adafruit_SSD1306', 'Adafruit_NeoPixel',
    'MPU6050', 'OneWire', 'DallasTemperature', 'EEPROM.h',
    'SoftwareSerial', 'AccelStepper', 'Stepper.h',
    'DFRobot_RainfallSensor', 'HX711-CUSTOM',
  ];

  function stripKnownIncludes(src: string): string {
    return src.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('#include')) return line;
      // Keep user local includes (quoted), strip library angle-bracket includes
      // and known lib headers
      const isLocal = trimmed.includes('"') &&
        !STRIP_INCLUDES.some(lib => trimmed.includes(lib));
      return isLocal ? line : `// ${line}  /* stubbed */`;
    }).join('\n');
  }

  const libStubs = getLibraryStubs(allSources);

  let src = `// ── Bundled from project files (${userFiles.map(f => f.name).join(', ')}) ──\n`;
  src += ARDUINO_STUBS + '\n';
  if (libStubs) src += '\n// ── Library stubs (auto-detected) ──\n' + libStubs + '\n';

  // Headers first
  headerFiles.sort((a, b) => a.name.localeCompare(b.name));
  headerFiles.forEach(f => {
    src += `\n// ─── ${f.name} ───\n${stripKnownIncludes(f.content)}\n`;
  });

  // .cpp files
  cppFiles.forEach(f => {
    src += `\n// ─── ${f.name} ───\n${stripKnownIncludes(f.content)}\n`;
  });

  // .ino files last (main sketch)
  inoFiles.forEach(f => {
    src += `\n// ─── ${f.name} ───\n${stripKnownIncludes(f.content)}\n`;
  });

  return src;
}
