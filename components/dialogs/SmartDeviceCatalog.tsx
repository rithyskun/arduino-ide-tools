'use client';
import { useState } from 'react';
import { X, Plus, Trash2, Settings, Thermometer, Monitor, Cpu, Radio, Zap, Activity } from 'lucide-react';
import { useIDEStore } from '@/lib/store';
import type { DeviceInstance } from '@/types';

interface SmartDeviceCatalogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

// Device templates with default configurations
const deviceTemplates = [
  {
    deviceType: 'dht22',
    label: 'DHT22 Temperature/Humidity Sensor',
    category: 'sensor',
    icon: <Thermometer size={20} className="text-blue-500" />,
    description: 'Digital temperature and humidity sensor with 2-second read interval',
    defaultConfig: { readInterval: 2000 },
    defaultPinMapping: { DATA: 2 },
    defaultValues: { temperature: 25.0, humidity: 60.0 }
  },
  {
    deviceType: 'lcd1602',
    label: '16x2 LCD Display',
    category: 'display',
    icon: <Monitor size={20} className="text-purple-500" />,
    description: 'I2C 16x2 character LCD display with backlight control',
    defaultConfig: { address: '0x27', backlight: true },
    defaultPinMapping: { SDA: 18, SCL: 19 },
    defaultValues: { line1: 'Hello World', line2: 'Arduino' }
  },
  {
    deviceType: 'stepper',
    label: 'Stepper Motor',
    category: 'actuator',
    icon: <Settings size={20} className="text-green-500" />,
    description: 'Bipolar stepper motor with step/dir/enable control',
    defaultConfig: { stepsPerRevolution: 200, maxSpeed: 1000 },
    defaultPinMapping: { STEP: 3, DIR: 4, ENABLE: 5 },
    defaultValues: { position: 0, enabled: false }
  },
  {
    deviceType: 'ultrasonic',
    label: 'HC-SR04 Ultrasonic Sensor',
    category: 'sensor',
    icon: <Radio size={20} className="text-orange-500" />,
    description: 'Ultrasonic distance sensor with echo timing',
    defaultConfig: { maxDistance: 400 },
    defaultPinMapping: { TRIG: 7, ECHO: 8 },
    defaultValues: { distance: 100 }
  },
  {
    deviceType: 'relay',
    label: 'Relay Module',
    category: 'actuator',
    icon: <Zap size={20} className="text-yellow-500" />,
    description: 'Single channel relay module for high-power control',
    defaultConfig: { activeLow: 1 },
    defaultPinMapping: { IN: 9 },
    defaultValues: { state: false }
  },
  {
    deviceType: 'led',
    label: 'LED',
    category: 'actuator',
    icon: <Activity size={20} className="text-red-500" />,
    description: 'Basic LED with PWM brightness control',
    defaultConfig: { pwm: 1 },
    defaultPinMapping: { PIN: 13 },
    defaultValues: { brightness: 0 }
  },
  {
    deviceType: 'bmp280',
    label: 'BMP280 Pressure Sensor',
    category: 'sensor',
    icon: <Thermometer size={20} className="text-cyan-500" />,
    description: 'Barometric pressure, temperature, and altitude sensor',
    defaultConfig: { address: '0x76' },
    defaultPinMapping: { SDA: 20, SCL: 21 },
    defaultValues: { pressure: 1013.25, temperature: 20.0, altitude: 0 }
  },
  {
    deviceType: 'servo',
    label: 'Servo Motor',
    category: 'actuator',
    icon: <Settings size={20} className="text-indigo-500" />,
    description: 'Precision servo motor with angle control',
    defaultConfig: { minAngle: 0, maxAngle: 180, speed: 60 },
    defaultPinMapping: { PIN: 10 },
    defaultValues: { angle: 90 }
  },
  {
    deviceType: 'buzzer',
    label: 'Buzzer/Beep',
    category: 'actuator',
    icon: <Zap size={20} className="text-pink-500" />,
    description: 'Tone generator with frequency control',
    defaultConfig: { volume: 50, pwm: 1 },
    defaultPinMapping: { PIN: 11 },
    defaultValues: { frequency: 0, isPlaying: false }
  },
  {
    deviceType: 'soil-moisture',
    label: 'Soil Moisture Sensor',
    category: 'sensor',
    icon: <Activity size={20} className="text-green-600" />,
    description: 'Analog soil moisture sensor with calibration',
    defaultConfig: { threshold: 30 },
    defaultPinMapping: { ANALOG: 0, DIGITAL: 1 },
    defaultValues: { moisture: 50, isDry: false }
  },
  {
    deviceType: 'hx711',
    label: 'HX711 Load Cell',
    category: 'sensor',
    icon: <Cpu size={20} className="text-gray-500" />,
    description: 'Weight measurement amplifier with calibration',
    defaultConfig: { calibrationFactor: 1000 },
    defaultPinMapping: { DT: 3, SCK: 4 },
    defaultValues: { weight: 500, raw: 8589934 }
  },
  {
    deviceType: 'ina260',
    label: 'INA260 Power Monitor',
    category: 'sensor',
    icon: <Activity size={20} className="text-blue-600" />,
    description: 'I2C voltage, current, and power monitor',
    defaultConfig: { address: '0x40' },
    defaultPinMapping: { SDA: 20, SCL: 21 },
    defaultValues: { voltage: 12.1, current: 0.32, power: 3.87 }
  },
  {
    deviceType: 'rainmeter',
    label: 'Rainfall Sensor',
    category: 'sensor',
    icon: <Activity size={20} className="text-blue-400" />,
    description: 'Tipping bucket rain gauge with tip counting',
    defaultConfig: { calibration: 0.2794 },
    defaultPinMapping: { TIP: 9 },
    defaultValues: { tipCount: 0, rainfall: 0 }
  }
];

export default function SmartDeviceCatalog({ isOpen, onClose, projectId }: SmartDeviceCatalogProps) {
  const { addDeviceToProject, removeDeviceFromProject, updateDeviceInProject, getDevicesFromProject } = useIDEStore();
  const [devices, setDevices] = useState<DeviceInstance[]>(() => getDevicesFromProject(projectId));
  const [selectedDevice, setSelectedDevice] = useState<DeviceInstance | null>(null);
  const [editingDevice, setEditingDevice] = useState<DeviceInstance | null>(null);

  function handleAddDevice(template: typeof deviceTemplates[0]) {
    const newDevice: DeviceInstance = {
      instanceId: `${template.deviceType}-${Date.now()}`,
      deviceType: template.deviceType,
      label: template.label,
      config: template.defaultConfig as any,
      pinMapping: template.defaultPinMapping as any,
      values: template.defaultValues as any
    };

    addDeviceToProject(projectId, newDevice);
    setDevices(prev => [...prev, newDevice]);
  }

  function handleRemoveDevice(instanceId: string) {
    removeDeviceFromProject(projectId, instanceId);
    setDevices(prev => prev.filter(d => d.instanceId !== instanceId));
    setSelectedDevice(null);
    setEditingDevice(null);
  }

  function handleUpdateDevice(instanceId: string, updates: Partial<DeviceInstance>) {
    updateDeviceInProject(projectId, instanceId, updates);
    setDevices(prev => prev.map(d =>
      d.instanceId === instanceId ? { ...d, ...updates } : d
    ));
  }

  function handlePinMappingChange(instanceId: string, pinName: string, pinNumber: number) {
    const device = devices.find(d => d.instanceId === instanceId);
    if (device) {
      const newPinMapping = { ...device.pinMapping, [pinName]: pinNumber };
      handleUpdateDevice(instanceId, { pinMapping: newPinMapping });
    }
  }

  function handleConfigChange(instanceId: string, configKey: string, configValue: any) {
    const device = devices.find(d => d.instanceId === instanceId);
    if (device) {
      const newConfig = { ...device.config, [configKey]: configValue };
      handleUpdateDevice(instanceId, { config: newConfig });
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Device Catalog</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex h-[600px]">
          {/* Device Templates */}
          <div className="w-1/2 border-r p-4 overflow-y-auto">
            <h3 className="font-medium text-gray-700 mb-4">Available Devices</h3>
            <div className="space-y-3">
              {deviceTemplates.map((template) => (
                <div
                  key={template.deviceType}
                  className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleAddDevice(template)}
                >
                  <div className="flex items-center gap-3">
                    {template.icon}
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{template.label}</div>
                      <div className="text-sm text-gray-600">{template.description}</div>
                      <div className="text-xs text-blue-600 mt-1">
                        Click to add to project
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Project Devices */}
          <div className="w-1/2 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-700">Project Devices</h3>
              <span className="text-sm text-gray-600">
                {devices.length} device{devices.length !== 1 ? 's' : ''}
              </span>
            </div>

            {devices.length === 0 ? (
              <div className="text-center py-8">
                <Cpu size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No devices added yet</p>
                <p className="text-sm text-gray-500">
                  Click on devices from the left panel to add them to your project
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {devices.map((device) => {
                  const template = deviceTemplates.find(t => t.deviceType === device.deviceType);
                  const isEditing = editingDevice?.instanceId === device.instanceId;

                  return (
                    <div
                      key={device.instanceId}
                      className={`border rounded-lg p-3 ${selectedDevice?.instanceId === device.instanceId ? 'border-blue-500' : ''
                        }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {template?.icon}
                          <div>
                            <div className="font-medium text-gray-800">{device.label}</div>
                            <div className="text-sm text-gray-600">{device.deviceType}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingDevice(isEditing ? null : device)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Settings size={16} />
                          </button>
                          <button
                            onClick={() => handleRemoveDevice(device.instanceId)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Pin Mapping */}
                      <div className="text-sm text-gray-600 mb-2">
                        <div className="font-medium text-gray-700 mb-1">Pin Mapping:</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(device.pinMapping).map(([pinName, pinNumber]) => (
                            <span key={pinName} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                              {pinName} → D{pinNumber}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Edit Mode */}
                      {isEditing && (
                        <div className="space-y-3 mt-3 pt-3 border-t">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Device Label
                            </label>
                            <input
                              type="text"
                              value={device.label}
                              onChange={(e) => handleUpdateDevice(device.instanceId, { label: e.target.value })}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Pin Mapping
                            </label>
                            <div className="space-y-1">
                              {Object.entries(device.pinMapping).map(([pinName, pinNumber]) => (
                                <div key={pinName} className="flex items-center gap-2">
                                  <span className="text-sm w-16">{pinName}:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="53"
                                    value={pinNumber}
                                    onChange={(e) => handlePinMappingChange(device.instanceId, pinName, parseInt(e.target.value))}
                                    className="w-16 px-2 py-1 border rounded text-sm"
                                  />
                                  <span className="text-xs text-gray-500">D{pinNumber}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Configuration
                            </label>
                            <div className="space-y-1">
                              {Object.entries(device.config).map(([key, value]) => (
                                <div key={key} className="flex items-center gap-2">
                                  <span className="text-sm w-20">{key}:</span>
                                  <input
                                    type={typeof value === 'number' ? 'number' : 'text'}
                                    value={String(value)}
                                    onChange={(e) => handleConfigChange(
                                      device.instanceId,
                                      key,
                                      typeof value === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                                    )}
                                    className="flex-1 px-2 py-1 border rounded text-sm"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Device-driven simulation will automatically use these devices
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
