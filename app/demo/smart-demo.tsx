'use client';
import { useState, useEffect } from 'react';
import { Brain, Zap, Target, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { createSmartSimulator, SmartSimulatorUtils } from '@/lib/simulator';
import type { Project, DeviceInstance } from '@/types';

// Demo project with IoT sensor setup
const demoProject: Project = {
  id: 'smart-demo-project',
  name: 'Smart Weather Station',
  boardId: 'arduino-uno',
  files: [
    {
      name: 'main.ino',
      content: `
#include <DHT.h>
#include <Adafruit_BMP280.h>
#include <SoftwareSerial.h>

DHT dht(2, DHT22);
Adafruit_BMP280 bmp;
SoftwareSerial bluetooth(10, 11); // RX, TX

struct WeatherData {
  float temperature;
  float humidity;
  float pressure;
  unsigned long timestamp;
};

WeatherData currentData;
bool newDataAvailable = false;

void setup() {
  Serial.begin(9600);
  bluetooth.begin(9600);
  
  if (!bmp.begin(0x76)) {
    Serial.println("BMP280 initialization failed!");
    while (1);
  }
  
  dht.begin();
  
  Serial.println("Weather Station initialized");
  delay(1000);
}

void loop() {
  static unsigned long lastRead = 0;
  const unsigned long readInterval = 5000; // Read every 5 seconds
  
  if (millis() - lastRead >= readInterval) {
    readSensors();
    lastRead = millis();
  }
  
  if (newDataAvailable) {
    transmitData();
    newDataAvailable = false;
  }
  
  // Check for Bluetooth commands
  if (bluetooth.available()) {
    handleBluetoothCommand();
  }
  
  delay(100);
}

void readSensors() {
  currentData.temperature = dht.readTemperature();
  currentData.humidity = dht.readHumidity();
  currentData.pressure = bmp.readPressure() / 100.0; // Convert to hPa
  currentData.timestamp = millis();
  
  if (!isnan(currentData.temperature) && !isnan(currentData.humidity)) {
    newDataAvailable = true;
    
    Serial.print("Temp: ");
    Serial.print(currentData.temperature);
    Serial.print("°C, Hum: ");
    Serial.print(currentData.humidity);
    Serial.print("%, Pressure: ");
    Serial.print(currentData.pressure);
    Serial.println(" hPa");
  }
}

void transmitData() {
  String data = String(currentData.temperature) + "," + 
                String(currentData.humidity) + "," + 
                String(currentData.pressure) + "," +
                String(currentData.timestamp);
  
  bluetooth.println(data);
  Serial.println("Data transmitted: " + data);
}

void handleBluetoothCommand() {
  String command = bluetooth.readStringUntil('\\n');
  command.trim();
  
  if (command == "STATUS") {
    bluetooth.println("OK");
  } else if (command == "DATA") {
    transmitData();
  }
}
      `,
      language: 'cpp',
      modified: false
    }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

const demoDevices: DeviceInstance[] = [
  {
    instanceId: 'dht22-1',
    deviceType: 'dht22',
    label: 'DHT22 Temperature/Humidity',
    config: { pin: 2 },
    pinMapping: { 'DATA': 2 },
    values: {}
  },
  {
    instanceId: 'bmp280-1',
    deviceType: 'bmp280',
    label: 'BMP280 Pressure Sensor',
    config: { i2cAddress: 0x76 },
    pinMapping: { 'SDA': 18, 'SCL': 19 },
    values: {}
  },
  {
    instanceId: 'bluetooth-1',
    deviceType: 'hc-05',
    label: 'Bluetooth Module',
    config: { baudRate: 9600 },
    pinMapping: { 'RX': 10, 'TX': 11 },
    values: {}
  }
];

export default function SmartDemoPage() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    runSmartAnalysis();
  }, []);

  async function runSmartAnalysis() {
    setIsAnalyzing(true);
    
    try {
      // Simulate smart analysis
      const projectType = SmartSimulatorUtils.detectProjectType(demoProject, demoDevices);
      const errorCheck = SmartSimulatorUtils.quickErrorCheck(demoProject, demoDevices);
      const recommendedProfile = SmartSimulatorUtils.getRecommendedProfile(demoProject, demoDevices);

      setAnalysis({
        projectType,
        errorCheck,
        recommendedProfile,
        codeMetrics: {
          linesOfCode: demoProject.files[0].content.split('\n').length,
          functions: 5,
          complexity: 'simple',
          patterns: ['polling_loop', 'sensor_reading', 'data_transmission']
        },
        deviceAnalysis: {
          totalDevices: demoDevices.length,
          i2cDevices: 1,
          serialDevices: 1,
          digitalDevices: 1,
          pinConflicts: 0,
          powerConsumption: 15.5 // mA
        },
        optimizations: [
          {
            type: 'performance',
            title: 'Use Non-blocking Delays',
            description: 'Replace delay() with millis() for better responsiveness',
            impact: 'high'
          },
          {
            type: 'power',
            title: 'Implement Sleep Mode',
            description: 'Add sleep mode between readings to save power',
            impact: 'medium'
          },
          {
            type: 'reliability',
            title: 'Add Error Handling',
            description: 'Add validation for sensor readings',
            impact: 'medium'
          }
        ]
      });
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }

  const getProjectTypeIcon = (type: string) => {
    switch (type) {
      case 'iot_sensor': return <Target className="w-5 h-5" />;
      case 'robotics': return <Brain className="w-5 h-5" />;
      default: return <Zap className="w-5 h-5" />;
    }
  };

  const getProjectTypeColor = (type: string) => {
    switch (type) {
      case 'iot_sensor': return 'text-blue-500';
      case 'robotics': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-16 h-16 text-blue-500 animate-pulse mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Analyzing Project...</h2>
          <p className="text-gray-600">Smart simulator is examining your code and devices</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Analysis Failed</h2>
          <p className="text-gray-600">Unable to analyze the project</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-800">Smart Simulator Demo</h1>
          </div>
          <p className="text-gray-600">
            Experience the power of AI-driven Arduino simulation with intelligent analysis and optimization.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            {['overview', 'analysis', 'devices', 'optimizations'].map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`px-6 py-3 font-medium capitalize transition-colors ${
                  activeSection === section
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {section}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Project Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {getProjectTypeIcon(analysis.projectType)}
                      <span className="text-sm font-medium text-gray-600">Project Type</span>
                    </div>
                    <p className={`text-lg font-bold capitalize ${getProjectTypeColor(analysis.projectType)}`}>
                      {analysis.projectType.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium text-gray-600">Complexity</span>
                    </div>
                    <p className="text-lg font-bold text-green-600">{analysis.codeMetrics.complexity}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-gray-600">Devices</span>
                    </div>
                    <p className="text-lg font-bold text-blue-600">{analysis.deviceAnalysis.totalDevices}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium text-gray-600">Lines of Code</span>
                    </div>
                    <p className="text-lg font-bold text-purple-600">{analysis.codeMetrics.linesOfCode}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Detected Patterns</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.codeMetrics.patterns.map((pattern: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                    >
                      {pattern.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Recommended Profile</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">{analysis.recommendedProfile?.name}</span>
                  </div>
                  <p className="text-green-700 text-sm">{analysis.recommendedProfile?.description}</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'analysis' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Code Analysis</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-700 mb-3">Code Metrics</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Lines of Code:</span>
                        <span className="font-medium">{analysis.codeMetrics.linesOfCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Functions:</span>
                        <span className="font-medium">{analysis.codeMetrics.functions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Complexity:</span>
                        <span className="font-medium capitalize">{analysis.codeMetrics.complexity}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-700 mb-3">Error Analysis</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Issues:</span>
                        <span className="font-medium">{analysis.errorCheck.summary.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Critical:</span>
                        <span className="font-medium text-red-600">{analysis.errorCheck.summary.criticalIssues}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Warnings:</span>
                        <span className="font-medium text-yellow-600">
                          {analysis.errorCheck.summary.total - analysis.errorCheck.summary.criticalIssues}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {analysis.errorCheck.errors.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Issues Found</h3>
                  <div className="space-y-2">
                    {analysis.errorCheck.errors.slice(0, 3).map((error: any, index: number) => (
                      <div key={index} className="border-l-4 border-yellow-500 pl-4 py-2 bg-yellow-50 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          <span className="font-medium text-gray-800">{error.title}</span>
                          <span className="text-sm text-gray-600">Line {error.line}</span>
                        </div>
                        <p className="text-gray-700 text-sm">{error.message}</p>
                        {error.suggestion && (
                          <p className="text-gray-600 text-sm mt-1">
                            <strong>Suggestion:</strong> {error.suggestion}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'devices' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Device Analysis</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-700 mb-3">Device Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Devices:</span>
                        <span className="font-medium">{analysis.deviceAnalysis.totalDevices}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">I2C Devices:</span>
                        <span className="font-medium">{analysis.deviceAnalysis.i2cDevices}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Serial Devices:</span>
                        <span className="font-medium">{analysis.deviceAnalysis.serialDevices}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Digital Devices:</span>
                        <span className="font-medium">{analysis.deviceAnalysis.digitalDevices}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-700 mb-3">Power Analysis</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Power:</span>
                        <span className="font-medium">{analysis.deviceAnalysis.powerConsumption} mA</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pin Conflicts:</span>
                        <span className="font-medium text-green-600">{analysis.deviceAnalysis.pinConflicts}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Device Details</h3>
                <div className="space-y-3">
                  {demoDevices.map((device, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-800">{device.label}</h4>
                        <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {device.deviceType}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Pin Mapping:</span>
                          <div className="mt-1">
                            {Object.entries(device.pinMapping).map(([pin, pinNum]) => (
                              <span key={pin} className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs mr-1 mb-1">
                                {pin} → D{pinNum}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Configuration:</span>
                          <div className="mt-1">
                            {Object.entries(device.config).map(([key, value]) => (
                              <div key={key} className="text-xs">
                                <span className="font-medium">{key}:</span> {value}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'optimizations' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Smart Optimizations</h2>
                <div className="space-y-4">
                  {analysis.optimizations.map((opt: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        <h3 className="font-medium text-gray-800">{opt.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${
                          opt.impact === 'high' ? 'bg-red-100 text-red-700' :
                          opt.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {opt.impact} impact
                        </span>
                      </div>
                      <p className="text-gray-700 mb-2">{opt.description}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">Type:</span>
                        <span className="capitalize">{opt.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-5 h-5 text-blue-600" />
                  <h3 className="font-medium text-blue-800">Smart Recommendations</h3>
                </div>
                <p className="text-blue-700">
                  The smart simulator has analyzed your project and identified these optimization opportunities.
                  Implement these suggestions to improve performance, reliability, and power efficiency.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
