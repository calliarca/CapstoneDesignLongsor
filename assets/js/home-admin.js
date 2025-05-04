// Deklarasikan variabel di global scope
let toggleSimulation;
let currentKemiringan = 0; // Simpan nilai derajat kemiringan
let currentCurahHujan = 0; // Simpan nilai curah huja
let currentKelembabanTanah = 0;// Simpan nilai kelembaban tanah
let currentKelembabanTanah1 = 0;
let currentKelembabanTanah2 = 0;
let currentKelembabanTanah3 = 0;
let currentKelembabanTanah4 = 0;
let currentKelembabanTanah5 = 0;
let currentKelembabanTanah6 = 0;
let currentOutputKemiringan = 0;
let currentOutputCurahHujan = 0;


setInterval(updateKemiringan, 1000); // Update setiap 1 detik
updateKemiringan(); // Panggil pertama kali langsung

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

  // Nonaktifkan input kemiringan dan curah hujan secara default
  if (kemiringanInput) kemiringanInput.disabled = true;
  if (curahHujanInput) curahHujanInput.disabled = true;

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
  
      // Reset nilai derajat kemiringan dan curah hujan ke 0
      currentKemiringan = 0;
      currentCurahHujan = 0;
  
      // Reset nilai input
      if (kemiringanInput) kemiringanInput.value = currentKemiringan;
      if (curahHujanInput) curahHujanInput.value = currentCurahHujan;
  
      // Panggil stop_simulation.php
      fetch('php/stop_simulation.php', {
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
        kelembabanTanah1: currentKelembabanTanah1 || 0, // Pastikan nilai default
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
  
      console.log("Data yang dikirim ke backend:", data); // Debugging
  
      fetch('php/save_simulation.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      window.location.href = 'index.html'; // Ganti dengan URL tujuan
      break;
    case 'logout':
      fetch('./php/logout.php', {  // Pastikan path sesuai dengan struktur proyek
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
              window.location.href = 'login.html'; // Redirect ke halaman login
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
  const kemiringanInput = document.querySelector("#kemiringan-input");
  const simulationNameInput = document.querySelector("#simulation-name");
  const simulationName = simulationNameInput.value.trim();

  if (!simulationName) {
      alert("Silakan isi nama simulasi terlebih dahulu.");
      return;
  }

  const selectedValue = kemiringanInput.value;
  if (!selectedValue) {
      alert("Silakan pilih derajat kemiringan.");
      return;
  }

  const data = {
    simulationName: simulationName,
    kelembabanTanah1: currentKelembabanTanah1, // Gunakan nilai kelembaban tanah 1
    kelembabanTanah2: currentKelembabanTanah2, // Gunakan nilai kelembaban tanah 2
    kelembabanTanah3: currentKelembabanTanah3, // Gunakan nilai kelembaban tanah 3
    kelembabanTanah4: currentKelembabanTanah4, // Gunakan nilai kelembaban tanah 4
    kelembabanTanah5: currentKelembabanTanah5, // Gunakan nilai kelembaban tanah 5
    kelembabanTanah6: currentKelembabanTanah6, // Gunakan nilai kelembaban tanah 6
    derajatKemiringan: currentKemiringan, // Gunakan nilai derajat kemiringan
    outputKemiringan: currentOutputKemiringan, // Gunakan nilai output kemiringan
    curahHujan: currentCurahHujan, // Gunakan nilai curah hujan
    outputCurahHujan: currentOutputCurahHujan // Gunakan nilai output curah hujan
  };

  // Kirim ke database MySQL
  fetch("php/save_simulation.php", {
      method: "POST",
      headers: {
          "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(result => {
      if (result.status === "success") {
          console.log("Data berhasil disimpan ke database.");
      } else {
          console.error("Gagal menyimpan data:", result.message);
      }
  });

  // Kirim ke MQTT (ESP32 via ThingSpeak)
  fetch("php/send_to_mqtt.php", {
      method: "POST",
      headers: {
          "Content-Type": "application/json"
      },
      body: JSON.stringify({ derajatKemiringan: parseFloat(selectedValue) })
  })
  .then(response => response.json())
  .then(result => {
      if (result.status === "success") {
          alert("Dongkrak bergerak ke " + selectedValue + "°");
      } else {
          alert("Gagal mengirim ke MQTT.");
      }
  })
  .catch(error => {
      console.error("Error:", error);
      alert("Terjadi kesalahan saat mengirim data.");
  });
}

function handleCurahHujan() {
  if (!toggleSimulation.checked) {
    alert('Simulation is turned off. Please turn on the simulation to input data.');
    return; // Hentikan proses jika toggle slider dimatikan
  }

  const curahHujanInput = document.querySelector('#curah-hujan-input');
  const simulationNameInput = document.querySelector('#simulation-name');
  const simulationName = simulationNameInput.value.trim();

  if (curahHujanInput && simulationName) {
    const curahHujanValue = curahHujanInput.value;
    if (curahHujanValue) {
      // Kirim data ke backend
      sendDataToBackend(
        {
          simulationName: simulationName,
          kelembabanTanah: currentKelembabanTanah, // Gunakan nilai yang sudah disimpan
          derajatKemiringan: currentKemiringan, // Gunakan nilai yang sudah disimpan
          curahHujan: parseFloat(curahHujanValue),
        },
        'curahHujan' // Tentukan jenis data
      );
    } else {
      alert('Silakan masukkan curah hujan.');
    }
  } else {
    alert('Silakan isi nama simulasi terlebih dahulu.');
  }
}

function sendDataToBackend(data, type) {
  fetch('php/save_simulation.php', {
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
      fetch("./php/check_session.php")
      .then(response => response.text()) // Ambil teks mentah sebelum parsing JSON
      .then(text => {
          console.log("Raw response:", text); // Lihat output asli
          return JSON.parse(text); // Coba parse JSON
      })
      .then(data => {
          console.log("Check Session Response:", data);
          if (data.status !== "success") {
              console.error("Session tidak valid, kembali ke login.");
              window.location.href = "./login.html";
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
          window.location.href = "./login.html";
      });

  // Set nama user di title
  fetch("./php/get_name.php")
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

function updateKemiringan() {
  fetch('php/get_kemiringan.php')
    .then(response => response.text())
    .then(data => {
      document.getElementById('nilaiKemiringan').textContent = data;
    })
    .catch(error => {
      console.error('Gagal mengambil data:', error);
    });
}


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
// Fungsi untuk membuka popup kamera dan mengambil URL stream dari camera_config.json
function openCameraPopup() {
  fetch('assets/js/camera_config.json')
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
