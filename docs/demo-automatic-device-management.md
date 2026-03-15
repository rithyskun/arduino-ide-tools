# 🎯 Automatic Device Management Demo

## 🚀 What's New

I've implemented automatic device management that creates and manages the `__devices.json` file automatically when you add devices to your project. Plus, all files are now renamable!

## ✨ Features Added

### 1. **Automatic Device File Creation**
- When you add devices via the Device Catalog, it automatically creates `__devices.json`
- No more manual file creation required
- Devices are stored with proper configuration and pin mappings

### 2. **Smart Device Catalog**
- Visual device selection with templates
- Pre-configured pin mappings for common devices
- Real-time device editing (labels, pins, configuration)
- Device categories: Sensors, Actuators, Displays, Communication

### 3. **File Renaming**
- Click the edit icon (📝) next to any file to rename it
- Works for all file types including `__devices.json`
- Updates active file and open tabs automatically
- Prevents duplicate file names

### 4. **Device-Driven Simulator Integration**
- Automatically detects devices in `__devices.json`
- Switches to device-driven simulator when devices are present
- Each device has realistic behavior and physics

## 🎮 How to Use

### Adding Devices:
1. Open your project
2. Click the "Devices" tab in the right panel
3. Click "Open Device Catalog"
4. Select devices from the left panel (DHT22, LCD, Stepper, etc.)
5. Configure pins and settings in the right panel
6. Click "Done" - devices are automatically saved to `__devices.json`

### Renaming Files:
1. Hover over any file in the file tree
2. Click the edit icon (📝)
3. Type the new name
4. Press Enter to save or Escape to cancel

### Testing Device-Driven Simulation:
1. Add some devices to your project
2. Write Arduino code that uses those devices
3. Click "Compile & Run"
4. Watch for "Using device-driven simulator" message
5. Interact with devices via the Hardware panel

## 📁 Available Device Templates

| Device | Type | Default Pins | Features |
|--------|------|--------------|----------|
| DHT22 | Sensor | DATA: 2 | Temperature/Humidity with 2s timing |
| LCD1602 | Display | SDA: 18, SCL: 19 | 16x2 I2C display with backlight |
| Stepper | Actuator | STEP: 3, DIR: 4, ENABLE: 5 | Physics-based motor control |
| Ultrasonic | Sensor | TRIG: 7, ECHO: 8 | Distance measurement |
| Relay | Actuator | IN: 9 | High-power switching |
| LED | Actuator | PIN: 13 | PWM brightness control |

## 🎯 Expected Workflow

1. **New Project** → Start with empty project
2. **Add Devices** → Use Smart Device Catalog to add hardware
3. **Auto File Creation** → `__devices.json` created automatically
4. **Write Code** → Arduino code for your devices
5. **Run Simulation** → Device-driven simulator activates
6. **Interactive Control** → Adjust devices via Hardware panel
7. **Rename Files** → Organize your project as needed

## 🔍 What You Should See

### Device Catalog:
- Left panel: Available device templates with descriptions
- Right panel: Your project devices with editing controls
- Real-time pin mapping and configuration

### File Tree:
- Edit icon (📝) on hover for all files
- Inline editing with save/cancel buttons
- Automatic tab updates when files are renamed

### Simulation:
- `"Using device-driven simulator"` message
- Device initialization messages in serial monitor
- Interactive device controls in Hardware panel

## 🎉 Success Indicators

✅ **Device Catalog opens** with device templates  
✅ **Devices add automatically** to `__devices.json`  
✅ **File renaming works** for all file types  
✅ **Device-driven simulator activates** when devices present  
✅ **Device states update** in real-time  
✅ **Pin mapping configurable** per device  

## 🛠️ Technical Details

### Store Actions Added:
- `addDeviceToProject(projectId, device)` - Add device to project
- `removeDeviceFromProject(projectId, instanceId)` - Remove device
- `updateDeviceInProject(projectId, instanceId, updates)` - Update device
- `getDevicesFromProject(projectId)` - Get project devices
- `renameFile(projectId, oldName, newName)` - Rename any file

### Device Behaviors:
- Each device has its own behavior class with realistic physics
- Devices respond to Arduino function calls from user code
- State management for interactive UI controls
- Proper timing constraints (e.g., DHT22 2-second intervals)

### File Management:
- All files (including system files) are now renamable
- Prevents duplicate names and invalid characters
- Updates active file and open file references
- Maintains file extensions properly

This makes the device-driven simulator truly user-friendly - no more manual file management, just add devices and start coding! 🚀
