'use client';
import { useState, useEffect } from 'react';
import {
  Activity,
  Thermometer,
  Zap,
  Monitor,
  Settings,
  Cpu,
  Radio,
} from 'lucide-react';
import type { DeviceInstance } from '@/types';

interface DeviceDrivenPanelProps {
  devices: DeviceInstance[];
  deviceStates: Record<string, any>;
  onDeviceStateChange: (deviceId: string, state: Record<string, any>) => void;
  onSendSerial: (cmd: string) => void;
  simRunning: boolean;
}

export default function DeviceDrivenPanel({
  devices,
  deviceStates,
  onDeviceStateChange,
  onSendSerial,
  simRunning,
}: DeviceDrivenPanelProps) {
  const [expandedDevices, setExpandedDevices] = useState<Record<string, boolean>>({});

  function toggleDeviceExpansion(deviceId: string) {
    setExpandedDevices(prev => ({
      ...prev,
      [deviceId]: !prev[deviceId]
    }));
  }

  function getDeviceIcon(deviceType: string) {
    switch (deviceType) {
      case 'dht22': return <Thermometer size={14} />;
      case 'stepper': return <Settings size={14} className="animate-spin" />;
      case 'lcd1602': return <Monitor size={14} />;
      default: return <Cpu size={14} />;
    }
  }

  function getDeviceColor(category: string) {
    switch (category) {
      case 'sensor': return 'text-blue-500';
      case 'actuator': return 'text-green-500';
      case 'display': return 'text-purple-500';
      case 'communication': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  }

  function renderDeviceControls(device: DeviceInstance, state: any) {
    switch (device.deviceType) {
      case 'dht22':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Temperature:</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="-40"
                  max="80"
                  step="0.1"
                  value={state.temperature || 25}
                  onChange={(e) => onDeviceStateChange(device.instanceId, { 
                    temperature: parseFloat(e.target.value) 
                  })}
                  className="w-24"
                />
                <span className="text-sm font-medium w-12">{state.temperature || 25}°C</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Humidity:</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={state.humidity || 60}
                  onChange={(e) => onDeviceStateChange(device.instanceId, { 
                    humidity: parseFloat(e.target.value) 
                  })}
                  className="w-24"
                />
                <span className="text-sm font-medium w-12">{state.humidity || 60}%</span>
              </div>
            </div>
            {state.isReading && (
              <div className="text-xs text-blue-600 animate-pulse">Reading sensor...</div>
            )}
          </div>
        );

      case 'stepper':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Position:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={state.targetPosition || 0}
                  onChange={(e) => onDeviceStateChange(device.instanceId, { 
                    targetPosition: parseInt(e.target.value) 
                  })}
                  className="w-20 px-2 py-1 border rounded text-sm"
                />
                <span className="text-sm font-medium">steps</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Speed:</span>
              <span className="text-sm font-medium">{state.rpm || 0} RPM</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Enabled:</span>
              <button
                onClick={() => onDeviceStateChange(device.instanceId, { 
                  enabled: !state.enabled 
                })}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  state.enabled 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-300 text-gray-700'
                }`}
              >
                {state.enabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="text-xs text-gray-500">
              Current: {state.position || 0} steps
            </div>
          </div>
        );

      case 'lcd1602':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Line 1:</span>
              <input
                type="text"
                value={state.line1 || ''}
                onChange={(e) => onDeviceStateChange(device.instanceId, { 
                  line1: e.target.value 
                })}
                className="w-32 px-2 py-1 border rounded text-sm"
                maxLength={16}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Line 2:</span>
              <input
                type="text"
                value={state.line2 || ''}
                onChange={(e) => onDeviceStateChange(device.instanceId, { 
                  line2: e.target.value 
                })}
                className="w-32 px-2 py-1 border rounded text-sm"
                maxLength={16}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Backlight:</span>
              <button
                onClick={() => onDeviceStateChange(device.instanceId, { 
                  backlight: !state.backlight 
                })}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  state.backlight 
                    ? 'bg-yellow-500 text-white' 
                    : 'bg-gray-300 text-gray-700'
                }`}
              >
                {state.backlight ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="bg-black text-green-400 p-2 rounded font-mono text-xs">
              <div>{(state.line1 || '').padEnd(16, ' ')}</div>
              <div>{(state.line2 || '').padEnd(16, ' ')}</div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-600">
            <div>Device Type: {device.deviceType}</div>
            <pre className="bg-gray-100 p-2 rounded text-xs mt-2">
              {JSON.stringify(state, null, 2)}
            </pre>
          </div>
        );
    }
  }

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <Cpu size={48} className="text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">No Devices Configured</h3>
        <p className="text-sm text-gray-600 mb-4">
          Add devices using the Device Catalog to enable device-driven simulation
        </p>
        <p className="text-xs text-gray-500">
          Device-driven simulation adapts to your actual hardware configuration
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} className="text-blue-500" />
          <h3 className="font-medium text-gray-800">Device-Driven Simulation</h3>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
            {devices.length} devices
          </span>
        </div>

        {devices.map((device) => {
          const state = deviceStates[device.instanceId] || {};
          const isExpanded = expandedDevices[device.instanceId];

          return (
            <div
              key={device.instanceId}
              className="border rounded-lg overflow-hidden"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {/* Device Header */}
              <button
                onClick={() => toggleDeviceExpansion(device.instanceId)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={getDeviceColor(device.deviceType)}>
                    {getDeviceIcon(device.deviceType)}
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-800">{device.label}</div>
                    <div className="text-xs text-gray-600">{device.deviceType}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {simRunning && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                  <div className="text-gray-400">
                    {isExpanded ? '▼' : '▶'}
                  </div>
                </div>
              </button>

              {/* Device Details */}
              {isExpanded && (
                <div className="p-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="space-y-3">
                    {/* Pin Mapping */}
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Pin Mapping</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(device.pinMapping).map(([pinName, pinNum]) => (
                          <span
                            key={pinName}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                          >
                            {pinName} → D{pinNum}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Device Controls */}
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Device Controls</div>
                      {renderDeviceControls(device, state)}
                    </div>

                    {/* Configuration */}
                    {Object.keys(device.config).length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Configuration</div>
                        <div className="text-xs text-gray-600 space-y-1">
                          {Object.entries(device.config).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key}:</span> {value}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
