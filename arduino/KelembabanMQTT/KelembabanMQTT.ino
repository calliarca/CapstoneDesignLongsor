#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>

// WiFi Credentials
const char ssid[] = "RedmiC";
const char pass[] = "blablabla";

// ThingSpeak MQTT Credentials
#define channelID 3013752

const char mqttUserName[] = "LgwUJRonHwAaGiIANxUFGQ8";
const char clientID[] = "LgwUJRonHwAaGiIANxUFGQ8";
const char mqttPass[] = "yGYSEib4dSC0AOdq3yVgNL+3";

// MQTT Server (ThingSpeak)
const char* mqttServer = "mqtt3.thingspeak.com";
const int mqttPort = 1883;
String mqttTopic = "channels/" + String(channelID) + "/publish";

WiFiClient espClient;
PubSubClient client(espClient);

// === PENGATURAN TIMER DAN LAPORAN ===
unsigned long lastSentTime = 0;
// Interval ini kurang berpengaruh karena ada delay(20000) di akhir loop
const unsigned long updateInterval = 1000; 

// Variabel untuk laporan per jam
unsigned long dataSentCount = 0; // Menghitung jumlah data yang terkirim
unsigned long oneHourTimerStart = 0; // Timer untuk periode satu jam
const unsigned long oneHourMillis = 3600000; // 1 jam = 3,600,000 milidetik

// BARU: Flag untuk mengontrol apakah sistem sedang aktif atau sudah berhenti
bool isMonitoringActive = true;

// Variabel Sensor
const int soilPins[6] = {36, 39, 34, 35, 33, 32};
int adcValues[6];
float moisturePercent[6];

// Fungsi prototipe
void reconnectMQTT();
void sendToThingSpeak();

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < 6; i++) {
    pinMode(soilPins[i], INPUT);
  }
  Serial.println("=== Monitoring 6 Soil Moisture Sensors ===");
  
  // Koneksi WiFi
  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected");

  // Koneksi MQTT
  client.setServer(mqttServer, mqttPort);
  reconnectMQTT();

  // Mulai timer untuk laporan per jam
  oneHourTimerStart = millis();
  Serial.println("Timer monitoring selama 1 jam dimulai.");
}

void loop() {
  // Seluruh logika utama hanya berjalan jika monitoring aktif
  if (isMonitoringActive) {
    // Pastikan koneksi MQTT selalu terjaga
    if (!client.connected()) {
      reconnectMQTT();
    }
    client.loop();

    // Baca data dari semua sensor
    for (int i = 0; i < 6; i++) {
      adcValues[i] = analogRead(soilPins[i]);

      // Hitung kelembapan berdasarkan persamaan linear masing-masing sensor
      switch (i) {
        case 0: moisturePercent[i] = -0.0127 * adcValues[i] + 39.245; break;
        case 1: moisturePercent[i] = -0.0133 * adcValues[i] + 39.824; break;
        case 2: moisturePercent[i] = -0.0136 * adcValues[i] + 40.538; break;
        case 3: moisturePercent[i] = -0.0133 * adcValues[i] + 40.263; break;
        case 4: moisturePercent[i] = -0.0136 * adcValues[i] + 40.605; break;
        case 5: moisturePercent[i] = -0.0128 * adcValues[i] + 39.454; break;
      }
      moisturePercent[i] = constrain(moisturePercent[i], 0.0, 100.0);

      // Tampilkan hasil di Serial Monitor
      Serial.print("Sensor "); Serial.print(i + 1);
      Serial.print(" | ADC: "); Serial.print(adcValues[i]);
      Serial.print(" | Moisture: "); Serial.print(moisturePercent[i], 2);
      Serial.println(" %");
    }
    Serial.println("--------------------------------------------------");

    // Kirim data ke ThingSpeak. Dengan delay(20000), blok ini akan selalu tereksekusi.
    if (millis() - lastSentTime > updateInterval) {
      lastSentTime = millis();
      sendToThingSpeak();
    }

    // Cek apakah sudah satu jam untuk MENGHENTIKAN monitoring
    if (millis() - oneHourTimerStart >= oneHourMillis) {
      Serial.println("\n================== WAKTU MONITORING SELESAI ==================");
      Serial.println("Proses pengiriman data selama 1 jam telah selesai.");
      Serial.print("Total data yang berhasil terkirim: ");
      Serial.println(dataSentCount);
      Serial.println("==============================================================");
      Serial.println("Sistem berhenti mengirim data. Silakan restart ESP32 untuk memulai lagi.");
      
      isMonitoringActive = false; // Hentikan siklus monitoring
    }
    
    // Delay utama untuk loop, menentukan interval pembacaan dan pengiriman (20 detik)
    delay(1200); 
  } else {
    // Setelah 1 jam, program akan masuk ke sini dan tidak melakukan apa-apa.
    // Pesan terakhir sudah dicetak di atas.
    delay(5000); // Delay agar tidak membebani prosesor tanpa guna.
  }
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
  String payload = "field1=" + String(moisturePercent[0], 2) +
                   "&field2=" + String(moisturePercent[1], 2) +
                   "&field3=" + String(moisturePercent[2], 2) +
                   "&field4=" + String(moisturePercent[3], 2) +
                   "&field5=" + String(moisturePercent[4], 2) +
                   "&field6=" + String(moisturePercent[5], 2);

  // MODIFIKASI: Tambahkan hitungan pengiriman pada pesan log
  Serial.println("Mengirim data ke ThingSpeak (Percobaan ke-" + String(dataSentCount + 1) + ")");
  
  if (client.publish(mqttTopic.c_str(), payload.c_str())) {
    Serial.println("✅ Data sent successfully!");
    dataSentCount++; // Tambahkan 1 ke penghitung jika berhasil terkirim
  } else {
    Serial.println("❌ Failed to send data.");
  }
}