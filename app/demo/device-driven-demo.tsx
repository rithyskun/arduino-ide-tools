'use client';
import { useState } from 'react';
import { Brain, Cpu, Thermometer, Monitor, Settings, Plus, Trash2 } from 'lucide-react';
import { DeviceDrivenSimulator } from '@/lib/simulator/device-driven-simulator';
import type { Project, DeviceInstance } from '@/types';

export default function DeviceDrivenDemo() {
  const [project, setProject] = useState<Project>({
    id: 'device-driven-demo',
    name: 'Device-Driven Demo',
    boardId: 'arduino-uno',
    files: [
      {
        name: 'main.ino',
        content: `
// Device-Driven Arduino Demo
// This code responds to the actual devices configured in the project

#include <DHT.h>
#include <LiquidCrystal_I2C.h>

// Device instances - these will be automatically detected
DHT dht(2, DHT22);
LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  Serial.begin(9600);
  
  // Initialize devices - simulator will handle this automatically
  dht.begin();
  lcd.init();
  lcd.backlight();
  
  lcd.setCursor(0, 0);
  lcd.print("Device-Driven");
  lcd.setCursor(0, 1);
  lcd.print("Simulator Ready");
  
  Serial.println("<Inf> Device-driven demo started");
}

void loop() {
  static unsigned long lastRead = 0;
  const unsigned long readInterval = 2000; // Read every 2 seconds
  
  // Read sensor (simulator enforces DHT22 timing)
  if (millis() - lastRead >= readInterval) {
    float temp = dht.readTemperature();
    float humidity = dht.readHumidity();
    
    if (!isnan(temp) && !isnan(humidity)) {
      // Update LCD with sensor readings
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Temp: ");
      lcd.print(temp, 1);
      lcd.print("C");
      
      lcd.setCursor(0, 1);
      lcd.print("Hum: ");
      lcd.print(humidity, 1);
      lcd.print("%");
      
      // Send to serial
      Serial.print("<Data> Temperature=");
      Serial.print(temp);
      Serial.print(", Humidity=");
      Serial.println(humidity);
    }
    
    lastRead = millis();
  }
  
  delay(100);
}
        `,
        language: 'cpp',
        modified: false
      },
      {
        name: '__devices.json',
        content: JSON.stringify([
          {
            instanceId: 'dht22-1',
            deviceType: 'dht22',
            label: 'DHT22 Sensor',
            config: {},
            pinMapping: { 'DATA': 2 },
            values: {}
          },
          {
            instanceId: 'lcd1602-1',
            deviceType: 'lcd1602',
            label: 'LCD Display',
            config: { address: 0x27 },
            pinMapping: { 'SDA': 18, 'SCL': 19 },
            values: {}
          }
        ], null, 2),
        language: 'json',
        modified: false
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  const [devices, setDevices] = useState<DeviceInstance[]>(() => {
    try {
      const devicesFile = project.files.find(f => f.name === '__devices.json');
      return devicesFile ? JSON.parse(devicesFile.content) : [];
    } catch {
      return [];
    }
  });

  const [deviceStates, setDeviceStates] = useState<Record<string, any>>({});
  const [serialOutput, setSerialOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [simulator, setSimulator] = useState<DeviceDrivenSimulator | null>(null);

  function addDevice(deviceType: string) {
    const newDevice: DeviceInstance = {
      instanceId: `${deviceType}-${Date.now()}`,
      deviceType,
      label: `${deviceType.toUpperCase()} Device`,
      config: {},
      pinMapping: {},
      values: {}
    };

    setDevices(prev => [...prev, newDevice]);
    updateDevicesFile([...devices, newDevice]);
  }

  function removeDevice(instanceId: string) {
    setDevices(prev => prev.filter(d => d.instanceId !== instanceId));
    updateDevicesFile(devices.filter(d => d.instanceId !== instanceId));
  }

  function updateDevicesFile(updatedDevices: DeviceInstance[]) {
    const devicesFile = project.files.find(f => f.name === '__devices.json');
    if (devicesFile) {
      devicesFile.content = JSON.stringify(updatedDevices, null, 2);
      setProject(prev => ({
        ...prev,
        files: prev.files.map(f => 
          f.name === '__devices.json' ? { ...f, content: devicesFile.content } : f
        )
      }));
    }
  }

  function handleDeviceStateChange(deviceId: string, state: Record<string, any>) {
    setDeviceStates(prev => ({
      ...prev,
      [deviceId]: { ...prev[deviceId], ...state }
    }));
  }

  function handleSerial(text: string) {
    setSerialOutput(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${text}`]);
  }

  function startSimulation() {
    if (simulator) {
      simulator.stop();
    }

    const newSimulator = new DeviceDrivenSimulator(project, {
      onSerial: handleSerial,
      onPinChange: (pin, val) => {
        console.log(`Pin ${pin} changed to ${val}`);
      },
      onAnalogChange: (pin, val) => {
        console.log(`Analog ${pin} changed to ${val}`);
      },
      onMillisUpdate: (ms) => {
        // Could update UI with simulation time
      },
      onStop: () => {
        setIsRunning(false);
      },
    });

    setSimulator(newSimulator);
    newSimulator.start();
    setIsRunning(true);
  }

  function stopSimulation() {
    if (simulator) {
      simulator.stop();
      setSimulator(null);
    }
    setIsRunning(false);
  }

  function resetSimulation() {
    stopSimulation();
    setSerialOutput([]);
    setDeviceStates({});
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-blue-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Device-Driven Simulator Demo</h1>
                <p className="text-gray-600">Simulation adapts to your actual device configuration</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={startSimulation}
                disabled={isRunning}
                className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {isRunning ? 'Running...' : 'Start Simulation'}
              </button>
              <button
                onClick={stopSimulation}
                disabled={!isRunning}
                className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium disabled:opacity-50"
              >
                Stop
              </button>
              <button
                onClick={resetSimulation}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg font-medium"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Device Configuration */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Devices</h2>
              <button
                onClick={() => addDevice('dht22')}
                className="p-2 bg-blue-500 text-white rounded-lg"
                title="Add DHT22"
              >
                <Plus size={16} />
              </button>
            </div>

            {devices.length === 0 ? (
              <div className="text-center py-8">
                <Cpu size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No devices configured</p>
                <button
                  onClick={() => addDevice('dht22')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium"
                >
                  Add DHT22 Sensor
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {devices.map((device) => (
                  <div key={device.instanceId} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {device.deviceType === 'dht22' && <Thermometer size={16} className="text-blue-500" />}
                        {device.deviceType === 'lcd1602' && <Monitor size={16} className="text-purple-500" />}
                        {device.deviceType === 'stepper' && <Settings size={16} className="text-green-500" />}
                        <span className="font-medium">{device.label}</span>
                      </div>
                      <button
                        onClick={() => removeDevice(device.instanceId)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="text-sm text-gray-600">
                      Type: {device.deviceType}
                    </div>
                    {Object.keys(device.pinMapping).length > 0 && (
                      <div className="text-sm text-gray-600 mt-1">
                        Pins: {Object.entries(device.pinMapping).map(([pin, num]) => `${pin}→D${num}`).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Device States */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Device States</h2>
            {Object.keys(deviceStates).length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                Start simulation to see device states
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(deviceStates).map(([deviceId, state]) => {
                  const device = devices.find(d => d.instanceId === deviceId);
                  return (
                    <div key={deviceId} className="border rounded-lg p-3">
                      <div className="font-medium mb-2">{device?.label}</div>
                      <div className="text-sm text-gray-600 space-y-1">
                        {Object.entries(state).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Serial Output */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Serial Output</h2>
            <div className="bg-black text-green-400 p-3 rounded-lg font-mono text-sm h-96 overflow-y-auto">
              {serialOutput.length === 0 ? (
                <div className="text-gray-600">Start simulation to see serial output...</div>
              ) : (
                serialOutput.map((line, index) => (
                  <div key={index} className="mb-1">{line}</div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Code Display */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Arduino Code</h2>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
            {project.files[0].content}
          </pre>
        </div>
      </div>
    </div>
  );
}
