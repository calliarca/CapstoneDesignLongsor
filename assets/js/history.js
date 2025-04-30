document.addEventListener("DOMContentLoaded", function () {
    loadSimulationHistory();
    setupCloseOverlayButton();
    setupAddUserButton();
});

function loadSimulationHistory() {
    fetch("./php/getSimulations.php")
        .then(response => response.json())
        .then(responseData => {
            console.log("Data dari server:", responseData); // Debugging

            if (responseData.status !== "success") {
                console.error("Gagal mengambil data simulasi:", responseData);
                return;
            }

            let data = responseData.data;
            if (!Array.isArray(data)) {
                console.error("Data tidak dalam format array:", data);
                return;
            }

            let tableBody = document.getElementById("simulationTableBody");
            if (!tableBody) {
                console.error("Elemen simulationTableBody tidak ditemukan!");
                return;
            }
            tableBody.innerHTML = "";

            data.forEach((row, index) => {
                let tr = document.createElement("tr");

                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${row.tanggal}</td>
                    <td>${row.waktu_simulasi}</td>
                    <td>${row.nama_simulasi}</td>
                    <td>
                        <div class="dropdown">
                            <button class="btn btn-primary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                Actions
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item rawDataButton" href="#" data-simulation-name="${row.nama_simulasi}">Raw Data</a></li>
                                <li><a class="dropdown-item validDataButton" href="#">Valid Data</a></li>
                                <li><a class="dropdown-item openOverlayButton" href="#" data-simulation-id="${row.id}">Add User</a></li>
                                <li><a class="dropdown-item deleteSimulationButton" href="#" data-simulation-name="${row.nama_simulasi}">Delete</a></li>
                            </ul>
                        </div>
                    </td>
                `;

                tableBody.appendChild(tr);
            });
        })
        .catch(error => console.error("Error fetching data:", error));
}


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

  document.addEventListener("DOMContentLoaded", function () {
    fetch("./php/check_session.php")
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

// Event delegation untuk menangani klik tombol "Add User" dan "Raw Data"
document.addEventListener("click", function (event) {
    // --- Tombol Add User ---
    if (event.target.classList.contains("openOverlayButton")) {
        let simulationId = event.target.getAttribute("data-simulation-id");
        let simulationIdInput = document.getElementById("simulationId");

        if (simulationIdInput) {
            simulationIdInput.value = simulationId;
        } else {
            console.error("Elemen simulationId tidak ditemukan!");
        }

        let overlay = document.getElementById("overlay");
        if (overlay) {
            overlay.style.display = "flex";
        } else {
            console.error("Elemen overlay tidak ditemukan!");
        }

        // Muat daftar user
        loadUserList();
    }

    if (event.target.classList.contains("rawDataButton")) {
        let simulationName = event.target.getAttribute("data-simulation-name");
        if (simulationName) {
            let encodedName = encodeURIComponent(simulationName);
            window.location.href = `raw-data.html?name=${encodedName}`;
        } else {
            alert("Nama simulasi tidak ditemukan.");
        }
    }    
});


// Fungsi untuk memuat daftar user dari database
function loadUserList() {
    fetch("./php/getUsers.php")
        .then(response => response.json())
        .then(data => {
            let userEmailInput = document.getElementById("userEmailInput");
            if (!userEmailInput) {
                console.error("Elemen userEmailInput tidak ditemukan!");
                return;
            }
            userEmailInput.innerHTML = "";
            
            if (data.length === 0) {
                let option = document.createElement("option");
                option.value = "";
                option.textContent = "No users available";
                userEmailInput.appendChild(option);
            } else {
                data.forEach(user => {
                    let option = document.createElement("option");
                    option.value = user.email;
                    option.textContent = `${user.name} (${user.email})`;
                    userEmailInput.appendChild(option);
                });
            }
        })
        .catch(error => console.error("Error fetching users:", error));
}

// Fungsi untuk menangani tombol "Close"
function setupCloseOverlayButton() {
    let closeButton = document.getElementById("closeOverlayButton");
    if (closeButton) {
        closeButton.addEventListener("click", function () {
            let overlay = document.getElementById("overlay");
            if (overlay) {
                overlay.style.display = "none";
            }
        });
    } else {
        console.error("Tombol closeOverlayButton tidak ditemukan!");
    }
}

// Fungsi untuk menangani penambahan user ke simulasi
function setupAddUserButton() {
    let addUserButton = document.getElementById("addUserButton");
    if (addUserButton) {
        addUserButton.addEventListener("click", function () {
            let selectedUser = document.getElementById("userEmailInput")?.value;
            let simulationId = document.getElementById("simulationId")?.value;
            
            if (!selectedUser || !simulationId) {
                alert("Silakan pilih user dan simulasi!");
                return;
            }
            
           fetch("./php/grantAccess.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: selectedUser, simulation_id: simulationId })
            })
            .then(response => response.text()) // Ambil respons sebagai teks dulu
            .then(text => {
                console.log("Raw Response from Server:", text); // Debugging
                return JSON.parse(text); // Coba parsing ke JSON
            })
            .then(data => {
                alert(data.message);
                document.getElementById("overlay").style.display = "none";
            })
            .catch(error => console.error("Error adding user:", error));
        });
    } else {
        console.error("Tombol addUserButton tidak ditemukan!");
    }
}

document.addEventListener("click", function (event) {
    if (event.target.classList.contains("deleteSimulationButton")) {
        let simulationName = event.target.getAttribute("data-simulation-name");

        if (!simulationName) {
            alert("Nama simulasi tidak ditemukan.");
            return;
        }

        if (confirm("Yakin ingin menghapus simulasi ini?")) {
            fetch("./php/hapus_simulasi.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: "simulation_name=" + encodeURIComponent(simulationName)
            })
            .then(response => response.text())
            .then(result => {
                if (result === "success") {
                    alert("Simulasi berhasil dihapus.");
                    loadSimulationHistory(); // Refresh tabel
                } else {
                    alert("Gagal menghapus simulasi.");
                    console.error("Server response:", result);
                }
            })
            .catch(error => console.error("Error saat menghapus:", error));
        }
    }
});

