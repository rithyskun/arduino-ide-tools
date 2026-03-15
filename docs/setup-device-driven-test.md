# Device-Driven Simulator Test Setup

## 🚀 Quick Setup Guide

Follow these steps to test the device-driven simulator:

### Step 1: Create a New Project
1. Open the Arduino IDE
2. Create a new project (or use an existing one)

### Step 2: Add the Test Files
Copy the contents of these files into your project:

#### `main.ino` (Arduino Code)
```cpp
// Copy the contents from: test-project-files/main.ino
```

#### `__devices.json` (Device Configuration)
```json
// Copy the contents from: test-project-files/__devices.json
```

### Step 3: Run the Simulation
1. Click **"Compile & Run"**
2. Watch the serial monitor - you should see:
   ```
   <Inf> Device-driven simulator initializing for project: Your Project
   <Inf> Found 2 devices in project
   <Inf> Creating device: dht22 (DHT22 Temperature/Humidity Sensor)
   <Inf> ✓ Initialized: DHT22 Temperature/Humidity Sensor (dht22)
   <Inf> Creating device: lcd1602 (16x2 LCD Display)
   <Inf> ✓ Initialized: 16x2 LCD Display (lcd1602)
   <Inf> Device-driven simulator ready with 2 devices
   <Inf> IoT Sensor Station starting...
   <Inf> DHT22 sensor initialized
   <Inf> LCD display initialized
   <Inf> System ready - reading sensors...
   ```

### Step 4: Test Device Interactions

#### Serial Commands (type these in the serial monitor):
- `STATUS` - Show current sensor readings
- `HELP` - Show all available commands
- `RESET` - Reset the LCD display
- `BACKLIGHT` / `NO_BACKLIGHT` - Control LCD backlight
- `SET_TEMP=35.5` - Set temperature for testing

#### Expected Behavior:
- **DHT22 Sensor**: Reads temperature/humidity every 2 seconds (realistic timing)
- **LCD Display**: Shows sensor readings in real-time
- **Serial Output**: Shows sensor data and system status

### Step 5: Check Device States
Open the **Hardware Panel** to see:
- Real-time device states
- Interactive controls for temperature/humidity
- LCD display content
- Device pin mappings

## 🎯 What You Should See

### Device-Driven Features:
1. **Realistic Timing**: DHT22 enforces 2-second read intervals
2. **Live Device States**: Temperature/humidity change realistically
3. **LCD Updates**: Display updates with sensor data
4. **Interactive Controls**: Change sensor values via UI controls
5. **Serial Commands**: System responds to user commands

### Expected Serial Output:
```
<Data> Temperature=25.3C, Humidity=62.1%
<Inf> Display updated
<Data> Temperature=25.4C, Humidity=62.0%
<Inf> Display updated
```

### Expected LCD Display:
```
Temp:25.3C
Hum:62.0%
```

## 🔧 Troubleshooting

### If you see "Unknown device type":
- Check that the device registry import is working
- Verify `__devices.json` has correct deviceType values
- Check browser console for error messages

### If no devices are found:
- Make sure `__devices.json` file exists
- Check JSON syntax is valid
- Verify file name matches exactly

### If simulation doesn't start:
- Check browser console for errors
- Verify device behaviors are registered
- Make sure all imports are working

## 🎉 Success Indicators

✅ **Device-driven simulator selected** (not basic or interpreted)
✅ **Devices initialized successfully** (check serial output)
✅ **Realistic sensor timing** (2-second DHT22 intervals)
✅ **Live device state updates** (in hardware panel)
✅ **Interactive controls work** (temperature/humidity sliders)
✅ **LCD displays data** (real-time updates)

If you see all of these, the device-driven simulator is working perfectly! 🚀
