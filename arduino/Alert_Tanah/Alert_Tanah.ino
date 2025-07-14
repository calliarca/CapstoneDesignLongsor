// --- Pustaka yang Diperlukan ---
#include <WiFi.h>
#include <LiquidCrystal_I2C.h>
#include <ezButton.h>
#include <PubSubClient.h> // Menggantikan HTTPClient

// ====================================================================
// --- KONFIGURASI PENGGUNA (GANTI SESUAI KEBUTUHAN ANDA) ---
// ====================================================================

// 1. Kredensial WiFi Anda
const char* ssid = "Busyetdah";
const char* password = "12341234";

// 2. Kredensial MQTT ThingSpeak Anda
#define CHANNEL_ID 2963900 // Ganti dengan Channel ID Anda
const char* mqttUserName = "FzYrCCo6MSE0OBMFJBgYDSw"; // Ganti dengan MQTT Username/ClientID
const char* clientID = "FzYrCCo6MSE0OBMFJBgYDSw";     // Ganti dengan MQTT ClientID
const char* mqttPass = "7lOfdFz+hqyVUSzEhsevqgg/";   // Ganti dengan MQTT API Key (Write API Key)

// 3. Konfigurasi Topik MQTT
String mqttTopic = "channels/" + String(CHANNEL_ID) + "/publish";

// ====================================================================
// --- Inisialisasi Perangkat Keras & MQTT ---
// ====================================================================

// Perangkat Keras
HardwareSerial K210Serial(2); // UART2 di GPIO16 (RX), GPIO17 (TX)
LiquidCrystal_I2C lcd(0x27, 16, 2);
const int buttonSetPin = 13;
const int buttonEnterPin = 14;
ezButton tombolSet(buttonSetPin);
ezButton tombolEnter(buttonEnterPin);

// MQTT
const char* mqttServer = "mqtt3.thingspeak.com";
const int mqttPort = 1883;
WiFiClient espClient;
PubSubClient client(espClient);

// --- Variabel Global ---
float gerak_px_terukur = 0.0;
int movement_threshold_px = 30;
int temp_threshold_px = movement_threshold_px;
const int threshold_min = 30;
const int threshold_max = 100;
const int threshold_step = 10;

enum DisplayState { RUNNING, SETTING, ALARM };
DisplayState currentState = RUNNING;
String lastLcdLine1 = "", lastLcdLine2 = "";

// ====================================================================
// --- FUNGSI-FUNGSI HELPER ---
// ====================================================================

/**
 * @brief Memperbarui tampilan LCD dengan efisien (hanya jika teks berubah).
 */
void updateLcd(String line1, String line2) {
    if (line1 != lastLcdLine1) {
        lcd.setCursor(0, 0); lcd.print("                ");
        lcd.setCursor(0, 0); lcd.print(line1);
        lastLcdLine1 = line1;
    }
    if (line2 != lastLcdLine2) {
        lcd.setCursor(0, 1); lcd.print("                ");
        lcd.setCursor(0, 1); lcd.print(line2);
        lastLcdLine2 = line2;
    }
}

/**
 * @brief Menghubungkan kembali ke broker MQTT jika koneksi terputus.
 */
void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Mencoba terhubung ke MQTT Broker...");
    updateLcd("Connecting MQTT", "Please wait...");
    if (client.connect(clientID, mqttUserName, mqttPass)) {
      Serial.println(" Terhubung!");
      lcd.clear(); // Hapus pesan koneksi dari LCD
    } else {
      Serial.print(" Gagal, rc=");
      Serial.print(client.state());
      Serial.println(" Mencoba lagi dalam 5 detik...");
      delay(5000);
    }
  }
}

/**
 * @brief Mengirim notifikasi alarm ke server ThingSpeak via MQTT.
 * INI ADALAH FUNGSI YANG ISINYA DIUBAH.
 */
void sendAlarmNotification() {
    // Pastikan koneksi MQTT terhubung sebelum mengirim
    if (!client.connected()) {
        Serial.println("Koneksi MQTT terputus, mencoba menghubungkan kembali...");
        reconnectMQTT();
    }

    // Buat payload untuk dikirim ke ThingSpeak.
    // Misal: field7 untuk notifikasi alarm (nilai 1), field8 untuk nilai pergerakan terukur.
    String payload = "field3=1" +
                     String("&field4=") + String(gerak_px_terukur, 2);

    Serial.println("Mengirim notifikasi alarm ke ThingSpeak: " + payload);

    // Publikasikan payload ke topik MQTT
    if (client.publish(mqttTopic.c_str(), payload.c_str())) {
        Serial.println("✅ Notifikasi alarm berhasil dikirim via MQTT!");
    } else {
        Serial.println("❌ Gagal mengirim notifikasi alarm via MQTT.");
    }
}

// ====================================================================
// --- FUNGSI UTAMA ARDUINO ---
// ====================================================================

void setup() {
    Serial.begin(115200);
    K210Serial.begin(115200, SERIAL_8N1, 16, 17);

    tombolSet.setDebounceTime(50);
    tombolEnter.setDebounceTime(50);

    lcd.init();
    lcd.backlight();
    updateLcd("Sistem Longsor", "Memulai...");

    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi terhubung!");
    Serial.print("IP ESP32: ");
    Serial.println(WiFi.localIP());

    // Setup koneksi ke server MQTT
    client.setServer(mqttServer, mqttPort);

    delay(2000);
    lcd.clear();
    Serial.println("Sistem siap.");
}

void loop() {
    // Jaga koneksi MQTT tetap hidup
    if (!client.connected()) {
      reconnectMQTT();
    }
    client.loop(); // Penting untuk memproses pesan dan menjaga koneksi

    tombolSet.loop();
    tombolEnter.loop();

    // --- Logika Tombol Threshold ---
    if (tombolSet.isPressed()) {
        if (currentState != SETTING) temp_threshold_px = movement_threshold_px;
        currentState = SETTING;
        temp_threshold_px += threshold_step;
        if (temp_threshold_px > threshold_max) temp_threshold_px = threshold_min;
        Serial.printf("Set sementara: %d px\n", temp_threshold_px);
    }

    if (tombolEnter.isPressed()) {
        if (currentState == SETTING) {
            movement_threshold_px = temp_threshold_px;
            currentState = RUNNING;
            Serial.printf("*** Threshold disimpan: %d px ***\n", movement_threshold_px);
        } else if (currentState == ALARM) {
            currentState = RUNNING;
            Serial.println("*** ALARM DIRESET MANUAL ***");
        }
    }

    // --- Logika Membaca Data dari K210 ---
    static String line = "";
    while (K210Serial.available()) {
        char c = K210Serial.read();
        line += c;

        if (line.endsWith("------------------------------\n")) {
            int pos = line.indexOf("delta:");
            if (pos >= 0) {
                String gerak_str = line.substring(pos + 6);
                gerak_px_terukur = gerak_str.toFloat();
                Serial.printf("Gerakan terdeteksi: %.2f px\n", gerak_px_terukur);
                if (gerak_px_terukur > movement_threshold_px && currentState == RUNNING) {
                    currentState = ALARM;
                    Serial.println("!!! LONGSOR TERDETEKSI !!!");
                    sendAlarmNotification(); // Panggil fungsi notifikasi yang sudah diubah
                }
            }
            line = "";
        }
    }

    // --- Logika Update Tampilan LCD ---
    char buffer[17];
    switch (currentState) {
        case SETTING:
            updateLcd("Set Threshold:", String(temp_threshold_px) + " px");
            break;
        case RUNNING:
            sprintf(buffer, "Th:%dpx", movement_threshold_px);
            updateLcd(buffer, "Geser:" + String(gerak_px_terukur, 1) + "px");
            break;
        case ALARM:
            updateLcd("!!! PERINGATAN", "TERJADI LONGSOR");
            break;
    }
}
