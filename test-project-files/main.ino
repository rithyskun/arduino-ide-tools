// IoT Sensor Station - Device-Driven Simulator Demo
// This project demonstrates the device-driven simulator with real device interactions

#include <DHT.h>
#include <LiquidCrystal_I2C.h>

// Device instances - these will be automatically detected by the device-driven simulator
DHT dht(2, DHT22);
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Global variables
float currentTemp = 0.0;
float currentHumidity = 0.0;
unsigned long lastSensorRead = 0;
const unsigned long SENSOR_READ_INTERVAL = 2000; // DHT22 requires 2 seconds between reads
unsigned long lastDisplayUpdate = 0;
const unsigned long DISPLAY_UPDATE_INTERVAL = 1000;

void setup() {
  Serial.begin(9600);
  Serial.println("<Inf> IoT Sensor Station starting...");
  
  // Initialize devices - device-driven simulator will handle this automatically
  dht.begin();
  lcd.init();
  lcd.backlight();
  
  // Display startup message
  lcd.setCursor(0, 0);
  lcd.print("IoT Sensor");
  lcd.setCursor(0, 1);
  lcd.print("Station v1.0");
  
  Serial.println("<Inf> DHT22 sensor initialized");
  Serial.println("<Inf> LCD display initialized");
  Serial.println("<Inf> System ready - reading sensors...");
  
  delay(2000); // Show startup message
}

void loop() {
  unsigned long currentTime = millis();
  
  // Read DHT22 sensor (device-driven simulator enforces timing constraints)
  if (currentTime - lastSensorRead >= SENSOR_READ_INTERVAL) {
    readSensorData();
    lastSensorRead = currentTime;
  }
  
  // Update LCD display
  if (currentTime - lastDisplayUpdate >= DISPLAY_UPDATE_INTERVAL) {
    updateDisplay();
    lastDisplayUpdate = currentTime;
  }
  
  // Handle serial commands
  if (Serial.available()) {
    handleSerialCommands();
  }
  
  delay(100); // Small delay to prevent overwhelming the simulator
}

void readSensorData() {
  Serial.print("<Inf> Reading DHT22 sensor...");
  
  // Device-driven simulator will enforce realistic timing and values
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  if (!isnan(temp) && !isnan(humidity)) {
    currentTemp = temp;
    currentHumidity = humidity;
    
    Serial.print("<Data> Temperature=");
    Serial.print(temp, 1);
    Serial.print("C, Humidity=");
    Serial.print(humidity, 1);
    Serial.println("%");
    
    // Check for alert conditions
    if (temp > 30.0) {
      Serial.println("<Warn> High temperature alert!");
    }
    if (humidity > 70.0) {
      Serial.println("<Warn> High humidity alert!");
    }
  } else {
    Serial.println("<Err> Failed to read sensor data");
  }
}

void updateDisplay() {
  lcd.clear();
  
  // Line 1: Temperature
  lcd.setCursor(0, 0);
  lcd.print("Temp:");
  lcd.print(currentTemp, 1);
  lcd.print("C");
  
  // Line 2: Humidity
  lcd.setCursor(0, 1);
  lcd.print("Hum:");
  lcd.print(currentHumidity, 1);
  lcd.print("%");
  
  Serial.println("<Inf> Display updated");
}

void handleSerialCommands() {
  String command = Serial.readStringUntil('\n');
  command.trim();
  
  if (command == "STATUS") {
    Serial.println("<Inf> === System Status ===");
    Serial.print("<Data> Temperature: ");
    Serial.print(currentTemp, 1);
    Serial.println("C");
    Serial.print("<Data> Humidity: ");
    Serial.print(currentHumidity, 1);
    Serial.println("%");
    Serial.println("<Inf> System operational");
  } else if (command == "RESET") {
    Serial.println("<Inf> Resetting display...");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("IoT Sensor");
    lcd.setCursor(0, 1);
    lcd.print("Reset Complete");
    delay(1000);
  } else if (command == "BACKLIGHT") {
    lcd.backlight();
    Serial.println("<Inf> Backlight turned on");
  } else if (command == "NO_BACKLIGHT") {
    lcd.noBacklight();
    Serial.println("<Inf> Backlight turned off");
  } else if (command.startsWith("SET_TEMP=")) {
    // For testing - override temperature (simulator will respond to this)
    float newTemp = command.substring(9).toFloat();
    currentTemp = newTemp;
    Serial.print("<Inf> Temperature set to: ");
    Serial.println(currentTemp, 1);
  } else if (command == "HELP") {
    Serial.println("<Inf> Available commands:");
    Serial.println("<Inf> STATUS - Show system status");
    Serial.println("<Inf> RESET - Reset display");
    Serial.println("<Inf> BACKLIGHT - Turn backlight on");
    Serial.println("<Inf> NO_BACKLIGHT - Turn backlight off");
    Serial.println("<Inf> SET_TEMP=xx.x - Set temperature for testing");
    Serial.println("<Inf> HELP - Show this help");
  } else {
    Serial.print("<Err> Unknown command: ");
    Serial.println(command);
    Serial.println("<Inf> Send HELP for available commands");
  }
}
