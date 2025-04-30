document.getElementById("registerForm").addEventListener("submit", function(event) {
    event.preventDefault();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    if (password !== confirmPassword) {
        alert("Password tidak cocok!");
        return;
    }
    alert("Registrasi berhasil!");
});

function togglePassword(inputId, iconId) {
    let input = document.getElementById(inputId);
    let icon = document.getElementById(iconId);

    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
}

// AJAX untuk mengirim data ke register.php
document.getElementById("registerForm").addEventListener("submit", function(event) {
    event.preventDefault();

    let name = document.getElementById("name").value;
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;
    let confirmPassword = document.getElementById("confirmPassword").value;
    let accountType = document.getElementById("accountType").value;

    if (password !== confirmPassword) {
        alert("Password tidak cocok!");
        return;
    }

    let formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("accountType", accountType);

    fetch("php/register.php", {
        method: "POST",
        body: formData
    })
    .then(response => response.text())
    .then(data => alert(data))
    .catch(error => console.error("Error:", error));
});

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