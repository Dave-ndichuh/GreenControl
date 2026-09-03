#include <LiquidCrystal.h>
#include <Servo.h>

LiquidCrystal lcd(12, 11, 5, 4, 3, 2);
Servo ventServo;

const int lm35Pin = A0;
const int servoPin = 9;
const float thresholdTemp = 28.0;

char mode = 'A'; // 'A' = Auto, 'O' = Open, 'C' = Close

void setup() {
  Serial.begin(9600); // Open serial connection for Python
  lcd.begin(16, 2);
  ventServo.attach(servoPin);
  ventServo.write(0);
  lcd.print("Greenhouse Sim");
  delay(2000);
  lcd.clear();
}

void loop() {
  // 1. Check for incoming override commands from Python
  if (Serial.available() > 0) {
    char incoming = Serial.read();
    if (incoming == 'O' || incoming == 'C' || incoming == 'A') {
      mode = incoming;
    }
  }

  // 2. Read and convert sensor data
  int rawValue = analogRead(lm35Pin);
  float voltage = (rawValue / 1024.0) * 5.0;
  float temperatureC = voltage * 100.0;

  // 3. Broadcast to Python
  Serial.print("TEMP:");
  Serial.println(temperatureC);

  // 4. Update LCD and Servo based on mode
  lcd.setCursor(0, 0);
  lcd.print("Temp: ");
  lcd.print(temperatureC, 1);
  lcd.print(" C   ");

  lcd.setCursor(0, 1);
  if (mode == 'A') {
    if (temperatureC > thresholdTemp) {
      ventServo.write(90);
      lcd.print("Vent: OPEN (A) ");
    } else {
      ventServo.write(0);
      lcd.print("Vent: CLOSED(A)");
    }
  } else if (mode == 'O') {
    ventServo.write(90);
    lcd.print("Vent: OPEN (M) "); // M for Manual Override
  } else if (mode == 'C') {
    ventServo.write(0);
    lcd.print("Vent: CLOSED(M)");
  }

  delay(1000);
}
