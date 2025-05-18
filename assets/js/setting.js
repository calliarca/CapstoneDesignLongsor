// Fungsi untuk navigasi
function navigateTo(page) {
    switch (page) {
      case 'home':
        window.location.href = 'home-admin.html';
        break;
      case 'logout':
        fetch('../backend/php/logout.php', { // Ubah path ke backend/php
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

document.addEventListener("DOMContentLoaded", function () {
    fetch("../backend/php/check_session.php") // Ubah path ke backend/php
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        })
        .then(text => {
            console.log("Raw Response:", text);
            return JSON.parse(text);
        })
        .then(data => {
            console.log("Check Session Response:", data);

            if (data.status !== "success") {
                console.error("Session tidak valid, kembali ke login.");
                window.location.href = "login.html";
            } else {
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
            window.location.href = "login.html";
        });

    // Set nama user di title
    fetch("../backend/php/get_name.php") // Ubah path ke backend/php
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

    // Auto-isi saat load
    const savedUrl = localStorage.getItem('cameraStreamUrl');
    if (savedUrl) {
      document.getElementById('cameraStreamUrl').value = savedUrl;
    }
});

function submitForm(event) {
    event.preventDefault();

    const humidityChannel = document.getElementById('channelIDMoisture').value.trim();
    const slopeChannel = document.getElementById('channelIDSlope').value.trim();

    const regex = /^[0-9]{6}$/;

    if (!regex.test(humidityChannel)) {
        showNotification('Channel ID - Kelembapan Tanah harus berupa 6 digit angka.', 'error');
        return;
    }

    if (!regex.test(slopeChannel)) {
        showNotification('Channel ID - Kemiringan harus berupa 6 digit angka.', 'error');
        return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '../backend/php/update_channel.php', true); // Ubah path ke backend/php
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

    xhr.onload = function () {
        try {
            const response = JSON.parse(xhr.responseText);
            if (xhr.status === 200 && response.status === 'success') {
                showNotification(response.message, 'success');
            } else {
                showNotification(response.message || 'Terjadi kesalahan saat mengupdate konfigurasi.', 'error');
            }
        } catch (e) {
            showNotification('Gagal memproses respons dari server.', 'error');
        }
    };

    xhr.onerror = function () {
        showNotification('Gagal mengirim data ke server.', 'error');
    };

    xhr.send(
        'humidity_channel=' + encodeURIComponent(humidityChannel) +
        '&slope_channel=' + encodeURIComponent(slopeChannel)
    );
}

function showNotification(message, type) {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');

    if (!notification || !notificationMessage) {
        console.warn('Elemen notifikasi tidak ditemukan!');
        return;
    }

    notificationMessage.textContent = message;
    notification.classList.remove('alert-success', 'alert-danger');
    notification.classList.add(type === 'success' ? 'alert-success' : 'alert-danger');
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

function submitStreamURL(event) {
    event.preventDefault();

    const cameraStreamUrl = document.getElementById('cameraStreamUrl').value.trim();
    const urlRegex = /^(http|https):\/\/[^ "]+$/;

    if (!urlRegex.test(cameraStreamUrl)) {
        showNotification('URL Stream Kamera tidak valid.', 'error');
        return;
    }

    localStorage.setItem('cameraStreamUrl', cameraStreamUrl);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '../backend/php/update_camera_url.php', true); // Ubah path ke backend/php
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

    xhr.onload = function () {
        if (xhr.status === 200) {
            showNotification('URL Kamera berhasil disimpan.', 'success');
        } else {
            showNotification('Gagal menyimpan URL Kamera.', 'error');
        }
    };

    xhr.send('camera_stream_url=' + encodeURIComponent(cameraStreamUrl));
}

// Auto-isi saat load
document.addEventListener("DOMContentLoaded", function () {
    const savedUrl = localStorage.getItem('cameraStreamUrl');
    if (savedUrl) {
      document.getElementById('cameraStreamUrl').value = savedUrl;
    }
});
