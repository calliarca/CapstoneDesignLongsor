// =============================================================
//               HOME-ADMIN.JS (VERSI DIPERBAIKI)
//         Dengan Manajemen UI & Event Handler Terpusat
// =============================================================

// -------------------------------------------------------------
//                    DEKLARASI VARIABEL GLOBAL
// -------------------------------------------------------------

// Status dan Data Aplikasi
let currentKemiringan = 0;
let currentCurahHujan = 0;
let currentKelembabanTanah1 = 0, currentKelembabanTanah2 = 0, currentKelembabanTanah3 = 0;
let currentKelembabanTanah4 = 0, currentKelembabanTanah5 = 0, currentKelembabanTanah6 = 0;
let currentOutputKemiringan = 0, currentOutputYaw = 0, currentOutputRoll = 0;
let currentOutputCurahHujan = 0;
let currentActiveSimulationName = null;
let dataBuffer = [];

// Konfigurasi (akan diisi dari file JSON)
let channelConfig = {};
let thingspeakConfig = {};

// ID Interval
let apiPollingIntervalId = null;
let collectDataIntervalId = null;
let batchSaveIntervalId = null;

// Konstanta
const API_POLLING_INTERVAL_MS = 1000;
const MAX_DATA_AGE_MS = 15 * 60 * 1000;
const COLLECT_INTERVAL_MS = 1000;
const BATCH_SAVE_INTERVAL_MS = 30000;

// Inisialisasi untuk Three.js
window.globalGyroData = { x: 0, y: 0, z: 0 };
console.log("[Init] window.globalGyroData diinisialisasi.");

// Objek terpusat untuk menampung semua elemen UI
const UI = {};

// =============================================================
//                    INISIALISASI APLIKASI
// =============================================================

/**
 * Event listener utama yang dijalankan setelah semua elemen HTML dimuat.
 */
document.addEventListener('DOMContentLoaded', () => {
  populateUIObject();
  initializeEventListeners();
  initializeUIState();
  loadAllConfigs();
  checkUserSession();
});

/**
 * Mengisi objek UI dengan semua referensi elemen DOM. Dilakukan sekali untuk efisiensi.
 */
function populateUIObject() {
  UI.toggleSimulation = document.querySelector('#toggle-simulation');
  UI.simulationPopup = document.querySelector('#simulation-popup');
  UI.simulationOverlay = document.querySelector('#popup-overlay');
  UI.saveSimButton = document.querySelector('#save-simulation-btn');
  UI.closePopupButton = document.querySelector('#close-popup-btn');
  UI.simNameInput = document.querySelector('#simulation-name');
  UI.simStatusText = document.querySelector('#simulation-text');
  UI.kemiringanInput = document.querySelector('#kemiringan-input');
  UI.curahHujanInput = document.querySelector('#curah-hujan-input');
  UI.kemiringanButton = document.querySelector('.frame-home-page1-button1');
  UI.curahHujanButton = document.querySelector('.frame-home-page1-button2');
  UI.avgMoistureEl = document.getElementById('average-moisture');
  UI.nilaiKemiringanEl = document.getElementById('nilaiKemiringan');
  UI.nilaiOutputCHujanEl = document.getElementById('nilaiOutputCurahHujan');
  UI.userNameElements = document.querySelectorAll('#user-name');
  UI.openCamBtn = document.getElementById('open-camera-popup-btn');
  UI.closeCamBtn = document.getElementById('close-camera-popup-btn');
  UI.camOverlay = document.querySelector('.camera-popup-overlay');
  UI.camPopup = document.querySelector('.camera-popup');
  UI.iframeStream = document.getElementById('esp32-camera-stream');
  UI.cameraErrorMessage = document.getElementById('camera-error-message');
}

/**
 * Mengatur status awal semua elemen UI saat halaman dimuat.
 */
function initializeUIState() {
  setSimulationControls(false); // Nonaktifkan kontrol input di awal
}

/**
 * Mendaftarkan semua event listener yang dibutuhkan oleh aplikasi.
 */
function initializeEventListeners() {
  if (UI.toggleSimulation) UI.toggleSimulation.addEventListener('change', handleToggleSimulation);
  if (UI.simNameInput) UI.simNameInput.addEventListener('input', handleSimNameInput);
  if (UI.saveSimButton) UI.saveSimButton.addEventListener('click', startAndSaveSimulation);
  if (UI.closePopupButton) UI.closePopupButton.addEventListener('click', closeSimulationPopup);
  if (UI.simulationOverlay) UI.simulationOverlay.addEventListener('click', closeSimulationPopup);
  if (UI.kemiringanButton) UI.kemiringanButton.addEventListener('click', handleKemiringan);
  if (UI.curahHujanButton) UI.curahHujanButton.addEventListener('click', handleCurahHujan);
  if (UI.openCamBtn) UI.openCamBtn.addEventListener('click', openCameraPopup);
  if (UI.closeCamBtn) UI.closeCamBtn.addEventListener('click', closeCameraPopup);

  window.addEventListener('beforeunload', handleBeforeUnload);
  document.querySelectorAll('a').forEach(link => link.addEventListener('click', handleLinkClick));
  document.addEventListener('wheel', (event) => {
    if (event.ctrlKey) event.preventDefault();
  }, { passive: false });
}

// =============================================================
//                FUNGSI PENGELOLA EVENT (EVENT HANDLERS)
// =============================================================

function handleToggleSimulation(event) {
  if (event.target.checked) {
    if (UI.simulationPopup) UI.simulationPopup.style.display = 'block';
    if (UI.simulationOverlay) UI.simulationOverlay.style.display = 'block';
    if (UI.kemiringanInput) UI.kemiringanInput.value = currentKemiringan;
    if (UI.curahHujanInput) UI.curahHujanInput.value = currentCurahHujan;
    console.log("[Simulasi] Mode diaktifkan, membuka popup.");
  } else {
    if (UI.simStatusText) UI.simStatusText.textContent = 'START SIMULATION';
    console.log("[Simulasi] Mode dihentikan.");
    showNotification("Simulasi dihentikan.");
    stopApiPolling();

    clearInterval(collectDataIntervalId);
    clearInterval(batchSaveIntervalId);
    collectDataIntervalId = null;
    batchSaveIntervalId = null;

    if (dataBuffer.length > 0 && currentActiveSimulationName) {
      sendBufferedDataToServer(true);
    } else {
      dataBuffer = [];
    }
    currentActiveSimulationName = null;
    
    fetch('../backend/php/stop_simulation.php', { method: 'POST' })
      .then(response => response.json())
      .then(data => {
        if (data.status === "success") console.log("Panggilan stop_simulation.php berhasil.");
        else console.error("Gagal memanggil stop_simulation.php:", data.message || "");
      })
      .catch(error => console.error("Error saat memanggil stop_simulation.php:", error));
  }
}

function handleSimNameInput() {
    const simulationName = UI.simNameInput.value.trim();
    setSimulationControls(!!simulationName);
}

function closeSimulationPopup() {
    if (UI.simulationPopup) UI.simulationPopup.style.display = 'none';
    if (UI.simulationOverlay) UI.simulationOverlay.style.display = 'none';
    if (UI.toggleSimulation && UI.toggleSimulation.checked && !currentActiveSimulationName) {
        UI.toggleSimulation.checked = false;
        console.log("[Simulasi] Popup ditutup tanpa menyimpan, toggle dimatikan.");
    }
}

function handleKemiringan() {
  const value = parseFloat(UI.kemiringanInput.value);
  if (isNaN(value)) {
    showNotification("Silakan pilih derajat kemiringan yang valid.", 'error');
    return;
  }
  currentKemiringan = value;
  sendAndLogEvent('kemiringan', value);
}

function handleCurahHujan() {
  const value = parseFloat(UI.curahHujanInput.value);
  if (isNaN(value)) {
    showNotification("Silakan masukkan nilai curah hujan yang valid.", 'error');
    return;
  }
  currentCurahHujan = value;
  sendAndLogEvent('curahHujan', value);
}

function handleBeforeUnload(event) {
    if (UI.toggleSimulation && UI.toggleSimulation.checked && currentActiveSimulationName) {
        stopApiPolling();
        clearInterval(collectDataIntervalId);
        clearInterval(batchSaveIntervalId);
        const confirmationMessage = 'Simulasi sedang berjalan. Apakah Anda yakin ingin meninggalkan halaman?';
        event.preventDefault();
        event.returnValue = confirmationMessage;
        return confirmationMessage;
    }
}

function handleLinkClick(event) {
    if (UI.toggleSimulation && UI.toggleSimulation.checked && currentActiveSimulationName) {
        const link = event.currentTarget;
        if (link.closest('.camera-popup') || link.closest('#simulation-popup') || link.getAttribute('href') === '#') {
            return;
        }
        event.preventDefault();
        showNotification("Hentikan simulasi terlebih dahulu untuk berpindah halaman.", 'warning');
    }
}

// =============================================================
//              FUNGSI UTAMA LOGIKA APLIKASI
// =============================================================

async function loadAllConfigs() {
    try {
        const [channelRes, thingspeakRes] = await Promise.all([
            fetch('../backend/assets/js/channel_config.json'),
            fetch('../backend/assets/js/thingspeak_config.json')
        ]);

        if (!channelRes.ok) throw new Error(`Gagal memuat channel_config.json`);
        if (!thingspeakRes.ok) throw new Error(`Gagal memuat thingspeak_config.json`);

        channelConfig = await channelRes.json();
        thingspeakConfig = await thingspeakRes.json();

        console.log("[Config] Semua file konfigurasi berhasil dimuat.");
    } catch (error) {
        console.error("[Config] Error:", error);
        showNotification(`Gagal memuat konfigurasi. Fitur data sensor tidak akan berfungsi.`, 'error');
    }
}

function checkUserSession() {
    fetch("../backend/php/check_session.php")
        .then(response => response.json())
        .then(data => {
            if (data.status !== "success" || !data.session_data) {
                window.location.href = "../public/login.html";
            } else {
                UI.userNameElements.forEach(el => el.innerText = data.session_data.name);
                document.title = `Home Page - ${data.session_data.name}`;
            }
        })
        .catch(error => {
            console.error("Gagal memeriksa session:", error);
            window.location.href = "../public/login.html";
        });
}

function startAndSaveSimulation() {
    if (!UI.toggleSimulation.checked) {
        showNotification('Simulasi harus diaktifkan terlebih dahulu.', 'warning');
        return;
    }
    const simulationName = UI.simNameInput.value.trim();
    if (!simulationName) {
        showNotification('Silakan masukkan nama simulasi.', 'warning');
        return;
    }

    currentActiveSimulationName = simulationName;

    const initialData = {
        simulationName,
        client_timestamp: new Date().toISOString(),
        kelembabanTanah1: currentKelembabanTanah1, kelembabanTanah2: currentKelembabanTanah2,
        kelembabanTanah3: currentKelembabanTanah3, kelembabanTanah4: currentKelembabanTanah4,
        kelembabanTanah5: currentKelembabanTanah5, kelembabanTanah6: currentKelembabanTanah6,
        derajatKemiringan: currentKemiringan, outputKemiringan: currentOutputKemiringan,
        curahHujan: currentCurahHujan, outputCurahHujan: currentOutputCurahHujan
    };

    fetch('../backend/php/save_simulation.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(initialData),
    })
    .then(response => response.json())
    .then(result => {
        if (result.status === "success") {
            showNotification(`Simulasi "${simulationName}" dimulai!`, 'success');
            if (UI.simStatusText) UI.simStatusText.textContent = simulationName;
            
            startApiPolling();
            
            clearInterval(collectDataIntervalId);
            clearInterval(batchSaveIntervalId);
            dataBuffer = [];
            
            collectDataIntervalId = setInterval(collectDataPoint, COLLECT_INTERVAL_MS);
            batchSaveIntervalId = setInterval(() => sendBufferedDataToServer(false), BATCH_SAVE_INTERVAL_MS);
            
            closeSimulationPopup();
        } else {
            throw new Error(result.message || "Gagal memulai simulasi.");
        }
    })
    .catch(error => {
        showNotification(error.message, 'error');
        currentActiveSimulationName = null;
    });
}

function sendAndLogEvent(eventType, eventValue) {
    const dataForDevice = {
        derajatKemiringan: eventType === 'kemiringan' ? eventValue : currentKemiringan,
        curahHujanKontrol: eventType === 'curahHujan' ? eventValue : currentCurahHujan
    };

    fetch("../backend/php/send_to_thingspeak.php", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dataForDevice)
    })
    .then(response => response.json())
    .then(resultSend => {
        if (resultSend.status !== "success") throw new Error(resultSend.message || "Gagal mengirim ke perangkat.");
        
        showNotification(`Pengaturan ${eventType} berhasil dikirim.`, 'success');

        const eventDataForLog = {
            simulationName: currentActiveSimulationName, client_timestamp: new Date().toISOString(),
            kelembabanTanah1: currentKelembabanTanah1, kelembabanTanah2: currentKelembabanTanah2,
            kelembabanTanah3: currentKelembabanTanah3, kelembabanTanah4: currentKelembabanTanah4,
            kelembabanTanah5: currentKelembabanTanah5, kelembabanTanah6: currentKelembabanTanah6,
            derajatKemiringan: dataForDevice.derajatKemiringan, outputKemiringan: currentOutputKemiringan,
            curahHujan: dataForDevice.curahHujanKontrol, outputCurahHujan: currentOutputCurahHujan
        };
        
        return fetch("../backend/php/save_simulation.php", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(eventDataForLog)
        });
    })
    .then(resSave => resSave.json())
    .then(resultSave => {
        if (resultSave.status !== "success") throw new Error(resultSave.message || `Gagal mencatat event.`);
        console.log(`[Event Log] Event ${eventType} berhasil dicatat.`);
    })
    .catch(error => {
        console.error(`[Event Error] Terjadi kesalahan pada proses ${eventType}:`, error);
        showNotification(`Error: ${error.message}`, 'error');
    });
}

// =============================================================
//                FUNGSI-FUNGSI UTILITAS & TAMPILAN
// =============================================================

function setSimulationControls(enabled) {
    if (UI.kemiringanInput) UI.kemiringanInput.disabled = !enabled;
    if (UI.curahHujanInput) UI.curahHujanInput.disabled = !enabled;
    if (UI.kemiringanButton) UI.kemiringanButton.disabled = !enabled;
    if (UI.curahHujanButton) UI.curahHujanButton.disabled = !enabled;
}

function showNotification(message, type = 'info') {
    const options = {
        text: message, duration: 3000, gravity: "top", position: "right", stopOnFocus: true,
    };
    switch (type) {
        case 'success': options.style = { background: "linear-gradient(to right, #00b09b, #96c93d)" }; break;
        case 'error': options.style = { background: "linear-gradient(to right, #ff5f6d, #ffc371)" }; break;
        case 'warning': options.style = { background: "linear-gradient(to right, #f1c40f, #f39c12)" }; break;
    }
    Toastify(options).showToast();
}

function navigateTo(page) {
  if (UI.toggleSimulation && UI.toggleSimulation.checked && currentActiveSimulationName) {
    showNotification("Hentikan simulasi terlebih dahulu untuk logout.", 'warning');
    return;
  }
  if (page === 'logout') {
      fetch('../backend/php/logout.php', { method: 'POST', credentials: 'include' })
      .then(response => response.json())
      .then(data => {
        if (data.status === "success") {
          showNotification('Anda telah berhasil logout.', 'success');
          sessionStorage.clear(); localStorage.clear();
          window.location.href = '../public/login.html';
        } else {
          throw new Error(data.message || 'Logout gagal.');
        }
      })
      .catch(error => {
          console.error("Logout Error:", error);
          showNotification(error.message, 'error');
      });
  }
}

// =================================================================================
// ⭐ PERUBAHAN UTAMA: Fungsi ini sekarang menggunakan `thingspeakConfig`
// =================================================================================
function fetchDataForAllSensors() {
    // Pastikan konfigurasi sudah dimuat
    if (!thingspeakConfig.kelembaban || !thingspeakConfig.kemiringan || !thingspeakConfig.curah_hujan || !thingspeakConfig.kontrol_simulator) {
        console.error("[API Polling] Konfigurasi ThingSpeak tidak lengkap. Polling dibatalkan.");
        processAndDisplaySensorData({ status: 'error', message: 'Konfigurasi ThingSpeak tidak lengkap.' });
        return;
    }

    const currentTime = new Date().getTime();
    const { kelembaban, kemiringan, curah_hujan, kontrol_simulator } = thingspeakConfig;

    // Fetch untuk Kelembaban
    const fetchKelembaban = fetch(`https://api.thingspeak.com/channels/${kelembaban.channel_id}/feeds.json?results=1&api_key=${kelembaban.read_api_key}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error Kelembaban! status: ${response.status}`);
            return response.json();
        });

    // Fetch untuk Kemiringan (Pitch, Yaw, Roll)
    const fetchKemiringan = fetch(`https://api.thingspeak.com/channels/${kemiringan.channel_id}/feeds.json?results=1&api_key=${kemiringan.read_api_key}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error Kemiringan! status: ${response.status}`);
            return response.json();
        });

    // Fetch untuk Curah Hujan
    const fetchCurahHujan = fetch(`https://api.thingspeak.com/channels/${curah_hujan.channel_id}/fields/${curah_hujan.fields.input}.json?results=1&api_key=${curah_hujan.read_api_key}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error Curah Hujan! status: ${response.status} - ${response.statusText}`);
            return response.json();
        });

    // Fetch untuk Notifikasi (dari Channel Kontrol Simulator)
    const fetchNotifikasi = fetch(`https://api.thingspeak.com/channels/${kontrol_simulator.channel_id}/fields/${kontrol_simulator.fields.alert_longsor}.json?results=1&api_key=${kontrol_simulator.read_api_key}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error Notifikasi! status: ${response.status}`);
            return response.json();
        });

    Promise.all([fetchKelembaban, fetchKemiringan, fetchCurahHujan, fetchNotifikasi])
        .then(([dataKelembaban, dataKemiringan, dataCurahHujan, dataNotifikasi]) => {
            if (dataNotifikasi && dataNotifikasi.feeds && dataNotifikasi.feeds.length > 0) {
                const feed = dataNotifikasi.feeds[0];
                const notifikasiLongsor = feed[`field${kontrol_simulator.fields.alert_longsor}`];

                if (notifikasiLongsor == '1') {
                    console.log("!!! PERINGATAN: Notifikasi longsor diterima dari Channel Notifikasi !!!");
                    stopApiPolling();
                    alert('⚠ PERGERAKAN TANAH TERDETEKSI! Simulasi akan dihentikan secara otomatis.');
                    if (toggleSimulation) {
                        toggleSimulation.checked = false;
                        toggleSimulation.dispatchEvent(new Event('change'));
                    }
                    return;
                }
            }
            let kelembabanFields = {
                sensor1: null, sensor2: null, sensor3: null,
                sensor4: null, sensor5: null, sensor6: null
            };
            let kemiringanValue = null;
            let yawValue = null;
            let rollValue = null;
            let curahHujanValue = null;
            let latestValidTimestamp = null;

            if (dataKelembaban.feeds && dataKelembaban.feeds.length > 0) {
                const feed = dataKelembaban.feeds[0];
                if (currentTime - Date.parse(feed.created_at) <= MAX_DATA_AGE_MS) {
                    kelembabanFields = { sensor1: feed.field1, sensor2: feed.field2, sensor3: feed.field3, sensor4: feed.field4, sensor5: feed.field5, sensor6: feed.field6 };
                    latestValidTimestamp = feed.created_at;
                }
            }

            if (dataKemiringan.feeds && dataKemiringan.feeds.length > 0) {
                const feed = dataKemiringan.feeds[0];
                if (currentTime - Date.parse(feed.created_at) <= MAX_DATA_AGE_MS) {
                    kemiringanValue = feed[`field${kemiringan.fields.pitch}`];
                    yawValue = feed[`field${kemiringan.fields.yaw}`];
                    rollValue = feed[`field${kemiringan.fields.roll}`];
                    if (!latestValidTimestamp || new Date(feed.created_at) > new Date(latestValidTimestamp)) {
                        latestValidTimestamp = feed.created_at;
                    }
                }
            }
            
            if (dataCurahHujan.feeds && dataCurahHujan.feeds.length > 0) {
                const feed = dataCurahHujan.feeds[0];
                const dataTimestamp = Date.parse(feed.created_at);
                if (currentTime - dataTimestamp <= MAX_DATA_AGE_MS) {
                    curahHujanValue = feed[`field${curah_hujan.fields.input}`];
                    if (!latestValidTimestamp || new Date(feed.created_at) > new Date(latestValidTimestamp)) {
                        latestValidTimestamp = feed.created_at;
                    }
                    console.log("[API Polling] Data curah hujan diterima dan valid.");
                } else {
                    console.log(`[API Polling] Data curah hujan basi (timestamp: ${feed.created_at}). Tidak digunakan.`);
                }
            } else if (dataCurahHujan.channel && dataCurahHujan.channel[`field${curah_hujan.fields.input}`] && dataCurahHujan.channel.updated_at) {
                const dataTimestamp = Date.parse(dataCurahHujan.channel.updated_at);
                if (currentTime - dataTimestamp <= MAX_DATA_AGE_MS) {
                    curahHujanValue = dataCurahHujan.channel[`field${curah_hujan.fields.input}`];
                     if (!latestValidTimestamp || new Date(dataCurahHujan.channel.updated_at) > new Date(latestValidTimestamp)) {
                        latestValidTimestamp = dataCurahHujan.channel.updated_at;
                    }
                    console.log("[API Polling] Data curah hujan (dari channel fallback) diterima dan valid.");
                } else {
                     console.log(`[API Polling] Data curah hujan (dari channel fallback) basi. Tidak digunakan.`);
                }
            } else {
                 console.log(`[API Polling] Tidak ada feeds atau fallback data curah hujan.`);
            }

            let apiResponse = {
                status: 'success',
                kelembaban: {
                    sensor1: parseFloat(kelembabanFields.sensor1) || currentKelembabanTanah1,
                    sensor2: parseFloat(kelembabanFields.sensor2) || currentKelembabanTanah2,
                    sensor3: parseFloat(kelembabanFields.sensor3) || currentKelembabanTanah3,
                    sensor4: parseFloat(kelembabanFields.sensor4) || currentKelembabanTanah4,
                    sensor5: parseFloat(kelembabanFields.sensor5) || currentKelembabanTanah5,
                    sensor6: parseFloat(kelembabanFields.sensor6) || currentKelembabanTanah6,
                },
                kemiringan: parseFloat(kemiringanValue) || currentOutputKemiringan,
                yaw: parseFloat(yawValue) || currentOutputYaw,
                roll: parseFloat(rollValue) || currentOutputRoll,
                curahHujan: parseFloat(curahHujanValue) || currentOutputCurahHujan,
                timestamp: latestValidTimestamp || new Date().toISOString()
            };
            processAndDisplaySensorData(apiResponse);
        })
        .catch(error => {
            console.error("[API Polling] Error mengambil data sensor gabungan:", error);
            if (error.message && (error.message.includes("429") || error.message.toLowerCase().includes("too many requests"))) {
                console.warn("[API Polling] Rate limit terdeteksi dari ThingSpeak. Menghentikan polling API.");
                stopApiPolling();
                alert("Terlalu banyak permintaan ke server sensor. Pengambilan data otomatis dihentikan sementara. Coba lagi nanti atau perpanjang interval polling di kode.");
            }
            processAndDisplaySensorData({ status: 'error', message: error.message });
        });
}
// =================================================================================


function startApiPolling() {
    if (!(toggleSimulation && toggleSimulation.checked && currentActiveSimulationName)) {
        console.log("[API Polling] Polling tidak dimulai, simulasi tidak aktif atau nama belum diatur.");
        return;
    }
    if (apiPollingIntervalId) {
        console.log("[API Polling] Polling sudah berjalan.");
        return;
    }
    console.log(`[API Polling] Memulai polling API ThingSpeak setiap ${API_POLLING_INTERVAL_MS / 1000} detik (karena simulasi aktif).`);
    fetchDataForAllSensors();
    apiPollingIntervalId = setInterval(fetchDataForAllSensors, API_POLLING_INTERVAL_MS);
}

function stopApiPolling() {
    if (apiPollingIntervalId) {
        clearInterval(apiPollingIntervalId);
        apiPollingIntervalId = null;
        console.log("[API Polling] Polling API ThingSpeak dihentikan.");
    }
}

function collectDataPoint() {
    if (toggleSimulation && toggleSimulation.checked && currentActiveSimulationName) {
        const dataPoint = {
            client_timestamp: new Date().toISOString(),
            kelembabanTanah1: currentKelembabanTanah1,
            kelembabanTanah2: currentKelembabanTanah2,
            kelembabanTanah3: currentKelembabanTanah3,
            kelembabanTanah4: currentKelembabanTanah4,
            kelembabanTanah5: currentKelembabanTanah5,
            kelembabanTanah6: currentKelembabanTanah6,
            outputKemiringan: currentOutputKemiringan,
            outputCurahHujan: currentOutputCurahHujan
        };
        dataBuffer.push(dataPoint);
    }
}

function sendBufferedDataToServer(isFinalSend = false) {
    const toggleIsChecked = toggleSimulation ? toggleSimulation.checked : false;

    if (dataBuffer.length > 0 && (toggleIsChecked || isFinalSend) && currentActiveSimulationName) {
        const dataToSend = {
            simulationName: currentActiveSimulationName,
            derajatKemiringanInput: currentKemiringan,
            curahHujanInput: currentCurahHujan,
            dataPoints: [...dataBuffer]
        };

        const bufferSizeBeforeSending = dataBuffer.length;
        dataBuffer = [];

        console.log(`[Batch Send] Mengirim batch berisi ${bufferSizeBeforeSending} titik data untuk simulasi "${dataToSend.simulationName}"...`);

        fetch('../backend/php/save_simulation_batch.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend)
        })
        .then(response => response.json())
        .then(result => {
            if (result.status === "success") {
                console.log(`[Batch Send] Batch data (${bufferSizeBeforeSending} titik) berhasil dikirim dan disimpan.`);
            } else {
                console.error(`[Batch Send] Gagal mengirim/menyimpan batch data: ${result.message}. Data yang gagal dikirim:`, dataToSend.dataPoints);
            }
        })
        .catch(error => {
            console.error("[Batch Send] Error fetch saat mengirim batch data:", error, ". Data yang gagal dikirim:", dataToSend.dataPoints);
        });
    } else if (dataBuffer.length > 0 && !currentActiveSimulationName && isFinalSend) {
         console.warn("[Batch Send] Buffer memiliki data tetapi tidak ada nama simulasi aktif untuk pengiriman terakhir. Buffer dikosongkan.");
         dataBuffer = [];
    }

    if (!toggleIsChecked && !isFinalSend) {
        if (batchSaveIntervalId) {
            clearInterval(batchSaveIntervalId); batchSaveIntervalId = null;
            console.log("[Batch Send] Interval pengiriman batch dihentikan karena simulasi tidak aktif (failsafe).");
        }
        if (collectDataIntervalId) {
            clearInterval(collectDataIntervalId); collectDataIntervalId = null;
            console.log("[Data Collection] Interval pengumpulan data dihentikan karena simulasi tidak aktif (failsafe).");
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("[Init] Polling API dan koleksi data tidak dimulai otomatis. Aktifkan simulasi & simpan nama untuk memulai.");

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      console.log("[Page Visibility] Tab tidak aktif.");
      if (toggleSimulation && toggleSimulation.checked && currentActiveSimulationName) {
          console.log("[Page Visibility] Simulasi aktif, polling API dihentikan sementara saat tab tidak aktif.");
          stopApiPolling();
      }
    } else {
      console.log("[Page Visibility] Tab aktif.");
      if (toggleSimulation && toggleSimulation.checked && currentActiveSimulationName) {
        console.log("[Page Visibility] Simulasi aktif, polling API dimulai kembali saat tab aktif.");
        startApiPolling();
      }
    }
  });
});

function updateMainIndicator(average) {
  const element = document.querySelector('.frame-home-page1-humidity1');
  if (!element) return;
  element.classList.remove('dry', 'moderate', 'wet', 'error');
  if (isNaN(average) || average === null) {
      element.classList.add('error');
  } else if (average < 30) {
      element.classList.add('dry');
  } else if (average < 70) {
      element.classList.add('moderate');
  } else {
      element.classList.add('wet');
  }
}

function updateIndividualSensors(sensors) {
  for (let i = 1; i <= 6; i++) {
    const sensorElement = document.getElementById(`sensor-${i}`);
    if (sensorElement) {
      const value = parseFloat(sensors[`sensor${i}`]);
      const dotElement = sensorElement.querySelector('.sensor-dot');
      const valueElement = sensorElement.querySelector('.sensor-value');
      
      if (!dotElement || !valueElement) continue;
      
      dotElement.className = 'sensor-dot';
      if (isNaN(value) || value === null) {
           valueElement.textContent = `ERR`;
           dotElement.classList.add('error');
      } else {
        valueElement.textContent = `${value}%`;
        if (value < 30) dotElement.classList.add('dry');
        else if (value < 70) dotElement.classList.add('moderate');
        else dotElement.classList.add('wet');
      }
    }
  }
}

document.querySelectorAll('.sensor-point').forEach(sensor => {
  sensor.addEventListener('click', function() {
    const sensorId = this.id.split('-')[1];
    const valueElement = this.querySelector('.sensor-value');
    const currentValue = valueElement ? valueElement.textContent : 'N/A';
    console.log(`Detail Sensor ${sensorId}\nNilai saat ini: ${currentValue}`);
  });
});

function resetAlarmStatusOnServer() {
    console.log("[Reset Alarm] Mengirim permintaan untuk mereset status alarm di ThingSpeak...");
    // NOTE: Backend script 'reset_alarm_status.php' akan menggunakan kredensial
    // untuk mereset alarm di Channel "Kontrol Simulator".
    fetch('../backend/php/reset_alarm_status.php', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                console.log("[Reset Alarm] Server mengonfirmasi status alarm telah di-reset.");
            } else {
                console.error("[Reset Alarm] Gagal mereset status alarm:", data.message);
            }
        })
        .catch(error => {
            console.error("[Reset Alarm] Error saat mengirim permintaan reset:", error);
        });
}

// Coba Notifikasi Baru
function showNotification(message, type = 'info') {
    const options = {
        text: message,
        duration: 3000,
        gravity: "top", // `top` or `bottom`
        position: "right", // `left`, `center` or `right`
        stopOnFocus: true, // Prevents dismissing of toast on hover
    };

    switch (type) {
        case 'success':
            options.style = { background: "linear-gradient(to right, #00b09b, #96c93d)" };
            break;
        case 'error':
            options.style = { background: "linear-gradient(to right, #ff5f6d, #ffc371)" };
            break;
        case 'warning':
            options.style = { background: "linear-gradient(to right, #f1c40f, #f39c12)" };
            break;
    }

    Toastify(options).showToast();
}