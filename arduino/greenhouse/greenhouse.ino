#include <LiquidCrystal.h>
#include <Servo.h>

LiquidCrystal lcd(12, 11, 5, 4, 3, 2);
Servo ventServo;

const int lm35Pin = A0;
const int servoPin = 9;

float thresholdTemp = 28.0; // Dynamically updated from dashboard
char mode = 'A'; // 'A' = Auto, 'O' = Open, 'C' = Close

// Non-blocking timer variables
unsigned long previousMillis = 0;
const unsigned long sensorInterval = 5000;

// Watchdog variables
unsigned long lastSerialTime = 0;
const unsigned long watchdogTimeout = 30000; // 30 seconds

void setup() {
  Serial.begin(9600);
  Serial.setTimeout(50); // Prevent blocking on string reads
  
  lcd.begin(16, 2);
  ventServo.attach(servoPin);
  ventServo.write(0);
  lcd.print("Greenhouse Sim");
  delay(2000);
  lcd.clear();
  
  // Initialize watchdog timer
  lastSerialTime = millis();
}

void loop() {
  // 1. Non-blocking Serial parsing
  while (Serial.available() > 0) {
    String incomingStr = Serial.readStringUntil('\n');
    incomingStr.trim(); // Remove whitespace/newlines
    
    if (incomingStr.length() > 0) {
      lastSerialTime = millis(); // Reset watchdog on ANY incoming data
      
      if (incomingStr.startsWith("T:")) {
        // Parse dynamic threshold: "T:25.5"
        float newThreshold = incomingStr.substring(2).toFloat();
        if (newThreshold > 0) {
          thresholdTemp = newThreshold;
          updateActuators(readTemperature()); // Immediately update state
        }
      } 
      else if (incomingStr == "A" || incomingStr == "O" || incomingStr == "C") {
        mode = incomingStr.charAt(0);
        updateActuators(readTemperature()); // Immediately update state
      }
      // Note: If incomingStr == "PING", it hits the length>0 block and resets the watchdog safely.
    }
  }

  // 2. Watchdog Check (Connection Failsafe)
  if (millis() - lastSerialTime > watchdogTimeout) {
    if (mode != 'A') {
      mode = 'A'; // Revert to Auto mode for safety
      Serial.println("WATCHDOG: Reverted to AUTO");
      updateActuators(readTemperature());
    }
    // Prevent immediate re-triggering of the message
    lastSerialTime = millis();
  }

  // 3. Sensor Reading and Pushing
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= sensorInterval) {
    previousMillis = currentMillis;
    
    float temperatureC = readTemperature();
    
    Serial.print("TEMP:");
    Serial.println(temperatureC);

    updateActuators(temperatureC);
  }
}

// 4. Moving Average Noise Filter
float readTemperature() {
  float sumVoltage = 0.0;
  for (int i = 0; i < 10; i++) {
    int rawValue = analogRead(lm35Pin);
    sumVoltage += (rawValue / 1024.0) * 5.0;
    delay(10); // Small 10ms delay between samples
  }
  float avgVoltage = sumVoltage / 10.0;
  return avgVoltage * 100.0;
}

void updateActuators(float temperatureC) {
  // Update LCD
  lcd.setCursor(0, 0);
  lcd.print("Temp: ");
  lcd.print(temperatureC, 1);
  lcd.print(" C   ");

  lcd.setCursor(0, 1);
  
  // Apply Logic and Send Hardware ACKs
  if (mode == 'A') {
    if (temperatureC > thresholdTemp) {
      ventServo.write(90);
      lcd.print("Vent: OPEN (A) ");
      Serial.println("VENT:OPEN"); // Hardware ACK
    } else {
      ventServo.write(0);
      lcd.print("Vent: CLOSED(A)");
      Serial.println("VENT:CLOSED"); // Hardware ACK
    }
  } else if (mode == 'O') {
    ventServo.write(90);
    lcd.print("Vent: OPEN (M) ");
    Serial.println("VENT:OPEN"); // Hardware ACK
  } else if (mode == 'C') {
    ventServo.write(0);
    lcd.print("Vent: CLOSED(M)");
    Serial.println("VENT:CLOSED"); // Hardware ACK
  }
}
