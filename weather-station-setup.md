# 🌦️ Weather Station Device-Driven Simulator Setup

## 🎯 Your Current Status

✅ **"Using device-driven simulator"** - Perfect!  
✅ **Weather station project detected** - All your files are there  
✅ **Device behaviors created** - HX711, INA260, Rainmeter, Relay, Stepper, LCD  

## 🚀 Next Steps

### Step 1: Add the Weather Station Devices

Copy the contents of `weather-station-devices.json` into a new file called `__devices.json` in your project:

```json
[
  {
    "instanceId": "hx711-1",
    "deviceType": "hx711",
    "label": "Load Cell Scale 1",
    "config": { "calibrationFactor": 1000.0, "offset": 0.0 },
    "pinMapping": { "DT": 3, "SCK": 4 },
    "values": { "weight": 500.0, "raw": 8589934 }
  },
  {
    "instanceId": "hx711-2", 
    "deviceType": "hx711",
    "label": "Load Cell Scale 2",
    "config": { "calibrationFactor": 1000.0, "offset": 0.0 },
    "pinMapping": { "DT": 5, "SCK": 6 },
    "values": { "weight": 750.0, "raw": 12884902 }
  },
  {
    "instanceId": "hx711-3",
    "deviceType": "hx711", 
    "label": "Load Cell Scale 3",
    "config": { "calibrationFactor": 1000.0, "offset": 0.0 },
    "pinMapping": { "DT": 7, "SCK": 8 },
    "values": { "weight": 300.0, "raw": 5153961 }
  },
  {
    "instanceId": "ina260-1",
    "deviceType": "ina260",
    "label": "Power Monitor",
    "config": { "address": "0x40", "conversionTime": 858, "averagingCount": 4 },
    "pinMapping": { "SDA": 20, "SCL": 21 },
    "values": { "voltage": 12100, "current": 320, "power": 3872 }
  },
  {
    "instanceId": "rainmeter-1",
    "deviceType": "rainmeter",
    "label": "Rainfall Sensor 1",
    "config": { "tipCount": 0, "calibration": 0.2794 },
    "pinMapping": { "TIP": 9 },
    "values": { "tips": 0, "rainfall": 0.0 }
  },
  {
    "instanceId": "rainmeter-2",
    "deviceType": "rainmeter", 
    "label": "Rainfall Sensor 2",
    "config": { "tipCount": 0, "calibration": 0.2794 },
    "pinMapping": { "TIP": 10 },
    "values": { "tips": 0, "rainfall": 0.0 }
  },
  {
    "instanceId": "stepper-1",
    "deviceType": "stepper",
    "label": "Flow Control Stepper",
    "config": { "stepsPerRevolution": 200, "maxSpeed": 1000, "acceleration": 500 },
    "pinMapping": { "STEP": 11, "DIR": 12, "ENABLE": 13 },
    "values": { "position": 0, "velocity": 0, "enabled": false }
  },
  {
    "instanceId": "relay-1",
    "deviceType": "relay",
    "label": "Pump Relay 1",
    "config": { "activeLow": true, "initialState": false },
    "pinMapping": { "IN": 22 },
    "values": { "state": false }
  },
  {
    "instanceId": "relay-2",
    "deviceType": "relay",
    "label": "Pump Relay 2", 
    "config": { "activeLow": true, "initialState": false },
    "pinMapping": { "IN": 23 },
    "values": { "state": false }
  }
]
```

### Step 2: Run the Simulation

1. **Click "Compile & Run"** again
2. **Watch for device initialization messages**:

```
<Inf> Device-driven simulator initializing for project: Nexsis
<Inf> Found 9 devices in project
<Inf> Creating device: hx711 (Load Cell Scale 1)
<Inf> ✓ Initialized: Load Cell Scale 1 (hx711)
<Inf> Creating device: hx711 (Load Cell Scale 2)
<Inf> ✓ Initialized: Load Cell Scale 2 (hx711)
<Inf> Creating device: hx711 (Load Cell Scale 3)
<Inf> ✓ Initialized: Load Cell Scale 3 (hx711)
<Inf> Creating device: ina260 (Power Monitor)
<Inf> ✓ Initialized: Power Monitor (ina260)
<Inf> Creating device: rainmeter (Rainfall Sensor 1)
<Inf> ✓ Initialized: Rainfall Sensor 1 (rainmeter)
<Inf> Creating device: rainmeter (Rainfall Sensor 2)
<Inf> ✓ Initialized: Rainfall Sensor 2 (rainmeter)
<Inf> Creating device: stepper (Flow Control Stepper)
<Inf> ✓ Initialized: Flow Control Stepper (stepper)
<Inf> Creating device: relay (Pump Relay 1)
<Inf> ✓ Initialized: Pump Relay 1 (relay)
<Inf> Creating device: relay (Pump Relay 2)
<Inf> ✓ Initialized: Pump Relay 2 (relay)
<Inf> Device-driven simulator ready with 9 devices
```

### Step 3: Test Device Interactions

**Hardware Panel will show:**
- **3x HX711 Scales** with weight controls and calibration
- **INA260 Power Monitor** with voltage/current/power
- **2x Rainfall Sensors** with tip counting
- **Stepper Motor** with position/velocity controls
- **2x Relays** with on/off switching

**Try these interactions:**
- Change scale weights and see readings update
- Adjust voltage/current on INA260
- Add rainfall tips to see accumulation
- Control stepper motor position
- Toggle relay states

## 🎯 What Makes This Special

### Weather Station Features:
- ✅ **Realistic HX711 readings** with calibration and noise
- ✅ **Power monitoring** with I2C communication
- ✅ **Rainfall simulation** with tip counting and calibration
- ✅ **Stepper motor control** with physics-based motion
- ✅ **Relay switching** with active-low logic
- ✅ **All devices respond** to your existing Arduino code

### Device Behaviors:
- **HX711**: Weight measurement, calibration, noise simulation
- **INA260**: Voltage/current/power monitoring via I2C
- **Rainmeter**: Tipping bucket with tip counting
- **Stepper**: Physics-based motion with acceleration
- **Relay**: Active-low control with switching delays

## 🔧 Troubleshooting

### If devices don't initialize:
- Check `__devices.json` syntax is valid
- Verify device types match registered behaviors
- Check browser console for error messages

### If no device interactions:
- Open Hardware panel to see device states
- Try changing device values manually
- Check that device behaviors are imported

## 🎉 Success Indicators

✅ **9 devices initialize** successfully  
✅ **Hardware panel shows** all device controls  
✅ **Device states update** in real-time  
✅ **Your weather station code** interacts with devices  
✅ **Realistic device behaviors** respond to Arduino calls  

Your weather station will now have fully realistic device simulation instead of hardcoded weather station behavior! 🌦️
