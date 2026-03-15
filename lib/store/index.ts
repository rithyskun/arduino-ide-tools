import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import type {
  Project,
  ProjectFile,
  DeviceInstance,
  SimStatus,
  SimMode,
  SerialLine,
  CompileLogLine,
  SerialLineType,
  LogLevel,
} from '@/types';
import { DEMO_PROJECT_FILES } from '@/lib/defaultFiles';
import { nanoid } from '@/lib/utils';

// ── Layout ──────────────────────────────────────────────────────
export interface PanelSizes {
  fileTree: number; // px width
  rightPanel: number; // px width
  compileLog: number; // px height
  hwPanel: number; // px height (right panel vertical split)
}

// ── Full store shape ─────────────────────────────────────────────
interface IDEState {
  // Projects
  projects: Project[];
  activeProjectId: string | null;

  // Editor
  activeFile: string | null;
  openFiles: string[]; // tab order

  // Simulator
  simStatus: SimStatus;
  simMode: SimMode;
  simMillis: number;
  simSpeed: number;
  pinStates: Record<number, number>;
  analogStates: Record<number, number>;

  // Serial
  serialLines: SerialLine[];
  serialLineCount: number;

  // Compile log
  compileLog: CompileLogLine[];
  compileLogCount: number;

  // Panel layout
  panelSizes: PanelSizes;

  // UI state
  boardPanelOpen: boolean;
  devicePanelOpen: boolean;
  activeRightTab: 'simulation' | 'hardware' | 'analysis' | 'serial' | 'devices';

  // Actions — projects
  createProject: (name: string, boardId: string) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;

  // Actions — files
  openFile: (name: string) => void;
  closeFile: (name: string) => void;
  setActiveFile: (name: string) => void;
  updateFileContent: (name: string, content: string) => void;
  addFile: (name: string, content?: string) => void;
  deleteFile: (name: string) => void;
  importFiles: (files: { name: string; content: string }[]) => void;
  loadSketch: (name: string, boardId: string, files: ProjectFile[]) => void;
  markFileSaved: (name: string) => void;

  // Actions — devices
  addDevice: (deviceType: string, label: string) => void;
  removeDevice: (instanceId: string) => void;
  updateDeviceConfig: (
    instanceId: string,
    config: Record<string, number | string | boolean>
  ) => void;
  updateDeviceValue: (instanceId: string, key: string, value: number) => void;
  updateDevicePinMapping: (
    instanceId: string,
    pinMapping: Record<string, number>
  ) => void;

  // Actions — device management (for device-driven simulator)
  addDeviceToProject: (projectId: string, device: any) => void;
  removeDeviceFromProject: (projectId: string, instanceId: string) => void;
  updateDeviceInProject: (projectId: string, instanceId: string, updates: any) => void;
  getDevicesFromProject: (projectId: string) => any[];
  renameFile: (projectId: string, oldName: string, newName: string) => void;

  // Actions — board
  setBoard: (boardId: string) => void;

  // Actions — simulator
  setSimStatus: (status: SimStatus) => void;
  setSimMode: (mode: SimMode) => void;
  setSimMillis: (ms: number) => void;
  setSimSpeed: (speed: number) => void;
  setPinState: (pin: number, val: number) => void;
  setAnalogState: (pin: number, val: number) => void;

  // Actions — serial
  appendSerial: (text: string, type: SerialLineType) => void;
  clearSerial: () => void;

  // Actions — compile log
  appendLog: (text: string, level: LogLevel) => void;
  clearLog: () => void;

  // Actions — layout
  setPanelSizes: (sizes: Partial<PanelSizes>) => void;

  // Actions — UI
  setBoardPanelOpen: (open: boolean) => void;
  setDevicePanelOpen: (open: boolean) => void;
  setActiveRightTab: (
    tab: 'simulation' | 'hardware' | 'analysis' | 'serial' | 'devices'
  ) => void;
}

// ── Helper ──────────────────────────────────────────────────────
function activeProject(state: IDEState): Project | undefined {
  return state.projects.find((p) => p.id === state.activeProjectId);
}

// ── Store ────────────────────────────────────────────────────────
export const useIDEStore = create<IDEState>()(
  persist(
    immer((set, get) => ({
      // ── Initial state ──────────────────────────────────────────
      projects: [],
      activeProjectId: null,
      activeFile: 'main.ino',
      openFiles: ['main.ino'],
      simStatus: 'idle',
      simMode: 'interpreted',
      simMillis: 0,
      simSpeed: 5,
      pinStates: {},
      analogStates: {},
      serialLines: [],
      serialLineCount: 0,
      compileLog: [],
      compileLogCount: 0,
      panelSizes: {
        fileTree: 190,
        rightPanel: 340,
        compileLog: 120,
        hwPanel: 320,
      },
      boardPanelOpen: false,
      devicePanelOpen: false,
      activeRightTab: 'hardware',

      // ── Projects ───────────────────────────────────────────────
      createProject(name, boardId) {
        set((s) => {
          const id = nanoid();
          const project: Project = {
            id,
            name,
            boardId,
            files: DEMO_PROJECT_FILES.map((f) => ({ ...f })),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          s.projects.push(project);
          s.activeProjectId = id;
          s.activeFile = 'main.ino';
          s.openFiles = ['main.ino', 'config.h'];
        });
      },
      deleteProject(id) {
        set((s) => {
          s.projects = s.projects.filter((p) => p.id !== id);
          if (s.activeProjectId === id)
            s.activeProjectId = s.projects[0]?.id ?? null;
        });
      },
      setActiveProject(id) {
        set((s) => {
          s.activeProjectId = id;
          const p = s.projects.find((x) => x.id === id);
          if (p) {
            s.activeFile = p.files[0]?.name ?? null;
            s.openFiles = [p.files[0]?.name ?? ''].filter(Boolean);
          }
        });
      },
      renameProject(id, name) {
        set((s) => {
          const p = s.projects.find((x) => x.id === id);
          if (p) {
            p.name = name;
            p.updatedAt = Date.now();
          }
        });
      },

      // ── Files ─────────────────────────────────────────────────
      openFile(name) {
        set((s) => {
          if (!s.openFiles.includes(name)) s.openFiles.push(name);
          s.activeFile = name;
        });
      },
      closeFile(name) {
        set((s) => {
          s.openFiles = s.openFiles.filter((f) => f !== name);
          if (s.activeFile === name)
            s.activeFile = s.openFiles[s.openFiles.length - 1] ?? null;
        });
      },
      setActiveFile(name) {
        set((s) => {
          s.activeFile = name;
        });
      },
      updateFileContent(name, content) {
        set((s) => {
          const p = activeProject(s);
          if (!p) return;
          const f = p.files.find((x) => x.name === name);
          if (f) {
            f.content = content;
            f.modified = true;
            p.updatedAt = Date.now();
          }
        });
      },
      addFile(name, content = '') {
        set((s) => {
          const p = activeProject(s);
          if (!p) return;
          if (p.files.find((f) => f.name === name)) return;
          const ext = name.split('.').pop() ?? '';
          const lang = ['h', 'cpp', 'ino', 'hpp', 'c'].includes(ext)
            ? 'cpp'
            : ext === 'json'
              ? 'json'
              : 'plaintext';
          p.files.push({
            name,
            content: content || `// ${name}\n`,
            language: lang as 'cpp' | 'json' | 'plaintext',
            modified: true,
          });
          if (!s.openFiles.includes(name)) s.openFiles.push(name);
          s.activeFile = name;
        });
      },
      deleteFile(name) {
        set((s) => {
          const p = activeProject(s);
          if (!p) return;
          p.files = p.files.filter((f) => f.name !== name);
          s.openFiles = s.openFiles.filter((f) => f !== name);
          if (s.activeFile === name) s.activeFile = s.openFiles[0] ?? null;
        });
      },
      importFiles(files) {
        set((s) => {
          const p = activeProject(s);
          if (!p) return;
          files.forEach(({ name, content }) => {
            const existing = p.files.find((f) => f.name === name);
            const ext = name.split('.').pop() ?? '';
            const lang = ['h', 'cpp', 'ino', 'hpp', 'c'].includes(ext)
              ? 'cpp'
              : ext === 'json'
                ? 'json'
                : 'plaintext';
            if (existing) {
              existing.content = content;
              existing.modified = true;
            } else
              p.files.push({
                name,
                content,
                language: lang as 'cpp' | 'json' | 'plaintext',
                modified: true,
              });
            if (!s.openFiles.includes(name)) s.openFiles.push(name);
          });
          s.activeFile = files[0]?.name ?? s.activeFile;
        });
      },

      // Load a complete sketch (replaces all files, sets board)
      loadSketch(name: string, boardId: string, files: ProjectFile[]) {
        set((s) => {
          const p = activeProject(s);
          if (!p) return;
          p.name = name;
          p.boardId = boardId;
          p.files = files.map((f) => ({ ...f, modified: false }));
          p.updatedAt = Date.now();
          s.openFiles = [files[0]?.name ?? 'main.ino'];
          s.activeFile = files[0]?.name ?? 'main.ino';
        });
      },
      markFileSaved(name) {
        set((s) => {
          const p = activeProject(s);
          if (!p) return;
          const f = p.files.find((x) => x.name === name);
          if (f) f.modified = false;
        });
      },

      // ── Devices ───────────────────────────────────────────────
      addDevice(deviceType, label) {
        set((s) => {
          const p = activeProject(s);
          if (!p) return;
          if (!p.files.find((f) => f.name === '__devices.json')) {
            p.files.push({
              name: '__devices.json',
              content: '[]',
              language: 'json',
              modified: false,
            });
          }
          const devFile = p.files.find((f) => f.name === '__devices.json')!;
          const devices: DeviceInstance[] = JSON.parse(devFile.content);
          devices.push({
            instanceId: nanoid(),
            deviceType,
            label,
            config: {},
            pinMapping: {},
            values: {},
          });
          devFile.content = JSON.stringify(devices, null, 2);
        });
      },
      removeDevice(instanceId) {
        set((s) => {
          const p = activeProject(s);
          if (!p) return;
          const devFile = p.files.find((f) => f.name === '__devices.json');
          if (!devFile) return;
          const devices: DeviceInstance[] = JSON.parse(devFile.content);
          devFile.content = JSON.stringify(
            devices.filter((d) => d.instanceId !== instanceId),
            null,
            2
          );
        });
      },
      updateDeviceConfig(instanceId, config) {
        set((s) => {
          const p = activeProject(s);
          if (!p) return;
          const devFile = p.files.find((f) => f.name === '__devices.json');
          if (!devFile) return;
          const devices: DeviceInstance[] = JSON.parse(devFile.content);
          const d = devices.find((x) => x.instanceId === instanceId);
          if (d) d.config = { ...d.config, ...config };
          devFile.content = JSON.stringify(devices, null, 2);
        });
      },
      updateDeviceValue(instanceId, key, value) {
        set((s) => {
          const p = activeProject(s);
          if (!p) return;
          const devFile = p.files.find((f) => f.name === '__devices.json');
          if (!devFile) return;
          const devices: DeviceInstance[] = JSON.parse(devFile.content);
          const d = devices.find((x) => x.instanceId === instanceId);
          if (d) d.values[key] = value;
          devFile.content = JSON.stringify(devices, null, 2);
        });
      },
      updateDevicePinMapping(instanceId, pinMapping) {
        set((s) => {
          const p = activeProject(s);
          if (!p) return;
          const devFile = p.files.find((f) => f.name === '__devices.json');
          if (!devFile) return;
          const devices: DeviceInstance[] = JSON.parse(devFile.content);
          const d = devices.find((x) => x.instanceId === instanceId);
          if (d) d.pinMapping = { ...d.pinMapping, ...pinMapping };
          devFile.content = JSON.stringify(devices, null, 2);
        });
      },

      // ── Board ─────────────────────────────────────────────────
      setBoard(boardId) {
        set((s) => {
          const p = activeProject(s);
          if (p) {
            p.boardId = boardId;
            p.updatedAt = Date.now();
          }
        });
      },

      // ── Simulator ─────────────────────────────────────────────
      setSimStatus(status) {
        set((s) => {
          s.simStatus = status;
        });
      },
      setSimMode(mode) {
        set((s) => {
          s.simMode = mode;
        });
      },
      setSimMillis(ms) {
        set((s) => {
          s.simMillis = ms;
        });
      },
      setSimSpeed(speed) {
        set((s) => {
          s.simSpeed = speed;
        });
      },
      setPinState(pin, val) {
        set((s) => {
          s.pinStates[pin] = val;
        });
      },
      setAnalogState(pin, val) {
        set((s) => {
          s.analogStates[pin] = val;
        });
      },

      // ── Device Management ───────────────────────────────────────
      addDeviceToProject(projectId: string, device: any) {
        set((s) => {
          const project = s.projects.find((p) => p.id === projectId);
          if (!project) return;

          // Ensure __devices.json file exists
          let devicesFile = project.files.find((f) => f.name === '__devices.json');
          if (!devicesFile) {
            devicesFile = {
              name: '__devices.json',
              language: 'json',
              modified: true,
              readonly: false,
              content: '[]',
            };
            project.files.push(devicesFile);
          }

          // Parse existing devices
          let devices = [];
          try {
            devices = JSON.parse(devicesFile.content);
          } catch {
            devices = [];
          }

          // Add new device
          devices.push(device);
          devicesFile.content = JSON.stringify(devices, null, 2);
          devicesFile.modified = true;
          project.updatedAt = Date.now();
        });
      },

      removeDeviceFromProject(projectId: string, instanceId: string) {
        set((s) => {
          const project = s.projects.find((p) => p.id === projectId);
          if (!project) return;

          const devicesFile = project.files.find((f) => f.name === '__devices.json');
          if (!devicesFile) return;

          // Parse existing devices
          let devices = [];
          try {
            devices = JSON.parse(devicesFile.content);
          } catch {
            return;
          }

          // Remove device
          devices = devices.filter((d: any) => d.instanceId !== instanceId);
          devicesFile.content = JSON.stringify(devices, null, 2);
          devicesFile.modified = true;
          project.updatedAt = Date.now();
        });
      },

      updateDeviceInProject(projectId: string, instanceId: string, updates: any) {
        set((s) => {
          const project = s.projects.find((p) => p.id === projectId);
          if (!project) return;

          const devicesFile = project.files.find((f) => f.name === '__devices.json');
          if (!devicesFile) return;

          // Parse existing devices
          let devices = [];
          try {
            devices = JSON.parse(devicesFile.content);
          } catch {
            return;
          }

          // Update device
          const deviceIndex = devices.findIndex((d: any) => d.instanceId === instanceId);
          if (deviceIndex !== -1) {
            devices[deviceIndex] = { ...devices[deviceIndex], ...updates };
            devicesFile.content = JSON.stringify(devices, null, 2);
            devicesFile.modified = true;
            project.updatedAt = Date.now();
          }
        });
      },

      getDevicesFromProject(projectId: string) {
        const project = get().projects.find((p) => p.id === projectId);
        if (!project) return [];

        const devicesFile = project.files.find((f) => f.name === '__devices.json');
        if (!devicesFile) return [];

        try {
          return JSON.parse(devicesFile.content);
        } catch {
          return [];
        }
      },

      // ── File Management ─────────────────────────────────────────
      renameFile(projectId: string, oldName: string, newName: string) {
        set((s) => {
          const project = s.projects.find((p) => p.id === projectId);
          if (!project) return;

          const file = project.files.find((f) => f.name === oldName);
          if (!file) return;

          // Check if new name already exists
          if (project.files.some((f) => f.name === newName)) {
            console.warn(`File ${newName} already exists`);
            return;
          }

          // Rename the file
          file.name = newName;
          file.modified = true;
          project.updatedAt = Date.now();

          // Update active file if it was renamed
          if (s.activeFile === oldName) {
            s.activeFile = newName;
          }

          // Update open files if it was renamed
          const openFileIndex = s.openFiles.indexOf(oldName);
          if (openFileIndex !== -1) {
            s.openFiles[openFileIndex] = newName;
          }
        });
      },

      // ── Serial ────────────────────────────────────────────────
      appendSerial(text, type) {
        set((s) => {
          s.serialLines.push({
            id: s.serialLineCount++,
            text,
            type,
            timestamp: s.simMillis,
          });
          if (s.serialLines.length > 600) s.serialLines.shift();
        });
      },
      clearSerial() {
        set((s) => {
          s.serialLines = [];
          s.serialLineCount = 0;
        });
      },

      // ── Compile log ───────────────────────────────────────────
      appendLog(text, level) {
        set((s) => {
          s.compileLog.push({ id: s.compileLogCount++, text, level });
          if (s.compileLog.length > 300) s.compileLog.shift();
        });
      },
      clearLog() {
        set((s) => {
          s.compileLog = [];
          s.compileLogCount = 0;
        });
      },

      // ── Layout ────────────────────────────────────────────────
      setPanelSizes(sizes) {
        set((s) => {
          Object.assign(s.panelSizes, sizes);
        });
      },

      // ── UI ────────────────────────────────────────────────────
      setBoardPanelOpen(open) {
        set((s) => {
          s.boardPanelOpen = open;
        });
      },
      setDevicePanelOpen(open) {
        set((s) => {
          s.devicePanelOpen = open;
        });
      },
      setActiveRightTab(tab: 'simulation' | 'hardware' | 'analysis' | 'serial' | 'devices') {
        set((s) => {
          s.activeRightTab = tab;
        });
      },
    })),
    {
      name: 'arduino-ide-state',
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        panelSizes: state.panelSizes,
        simSpeed: state.simSpeed,
      }),
    }
  )
);
