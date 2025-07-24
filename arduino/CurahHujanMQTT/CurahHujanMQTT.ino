#include <WiFi.h>
#include <PubSubClient.h>

// =================================================================
//                      KONFIGURASI JARINGAN & MQTT
// =================================================================

// ----- WiFi Credentials -----
const char ssid[] = "Reee";
const char pass[] = "Reeee1234";

// ----- MQTT Broker & Port -----
const char* mqttServer = "mqtt3.thingspeak.com";
const int mqttPort = 1883;

// ----- Channel IDs -----
#define CHANNEL_ID_INPUT_SP_RAINFALL 2963900 
#define CHANNEL_ID_OUTPUT_RAINFALL_ACTUAL 3013754 

// ----- Kredensial & Klien untuk PUBLISH (Channel Output: 3013754) -----
const char mqttUserName_pub[] = "EzsUBSsTGRYEOgo3ADMPPAc";
const char clientID_pub[]     = "EzsUBSsTGRYEOgo3ADMPPAc"; // ID harus unik
const char mqttPass_pub[]     = "HiRIPd9Cx3JRlwezOsd+HDuN";
String mqttPublishTopic       = "channels/" + String(CHANNEL_ID_OUTPUT_RAINFALL_ACTUAL) + "/publish";
WiFiClient espClient_pub;
PubSubClient client_pub(espClient_pub);

// ----- Kredensial & Klien untuk SUBSCRIBE (Channel Input: 2963900) -----
// TODO: Ganti placeholder di bawah ini dengan kredensial yang benar untuk channel 2963900
const char mqttUserName_sub[] = "ICMHJyYYIRkrNgMVGDUcARM";
const char clientID_sub[]     = "ICMHJyYYIRkrNgMVGDUcARM"; // ID harus unik
const char mqttPass_sub[]     = "kDU0XPSGjMb7Un3USw59j5Fu";
String mqttSubscribeTopic     = "channels/" + String(CHANNEL_ID_INPUT_SP_RAINFALL) + "/subscribe/fields/field2";
WiFiClient espClient_sub;
PubSubClient client_sub(espClient_sub);


// =================================================================
//                      KONFIGURASI PIN & KONTROL POMPA
// =================================================================

const int RPWM_PIN = 18;
const int LPWM_PIN = 19;
const int R_EN_PIN = 23;
const int L_EN_PIN = 22;
const int sensorPin = 32;

// =================================================================
//                VARIABEL GLOBAL UNTUK PENGUKURAN & KONTROL
// =================================================================

volatile unsigned long pulseCount = 0;
volatile unsigned long lastPulseTime = 0;
float flowRate = 0.0;
float volume = 0.0;
float totalVolume = 0.0;

const float a_flow = 0.00001701;
const float b_flow = 0.02554036;
const float c_flow = 0.09168697;
const float luasArea = 1.073;

float Kp = 3.37, Ki = 0, Kd = 0.1;
float integral = 0, lastError = 0;
float pwmActual = 70.0;

const int maxCycle = 6;
unsigned long cycleInterval[maxCycle];
unsigned long programStartTime = 0;
unsigned long cycleStartTime = 0;
int cycleCount = 0;
bool cycleStarted = false;
bool isRunning = false;
bool userInputReceived = false;

float SP_Rainfall = 0;
float volumeTarget = 0;
float volumePerCycle = 0;
float rainfallActual = 0;
int dataSentCount = 0;

unsigned long previousMillisMQTT = 0;
const unsigned long intervalMQTT = 30000;

// Variabel untuk manajemen koneksi non-blocking
unsigned long lastPubReconnectAttempt = 0;
unsigned long lastSubReconnectAttempt = 0;

// Deklarasi fungsi
void callback_mqtt(char* topic, byte* payload, unsigned int length);
void reconnectPublishClient();
void reconnectSubscribeClient();

// =================================================================
//                      FUNGSI-FUNGSI UTAMA
// =================================================================

void IRAM_ATTR countPulse() {
  unsigned long now = micros();
  if (now - lastPulseTime > 1000) {
    pulseCount++;
    lastPulseTime = now;
  }
}

void setupWiFi() {
  Serial.println();
  Serial.print("Menghubungkan ke WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi terhubung!");
  Serial.print("Alamat IP: ");
  Serial.println(WiFi.localIP());
}

void callback_mqtt(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  
  float input = msg.toFloat();
  
  if (input >= 0 && input <= 20) {
    SP_Rainfall = input;
    volumeTarget = SP_Rainfall * luasArea;
    volumePerCycle = volumeTarget / maxCycle;
    
    totalVolume = 0;
    rainfallActual = 0;
    cycleCount = 0;
    programStartTime = millis();
    userInputReceived = true;
    isRunning = false;
    cycleStarted = false;
    dataSentCount = 0;
    
    Serial.println("==============================");
    Serial.print("PERINTAH BARU DITERIMA");
    Serial.print("Curah hujan diset: ");
    Serial.print(SP_Rainfall, 2);
    Serial.println(" mm/jam");
    Serial.print("Target volume total: ");
    Serial.print(volumeTarget, 3);
    Serial.print(" L (");
    Serial.print(volumePerCycle, 3);
    Serial.println(" L per siklus)");
    Serial.println("==============================");
  } else {
    Serial.print("Input tidak valid diterima: ");
    Serial.println(input);
  }
}

void reconnectPublishClient() {
  Serial.print("Mencoba menghubungkan Klien PUBLISH...");
  if (client_pub.connect(clientID_pub, mqttUserName_pub, mqttPass_pub)) {
    Serial.println(" Terhubung!");
  } else {
    Serial.print(" Gagal, rc=");
    Serial.print(client_pub.state());
    Serial.println(". Akan mencoba lagi nanti.");
  }
}

void reconnectSubscribeClient() {
  Serial.print("Mencoba menghubungkan Klien SUBSCRIBE...");
  if (client_sub.connect(clientID_sub, mqttUserName_sub, mqttPass_sub)) {
    Serial.println(" Terhubung!");
    client_sub.subscribe(mqttSubscribeTopic.c_str());
    Serial.print("Berhasil subscribe ke topik: ");
    Serial.println(mqttSubscribeTopic);
  } else {
    Serial.print(" Gagal, rc=");
    Serial.print(client_sub.state());
    Serial.println(". Akan mencoba lagi nanti.");
  }
}

void publishRainfallActual() {
  if (!client_pub.connected()) {
    Serial.println("Klien PUBLISH tidak terhubung, pengiriman dibatalkan.");
    return;
  }
  String payload = "field1=" + String(rainfallActual, 3);
  Serial.print("Mengirim data ke ThingSpeak: ");
  Serial.println(payload);
  
  if (client_pub.publish(mqttPublishTopic.c_str(), payload.c_str())) {
    dataSentCount++;
    Serial.println("Data berhasil dikirim.");
  } else {
    Serial.println("Gagal mengirim data.");
  }
}

// =================================================================
//                               SETUP UTAMA
// =================================================================
void setup() {
  Serial.begin(115200);
  
  pinMode(RPWM_PIN, OUTPUT);
  pinMode(LPWM_PIN, OUTPUT);
  pinMode(R_EN_PIN, OUTPUT);
  pinMode(L_EN_PIN, OUTPUT);
  
  pinMode(sensorPin, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(sensorPin), countPulse, FALLING);
  
  digitalWrite(R_EN_PIN, HIGH);
  digitalWrite(L_EN_PIN, HIGH);
  analogWrite(RPWM_PIN, 0);
  analogWrite(LPWM_PIN, 0);

  for (int i = 0; i < maxCycle; i++) {
    cycleInterval[i] = (i * 10UL * 60 * 1000) + 1000;
  }

  setupWiFi();
  
  // Konfigurasi Klien PUBLISH
  client_pub.setServer(mqttServer, mqttPort);

  // Konfigurasi Klien SUBSCRIBE
  client_sub.setServer(mqttServer, mqttPort);
  client_sub.setCallback(callback_mqtt);
}

// =================================================================
//                                LOOP UTAMA
// =================================================================
void loop() {
  // --- MANAJEMEN KONEKSI ---
  if (WiFi.status() != WL_CONNECTED) {
    setupWiFi();
  }

  if (!client_pub.connected()) {
    long now = millis();
    if (now - lastPubReconnectAttempt > 5000) {
      lastPubReconnectAttempt = now;
      reconnectPublishClient();
    }
  }

  if (!client_sub.connected()) {
    long now = millis();
    if (now - lastSubReconnectAttempt > 5000) {
      lastSubReconnectAttempt = now;
      reconnectSubscribeClient();
    }
  }
  
  client_pub.loop();
  client_sub.loop();

  // --- LOGIKA UTAMA ---
  unsigned long now = millis();

  if (now - previousMillisMQTT >= intervalMQTT && userInputReceived && cycleCount < maxCycle) {
    previousMillisMQTT = now;
    publishRainfallActual();
  }

  if (!userInputReceived || cycleCount >= maxCycle) {
    if (userInputReceived && cycleCount >= maxCycle) {
      Serial.println("==============================");
      Serial.println("Semua siklus selesai.");
      Serial.print("Jumlah data yang dikirim: ");
      Serial.println(dataSentCount);
      Serial.println("==============================");
      userInputReceived = false;
    }
    return;
  }

  unsigned long elapsedTime = now - programStartTime;

  if (!cycleStarted && elapsedTime >= cycleInterval[cycleCount]) {
    volume = 0;
    pulseCount = 0;
    integral = 0;
    lastError = 0;
    pwmActual = 70;
    cycleStartTime = now;
    isRunning = true;
    cycleStarted = true;
    
    digitalWrite(R_EN_PIN, HIGH);
    digitalWrite(L_EN_PIN, HIGH);
    analogWrite(RPWM_PIN, map((int)pwmActual, 0, 100, 0, 255));
    analogWrite(LPWM_PIN, 0);
    
    Serial.print("▶️  Mulai siklus ke-");
    Serial.println(cycleCount + 1);
  }

  static unsigned long lastPIDUpdate = 0;
  if (isRunning && now - lastPIDUpdate >= 200) {
    lastPIDUpdate = now;

    noInterrupts();
    unsigned long count = pulseCount;
    pulseCount = 0;
    interrupts();

    float freq = count * 5.0;
    flowRate = a_flow * freq * freq + b_flow * freq + c_flow;
    if (flowRate < 0.2) flowRate = 0;

    volume += flowRate / 300.0;
    totalVolume += flowRate / 300.0;
    rainfallActual = totalVolume / luasArea;

    float error = 2.0 - flowRate;
    integral += error * 0.2;
    float derivative = (error - lastError) / 0.2;
    lastError = error;
    float output = Kp * error + Ki * integral + Kd * derivative;
    
    pwmActual += output;
    pwmActual = constrain(pwmActual, 0, 100);
    int pwmVal = map((int)pwmActual, 0, 100, 0, 255);
    if (pwmVal > 0 && pwmVal < 70) pwmVal = 70;

    analogWrite(RPWM_PIN, pwmVal);
    analogWrite(LPWM_PIN, 0);

    Serial.print("t="); Serial.print((now - cycleStartTime) / 1000.0, 2); Serial.print("s | ");
    Serial.print("f="); Serial.print(freq, 1); Serial.print(" Hz | ");
    Serial.print("Q="); Serial.print(flowRate, 3); Serial.print(" L/min | ");
    Serial.print("e="); Serial.print(" | ");
    Serial.print(error, 3);
    Serial.print("v="); Serial.print(volume, 3); Serial.print(" L | ");
    Serial.print("r="); Serial.print(rainfallActual, 3); Serial.print(" mm/j | ");
    Serial.print("PWM="); Serial.println(pwmActual, 1);

    if (volume >= volumePerCycle - 0.01) {
      analogWrite(RPWM_PIN, 0);
      analogWrite(LPWM_PIN, 0);
      digitalWrite(R_EN_PIN, LOW);
      digitalWrite(L_EN_PIN, LOW);
      isRunning = false;
      cycleStarted = false;
      
      Serial.print("✅ Siklus ke-");
      Serial.print(cycleCount + 1);
      Serial.print(" selesai. Volume tercapai: ");
      Serial.print(volume, 3);
      Serial.println(" L");
      
      cycleCount++;
    }
  }
}
