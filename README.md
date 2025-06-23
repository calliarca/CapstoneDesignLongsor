# 🌋 Landslide Simulator - Capstone Design

A smart landslide simulator system developed for **research and educational purposes**, integrating hardware (sensors, actuators, ESP32) and a web-based dashboard to monitor and control real-time environmental conditions that may trigger landslides.

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

### 1. Setup ESP32
- Open any sketch under `/arduino/`
- Install required libraries: `WiFi`, `PubSubClient`, `Wire`, `MPU6050`, etc.
- Set your **Wi-Fi credentials** and **MQTT credentials**.
- Upload to your ESP32 via Arduino IDE.

### 2. Setup Web Server
- Install [XAMPP](https://www.apachefriends.org/index.html)
- Place the project in the `htdocs/` folder.
- Import database schema into **phpMyAdmin** (usually under `database/` folder).
- Start **Apache** and **MySQL** services.

### 3. Access the Web Interface
Open a browser and visit:
http://localhost/CAPSTONE/public/


Login with admin or user credentials to access respective dashboards.

---

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
