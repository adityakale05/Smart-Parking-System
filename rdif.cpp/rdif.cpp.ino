#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>

// -------- WIFI --------
const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASSWORD";

// -------- SLOT CONFIG --------
int slotID = 1;   // 🔴 CHANGE THIS FOR EACH ESP (1 → 50)

// -------- RFID --------
#define SS_PIN 5
#define RST_PIN 27
MFRC522 mfrc522(SS_PIN, RST_PIN);

// -------- LED --------
#define GREEN_LED 22
#define RED_LED 4

// -------- STATES --------
bool isBooked = false;
bool carPresent = false;

// -------- LED CONTROL --------
void updateLED() {
    if (isBooked || carPresent) {
        digitalWrite(GREEN_LED, LOW);
        digitalWrite(RED_LED, HIGH);
    } else {
        digitalWrite(GREEN_LED, HIGH);
        digitalWrite(RED_LED, LOW);
    }
}

// -------- FETCH JSON --------
void fetchBookingStatus() {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;

        String url = "http://172.16.33.188:3000/slot/" + String(slotID);
        http.begin(url);

        int httpResponseCode = http.GET();

        if (httpResponseCode > 0) {
            String payload = http.getString();

            StaticJsonDocument<200> doc;
            deserializeJson(doc, payload);

            isBooked = doc["booked"];
            updateLED();
        }

        http.end();
    }
}

// -------- SETUP --------
void setup() {
    Serial.begin(115200);

    pinMode(GREEN_LED, OUTPUT);
    pinMode(RED_LED, OUTPUT);

    SPI.begin();
    mfrc522.PCD_Init();

    // WiFi connect
    WiFi.begin(ssid, password);
    Serial.print("Connecting...");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }

    Serial.println("\nConnected!");
    Serial.println(WiFi.localIP());

    updateLED();
}

// -------- LOOP --------
void loop() {

    // Fetch backend data
    fetchBookingStatus();

    // RFID detection
    if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {

        Serial.println("RFID detected");

        carPresent = true;
        updateLED();

        delay(3000);

        carPresent = false;
        updateLED();
    }

    delay(5000);
}