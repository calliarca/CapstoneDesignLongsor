#include <WiFi.h>
#include <PubSubClient.h>

// ===== WiFi Credentials =====
const char ssid[] = "Xiaomi MiA1";      // Ganti dengan nama WiFi Anda
const char pass[] = "1234qwer";  // Ganti dengan password WiFi Anda

// ===== ThingSpeak MQTT Credentials =====
const char mqttUserName[] = "FzYrCCo6MSE0OBMFJBgYDSw";
const char clientID[] = "FzYrCCo6MSE0OBMFJBgYDSw";
const char mqttPass[] = "7lOfdFz+hqyVUSzEhsevqgg/";

// ===== ThingSpeak Channel IDs =====
// GANTI dengan Channel ID ThingSpeak Anda untuk MENERIMA SP_Rainfall (misal: Channel 1 Anda)
#define CHANNEL_ID_INPUT_SP_RAINFALL 2963900
// GANTI dengan Channel ID ThingSpeak Anda untuk MENGIRIM rainfallActual (misal: Channel 2 Anda)
#define CHANNEL_ID_OUTPUT_RAINFALL_ACTUAL 2972562

// ===== MQTT Server (ThingSpeak) =====
const char* mqttServer = "mqtt3.thingspeak.com";
const int mqttPort = 1883;

// MQTT Topics
// Subscribe ke field1 dari Channel Input untuk SP_Rainfall
String mqttSubscribeTopic = "channels/" + String(CHANNEL_ID_INPUT_SP_RAINFALL) + "/subscribe/fields/field2";
// Publish ke Channel Output (payload akan menentukan field1)
String mqttPublishTopic = "channels/" + String(CHANNEL_ID_OUTPUT_RAINFALL_ACTUAL) + "/publish";

WiFiClient espClient;
PubSubClient client(espClient);

// ===== Konfigurasi Pin (sesuai kode awal Anda) =====
const int RPWM_PIN = 18;
const int LPWM_PIN = 19;
const int R_EN_PIN = 23;
const int L_EN_PIN = 22;
const int sensorPin = 32; // Flowmeter sensor pin

// ===== Flowmeter =====
volatile unsigned long pulseCount = 0;
volatile unsigned long lastPulseTime = 0;
float flowRate = 0.0;     // L/min
float volume = 0.0;       // volume per semprotan (liter)
float totalVolume = 0.0;  // total volume keseluruhan (liter)

//Persamaan Regresi Flowmeter
const float a_flow = 0.0245; // Disarankan ganti nama agar tidak konflik jika ada var 'a' lain
const float b_flow = 0.1828; // Disarankan ganti nama

// ===== Luas area =====
const float luasArea = 1.001; // luas area dalam meter persegi

// Nilai PID (Perlu di Tuning)
float Kp = 1.5, Ki = 0.5, Kd = 0.1;
float integral = 0, lastError = 0;

// ===== Simulasi Siklus =====
const unsigned long interval_off = 60000; // interval OFF = 1 menit (nama variabel diubah)
const int maxCycle = 6;               // jumlah semprotan per jam (6 kali)
unsigned long lastSwitchTime = 0;

bool isRunning = false;
bool userInputReceived = false; // Akan true jika SP_Rainfall valid diterima dari MQTT
int cycleCount = 0;

// ===== Target Curah Hujan dan volume target per semprotan =====
float SP_Rainfall = 0;      // setpoint curah hujan (mm/jam) - dari MQTT
float volumeTarget = 0;     // liter per semprotan

float rainfallActual = 0;   // curah hujan aktual kumulatif (mm) - dikirim ke ThingSpeak

// ===== MQTT Publish Timer =====
unsigned long previousMillisMQTT = 0;
const long intervalMQTT = 30000; // Interval untuk publish data ke ThingSpeak (misal: 30 detik)

// ===== Fungsi interrupt hitung pulse flowmeter =====
void IRAM_ATTR countPulse() {
  unsigned long now = micros();
  if (now - lastPulseTime > 1000) { // debounce 1ms
    pulseCount++;
    lastPulseTime = now;
  }
}

void setupWiFi() {
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, pass);
  int wifi_retries = 0;
  while (WiFi.status() != WL_CONNECTED && wifi_retries < 30) {
    delay(500);
    Serial.print(".");
    wifi_retries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi connection failed. Please check credentials/network.");
  }
}

void callback_mqtt(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);

  float input = message.toFloat();
  if (input >= 0 && input <= 20) { // Asumsi valid rainfall 0-20 mm/jam
    SP_Rainfall = input;
    userInputReceived = true;
    cycleCount = 0;
    totalVolume = 0;
    rainfallActual = 0; // Reset rainfall aktual saat setpoint baru diterima

    Serial.print("New Setpoint Curah Hujan from MQTT (Channel " + String(CHANNEL_ID_INPUT_SP_RAINFALL) + "/field1): ");
    Serial.print(SP_Rainfall);
    Serial.println(" mm/jam");

    volumeTarget = (SP_Rainfall * luasArea) / maxCycle; // liter
    } else { // Jika maxCycle tidak valid, anggap 1 siklus besar
        volumeTarget = SP_Rainfall * luasArea;
    }
    Serial.print("Target volume per semprotan: ");
    Serial.print(volumeTarget, 3);
    Serial.println(" L");

    volume = 0;
    pulseCount = 0; // Reset pulse count untuk pembacaan flowrate awal yang akurat
    integral = 0;
    lastError = 0;

    if (!isRunning && cycleCount < maxCycle) {
         isRunning = true;
         lastSwitchTime = millis();
         Serial.println("Pompa dinyalakan berdasarkan setpoint MQTT baru.");
    } else if (isRunning) {
        Serial.println("Setpoint diperbarui, siklus saat ini akan melanjutkan.");
    } else {
        Serial.println("Setpoint diterima. Pompa akan mulai pada siklus berikutnya jika interval terpenuhi.");
    }
  } else {
    Serial.print("Nilai setpoint dari MQTT tidak valid: ");
    Serial.println(input);
  }
}

void reconnectMQTT() {
  int mqtt_retries = 0;
  while (!client.connected() && mqtt_retries < 5) {
    Serial.print("Attempting MQTT connection...");
    if (client.connect(clientID, mqttUserName, mqttPass)) {
      Serial.println("connected");
      if (client.subscribe(mqttSubscribeTopic.c_str())) {
        Serial.print("Subscribed to: ");
        Serial.println(mqttSubscribeTopic);
      } else {
        Serial.println("Subscription failed!");
      }
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
    mqtt_retries++;
  }
   if (!client.connected()){
    Serial.println("MQTT connection failed after several retries.");
  }
}

void publishRainfallActualToThingSpeak() {
  if (client.connected() && userInputReceived) {
    // Kirim rainfallActual ke field1 dari CHANNEL_ID_OUTPUT_RAINFALL_ACTUAL
    String payload = "field1=" + String(rainfallActual, 3);

    Serial.print("Publishing to ThingSpeak (Channel " + String(CHANNEL_ID_OUTPUT_RAINFALL_ACTUAL) + "/field1): ");
    Serial.println(payload);

    if (client.publish(mqttPublishTopic.c_str(), payload.c_str())) {
      Serial.println("Data (rainfallActual) published successfully.");
    } else {
      Serial.println("Failed to publish data (rainfallActual).");
    }
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("Rainfall Simulator with ThingSpeak MQTT Starting...");
  Serial.println("Version 2.0 - Specific Channel/Field Target");

  pinMode(RPWM_PIN, OUTPUT);
  pinMode(LPWM_PIN, OUTPUT);
  pinMode(R_EN_PIN, OUTPUT);
  pinMode(L_EN_PIN, OUTPUT);
  pinMode(sensorPin, INPUT_PULLUP);

  digitalWrite(R_EN_PIN, HIGH);
  digitalWrite(L_EN_PIN, HIGH); // Pastikan ini sesuai dengan cara kerja driver motor Anda

  attachInterrupt(digitalPinToInterrupt(sensorPin), countPulse, FALLING); //Baca pulsa flowmeter

  analogWrite(RPWM_PIN, 0); // Pompa mati
  analogWrite(LPWM_PIN, 0);

  setupWiFi();
  if (WiFi.status() == WL_CONNECTED) {
    client.setServer(mqttServer, mqttPort);
    client.setCallback(callback_mqtt);
    // reconnectMQTT(); // Panggil reconnectMQTT di loop jika koneksi terputus
  }

  Serial.println("Waiting for SP_Rainfall from ThingSpeak Channel " + String(CHANNEL_ID_INPUT_SP_RAINFALL) + ", field2.");
  Serial.println("rainfallActual will be published to ThingSpeak Channel " + String(CHANNEL_ID_OUTPUT_RAINFALL_ACTUAL) + ", field1.");
}

void loop() {
  unsigned long now = millis();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Attempting to reconnect...");
    setupWiFi();
  }

  if (WiFi.status() == WL_CONNECTED && !client.connected()) {
    reconnectMQTT(); // Coba sambungkan ulang MQTT jika WiFi terhubung tapi MQTT tidak
  }
  
  if (client.connected()) {
    client.loop(); // Penting untuk memproses pesan masuk dan menjaga koneksi
  }

  // ===== Pompa ON =====
  if (isRunning) {
    static unsigned long lastReadTime = 0;
    if (now - lastReadTime >= 1000) {  // Baca setiap 1 detik
      lastReadTime = now;

      noInterrupts();
      unsigned long currentPulseCount = pulseCount;
      pulseCount = 0;
      interrupts();

      float freq = currentPulseCount;
      flowRate = (a_flow * freq) + b_flow; //regresi flowmeter
      if (flowRate < 0.2) flowRate = 0;

      float volumeThisSecond = flowRate / 60.0; // Volume dalam Liter
      volume += volumeThisSecond;
      totalVolume += volumeThisSecond;
      rainfallActual = totalVolume / luasArea;

      float error = volumeTarget - volume;
      integral += error;
      float derivative = error - lastError;
      float outputPID = Kp * error + Ki * integral + Kd * derivative;
      lastError = error;

      int pwmPercent = constrain((int)outputPID, 0, 100);

      if (volume >= volumeTarget || error <= 0) {
        analogWrite(RPWM_PIN, 0);
        analogWrite(LPWM_PIN, 0);
        digitalWrite(R_EN_PIN, LOW);
        digitalWrite(L_EN_PIN, LOW);

        isRunning = false;
        lastSwitchTime = now;
        cycleCount++;

        integral = 0;
        lastError = 0;
      } else {
        analogWrite(RPWM_PIN, map(pwmPercent, 0, 100, 0, 255));
        analogWrite(LPWM_PIN, 0);
        digitalWrite(R_EN_PIN, HIGH);
        digitalWrite(L_EN_PIN, HIGH);

        Serial.print("Flowrate: ");
        Serial.print(flowRate, 3);
        Serial.print(" L/min | Volume semprotan: ");
       Serial.print(volume, 3);
       Serial.print(" L | Total volume: ");
       Serial.print(totalVolume, 3);
       Serial.print(" L | Curah Hujan Aktual: ");
        Serial.print(rainfallActual, 3);
       Serial.print(" mm/jam | PWM: ");
       Serial.print(pwmPercent);
        Serial.println(" %");
      }
    }
  }

  // ===== Pompa OFF (tunggu interval untuk nyala lagi) =====
  if (!isRunning && userInputReceived && cycleCount < maxCycle) {
    if (now - lastSwitchTime >= interval_off) {
      volume = 0;
      pulseCount = 0;
      integral = 0;
      lastError = 0;

      isRunning = true;
      lastSwitchTime = now;

      digitalWrite(R_EN_PIN, HIGH);
      digitalWrite(L_EN_PIN, HIGH);

      Serial.print("Semprotan ke-");
      Serial.print(cycleCount +1);
      Serial.println(" dimulai.");
    }
  }

  // ===== Publish data ke ThingSpeak secara periodik =====
  unsigned long currentMillisMQTT_now = millis(); // Ganti nama var agar tidak konflik
  if (currentMillisMQTT_now - previousMillisMQTT >= intervalMQTT) {
    previousMillisMQTT = currentMillisMQTT_now;
    if (WiFi.status() == WL_CONNECTED && client.connected()) {
      publishRainfallActualToThingSpeak();
    }
  }
}
