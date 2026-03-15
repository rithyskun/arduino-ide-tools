'use client';
import { useCallback, useRef, useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, LogOut, Cloud, CloudOff } from 'lucide-react';
import { useProjectSync } from '@/lib/store/useProjectSync';
import Toolbar from '@/components/toolbar/Toolbar';
import FileTree from '@/components/sidebar/FileTree';
import CodeEditor from '@/components/editor/CodeEditor';
import CompileLog from '@/components/panels/CompileLog';
import SerialMonitor from '@/components/panels/SerialMonitor';
import SmartHardwarePanel from '@/components/panels/SmartHardwarePanel';
import SimulationPanel from '@/components/simulation/SimulationPanel';
import DeviceCatalog from '@/components/dialogs/DeviceCatalog';
import BoardSelector from '@/components/dialogs/BoardSelector';
import { useIDEStore } from '@/lib/store';
import { useSplitter } from '@/components/editor/useSplitter';
import {
  SmartSimulator,
  type SensorInputs,
  type DiagnosticSnapshot,
} from '@/lib/simulator/smart-engine';
import type { SerialLineType } from '@/types';
import { BOARDS } from '@/lib/boards';

export default function IDE({ guestMode = false }: { guestMode?: boolean }) {
  const store = useIDEStore();
  const { data: session } = useSession();
  const router = useRouter();
  const { saveNow } = useProjectSync();
  const hasUnsaved =
    store.projects
      .find((p) => p.id === store.activeProjectId)
      ?.files.some((f) => f.modified) ?? false;

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

  const simRef = useRef<SmartSimulator | null>(null);
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

  // ── Compile & Run ─────────────────────────────────────────────
  async function compileAndRun() {
    if (simRef.current) simRef.current.stop();
    clearSerial();
    clearLog();
    setSimStatus('compiling');

    const project = projects.find((p) => p.id === activeProjectId);
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
        .filter((f) => !f.name.startsWith('__'))
        .map((f) => f.name)
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

    // Start interpreted sim regardless (AVR binary would go here if godbolt returns ELF)
    appendLog('Starting interpreted JS simulation…', 'step');
    setSimMode('interpreted');
    setSimStatus('running');

    const sim = new SmartSimulator({
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
    sim.setSpeed(simSpeed);
    sim.setInputs(sensorInputs);
    simRef.current = sim;
    sim.start();
    // Poll diagnostics every 500ms
    diagInterval.current = setInterval(() => {
      if (simRef.current) setDiagnostics(simRef.current.getDiagnostics());
    }, 500);
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
    simRef.current?.setInputs(sensorInputs);
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
          {hasUnsaved && (
            <span
              className="flex items-center gap-1 font-mono text-[9px]"
              style={{ color: 'var(--accent-amber)' }}
            >
              <CloudOff size={9} /> unsaved changes
            </span>
          )}
          {!hasUnsaved && store.activeProjectId && (
            <span
              className="flex items-center gap-1 font-mono text-[9px]"
              style={{ color: 'var(--accent-green)' }}
            >
              <Cloud size={9} /> saved
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
            {(['simulation', 'hardware', 'serial', 'devices'] as const).map(
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
      <DeviceCatalog
        open={devicePanelOpen}
        onClose={() => setDevicePanelOpen(false)}
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
  const project = projects.find((p) => p.id === activeProjectId);

  const devices: Array<{
    instanceId: string;
    deviceType: string;
    label: string;
  }> = (() => {
    try {
      const devFile = project?.files.find((f) => f.name === '__devices.json');
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

// ── Source bundler ────────────────────────────────────────────────
function buildBundledSource(
  files: Array<{ name: string; content: string; readonly?: boolean }>
): string {
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
#define A0 54
#define A1 55
#define A2 56
#define A3 57
#define A4 58
#define F_CPU 16000000UL
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
  class String_ { public: void trim(){} bool startsWith(const char*)const{return false;} int toInt()const{return 0;} float toFloat()const{return 0;} int indexOf(char)const{return -1;} };
  String_ readStringUntil(char){return{};}
};
extern HardwareSerial Serial; HardwareSerial Serial;
class TwoWire {
public: void begin(){} void setClock(long){} void beginTransmission(int){} int endTransmission(){return 0;}
  void write(int){} int requestFrom(int,int){return 0;} int read(){return 0;}
};
extern TwoWire Wire; TwoWire Wire;
class String {
public:
  String(){}String(const char*){}String(int){}String(float,int=2){}
  bool startsWith(const char*)const{return false;}
  String substring(int,int=-1)const{return{};}
  void trim(){}
  int toInt()const{return 0;} float toFloat()const{return 0;}
  int indexOf(char)const{return -1;} int length()const{return 0;}
  bool operator==(const char*)const{return false;}
  String operator+(const String&)const{return{};}
};
void pinMode(int,int){}
void digitalWrite(int,int){}
int  digitalRead(int){return 0;}
int  analogRead(int){return 512;}
void analogWrite(int,int){}
void delay(long){}
long millis(){return 0;}
long micros(){return 0;}
void noInterrupts(){}
void interrupts(){}
void delayMicroseconds(int){}
`;
  const headerOrder = [
    'config.h',
    'TimerOne.h',
    'easyC.hpp',
    'HX711-CUSTOM.h',
    'Adafruit_INA260.h',
    'DFRobot_RainfallSensor.h',
    'stepper.h',
    'pca_mux.h',
    'eeprom_store.h',
    'command_handler.h',
  ];
  const cppFiles = files.filter((f) => f.name.endsWith('.cpp'));
  const inoFiles = files.filter((f) => f.name.endsWith('.ino'));

  let src = '// Bundled for avr-gcc · Arduino MEGA Simulator\n';
  src += ARDUINO_STUBS + '\n';
  headerOrder.forEach((name) => {
    const f = files.find((x) => x.name === name);
    if (f) src += `\n// --- ${name} ---\n${f.content}\n`;
  });
  cppFiles.forEach((f) => {
    src += `\n// --- ${f.name} ---\n${f.content}\n`;
  });
  inoFiles.forEach((f) => {
    src += `\n// --- ${f.name} ---\n${f.content}\n`;
  });
  return src;
}
