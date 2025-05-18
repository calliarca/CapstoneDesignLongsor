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

    // Path ke backend/php/register.php
    fetch("../backend/php/register.php", {
        method: "POST",
        body: formData
    })
    .then(response => response.text())
    .then(data => alert(data))
    .catch(error => console.error("Error:", error));
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

// Fungsi untuk navigasi
function navigateTo(page) {
    switch (page) {
      case 'home':
        window.location.href = 'home-admin.html';
        break;
      case 'logout':
        fetch('../backend/php/logout.php', {
            method: 'POST',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            console.log("Logout Response:", data);
            if (data.status === "success") {
                alert('You have logged out.');
                sessionStorage.clear();
                localStorage.clear();
                window.location.href = 'login.html';
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

// Cek session dan redirect jika tidak valid
document.addEventListener("DOMContentLoaded", function () {
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