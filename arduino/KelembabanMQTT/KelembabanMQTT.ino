#include <WiFi.h>
#include <PubSubClient.h>

// WiFi Credentials
const char ssid[] = "ASUS";
const char pass[] = "123456789";

// ThingSpeak MQTT Credentials
#define channelID 2843704
const char mqttUserName[] = "NjUSADEdNjg8CBUjDCAuBDc";
const char clientID[] = "NjUSADEdNjg8CBUjDCAuBDc";
const char mqttPass[] = "M8jZfJ0gGlo10ayuTioey9hm";

// MQTT Server (ThingSpeak)
const char* mqttServer = "mqtt3.thingspeak.com";
const int mqttPort = 1883;
String mqttTopic = "channels/" + String(channelID) + "/publish";

WiFiClient espClient;
PubSubClient client(espClient);

// Timer MQTT
unsigned long lastSentTime = 0;
const unsigned long updateInterval = 15000; // 15 detik sesuai rate ThingSpeak

// Array kelembapan untuk kirim data MQTT
float kelembapan[6];

// Gunakan hanya ADC1 pin: 32, 33, 34, 35, 36
// Reuse pin 35 untuk sensor 5 dan 6 (dibaca bergantian)
const int sensorPins[6] = {32, 33, 34, 35, 36, 36}; // Sensor 6 pakai GPIO35 juga

float slopes[6]     = {-0.02289, -0.02297, -0.02038, -0.02089, -0.02109, -0.02115};
float intercepts[6] = { 81.44,    82.51,    78.83,    83.51,    80.44,    85.17};

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < 5; i++) {
    pinMode(sensorPins[i], INPUT);
  }

  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected");

  client.setServer(mqttServer, mqttPort);
  reconnectMQTT();
}

void loop() {
  for (int i = 0; i < 6; i++) {
    int pin = sensorPins[i];

    // Kalau sensor ke-6 (pakai pin sama seperti sensor 5), kasih delay agar pembacaan stabil
    if (i == 5) delay(20);

    int adcValue = analogRead(pin);
    float moisture = slopes[i] * adcValue + intercepts[i];

    if (moisture < 0) moisture = 0;
    if (moisture > 100) moisture = 100;

    kelembapan[i] = moisture;

    Serial.print("Sensor ");
    Serial.print(i + 1);
    Serial.print(" - ADC: ");
    Serial.print(adcValue);
    Serial.print(" -> Kelembaban: ");
    Serial.print(moisture, 2);
    Serial.println(" %");
  }

  Serial.println("---------------------------");

  if (millis() - lastSentTime > updateInterval) {
    lastSentTime = millis();
    sendToThingSpeak();
  }

  client.loop();
  delay(2000);
}

void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT...");
    if (client.connect(clientID, mqttUserName, mqttPass)) {
      Serial.println(" Connected!");
    } else {
      Serial.print(" Failed, rc=");
      Serial.print(client.state());
      Serial.println(" Retrying in 5 sec...");
      delay(5000);
    }
  }
}

void sendToThingSpeak() {
  String payload = "field1=" + String(kelembapan[0], 2) +
                   "&field2=" + String(kelembapan[1], 2) +
                   "&field3=" + String(kelembapan[2], 2) +
                   "&field4=" + String(kelembapan[3], 2) +
                   "&field5=" + String(kelembapan[4], 2) +
                   "&field6=" + String(kelembapan[5], 2);

  Serial.println("Sending to ThingSpeak: " + payload);
  if (client.publish(mqttTopic.c_str(), payload.c_str())) {
    Serial.println("✅ Data sent successfully!");
  } else {
    Serial.println("❌ Failed to send data.");
  }
}