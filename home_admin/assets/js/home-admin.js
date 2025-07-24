// Deklarasi variabel di global scope
let currentKemiringan = 0;
let currentCurahHujan = 0;
let currentKelembabanTanah1 = 0;
let currentKelembabanTanah2 = 0;
let currentKelembabanTanah3 = 0;
let currentKelembabanTanah4 = 0;
let currentKelembabanTanah5 = 0;
let currentKelembabanTanah6 = 0;
let currentOutputKemiringan = 0;
let currentOutputYaw = 0;
let currentOutputRoll = 0;
let currentOutputCurahHujan = 0;
let isControlBusy = false; // ⭐ BARU: Flag untuk menandai tombol sedang sibuk

// Inisialisasi globalGyroData untuk three_scene.js
window.globalGyroData = { x: 0, y: 0, z: 0 };
console.log("[home-admin.js] window.globalGyroData diinisialisasi:", window.globalGyroData);

// Variabel untuk polling API
let apiPollingIntervalId;
const API_POLLING_INTERVAL_MS = 1000; // Interval polling API ThingSpeak
const MAX_DATA_AGE_MS = 15 * 60 * 1000; // 15 menit dalam milidetik (batas usia data sensor)

// Variabel untuk batch saving & active simulation
let currentActiveSimulationName = null; // Nama simulasi yang sedang aktif
let dataBuffer = []; // Buffer untuk menampung data sensor sebelum dikirim batch
let collectDataIntervalId = null; // ID interval untuk mengumpulkan data ke buffer
let batchSaveIntervalId = null;   // ID interval untuk mengirim batch data
const COLLECT_INTERVAL_MS = 1000;    // Kumpulkan data setiap 1 detik
const BATCH_SAVE_INTERVAL_MS = 30000; // Kirim batch ke server setiap 30 detik

let channelConfig = {}; // Untuk channel_config.json
let thingspeakConfig = {}; // Untuk thingspeak_config.json yang baru

document.addEventListener('DOMContentLoaded', () => {
  toggleSimulation = document.querySelector('#toggle-simulation');
  const simulationPopup = document.querySelector('#simulation-popup');
  const simulationOverlay = document.querySelector('#popup-overlay');
  const saveButton = document.querySelector('#save-simulation-btn');
  const closeButton = document.querySelector('#close-popup-btn');
  const simulationNameInput = document.querySelector('#simulation-name');
  const simulationText = document.querySelector('#simulation-text');
  const kemiringanInput = document.querySelector('#kemiringan-input');
  const curahHujanInput = document.querySelector('#curah-hujan-input');
  const kemiringanButton = document.querySelector('.frame-home-page1-button1');
  const curahHujanButton = document.querySelector('.frame-home-page1-button2');
  

  if (kemiringanInput) kemiringanInput.disabled = true;
  if (curahHujanInput) curahHujanInput.disabled = true;
  if (kemiringanButton) kemiringanButton.disabled = true;
  if (curahHujanButton) curahHujanButton.disabled = true;

  if (simulationNameInput) {
    simulationNameInput.addEventListener('input', () => {
      const simulationName = simulationNameInput.value.trim();
      const enableControls = !!simulationName;
      if (kemiringanInput) kemiringanInput.disabled = !enableControls;
      if (curahHujanInput) curahHujanInput.disabled = !enableControls;
      if (kemiringanButton) kemiringanButton.disabled = !enableControls;
      if (curahHujanButton) curahHujanButton.disabled = !enableControls;
    });
  }

  if (toggleSimulation) {
    toggleSimulation.addEventListener('change', (event) => {
      if (event.target.checked) {
        if (simulationPopup) simulationPopup.style.display = 'block';
        if (simulationOverlay) simulationOverlay.style.display = 'block';
        if (kemiringanInput) kemiringanInput.value = currentKemiringan;
        if (curahHujanInput) curahHujanInput.value = currentCurahHujan;
        console.log("[Simulasi] Mode simulasi diaktifkan via toggle, membuka popup.");
      } else {
        if (simulationPopup) simulationPopup.style.display = 'none';
        if (simulationOverlay) simulationOverlay.style.display = 'none';
        if (simulationText) simulationText.textContent = 'START SIMULATION';
        
        console.log("[Simulasi] Mode simulasi dihentikan via toggle.");
        showNotification("Simulasi dihentikan.");
        stopApiPolling();
        
        console.log("[Simulasi] Menghentikan interval pengumpulan dan pengiriman batch data.");
        if (collectDataIntervalId) {
            clearInterval(collectDataIntervalId);
            collectDataIntervalId = null;
        }
        if (batchSaveIntervalId) {
            clearInterval(batchSaveIntervalId);
            batchSaveIntervalId = null;
        }

        if (dataBuffer.length > 0 && currentActiveSimulationName) {
            console.log("[Simulasi] Simulasi dihentikan. Mengirim batch terakhir dari data buffer...");
            sendBufferedDataToServer(true);
        } else {
            dataBuffer = [];
        }
        currentActiveSimulationName = null;
        
        fetch('../backend/php/stop_simulation.php', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
          if (data.status === "success") console.log("Panggilan stop_simulation.php berhasil.");
          else console.error("Gagal memanggil stop_simulation.php: " + (data.message || ""));
        })
        .catch(error => console.error("Terjadi kesalahan saat memanggil stop_simulation.php:", error));
      }
    });
  }

  if (kemiringanInput) {
    kemiringanInput.addEventListener('input', (event) => {
      const value = parseFloat(event.target.value);
      if (!isNaN(value)) currentKemiringan = value;
    });
  }

  if (curahHujanInput) {
    curahHujanInput.addEventListener('input', (event) => {
      const value = parseFloat(event.target.value);
      if (!isNaN(value)) currentCurahHujan = value;
    });
  }

  if (saveButton) {
    saveButton.addEventListener('click', () => {
      if (!toggleSimulation || !toggleSimulation.checked) {
        console.warn('Simulasi harus aktif (toggle ON) untuk menyimpan data awal dan memulai sesi.');
        
        showNotification("Simulasi harus diaktifkan terlebih dahulu untuk memulai sesi.");
        return;
      }
      const simulationName = simulationNameInput ? simulationNameInput.value.trim() : "";
      if (simulationName) {
        currentActiveSimulationName = simulationName;

        const initialData = {
          simulationName: simulationName,
          client_timestamp: new Date().toISOString(),
          kelembabanTanah1: currentKelembabanTanah1 || 0,
          kelembabanTanah2: currentKelembabanTanah2 || 0,
          kelembabanTanah3: currentKelembabanTanah3 || 0,
          kelembabanTanah4: currentKelembabanTanah4 || 0,
          kelembabanTanah5: currentKelembabanTanah5 || 0,
          kelembabanTanah6: currentKelembabanTanah6 || 0,
          derajatKemiringan: currentKemiringan || 0,
          outputKemiringan: currentOutputKemiringan || 0,
          curahHujan: currentCurahHujan || 0,
          outputCurahHujan: currentOutputCurahHujan || 0
        };
        console.log("Data awal yang dikirim ke backend (save simulation):", initialData);
        fetch('../backend/php/save_simulation.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(initialData),
        })
        .then(response => {
          if (!response.ok) return response.json().then(err => { throw new Error(err.message || 'Failed to save initial simulation data.')});
          return response.json();
        })
        .then(result => {
          if (result.status === "success") {
            console.log(`Simulasi "${simulationName}" berhasil disimpan (data awal)! Memulai polling API dan koleksi data.`);
            showNotification(`Simulasi "${simulationName}" dimulai!`, 'success');
            if (simulationText) simulationText.textContent = simulationName;
          
            startApiPolling();

            if (collectDataIntervalId) clearInterval(collectDataIntervalId);
            if (batchSaveIntervalId) clearInterval(batchSaveIntervalId);
            dataBuffer = [];

            console.log(`[Simulasi] Memulai pengumpulan data periodik untuk "${currentActiveSimulationName}" setiap ${COLLECT_INTERVAL_MS / 1000} detik.`);
            collectDataIntervalId = setInterval(collectDataPoint, COLLECT_INTERVAL_MS);

            console.log(`[Simulasi] Memulai pengiriman batch data periodik setiap ${BATCH_SAVE_INTERVAL_MS / 1000} detik.`);
            batchSaveIntervalId = setInterval(sendBufferedDataToServer, BATCH_SAVE_INTERVAL_MS);
            
            if (simulationPopup) simulationPopup.style.display = 'none';
            if (simulationOverlay) simulationOverlay.style.display = 'none';
          } else {
            console.error("Gagal menyimpan data awal simulasi: " + result.message);
            showNotification("Gagal memulai simulasi: " + result.message, 'error');
            currentActiveSimulationName = null;
          }
        })
        .catch(error => {
            console.error("Error saving initial simulation data:", error);
            showNotification("Error memulai simulasi: " + error.message);
            currentActiveSimulationName = null;
        });
      } else {
          console.warn('Silakan masukkan nama simulasi.');
          showNotification('Silakan masukkan nama simulasi.');
      }
    });
  }

  if (closeButton) {
    closeButton.addEventListener('click', () => {
      if (simulationPopup) simulationPopup.style.display = 'none';
      if (simulationOverlay) simulationOverlay.style.display = 'none';
      if (toggleSimulation && toggleSimulation.checked && !currentActiveSimulationName) {
          toggleSimulation.checked = false;
          console.log("[Simulasi] Popup ditutup tanpa menyimpan nama, toggle dimatikan.");
      }
    });
  }

  if (simulationOverlay) {
    simulationOverlay.addEventListener('click', () => {
      if (simulationPopup) simulationPopup.style.display = 'none';
      if (simulationOverlay) simulationOverlay.style.display = 'none';
      if (toggleSimulation && toggleSimulation.checked && !currentActiveSimulationName) {
          toggleSimulation.checked = false;
          console.log("[Simulasi] Overlay diklik, popup ditutup tanpa menyimpan nama, toggle dimatikan.");
      }
    });
  }

  window.addEventListener('beforeunload', (event) => {
    if (toggleSimulation && toggleSimulation.checked && currentActiveSimulationName) {
        console.log("[Navigasi] Mencoba meninggalkan halaman saat simulasi aktif.");
        
        if (dataBuffer.length > 0) {
             console.warn("[Navigasi] Ada data di buffer. Pengiriman sinkron tidak diimplementasikan untuk beforeunload. Data mungkin hilang jika tab ditutup paksa.");
        }

        stopApiPolling();
        if (collectDataIntervalId) clearInterval(collectDataIntervalId);
        if (batchSaveIntervalId) clearInterval(batchSaveIntervalId);
        console.log("[Navigasi] Polling dan interval batch dihentikan karena akan meninggalkan halaman.");

        const confirmationMessage = 'Simulasi sedang berjalan. Apakah Anda yakin ingin meninggalkan halaman? Data yang belum tersimpan mungkin hilang.';
        event.preventDefault();
        event.returnValue = confirmationMessage;
        return confirmationMessage;
    } else if (toggleSimulation && toggleSimulation.checked && !currentActiveSimulationName) {
        stopApiPolling();
    }
  });

  document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (event) => {
      if (toggleSimulation && toggleSimulation.checked && currentActiveSimulationName) {
        if (link.closest('.camera-popup') || link.closest('#simulation-popup') || link.getAttribute('href') === '#') {
          return;
        }
        event.preventDefault();
        showNotification("Simulasi sedang berjalan. Hentikan simulasi terlebih dahulu untuk berpindah halaman.");
      }
    });
  });
});

// =================================================================================
// ⭐ PERUBAHAN UTAMA: Memuat semua file konfigurasi saat halaman dibuka
// =================================================================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Muat konfigurasi ThingSpeak yang baru
        const responseThingspeak = await fetch('../backend/assets/js/thingspeak_config.json');
        if (!responseThingspeak.ok) throw new Error(`Gagal memuat thingspeak_config.json`);
        thingspeakConfig = await responseThingspeak.json();
        console.log("[Config] Konfigurasi ThingSpeak (thingspeak_config.json) berhasil dimuat:", thingspeakConfig);

    } catch (error) {
        console.error("[Config] Error saat memuat file konfigurasi:", error);
        alert(`Gagal memuat file konfigurasi penting. Fitur pengambilan data sensor tidak akan berfungsi.`);
    }
});
// =================================================================================


document.addEventListener('wheel', function (event) {
  if (event.ctrlKey) event.preventDefault();
}, { passive: false });

function navigateTo(page) {
  if (toggleSimulation && toggleSimulation.checked && currentActiveSimulationName) {
    alert("Simulasi sedang berjalan. Hentikan simulasi terlebih dahulu untuk berpindah halaman atau logout.");
    return;
  }
  switch (page) {
    case 'home': window.location.href = 'index'; break;
    case 'logout':
      fetch('../backend/php/logout.php', { method: 'POST', credentials: 'include' })
      .then(response => response.json())
      .then(data => {
        console.log("Logout Response:", data);
        if (data.status === "success") {
          console.log('Anda telah logout.');
          alert('Anda telah berhasil logout.');
          sessionStorage.clear(); localStorage.clear(); window.location.href = '../public/login.html';
        } else {
            console.error('Logout gagal. Silakan coba lagi.');
            alert('Logout gagal. Silakan coba lagi.');
        }
      })
      .catch(error => {
          console.error("Logout Error:", error);
          alert('Terjadi kesalahan saat logout.');
      });
      break;
    default: console.error('Unknown section: ' + page);
  }
}


function sendAndLogEvent(eventType, eventValue) {
    // 1. Validasi umum (apakah simulasi aktif?)
    if (!toggleSimulation || !toggleSimulation.checked || !currentActiveSimulationName) {
        alert("Simulasi harus aktif dan nama simulasi harus tersimpan untuk mengirim event.");
        console.warn("[Event] Percobaan mengirim event saat simulasi tidak aktif.");
        return;
    }

    // ⭐ BARU: Dapatkan referensi tombol di sini
    const kemiringanButton = document.querySelector('.frame-home-page1-button1');
    const curahHujanButton = document.querySelector('.frame-home-page1-button2');

    // ⭐ PERUBAHAN: Gunakan flag dan class, bukan disabled
    isControlBusy = true;
    if (kemiringanButton) kemiringanButton.classList.add('button-busy');
    if (curahHujanButton) curahHujanButton.classList.add('button-busy');
    showNotification('Mengirim pengaturan ke perangkat...', 'info');

    // 2. Siapkan data untuk dikirim
    const dataForDevice = {
        derajatKemiringan: eventType === 'kemiringan' ? eventValue : currentKemiringan,
        curahHujanKontrol: eventType === 'curahHujan' ? eventValue : currentCurahHujan
    };

    console.log(`[Kontrol ${eventType}] Mengirim ke ThingSpeak:`, dataForDevice);

    // 3. Kirim data ke backend
    fetch("../backend/php/send_to_thingspeak.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataForDevice)
    })
    .then(response => response.json())
    .then(resultSend => {
        if (resultSend.status === "success") {
            console.log(`Pengaturan ${eventType} berhasil dikirim.`);
            showNotification(`Pengaturan ${eventType} berhasil dikirim!`, 'success'); // Ubah alert ke notifikasi

            const eventDataForLog = {
                simulationName: currentActiveSimulationName,
                client_timestamp: new Date().toISOString(),
                kelembabanTanah1: currentKelembabanTanah1,
                kelembabanTanah2: currentKelembabanTanah2,
                kelembabanTanah3: currentKelembabanTanah3,
                kelembabanTanah4: currentKelembabanTanah4,
                kelembabanTanah5: currentKelembabanTanah5,
                kelembabanTanah6: currentKelembabanTanah6,
                derajatKemiringan: dataForDevice.derajatKemiringan,
                outputKemiringan: currentOutputKemiringan,
                curahHujan: dataForDevice.curahHujanKontrol,
                outputCurahHujan: currentOutputCurahHujan
            };
            
            return fetch("../backend/php/save_simulation.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(eventDataForLog)
            });
        } else {
            throw new Error(resultSend.message || "Gagal mengirim pengaturan ke perangkat.");
        }
    })
    .then(resSave => resSave.json())
    .then(resultSave => {
        if (resultSave.status === "success") {
            console.log(`[Event Log] Event perubahan ${eventType} berhasil dicatat.`);
        } else {
            throw new Error(resultSave.message || `Gagal mencatat event ${eventType} di server.`);
        }
    })
    .catch(error => {
        console.error(`[Event Error] Terjadi kesalahan pada proses ${eventType}:`, error);
        showNotification(`Error: ${error.message}`, 'error'); // Ubah alert ke notifikasi
    })
    .finally(() => {
        // ⭐ BARU: Blok ini akan selalu dijalankan
        console.log("Menunggu 16 detik sebelum mengaktifkan tombol kembali...");
        setTimeout(() => {
            // ⭐ PERUBAHAN: Set flag ke false dan hapus class
            isControlBusy = false;
            if (kemiringanButton) kemiringanButton.classList.remove('button-busy');
            if (curahHujanButton) curahHujanButton.classList.remove('button-busy');
            console.log("Tombol kontrol diaktifkan kembali.");

            showNotification("Kontrol siap digunakan kembali.", "success");
        }, 16000); // 16 detik (15 detik limit + 1 detik buffer)
    });
}

function handleKemiringan() {
  // ⭐ BARU: Cek apakah kontrol sedang sibuk
  if (isControlBusy) {
    showNotification("Harap tunggu, perintah sebelumnya sedang diproses.", "warning");
    return;
  }
  
  const inputElement = document.querySelector("#kemiringan-input");
  const value = parseFloat(inputElement.value);
  if (isNaN(value)) {
    alert("Silakan pilih derajat kemiringan yang valid.");
    return;
  }
  sendAndLogEvent('kemiringan', value);
}

// Ganti fungsi lama Anda dengan yang ini
function handleCurahHujan() {
  // ⭐ BARU: Cek apakah kontrol sedang sibuk
  if (isControlBusy) {
    showNotification("Harap tunggu, perintah sebelumnya sedang diproses.", "warning");
    return;
  }

  const inputElement = document.querySelector('#curah-hujan-input');
  const value = parseFloat(inputElement.value);
  if (isNaN(value)) {
    alert("Silakan masukkan nilai curah hujan yang valid.");
    return;
  }
  sendAndLogEvent('curahHujan', value);
}

document.addEventListener("DOMContentLoaded", function () {
  fetch("../backend/php/check_session.php").then(response => response.text())
    .then(text => {
      try { return JSON.parse(text); }
      catch (e) { console.error("Failed to parse session JSON:", text, e); throw new Error("Invalid JSON from check_session.php"); }
    })
    .then(data => {
      console.log("Check Session Response:", data);
      if (data.status !== "success" || !data.session_data) {
        console.error("Sesi tidak valid, kembali ke login."); window.location.href = "../public/login.html";
      } else {
        console.log("Sesi valid:", data);
        let userNameElement = document.getElementById("user-name");
        if (userNameElement && data.session_data.name) userNameElement.innerText = data.session_data.name;
        else console.warn("#user-name tidak ditemukan atau nama tidak ada di data sesi!");
      }
    })
    .catch(error => { console.error("Gagal memeriksa session:", error); window.location.href = "../public/login.html"; });

  fetch("../backend/php/get_name.php").then(response => response.json())
    .then(data => {
      let userNameElement = document.getElementById("user-name");
      if (data.name) {
        document.title = `Home Page - ${data.name}`;
        if (userNameElement) userNameElement.innerText = data.name;
      } else {
        document.title = "Home Page - Guest";
        if (userNameElement) userNameElement.innerText = "Guest";
      }
    })
    .catch(() => {
      document.title = "Home Page - Guest";
      let userNameElement = document.getElementById("user-name");
      if (userNameElement) userNameElement.innerText = "Guest";
    });
});


function openCameraPopup() {
  fetch('../backend/assets/js/camera_config.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Gagal memuat camera_config.json (Status: ${response.status})`);
      }
      return response.json();
    })
    .then(config => {
      const cameraStreamUrl = config.camera_stream_url;
      const iframeElement = document.getElementById('esp32-camera-stream');
      const errorMessage = document.getElementById('camera-error-message');
      
      if (!iframeElement || !errorMessage) {
          console.error("Elemen popup kamera (iframe/error message) tidak ditemukan.");
          return;
      }
      
      errorMessage.style.display = 'none';
      iframeElement.src = 'about:blank';

      if (cameraStreamUrl && cameraStreamUrl.trim() !== '') {
        console.log(`[Camera] Memuat URL dari konfigurasi: ${cameraStreamUrl}`);
        iframeElement.src = cameraStreamUrl;
      } else {
        errorMessage.textContent = 'URL stream kamera tidak ditemukan di file konfigurasi.';
        errorMessage.style.display = 'block';
        console.warn('[Camera] Kunci "camera_stream_url" tidak ada atau kosong di camera_config.json.');
      }

      if (document.querySelector('.camera-popup')) document.querySelector('.camera-popup').style.display = 'block';
      if (document.querySelector('.camera-popup-overlay')) document.querySelector('.camera-popup-overlay').style.display = 'block';
    })
    .catch(error => {
      console.error('Error saat memuat atau memproses camera_config.json:', error);
      const errorMessage = document.getElementById('camera-error-message');
      if (errorMessage) {
          errorMessage.textContent = 'Gagal mengambil konfigurasi kamera. Pastikan file ada dan format JSON-nya benar.';
          errorMessage.style.display = 'block';
      }
      if (document.querySelector('.camera-popup')) document.querySelector('.camera-popup').style.display = 'block';
      if (document.querySelector('.camera-popup-overlay')) document.querySelector('.camera-popup-overlay').style.display = 'block';
      const iframeElement = document.getElementById('esp32-camera-stream');
      if (iframeElement) iframeElement.src = 'about:blank';
    });
}

const openCamBtn = document.getElementById('open-camera-popup-btn');
if(openCamBtn) openCamBtn.addEventListener('click', openCameraPopup);

const closeCamBtn = document.getElementById('close-camera-popup-btn');
if(closeCamBtn) closeCamBtn.addEventListener('click', function () {
  const camOverlay = document.querySelector('.camera-popup-overlay');
  const camPopup = document.querySelector('.camera-popup');
  if (camOverlay) camOverlay.style.display = 'none';
  if (camPopup) camPopup.style.display = 'none';
  const iframeElement = document.getElementById('esp32-camera-stream');
  if (iframeElement) iframeElement.src = 'about:blank';
});

function processAndDisplaySensorData(data) {
  if (data && (data.status === 'success' || data.status === 'empty')) {
    if (data.kelembaban) {
      currentKelembabanTanah1 = parseFloat(data.kelembaban.sensor1) || currentKelembabanTanah1 || 0;
      currentKelembabanTanah2 = parseFloat(data.kelembaban.sensor2) || currentKelembabanTanah2 || 0;
      currentKelembabanTanah3 = parseFloat(data.kelembaban.sensor3) || currentKelembabanTanah3 || 0;
      currentKelembabanTanah4 = parseFloat(data.kelembaban.sensor4) || currentKelembabanTanah4 || 0;
      currentKelembabanTanah5 = parseFloat(data.kelembaban.sensor5) || currentKelembabanTanah5 || 0;
      currentKelembabanTanah6 = parseFloat(data.kelembaban.sensor6) || currentKelembabanTanah6 || 0;
    }
    currentOutputKemiringan = parseFloat(data.kemiringan) || currentOutputKemiringan || 0;
    currentOutputYaw = parseFloat(data.yaw) || currentOutputYaw || 0;
    currentOutputRoll = parseFloat(data.roll) || currentOutputRoll || 0;
    
    if (window.globalGyroData) {
        window.globalGyroData.x = currentOutputKemiringan * (Math.PI / 180); // Pitch
        window.globalGyroData.y = currentOutputYaw * (Math.PI / 180);      // Yaw
        window.globalGyroData.z = currentOutputRoll * (Math.PI / 180);     // Roll
    }
    currentOutputCurahHujan = parseFloat(data.curahHujan) || currentOutputCurahHujan || 0;
    
    window.dataFromThingSpeak = {
        kemiringan: currentOutputKemiringan,
        yaw: currentOutputYaw,
        roll: currentOutputRoll,
        curahHujan: currentOutputCurahHujan,
        newData: true
    };

    const sensorsForUI = data.kelembaban || {
        sensor1: currentKelembabanTanah1, sensor2: currentKelembabanTanah2, sensor3: currentKelembabanTanah3,
        sensor4: currentKelembabanTanah4, sensor5: currentKelembabanTanah5, sensor6: currentKelembabanTanah6
    };
    const moistureValues = Object.values(sensorsForUI).map(v => parseFloat(v)).filter(v => !isNaN(v));
    const averageMoisture = moistureValues.length > 0 ? Math.round(moistureValues.reduce((a,b) => a+b,0)/moistureValues.length*10)/10 : 0;
    
    const avgMoistureEl = document.getElementById('average-moisture');
    if (avgMoistureEl) avgMoistureEl.textContent = averageMoisture;
    updateMainIndicator(averageMoisture);
    updateIndividualSensors(sensorsForUI);

    const nilaiKemiringanEl = document.getElementById('nilaiKemiringan');
    if (nilaiKemiringanEl) nilaiKemiringanEl.textContent = currentOutputKemiringan;
    
    const nilaiOutputCHujanEl = document.getElementById('nilaiOutputCurahHujan');
    if (nilaiOutputCHujanEl) nilaiOutputCHujanEl.textContent = currentOutputCurahHujan;

  } else {
    console.error("Error dalam data untuk pembaruan UI atau data tidak ada:", data ? data.message : "No data received", data);
    const avgMoistureEl = document.getElementById('average-moisture');
    if (avgMoistureEl) avgMoistureEl.textContent = 'ERR';
    updateMainIndicator(NaN);
    updateIndividualSensors({sensor1:NaN, sensor2:NaN, sensor3:NaN, sensor4:NaN, sensor5:NaN, sensor6:NaN});


    const nilaiKemiringanEl = document.getElementById('nilaiKemiringan');
    if (nilaiKemiringanEl) nilaiKemiringanEl.textContent = 'ERR';
    const nilaiOutputCHujanEl = document.getElementById('nilaiOutputCurahHujan');
    if (nilaiOutputCHujanEl) nilaiOutputCHujanEl.textContent = 'ERR';
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

// document.addEventListener("DOMContentLoaded", () => {
//   console.log("[Init] Polling API dan koleksi data tidak dimulai otomatis. Aktifkan simulasi & simpan nama untuk memulai.");

//   document.addEventListener("visibilitychange", () => {
//     if (document.hidden) {
//       console.log("[Page Visibility] Tab tidak aktif.");
//       if (toggleSimulation && toggleSimulation.checked && currentActiveSimulationName) {
//           console.log("[Page Visibility] Simulasi aktif, polling API dihentikan sementara saat tab tidak aktif.");
//           stopApiPolling();
//       }
//     } else {
//       console.log("[Page Visibility] Tab aktif.");
//       if (toggleSimulation && toggleSimulation.checked && currentActiveSimulationName) {
//         console.log("[Page Visibility] Simulasi aktif, polling API dimulai kembali saat tab aktif.");
//         startApiPolling();
//       }
//     }
//   });
// });

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