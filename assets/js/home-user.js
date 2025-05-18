document.addEventListener("DOMContentLoaded", function () {
    fetch("../backend/php/getSimulations.php")
        .then(response => response.json())
        .then(responseData => {
            console.log("Data dari server:", responseData); // Debugging

            if (responseData.status !== "success") {
                console.error("Gagal mengambil data simulasi:", responseData);
                return;
            }

            let data = responseData.data; // Ambil array dari objek data
            if (!Array.isArray(data)) {
                console.error("Data bukan array:", data);
                return;
            }

            let tableBody = document.getElementById("simulationTableBody");
            tableBody.innerHTML = ""; // Kosongkan tabel sebelum diisi
            
            data.forEach((row, index) => {
                console.log("Nama Simulasi:", row.nama_simulasi); // Debugging
                
                let tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${row.tanggal}</td>
                    <td>${row.timestamp}</td>
                    <td>${row.waktu_simulasi}</td>
                    <td>${row.nama_simulasi}</td>
                    <td>
                        <button class="detail-button" onclick="lihatRawData('${encodeURIComponent(row.nama_simulasi)}')">Raw Data</button>
                        <button class="detail-button" onclick="lihatValidData('${encodeURIComponent(row.nama_simulasi)}')">Valid Data</button>
                    </td>

                `;
                tableBody.appendChild(tr);
            });
        })
        .catch(error => console.error("Error fetching data:", error));
});

function lihatRawData(namaSimulasi) {
    window.location.href = `raw-data.html?simulation_name=${namaSimulasi}`;
}

function lihatValidData(namaSimulasi) {
    window.location.href = `valid-data.html?simulation_name=${namaSimulasi}`;
}



// Fungsi untuk navigasi
function navigateTo(page) {
  switch (page) {
    case 'home':
      window.location.href = 'index.html'; // Ganti dengan URL tujuan
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

function logoutUser() {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "../backend/php/logout.php", true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        window.location.href = "./login.html"; // Redirect ke halaman login setelah logout berhasil
      }
    };
    
    xhr.send();
  }

  document.addEventListener("DOMContentLoaded", function () {
    fetch("../backend/php/check_session.php")
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text(); // Baca sebagai teks dulu
        })
        .then(text => {
            console.log("Raw Response:", text); // Debugging
            return JSON.parse(text); // Parse JSON manual
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