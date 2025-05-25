// Deklarasikan variabel di global scope
let toggleSimulation;
let currentKemiringan = 0; // Simpan nilai derajat kemiringan
let currentCurahHujan = 0; // Simpan nilai curah hujan
let currentKelembabanTanah = 0;// Simpan nilai kelembaban tanah
let currentKelembabanTanah1 = 0;
let currentKelembabanTanah2 = 0;
let currentKelembabanTanah3 = 0;
let currentKelembabanTanah4 = 0;
let currentKelembabanTanah5 = 0;
let currentKelembabanTanah6 = 0;
let currentOutputKemiringan = 0;
let currentOutputCurahHujan = 0;
let currentActiveSimulationName = null;
let dataBuffer = []; // Untuk menampung data sensor sebelum dikirim batch
let collectDataIntervalId = null; // ID interval untuk mengumpulkan data ke buffer
let batchSaveIntervalId = null;   // ID interval untuk mengirim batch data


let pollingInterval; // Variabel untuk menyimpan interval ID

// === UNTUK GIRO THREE.JS ===
// Pastikan window.globalGyroData diinisialisasi.
// three_scene.js akan membaca dari sini.
if (typeof window.globalGyroData === 'undefined') {
    window.globalGyroData = { x: 0, y: 0, z: 0, updated: false };
}
// === AKHIR UNTUK GIRO ===

document.addEventListener('DOMContentLoaded', () => {
  toggleSimulation = document.querySelector('#toggle-simulation'); // Inisialisasi variabel
  const simulationPopup = document.querySelector('#simulation-popup');
  const simulationOverlay = document.querySelector('#popup-overlay');
  const saveButton = document.querySelector('#save-simulation-btn');
  const closeButton = document.querySelector('#close-popup-btn');
  const simulationNameInput = document.querySelector('#simulation-name');
  const simulationText = document.querySelector('#simulation-text');
  const kemiringanInput = document.querySelector('#kemiringan-input');
  const curahHujanInput = document.querySelector('#curah-hujan-input');
  const kemiringanButton = document.querySelector('.frame-home-page1-button1');
  const curahHujanButton = document.querySelector('.frame-home-page1-button2'); // Pastikan selector ini sesuai

  const COLLECT_INTERVAL_MS = 1000;    // Kumpulkan data setiap 1 detik
  const BATCH_SAVE_INTERVAL_MS = 30000; // Kirim batch ke server setiap 30 detik (sesuaikan)

  // Nonaktifkan input kemiringan dan curah hujan secara default
  if (kemiringanInput) kemiringanInput.disabled = true;
  if (curahHujanInput) curahHujanInput.disabled = true;

    // Panggil MQTT atau polling
  if (typeof mqtt !== 'undefined') {
    connectToThingSpeakMQTT(); // Prioritaskan MQTT
  } else {
    console.log("MQTT.js tidak tersedia, menggunakan fallback polling PHP.");
    pollingInterval = setInterval(updateData, 10000); // Mulai polling
    updateData(); // Panggil sekali di awal
  }

  // Event listener untuk input nama simulasi
  simulationNameInput.addEventListener('input', () => {
    const simulationName = simulationNameInput.value.trim();
    if (simulationName) {
      // Aktifkan input dan tombol jika nama simulasi diisi
      if (kemiringanInput) kemiringanInput.disabled = false;
      if (curahHujanInput) curahHujanInput.disabled = false;
      if (kemiringanButton) kemiringanButton.disabled = false;
      if (curahHujanButton) curahHujanButton.disabled = false;
    } else {
      // Nonaktifkan input dan tombol jika nama simulasi kosong
      if (kemiringanInput) kemiringanInput.disabled = true;
      if (curahHujanInput) curahHujanInput.disabled = true;
      if (kemiringanButton) kemiringanButton.disabled = true;
      if (curahHujanButton) curahHujanButton.disabled = true;
    }
  });

  toggleSimulation.addEventListener('change', (event) => {
    if (event.target.checked) {
      simulationPopup.style.display = 'block'; // Tampilkan popup
      simulationOverlay.style.display = 'block'; // Tampilkan overlay
  
      if (kemiringanInput) kemiringanInput.value = currentKemiringan;
      if (curahHujanInput) curahHujanInput.value = currentCurahHujan;
    } else {
      simulationPopup.style.display = 'none'; // Sembunyikan popup
      simulationOverlay.style.display = 'none'; // Sembunyikan overlay
      simulationText.textContent = 'START SIMULATION'; // Reset teks
  

      if (collectDataIntervalId) {
          clearInterval(collectDataIntervalId);
          collectDataIntervalId = null;
      }
      if (batchSaveIntervalId) {
          clearInterval(batchSaveIntervalId);
          batchSaveIntervalId = null;
      }

      // Kirim sisa data di buffer SEBELUM mereset currentActiveSimulationName
      if (dataBuffer.length > 0 && currentActiveSimulationName) {
          console.log("Simulation stopped. Sending final batch of buffered data...");
          sendBufferedDataToServer(true); // Kirim dengan flag isFinalSend = true
      } else {
          dataBuffer = []; // Pastikan buffer kosong
      }

      currentActiveSimulationName = null; // Reset nama simulasi aktif setelah potensi pengiriman terakhir

  
      // Panggil stop_simulation.php
      fetch('../backend/php/stop_simulation.php', {
        method: 'POST'
      })
      .then(response => response.json())
      .then(data => {
        if (data.status === "success") {
          alert("Simulasi berhasil dihentikan.");
        } else {
          alert("Gagal menghentikan simulasi.");
        }
      })
      .catch(error => {
        console.error("Terjadi kesalahan:", error);
        alert("Terjadi kesalahan saat menghentikan simulasi.");
      });
    }
  });
  
  // Pengecekan jika elemen kemiringan ada
  if (kemiringanInput) {
    kemiringanInput.addEventListener('input', (event) => {
      currentKemiringan = parseFloat(event.target.value); // Update currentKemiringan
    });
  }

  // Pengecekan jika elemen curah hujan ada
  if (curahHujanInput) {
    curahHujanInput.addEventListener('input', (event) => {
      currentCurahHujan = parseFloat(event.target.value); // Update currentCurahHujan
    });
  }

  saveButton.addEventListener('click', () => {
    if (!toggleSimulation.checked) {
      alert('Simulation is turned off. Please turn on the simulation to save data.');
      return; // Hentikan proses jika toggle slider dimatikan
    }
  
    const simulationName = simulationNameInput.value.trim();
  
if (simulationName) {
    const data = {
        simulationName: simulationName,
        client_timestamp: new Date().toISOString(), // <-- TAMBAHKAN INI
        kelembabanTanah1: currentKelembabanTanah1 || 0,
        kelembabanTanah2: currentKelembabanTanah2 || 0,
        kelembabanTanah3: currentKelembabanTanah3 || 0,
        kelembabanTanah4: currentKelembabanTanah4 || 0,
        kelembabanTanah5: currentKelembabanTanah5 || 0,
        kelembabanTanah6: currentKelembabanTanah6 || 0,
        derajatKemiringan: currentKemiringan || 0,      // Input pengguna saat ini
        outputKemiringan: currentOutputKemiringan || 0, // Sensor saat ini
        curahHujan: currentCurahHujan || 0,            // Input pengguna saat ini
        outputCurahHujan: currentOutputCurahHujan || 0 // Sensor saat ini
    };

    console.log(`[${new Date().toLocaleString()}] Mengirim data awal (dengan client_timestamp) untuk simulasi:`, data);
    fetch('../backend/php/save_simulation.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Failed to save simulation data.');
          }
          return response.json();
        })
        .then((result) => {
          if (result.status === "success") {
            alert(`Simulation "${simulationName}" saved successfully!`);
            simulationText.textContent = simulationName;
            currentActiveSimulationName = simulationName; // Set nama simulasi aktif
  
            // Hentikan interval lama jika ada (untuk kebersihan)
            if (collectDataIntervalId) clearInterval(collectDataIntervalId);
            if (batchSaveIntervalId) clearInterval(batchSaveIntervalId);
            dataBuffer = []; // Kosongkan buffer dari sesi sebelumnya

            // Mulai kumpulkan data ke buffer
            collectDataIntervalId = setInterval(collectDataPoint, COLLECT_INTERVAL_MS);

            // Mulai kirim batch data secara periodik
            batchSaveIntervalId = setInterval(sendBufferedDataToServer, BATCH_SAVE_INTERVAL_MS);

            // Hanya menutup popup jika penyimpanan berhasil
            simulationPopup.style.display = 'none';
            simulationOverlay.style.display = 'none';
          } else {
            alert("Error saving simulation: " + result.message);
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          alert("An error occurred while saving the simulation: " + error.message);
        });
    } else {
      alert('Please enter a simulation name.');
      toggleSimulation.checked = false;
    }
  });
  
  // Event listener untuk tombol "Cancel"
  closeButton.addEventListener('click', () => {
    simulationPopup.style.display = 'none'; // Tutup popup
    simulationOverlay.style.display = 'none'; // Sembunyikan overlay
    toggleSimulation.checked = false; // Reset slider ke OFF
  });
  
  // Tutup popup jika overlay di-klik
  simulationOverlay.addEventListener('click', () => {
    simulationPopup.style.display = 'none'; // Tutup popup
    simulationOverlay.style.display = 'none'; // Sembunyikan overlay
    toggleSimulation.checked = false; // Reset slider ke OFF
  });
});

// Disable zooming with scroll
document.addEventListener('wheel', function (event) {
  if (event.ctrlKey) {
    event.preventDefault();
  }
}, { passive: false });

// Fungsi untuk navigasi
function navigateTo(page) {
  switch (page) {
    case 'home':
      window.location.href = 'index'; // Ganti dengan URL tujuan
      break;
    case 'logout':
      fetch('../backend/php/logout.php', {  // Pastikan path sesuai dengan struktur proyek
          method: 'POST',
          credentials: 'include'  // Agar session cookie dikirim ke server
      })
      .then(response => response.json())
      .then(data => {
          console.log("Logout Response:", data); // Debugging
          if (data.status === "success") {
              alert('You have logged out.');
              sessionStorage.clear(); // Hapus sessionStorage
              localStorage.clear();  // Hapus localStorage jika ada
              window.location.href = 'login'; // Redirect ke halaman login
          } else {
              alert('Logout failed. Please try again.');
          }
      })
      .catch(error => console.error("Logout Error:", error));
      break;
    default:
      console.error('Unknown section: ' + page);
  }
}

function handleKemiringan() {
    // Pastikan toggleSimulation sudah diinisialisasi di DOMContentLoaded
    if (!toggleSimulation || !toggleSimulation.checked || !currentActiveSimulationName) {
        alert("Simulasi belum aktif atau nama simulasi belum diatur. Silakan mulai simulasi terlebih dahulu.");
        return;
    }

    const kemiringanInputElement = document.querySelector("#kemiringan-input");
    const selectedValue = kemiringanInputElement.value;

    if (selectedValue === "" || selectedValue === null) {
        alert("Silakan pilih derajat kemiringan.");
        return;
    }

    const newKemiringanValue = parseFloat(selectedValue);
    const tombolKirimKemiringan = document.querySelector('.frame-home-page1-button1'); // Atau ID tombol yang sesuai
    if (tombolKirimKemiringan) tombolKirimKemiringan.disabled = true;

    // 1. Kirim perintah ke ThingSpeak
    console.log(`Mengirim perintah kemiringan ${newKemiringanValue}° ke ThingSpeak...`);
    fetch("../backend/php/send_to_thingspeak.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ derajatKemiringan: newKemiringanValue })
    })
    .then(response => response.json())
    .then(resultSend => {
        if (resultSend.status === "success") {
            alert("Perintah kemiringan berhasil dikirim ke ThingSpeak: " + newKemiringanValue + "°");
            console.log("Respon dari send_to_thingspeak.php:", resultSend);

            // 2. Setelah perintah berhasil dikirim, catat event perubahan ini ke database
            // currentKemiringan (global) seharusnya sudah diupdate oleh event listener inputnya
            // Jika tidak, Anda bisa set di sini: currentKemiringan = newKemiringanValue;
            // Namun, lebih baik jika event listener input yang mengelolanya.

            const eventData = {
                simulationName: currentActiveSimulationName,
                client_timestamp: new Date().toISOString(), // <-- TAMBAHKAN INI
                kelembabanTanah1: currentKelembabanTanah1,
                kelembabanTanah2: currentKelembabanTanah2,
                kelembabanTanah3: currentKelembabanTanah3,
                kelembabanTanah4: currentKelembabanTanah4,
                kelembabanTanah5: currentKelembabanTanah5,
                kelembabanTanah6: currentKelembabanTanah6,
                derajatKemiringan: newKemiringanValue, // Input pengguna yang BARU di-set
                outputKemiringan: currentOutputKemiringan, // Output sensor TERKINI sebelum efek perintah
                curahHujan: currentCurahHujan, // Curah hujan input saat ini (tidak berubah oleh aksi ini)
                outputCurahHujan: currentOutputCurahHujan // Output sensor TERKINI
                // save_simulation.php akan menggunakan NOW() untuk created_at untuk event ini
            };

            console.log("Mencatat event perubahan kemiringan ke database:", eventData);
            fetch("../backend/php/save_simulation.php", { // Menggunakan skrip simpan tunggal
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(eventData)
            })
            .then(resSave => resSave.json())
            .then(resultSave => {
                if (resultSave.status === "success") {
                    console.log("Event perubahan kemiringan berhasil dicatat di database.");
                } else {
                        // Tangani error dari PHP, yang mungkin sekarang termasuk error rate limit dari ThingSpeak
                        alert("Gagal mengirim perintah: " + (resultSend.message || "Error tidak diketahui"));
                        if (resultSend.http_code && resultSend.response === '0') {
                            console.warn("ThingSpeak mungkin menolak update karena rate limit. Respons: 0");
                        }
                    }
            })
            .catch(errorSave => {
                console.error("Error saat mencatat event perubahan kemiringan:", errorSave);
                alert("Terjadi kesalahan saat mencatat perubahan setting kemiringan.");
            });

        } else {
            alert("Gagal mengirim perintah kemiringan ke ThingSpeak: " + resultSend.message);
            console.error("Respon error dari send_to_thingspeak.php:", resultSend);
        }
    })
    .catch(errorSend => {
        console.error("Error fetch saat mengirim perintah kemiringan ke ThingSpeak:", errorSend);
        alert("Terjadi kesalahan jaringan saat mengirim perintah kemiringan.");
    })
    .finally(() => {
    // Aktifkan kembali tombol setelah beberapa saat atau setelah selesai,
    // untuk memberi waktu ThingSpeak memproses atau untuk mencegah spam.
    // Anda bisa menggunakan setTimeout jika ingin jeda tertentu.
    if (tombolKirimKemiringan) {
        setTimeout(() => {
            tombolKirimKemiringan.disabled = false;
        }, 2000); // Contoh: aktifkan kembali setelah 2 detik
                   // Atau Anda bisa menunggu 15 detik jika ingin mengikuti rate limit ThingSpeak
                   // setTimeout(() => { tombolKirimKemiringan.disabled = false; }, 15000);
    }
});
}

function handleCurahHujan() {
    // Pastikan toggleSimulation sudah diinisialisasi di DOMContentLoaded
    if (!toggleSimulation || !toggleSimulation.checked || !currentActiveSimulationName) {
        alert('Simulasi belum aktif atau nama simulasi belum diatur. Silakan mulai simulasi terlebih dahulu.');
        return;
    }

    const curahHujanInputElement = document.querySelector('#curah-hujan-input');
    const curahHujanValue = curahHujanInputElement.value;

    if (curahHujanValue === "" || curahHujanValue === null) {
        alert('Silakan masukkan nilai curah hujan.');
        return;
    }

    const newCurahHujanValue = parseFloat(curahHujanValue);
    if (isNaN(newCurahHujanValue)) {
        alert('Nilai curah hujan tidak valid.');
        return;
    }

    // currentCurahHujan (global) seharusnya sudah diupdate oleh event listener inputnya.
    // Jika tidak, Anda bisa set di sini: currentCurahHujan = newCurahHujanValue;

    const eventData = {
        simulationName: currentActiveSimulationName,
        client_timestamp: new Date().toISOString(), // <-- TAMBAHKAN INI
        kelembabanTanah1: currentKelembabanTanah1,
        kelembabanTanah2: currentKelembabanTanah2,
        kelembabanTanah3: currentKelembabanTanah3,
        kelembabanTanah4: currentKelembabanTanah4,
        kelembabanTanah5: currentKelembabanTanah5,
        kelembabanTanah6: currentKelembabanTanah6,
        derajatKemiringan: currentKemiringan, // Derajat kemiringan input saat ini (tidak berubah oleh aksi ini)
        outputKemiringan: currentOutputKemiringan, // Output sensor TERKINI
        curahHujan: newCurahHujanValue,       // Input pengguna yang BARU di-set
        outputCurahHujan: currentOutputCurahHujan // Output sensor TERKINI
        // save_simulation.php akan menggunakan NOW() untuk created_at untuk event ini
    };

    console.log("Mencatat event perubahan curah hujan ke database:", eventData);
    fetch("../backend/php/save_simulation.php", { // Menggunakan skrip simpan tunggal
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData)
    })
    .then(response => response.json())
    .then(resultSave => {
        if (resultSave.status === "success") {
            console.log("Event perubahan curah hujan berhasil dicatat di database.");
            alert("Perubahan curah hujan berhasil dicatat.");
        } else {
            console.error("Gagal mencatat event perubahan curah hujan:", resultSave.message);
            alert("Gagal mencatat perubahan setting curah hujan ke database: " + resultSave.message);
        }
    })
    .catch(errorSave => {
        console.error("Error saat mencatat event perubahan curah hujan:", errorSave);
        alert("Terjadi kesalahan saat mencatat perubahan setting curah hujan.");
    });
}

function sendDataToBackend(data, type) {
  fetch('../backend/php/save_simulation.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.status === "success") {
        // Tampilkan pesan sesuai jenis data
        if (type === 'kemiringan') {
          alert('Nilai kemiringan berhasil diinput.');
        } else if (type === 'curahHujan') {
          alert('Nilai curah hujan berhasil diinput.');
        } else {
          alert(`Data berhasil disimpan: ${JSON.stringify(data)}`);
        }
      } else {
        alert("Error: " + result.message);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Terjadi kesalahan saat mengirim data.");
    });
}

document.addEventListener("DOMContentLoaded", function () {
      fetch("../backend/php/check_session.php")
      .then(response => response.text()) // Ambil teks mentah sebelum parsing JSON
      .then(text => {
          console.log("Raw response:", text); // Lihat output asli
          return JSON.parse(text); // Coba parse JSON
      })
      .then(data => {
          console.log("Check Session Response:", data);
          if (data.status !== "success") {
              console.error("Session tidak valid, kembali ke login.");
              window.location.href = "login";
          } else {
              console.log("Session valid:", data);
              let userNameElement = document.getElementById("user-name");
              if (userNameElement) {
                  userNameElement.innerText = data.session_data.name;
              } else {
                  console.warn("Elemen #user-name tidak ditemukan!");
              }
          }
      })
      .catch(error => {
          console.error("Gagal memeriksa session:", error);
          window.location.href = "login";
      });

  // Set nama user di title
  fetch("../backend/php/get_name.php")
      .then(response => response.json())
      .then(data => {
          let userNameElement = document.getElementById("user-name");
          if (data.name) {
              document.title = `Home Page - ${data.name}`;
              if (userNameElement) {
                  userNameElement.innerText = data.name;
              }
          } else {
              document.title = "Home Page - Guest";
              if (userNameElement) {
                  userNameElement.innerText = "Guest";
              }
          }
      })
      .catch(() => {
          document.title = "Home Page - Guest";
          let userNameElement = document.getElementById("user-name");
          if (userNameElement) {
              userNameElement.innerText = "Guest";
          }
      });
});

document.addEventListener('DOMContentLoaded', () => {
  // Pastikan toggleSimulation ada dan berfungsi
  toggleSimulation = document.querySelector('#toggle-simulation');

  // Mencegah navigasi saat simulasi berjalan
  window.addEventListener('beforeunload', (event) => {
    if (toggleSimulation.checked) {
      // Tampilkan pesan konfirmasi saat pengguna mencoba keluar dari halaman
      event.preventDefault();
      event.returnValue = ''; // Pesan konfirmasi harus ada untuk beberapa browser
    }
  });

  // Jika Anda juga ingin mencegah perubahan halaman lain, misalnya menggunakan tombol back atau tautan
  document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (event) => {
      if (toggleSimulation.checked) {
        event.preventDefault(); // Cegah navigasi jika simulasi berjalan
        alert("Simulasi sedang berjalan. Anda tidak bisa berpindah halaman saat ini.");
      }
    });
  });
});


// Fungsi untuk membuka popup kamera dan mengambil URL stream dari camera_config.json
function openCameraPopup() {
  fetch('../assets/js/camera_config.json')
    .then(response => response.json())
    .then(data => {
      const cameraStreamUrl = data.camera_stream_url;
      const iframeElement = document.getElementById('esp32-camera-stream');
      const errorMessage = document.getElementById('camera-error-message');

      errorMessage.style.display = 'none';

      // Deteksi apakah URL adalah YouTube
      if (cameraStreamUrl.includes("youtube.com") || cameraStreamUrl.includes("youtu.be")) {
        // Menggunakan regex untuk mengekstrak video ID dari URL YouTube
        const videoIdMatch = cameraStreamUrl.match(/(?:youtube\.com\/(?:[^/]+\/.*\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (videoIdMatch && videoIdMatch[1]) {
          const videoId = videoIdMatch[1];
          iframeElement.src = `https://www.youtube.com/embed/${videoId}`;
        } else {
          errorMessage.textContent = 'URL YouTube tidak valid.';
          errorMessage.style.display = 'block';
          return;
        }
      } else {
        iframeElement.src = cameraStreamUrl;
      }

      document.querySelector('.camera-popup-overlay').style.display = 'block';
      document.querySelector('.camera-popup').style.display = 'block';
    })
    .catch(error => {
      console.error('Error fetching camera config:', error);
      alert('Gagal mengambil konfigurasi kamera dari file JSON.');
    });
}


// Ketika tombol 📷 diklik, panggil fungsi openCameraPopup
document.getElementById('open-camera-popup-btn').addEventListener('click', openCameraPopup);

// Menutup popup kamera
document.getElementById('close-camera-popup-btn').addEventListener('click', function () {
  document.querySelector('.camera-popup-overlay').style.display = 'none';
  document.querySelector('.camera-popup').style.display = 'none';
});

// Fungsi untuk subscribe MQTT ThingSpeak (WebSocket)
function connectToThingSpeakMQTT() {
  const client = mqtt.connect("wss://mqtt3.thingspeak.com:443/mqtt", {
    username: "FzYrCCo6MSE0OBMFJBgYDSw",  // Ganti dengan Client ID tetap (bukan random)
    password: "MNCqAvaN5e7r6inbx9oHX+0N",    // Ganti dengan MQTT API Key ThingSpeak
    clientId: "FzYrCCo6MSE0OBMFJBgYDSw"   // Gunakan Client ID yang sama
  });

  client.on("connect", () => {
    console.log("MQTT Connected! Polling PHP dinonaktifkan.");
    clearInterval(pollingInterval); // Hentikan polling
    // Subscribe ke channel kelembaban (ID channel kelembaban)
    client.subscribe("channels/2843704/subscribe/json");
    // Subscribe ke channel kemiringan (ID channel kemiringan)
    client.subscribe("channels/2889619/subscribe/json");
  });

  
  client.on("message", (topic, message) => {
    try {
      const dataMQTT = JSON.parse(message.toString());
      const isKelembaban = topic.includes("2843704");
      const isKemiringanGiroChannel = topic.includes("2889619");

      let dataForUI = {
        status: 'success',
        kelembaban: {
          sensor1: currentKelembabanTanah1, sensor2: currentKelembabanTanah2,
          sensor3: currentKelembabanTanah3, sensor4: currentKelembabanTanah4,
          sensor5: currentKelembabanTanah5, sensor6: currentKelembabanTanah6
        },
        kemiringan: currentKemiringan,
        timestamp: new Date().toISOString()
      };

      if (isKelembaban) {
        // console.log("Data Kelembaban (2843704) diterima:", dataMQTT);
        dataForUI.kelembaban = {
          sensor1: parseFloat(dataMQTT.field1) || 0,
          sensor2: parseFloat(dataMQTT.field2) || 0,
          sensor3: parseFloat(dataMQTT.field3) || 0,
          sensor4: parseFloat(dataMQTT.field4) || 0,
          sensor5: parseFloat(dataMQTT.field5) || 0,
          sensor6: parseFloat(dataMQTT.field6) || 0
        };
        currentKelembabanTanah1 = dataForUI.kelembaban.sensor1;
        currentKelembabanTanah2 = dataForUI.kelembaban.sensor2;
        currentKelembabanTanah3 = dataForUI.kelembaban.sensor3;
        currentKelembabanTanah4 = dataForUI.kelembaban.sensor4;
        currentKelembabanTanah5 = dataForUI.kelembaban.sensor5;
        currentKelembabanTanah6 = dataForUI.kelembaban.sensor6;
      }

      if (isKemiringanGiroChannel) {
        // console.log(`Data dari Channel Kemiringan/Giro (2889619) diterima:`, dataMQTT);

        // 1. Update UI Kemiringan (dari field2)
        const kemiringanNilaiUntukUI = parseFloat(dataMQTT.field2) || 0;
        dataForUI.kemiringan = kemiringanNilaiUntukUI;
        currentKemiringan = kemiringanNilaiUntukUI;

        // 2. Update Data Giro untuk Three.js (dari field3, field4, field5)
        //    Asumsi: field3 = X, field4 = Y, field5 = Z
        //    <<<< PASTIKAN INI SESUAI DENGAN DATA ANDA DI THINGSPEAK >>>>
        const gyroDataX = dataMQTT.field3;
        const gyroDataY = dataMQTT.field4;
        const gyroDataZ = dataMQTT.field5;

        if (typeof gyroDataX !== 'undefined' && typeof gyroDataY !== 'undefined' && typeof gyroDataZ !== 'undefined') {
            window.globalGyroData.x = parseFloat(gyroDataX) || 0;
            window.globalGyroData.y = parseFloat(gyroDataY) || 0;
            window.globalGyroData.z = parseFloat(gyroDataZ) || 0;
            window.globalGyroData.updated = true;
            // console.log("window.globalGyroData diupdate dari channel 2889619:", window.globalGyroData);
        } else {
            console.warn("Data field giro (field3,4,5) dari MQTT channel 2889619 tidak lengkap:", dataMQTT);
        }
      }

      updateUIFromData(dataForUI); // Update UI kelembaban dan kemiringan

    } catch (e) {
        console.error("Error memproses pesan MQTT:", e, message.toString());
    }
  });

  client.on("error", (err) => {
    console.error("Error MQTT:", err);
    // Fallback ke polling PHP jika MQTT gagal
    setInterval(updateData, 10000);
  });
}

window.addEventListener("beforeunload", () => {
  clearInterval(pollingInterval);
});

// Fungsi utama update data kelembaban & kemiringan
async function updateData() {
  try {
    const response = await fetch('../backend/php/ambil_data_home.php');
    const data = await response.json();

    if (data.status === 'success' || data.status === 'empty') {
      // Update rata-rata kelembaban
      const sensors = data.kelembaban;
      const values = Object.values(sensors);
      const average = values.length > 0 ? Math.round(values.reduce((a,b) => a + b, 0) / values.length * 10) / 10 : 0;
      document.getElementById('average-moisture').textContent = average;

      // Update indikator warna utama kelembaban
      updateMainIndicator(average);

      // Update sensor kelembaban individual
      updateIndividualSensors(sensors);

      // Update nilai kemiringan
      document.getElementById('nilaiKemiringan').textContent = data.kemiringan + '°';

      // Log waktu update data terakhir
      console.log('Data terakhir diperbarui:', data.timestamp);
    } else {
      document.getElementById('average-moisture').textContent = 'ERR';
      document.getElementById('nilaiKemiringan').textContent = 'ERR';
    }
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('average-moisture').textContent = 'ERR';
    document.getElementById('nilaiKemiringan').textContent = 'ERR';
  }
}

// Update indikator utama kelembaban
function updateMainIndicator(average) {
  const element = document.querySelector('.frame-home-page1-humidity1');
  element.classList.remove('dry', 'moderate', 'wet');

  if (average < 30) {
    element.classList.add('dry');
  } else if (average < 70) {
    element.classList.add('moderate');
  } else {
    element.classList.add('wet');
  }
}

// Update sensor kelembaban individual
function updateIndividualSensors(sensors) {
  for (let i = 1; i <= 6; i++) {
    const sensorElement = document.getElementById(`sensor-${i}`);
    if (sensorElement) {
      const value = sensors[`sensor${i}`];
      const dotElement = sensorElement.querySelector('.sensor-dot');
      const valueElement = sensorElement.querySelector('.sensor-value');

      valueElement.textContent = `${value}%`;
      dotElement.className = 'sensor-dot';

      if (value < 30) {
        dotElement.classList.add('dry');
      } else if (value < 70) {
        dotElement.classList.add('moderate');
      } else {
        dotElement.classList.add('wet');
      }
    }
  }
}

// Event listener untuk klik sensor
document.querySelectorAll('.sensor-point').forEach(sensor => {
  sensor.addEventListener('click', function() {
    const sensorId = this.id.split('-')[1];
    const value = this.querySelector('.sensor-value').textContent;
    alert(`Detail Sensor ${sensorId}\nNilai: ${value}`);
  });
});

function collectDataPoint() {
    if (document.getElementById('toggle-simulation').checked && currentActiveSimulationName) {
        const dataPoint = {
            client_timestamp: new Date().toISOString(), // Timestamp dari klien
            kelembabanTanah1: currentKelembabanTanah1,
            kelembabanTanah2: currentKelembabanTanah2,
            kelembabanTanah3: currentKelembabanTanah3,
            kelembabanTanah4: currentKelembabanTanah4,
            kelembabanTanah5: currentKelembabanTanah5,
            kelembabanTanah6: currentKelembabanTanah6,
            outputKemiringan: currentOutputKemiringan,
            outputCurahHujan: currentOutputCurahHujan
            // Perhatikan: derajatKemiringan (input) dan curahHujan (input) akan dikirim bersama batch
        };
        dataBuffer.push(dataPoint);
        // console.log(`Data point added. Buffer size: ${dataBuffer.length}`);
    }
}

function sendBufferedDataToServer(isFinalSend = false) {
    const toggleIsChecked = document.getElementById('toggle-simulation').checked;

    // Hanya kirim jika ada data dan (simulasi aktif atau ini pengiriman terakhir)
    if (dataBuffer.length > 0 && (toggleIsChecked || isFinalSend) && currentActiveSimulationName) {
        const dataToSend = {
            simulationName: currentActiveSimulationName,
            derajatKemiringanInput: currentKemiringan, // Input pengguna saat ini
            curahHujanInput: currentCurahHujan,       // Input pengguna saat ini
            dataPoints: [...dataBuffer] // Salin isi buffer
        };

        dataBuffer = []; // Kosongkan buffer SEGERA setelah disalin

        console.log(`Sending batch of <span class="math-inline">\{dataToSend\.dataPoints\.length\} data points for "</span>{dataToSend.simulationName}"...`);

        fetch('../backend/php/save_simulation_batch.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend)
        })
        .then(response => response.json())
        .then(result => {
            if (result.status === "success") {
                console.log("Batch data successfully sent and saved.");
            } else {
                console.error("Failed to send/save batch data:", result.message);
                // Pertimbangkan untuk memasukkan kembali dataToSend.dataPoints ke dataBuffer jika gagal,
                // tapi hati-hati bisa menyebabkan data duplikat jika errornya sementara.
                // Atau simpan ke localStorage sebagai fallback (lebih kompleks).
            }
        })
        .catch(error => {
            console.error("Fetch error sending batch data:", error);
            // Sama, pertimbangkan error handling yang lebih canggih.
        });
    } else if (dataBuffer.length > 0 && !currentActiveSimulationName && isFinalSend) {
         console.warn("Buffer had data but no active simulation name for final send. Discarding buffer.");
         dataBuffer = []; // Kosongkan buffer jika tidak ada nama simulasi aktif
    }


    // Jika bukan pengiriman final dan toggle sudah mati, pastikan interval dihentikan.
    if (!toggleIsChecked && !isFinalSend) {
        if (batchSaveIntervalId) clearInterval(batchSaveIntervalId);
        batchSaveIntervalId = null;
        if (collectDataIntervalId) clearInterval(collectDataIntervalId);
        collectDataIntervalId = null;
        currentActiveSimulationName = null; // Pastikan direset
    }
}