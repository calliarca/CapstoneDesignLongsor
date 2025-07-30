# 🌋 Landslide Simulator - Capstone Design

A smart landslide simulator system developed for **research and educational purposes**, integrating hardware (sensors, actuators, ESP32) and a web-based dashboard to monitor and control real-time environmental conditions that may trigger landslides.

---

## 📦 How to Run This Website

### 1. Clone Repository
Clone repo ini ke folder `htdocs` XAMPP Anda:
```bash
git clone https://github.com/calliarca/CapstoneDesignLongsor_Reorganized.git
```

### 2. Install PHP Dependencies
Masuk ke folder project, lalu jalankan:
```bash
composer install
```
> Jika belum punya Composer, download di [getcomposer.org](https://getcomposer.org/).

### 3. Setup Database
- Buka `phpMyAdmin` melalui XAMPP.
- Import file database yang ada di folder `database/` (misal: `simulator_longsor.sql`).
- Pastikan konfigurasi database di `backend/php/config.php` sudah sesuai.

### 4. Konfigurasi File
- Edit file konfigurasi seperti:
  - `backend/assets/js/camera_config.json`
  - `backend/assets/js/channel_config.json`
  - `backend/assets/js/thingspeak_config.json`
  - `backend/php/config.php`
  - `simulator_longsor.sql`
- Isi sesuai kebutuhan (lihat contoh atau dokumentasi).

### 5. Jalankan XAMPP
- Aktifkan **Apache** dan **MySQL** di XAMPP Control Panel.

### 6. Akses Website
Buka browser dan akses:
```
http://localhost/CapstoneDesignLongsor_Reorganized/
```
Login dengan akun yang sudah terdaftar (admin/user).

---

## 📌 Project Objectives

- Simulate landslide events through a controlled environment (adjustable slope, rainfall).
- Monitor key indicators: **soil moisture**, **slope angle**, and **artificial rainfall**.
- Visualize real-time data and simulation states via a **web interface and digital twin**.
- Enable **remote access and control** for experimentation and analysis.

---

## ⚙️ Key Components

### 🧠 Hardware
- **ESP32** microcontroller (Wi-Fi + MQTT capable)
- **MPU6050** (gyroscope/accelerometer for slope measurement)
- **Soil Moisture Sensor**
- **Motor + BTS7960 Driver** for slope control
- **Solenoid Valve** or pump for rainfall simulation
- Optional: **K210 CANMV** for visual landslide analysis

### 🌐 Software
- **ESP32 Sketches** using Arduino IDE
- **ThingSpeak MQTT Broker** for real-time data publishing
- **Web Dashboard** for control and visualization (HTML, JS, PHP)
- **Database (MySQL)** for storing sensor and simulation data
- **PHP backend** for simulation control and CRUD operations

---

## 🚀 Getting Started

Untuk melihat kode Arduino (ESP32) dan contoh validasi data, silakan kunjungi repository berikut:
- [Arduino & Data Validation Source Code](https://github.com/calliarca/CapstoneDesignLongsor_AddOns)  
  Di repo tersebut juga tersedia dokumentasi dan contoh konfigurasi untuk file berikut:
  - `backend/assets/js/camera_config.json`
  - `backend/assets/js/channel_config.json`
  - `backend/assets/js/thingspeak_config.json`
  - `backend/php/config.php`

Pastikan Anda membaca README dan dokumentasi pada repository tersebut untuk setup hardware dan validasi data secara lengkap.

## 🔧 Features

- 📈 Real-time graph and value updates (slope, moisture, rainfall)
- 🎮 Remote simulation control (start, stop, adjust)
- 🔐 User login with role access (admin/user)
- 📄 View history and raw simulation data
- ⚙️ Dynamic MQTT channel configuration
- ⏱️ CRON-based MQTT data polling and storage
- (Optional) 🧠 Soil visual analysis using CANMV

---

## ✅ To-Do / Future Improvements

- [ ] Enhance digital twin animation
- [ ] Integrate image-based landslide detection
- [ ] Cloud deployment for remote access
- [ ] CSV export for raw data
- [ ] Node-RED or Grafana dashboard compatibility

---

## 👨‍💻 Contributors

- [Arsyad Faturrahman & Teams]
- [Telkom University]
