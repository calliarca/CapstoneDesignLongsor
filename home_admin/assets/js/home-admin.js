// Deklarasikan variabel di global scope
let toggleSimulation;
let currentKemiringan = 0; // Simpan nilai derajat kemiringan (INPUT PENGGUNA)
let currentCurahHujan = 0; // Simpan nilai curah hujan (INPUT PENGGUNA)

// Variabel untuk menyimpan data sensor aktual dari ThingSpeak/Polling
let currentKelembabanTanah1 = 0;
let currentKelembabanTanah2 = 0;
let currentKelembabanTanah3 = 0;
let currentKelembabanTanah4 = 0;
let currentKelembabanTanah5 = 0;
let currentKelembabanTanah6 = 0;
let currentOutputKemiringan = 0; // Data sensor kemiringan aktual (dari device/polling)
let currentOutputCurahHujan = 0;  // Data sensor curah hujan aktual (dari device/polling)

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


// --- PENGATURAN CHANNEL ID & FIELD UNTUK API POLLING ---
const CHANNEL_ID_KELEMBABAN_API = "2843704";
const READ_API_KEY_KELEMBABAN = "ZVBZD7YQNNEJR1U1";

const CHANNEL_ID_KEMIRINGAN_API = "2889619";
const READ_API_KEY_KEMIRINGAN = "VHCFV8DETRRXRGCN";
const KEMIRINGAN_FIELD_NUMBER_API = '2';

const CHANNEL_ID_CURAH_HUJAN_API = "2972562";
const READ_API_KEY_CURAHHUJAN = "46I76YZ62FSW76YF";
const CURAH_HUJAN_FIELD_NUMBER_API = '1';


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
        alert("Simulasi dihentikan."); // ALERT SAAT SIMULASI BERHENTI
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
        alert('Simulasi harus diaktifkan terlebih dahulu untuk memulai sesi.');
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
            alert(`Simulasi "${simulationName}" dimulai!`); // ALERT SAAT SIMULASI DIMULAI
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
            alert("Gagal memulai simulasi: " + result.message);
            currentActiveSimulationName = null; 
          }
        })
        .catch(error => {
            console.error("Error saving initial simulation data:", error);
            alert("Error memulai simulasi: " + error.message);
            currentActiveSimulationName = null; 
        });
      } else {
          console.warn('Silakan masukkan nama simulasi.');
          alert('Silakan masukkan nama simulasi.');
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
        alert("Simulasi sedang berjalan. Hentikan simulasi terlebih dahulu untuk berpindah halaman.");
      }
    });
  });
});

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
          sessionStorage.clear(); localStorage.clear(); window.location.href = 'login';
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

function handleKemiringan() {
  if (!toggleSimulation || !toggleSimulation.checked) {
    console.warn("Simulasi harus aktif untuk mengirim pengaturan kemiringan."); 
    alert("Simulasi harus aktif untuk mengirim pengaturan kemiringan.");
    return;
  }
  const kemiringanInputElement = document.querySelector("#kemiringan-input");
  if (!currentActiveSimulationName) { 
    console.warn("Sesi simulasi belum aktif (nama belum disimpan). Silakan mulai dan simpan nama simulasi."); 
    alert("Sesi simulasi belum aktif. Silakan mulai dan simpan nama simulasi.");
    return; 
  }
  
  const selectedValue = kemiringanInputElement ? kemiringanInputElement.value : "";
  if (selectedValue === "" || selectedValue === null || isNaN(parseFloat(selectedValue))) {
    console.warn("Silakan masukkan atau pilih derajat kemiringan yang valid."); 
    alert("Silakan masukkan atau pilih derajat kemiringan yang valid.");
    return;
  }
  
  const kemiringanToDevice = parseFloat(selectedValue);
  const dataToSend = {
      derajatKemiringan: kemiringanToDevice,
      curahHujanKontrol: currentCurahHujan 
  };

  console.log("[Kontrol Kemiringan] Mengirim ke ThingSpeak:", dataToSend);
  fetch("../backend/php/send_to_thingspeak.php", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dataToSend)
  })
  .then(response => response.json())
  .then(resultSend => {
    if (resultSend.status === "success") {
      console.log("Pengaturan kemiringan berhasil dikirim ke ThingSpeak.");
      alert("Pengaturan kemiringan berhasil dikirim ke perangkat."); // ALERT SUKSES KIRIM

      if (currentActiveSimulationName) {
        const eventData = {
            simulationName: currentActiveSimulationName,
            client_timestamp: new Date().toISOString(),
            kelembabanTanah1: currentKelembabanTanah1, kelembabanTanah2: currentKelembabanTanah2,
            kelembabanTanah3: currentKelembabanTanah3, kelembabanTanah4: currentKelembabanTanah4,
            kelembabanTanah5: currentKelembabanTanah5, kelembabanTanah6: currentKelembabanTanah6,
            derajatKemiringan: kemiringanToDevice, 
            outputKemiringan: currentOutputKemiringan, 
            curahHujan: currentCurahHujan, 
            outputCurahHujan: currentOutputCurahHujan 
        };
        console.log("[Event Log] Mencatat event perubahan kemiringan ke database:", eventData);
        fetch("../backend/php/save_simulation.php", { 
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(eventData)
        })
        .then(resSave => resSave.json())
        .then(resultSave => {
            if (resultSave.status === "success") {
                console.log("[Event Log] Event perubahan kemiringan berhasil dicatat.");
            } else {
                console.error("[Event Log] Gagal mencatat event perubahan kemiringan:", resultSave.message);
                alert("Gagal mencatat event perubahan kemiringan di server: " + resultSave.message); // ALERT GAGAL LOGGING
            }
        })
        .catch(errorSave => {
            console.error("[Event Log] Error saat mencatat event perubahan kemiringan:", errorSave);
            alert("Error saat mencatat event perubahan kemiringan di server.");
        });
      }
    } else {
        console.error("Gagal mengirim pengaturan kemiringan ke ThingSpeak: " + (resultSend.message || "Unknown error"), resultSend);
        alert("Gagal mengirim pengaturan kemiringan ke perangkat: " + (resultSend.message || "Error tidak diketahui")); // ALERT GAGAL KIRIM
    }
  })
  .catch(error => {
      console.error("Error sending slope setting to ThingSpeak:", error);
      alert("Error jaringan saat mengirim pengaturan kemiringan.");
    });
}

function handleCurahHujan() {
  if (!toggleSimulation || !toggleSimulation.checked) {
    console.warn("Simulasi harus aktif untuk mengirim pengaturan curah hujan."); 
    alert("Simulasi harus aktif untuk mengirim pengaturan curah hujan.");
    return;
  }
  const curahHujanInputElement = document.querySelector('#curah-hujan-input');
  if (!currentActiveSimulationName) { 
    console.warn('Sesi simulasi belum aktif (nama belum disimpan). Silakan mulai dan simpan nama simulasi.'); 
    alert('Sesi simulasi belum aktif. Silakan mulai dan simpan nama simulasi.');
    return; 
  }
  
  if (curahHujanInputElement) {
    const curahHujanValueString = curahHujanInputElement.value;
    if (curahHujanValueString !== "" && curahHujanValueString !== null && !isNaN(parseFloat(curahHujanValueString))) {
      const curahHujanToDevice = parseFloat(curahHujanValueString);
      const dataToSend = {
          derajatKemiringan: currentKemiringan, 
          curahHujanKontrol: curahHujanToDevice
      };
      
      console.log("[Kontrol Curah Hujan] Mengirim ke ThingSpeak:", dataToSend);
      fetch("../backend/php/send_to_thingspeak.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend) 
      })
      .then(response => response.json())
      .then(resultSend => {
        if (resultSend.status === "success") {
          console.log(`Pengaturan curah hujan berhasil dikirim ke ThingSpeak.`);
          alert("Pengaturan curah hujan berhasil dikirim ke perangkat."); // ALERT SUKSES KIRIM
          
           if (currentActiveSimulationName) {
                const eventData = {
                    simulationName: currentActiveSimulationName,
                    client_timestamp: new Date().toISOString(),
                    kelembabanTanah1: currentKelembabanTanah1, kelembabanTanah2: currentKelembabanTanah2,
                    kelembabanTanah3: currentKelembabanTanah3, kelembabanTanah4: currentKelembabanTanah4,
                    kelembabanTanah5: currentKelembabanTanah5, kelembabanTanah6: currentKelembabanTanah6,
                    derajatKemiringan: currentKemiringan, 
                    outputKemiringan: currentOutputKemiringan,
                    curahHujan: curahHujanToDevice,       
                    outputCurahHujan: currentOutputCurahHujan
                };
                console.log("[Event Log] Mencatat event perubahan curah hujan ke database:", eventData);
                fetch("../backend/php/save_simulation.php", { 
                    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(eventData)
                })
                .then(resSave => resSave.json())
                .then(resultSave => {
                    if (resultSave.status === "success") {
                        console.log("[Event Log] Event perubahan curah hujan berhasil dicatat.");
                    } else {
                        console.error("[Event Log] Gagal mencatat event perubahan curah hujan:", resultSave.message);
                        alert("Gagal mencatat event perubahan curah hujan di server: " + resultSave.message); // ALERT GAGAL LOGGING
                    }
                })
                .catch(errorSave => {
                    console.error("[Event Log] Error saat mencatat event perubahan curah hujan:", errorSave);
                    alert("Error saat mencatat event perubahan curah hujan di server.");
                });
           }
        } else {
            console.error(`Gagal mengirim pengaturan curah hujan ke ThingSpeak: ${resultSend.message || 'Unknown error'}`, resultSend);
            alert("Gagal mengirim pengaturan curah hujan ke perangkat: " + (resultSend.message || "Error tidak diketahui")); // ALERT GAGAL KIRIM
        }
      })
      .catch(error => {
          console.error("Error sending rainfall setting to ThingSpeak:", error);
          alert("Error jaringan saat mengirim pengaturan curah hujan.");
        });
    } else {
        console.warn('Silakan masukkan nilai curah hujan yang valid.');
        alert('Silakan masukkan nilai curah hujan yang valid.');
    }
  } else {
      console.error('Input element untuk curah hujan (#curah-hujan-input) tidak ditemukan.');
  }
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
        console.error("Sesi tidak valid, kembali ke login."); window.location.href = "login";
      } else {
        console.log("Sesi valid:", data);
        let userNameElement = document.getElementById("user-name");
        if (userNameElement && data.session_data.name) userNameElement.innerText = data.session_data.name;
        else console.warn("#user-name tidak ditemukan atau nama tidak ada di data sesi!");
      }
    })
    .catch(error => { console.error("Gagal memeriksa session:", error); window.location.href = "login"; });

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

function extractYouTubeVideoId(url) {
    if (!url) return null;
    const regexes = [
        /youtu\.be\/([a-zA-Z0-9_-]{11})/, 
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/, 
        /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/, 
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/, 
        /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/, 
        /googleusercontent\.com\/youtube\.com\/\d+\/([a-zA-Z0-9_-]{11})/ 
    ];
    for (const regex of regexes) {
        const match = url.match(regex);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
}

function openCameraPopup() {
  fetch('../assets/js/camera_config.json')
    .then(response => { if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return response.json(); })
    .then(data => {
      const cameraStreamUrl = data.camera_stream_url;
      const iframeElement = document.getElementById('esp32-camera-stream');
      const errorMessage = document.getElementById('camera-error-message');
      
      if (!iframeElement || !errorMessage) { 
          console.error("Elemen popup kamera (iframe/error message) tidak ditemukan."); return; 
      }
      
      errorMessage.style.display = 'none'; 
      iframeElement.src = 'about:blank'; 

      if (!cameraStreamUrl) {
        errorMessage.textContent = 'URL stream kamera tidak dikonfigurasi.'; 
        errorMessage.style.display = 'block'; 
        if (document.querySelector('.camera-popup')) document.querySelector('.camera-popup').style.display = 'block';
        if (document.querySelector('.camera-popup-overlay')) document.querySelector('.camera-popup-overlay').style.display = 'block';
        return;
      }

      let finalUrl = 'about:blank';
      const videoId = extractYouTubeVideoId(cameraStreamUrl);

      if (videoId) {
          finalUrl = `https://t0.gstatic.com/faviconV2?url=https://www.youtube.com/&client=BARD&type=FAVICON&size=256&fallback_opts=TYPE,SIZE,URL5{videoId}`; 
          console.log(`[Camera] YouTube video ID terdeteksi: ${videoId}. URL embed: ${finalUrl}`);
      } else if (cameraStreamUrl.startsWith("http://") || cameraStreamUrl.startsWith("https://")) {
          finalUrl = cameraStreamUrl;
          console.log(`[Camera] URL stream langsung: ${finalUrl}`);
      } else {
          errorMessage.textContent = 'Format URL kamera tidak valid atau tidak didukung.';
          errorMessage.style.display = 'block';
          console.warn(`[Camera] URL tidak valid atau tidak didukung: ${cameraStreamUrl}`);
      }
      
      if (finalUrl !== 'about:blank') {
        iframeElement.src = finalUrl;
      } else {
         if (errorMessage.style.display === 'none') { 
            errorMessage.textContent = 'URL stream kamera tidak dapat diproses.';
            errorMessage.style.display = 'block';
         }
      }

      if (document.querySelector('.camera-popup')) document.querySelector('.camera-popup').style.display = 'block';
      if (document.querySelector('.camera-popup-overlay')) document.querySelector('.camera-popup-overlay').style.display = 'block';
    })
    .catch(error => {
      console.error('Error fetching camera_config.json:', error);
      const errorMessage = document.getElementById('camera-error-message');
      if(errorMessage){ 
          errorMessage.textContent = 'Gagal mengambil konfigurasi kamera. Pastikan file camera_config.json ada dan valid.'; 
          errorMessage.style.display = 'block';
      }
      if (document.querySelector('.camera-popup')) document.querySelector('.camera-popup').style.display = 'block';
      if (document.querySelector('.camera-popup-overlay')) document.querySelector('.camera-popup-overlay').style.display = 'block';
      const iframeElement = document.getElementById('esp32-camera-stream');
      if(iframeElement) iframeElement.src = 'about:blank';
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
    if (window.globalGyroData) { 
        window.globalGyroData.x = currentOutputKemiringan * (Math.PI / 180); 
    }
    currentOutputCurahHujan = parseFloat(data.curahHujan) || currentOutputCurahHujan || 0;
    
    // Penambahan yang disarankan threejs di home-admin.js
    window.dataFromThingSpeak = {
        kemiringan: currentOutputKemiringan,
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

function fetchDataForAllSensors() {
    const currentTime = new Date().getTime();

    const fetchKelembaban = fetch(`https://api.thingspeak.com/channels/${CHANNEL_ID_KELEMBABAN_API}/feeds.json?results=1&api_key=${READ_API_KEY_KELEMBABAN}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error Kelembaban! status: ${response.status} - ${response.statusText}`);
            return response.json();
        });

    const fetchKemiringan = fetch(`https://api.thingspeak.com/channels/${CHANNEL_ID_KEMIRINGAN_API}/fields/${KEMIRINGAN_FIELD_NUMBER_API}.json?results=1&api_key=${READ_API_KEY_KEMIRINGAN}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error Kemiringan! status: ${response.status} - ${response.statusText}`);
            return response.json();
        });

    const fetchCurahHujan = fetch(`https://api.thingspeak.com/channels/${CHANNEL_ID_CURAH_HUJAN_API}/fields/${CURAH_HUJAN_FIELD_NUMBER_API}.json?results=1&api_key=${READ_API_KEY_CURAHHUJAN}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error Curah Hujan! status: ${response.status} - ${response.statusText}`);
            return response.json();
        });

    Promise.all([fetchKelembaban, fetchKemiringan, fetchCurahHujan])
        .then(([dataKelembaban, dataKemiringan, dataCurahHujan]) => {
            let kelembabanFields = {
                sensor1: null, sensor2: null, sensor3: null, 
                sensor4: null, sensor5: null, sensor6: null
            };
            let kemiringanValue = null;
            let curahHujanValue = null;
            let latestValidTimestamp = null;

            if (dataKelembaban.feeds && dataKelembaban.feeds.length > 0) {
                const feed = dataKelembaban.feeds[0];
                const dataTimestamp = Date.parse(feed.created_at);
                if (currentTime - dataTimestamp <= MAX_DATA_AGE_MS) {
                    kelembabanFields = {
                        sensor1: feed.field1, sensor2: feed.field2, sensor3: feed.field3,
                        sensor4: feed.field4, sensor5: feed.field5, sensor6: feed.field6
                    };
                    latestValidTimestamp = feed.created_at;
                    console.log("[API Polling] Data kelembaban diterima dan valid.");
                } else {
                    console.log(`[API Polling] Data kelembaban basi (timestamp: ${feed.created_at}). Tidak digunakan.`); 
                }
            } else {
                 console.log(`[API Polling] Tidak ada feeds data kelembaban.`); 
            }

            if (dataKemiringan.feeds && dataKemiringan.feeds.length > 0) {
                const feed = dataKemiringan.feeds[0];
                const dataTimestamp = Date.parse(feed.created_at);
                if (currentTime - dataTimestamp <= MAX_DATA_AGE_MS) {
                    kemiringanValue = feed[`field${KEMIRINGAN_FIELD_NUMBER_API}`];
                    if (!latestValidTimestamp || new Date(feed.created_at) > new Date(latestValidTimestamp)) {
                        latestValidTimestamp = feed.created_at;
                    }
                    console.log("[API Polling] Data kemiringan diterima dan valid.");
                } else {
                    console.log(`[API Polling] Data kemiringan basi (timestamp: ${feed.created_at}). Tidak digunakan.`); 
                }
            } else if (dataKemiringan.channel && dataKemiringan.channel[`field${KEMIRINGAN_FIELD_NUMBER_API}`] && dataKemiringan.channel.updated_at) {
                const dataTimestamp = Date.parse(dataKemiringan.channel.updated_at);
                if (currentTime - dataTimestamp <= MAX_DATA_AGE_MS) {
                    kemiringanValue = dataKemiringan.channel[`field${KEMIRINGAN_FIELD_NUMBER_API}`];
                     if (!latestValidTimestamp || new Date(dataKemiringan.channel.updated_at) > new Date(latestValidTimestamp)) {
                        latestValidTimestamp = dataKemiringan.channel.updated_at;
                    }
                    console.log("[API Polling] Data kemiringan (dari channel fallback) diterima dan valid.");
                } else {
                     console.log(`[API Polling] Data kemiringan (dari channel fallback) basi. Tidak digunakan.`); 
                }
            } else {
                console.log(`[API Polling] Tidak ada feeds atau fallback data kemiringan.`); 
            }

            if (dataCurahHujan.feeds && dataCurahHujan.feeds.length > 0) {
                const feed = dataCurahHujan.feeds[0];
                const dataTimestamp = Date.parse(feed.created_at);
                if (currentTime - dataTimestamp <= MAX_DATA_AGE_MS) {
                    curahHujanValue = feed[`field${CURAH_HUJAN_FIELD_NUMBER_API}`];
                    if (!latestValidTimestamp || new Date(feed.created_at) > new Date(latestValidTimestamp)) {
                        latestValidTimestamp = feed.created_at;
                    }
                    console.log("[API Polling] Data curah hujan diterima dan valid.");
                } else {
                    console.log(`[API Polling] Data curah hujan basi (timestamp: ${feed.created_at}). Tidak digunakan.`); 
                }
            } else if (dataCurahHujan.channel && dataCurahHujan.channel[`field${CURAH_HUJAN_FIELD_NUMBER_API}`] && dataCurahHujan.channel.updated_at) {
                const dataTimestamp = Date.parse(dataCurahHujan.channel.updated_at);
                if (currentTime - dataTimestamp <= MAX_DATA_AGE_MS) {
                    curahHujanValue = dataCurahHujan.channel[`field${CURAH_HUJAN_FIELD_NUMBER_API}`];
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
