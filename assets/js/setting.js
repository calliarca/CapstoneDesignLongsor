// Fungsi untuk navigasi
function navigateTo(page) {
    switch (page) {
        case 'home':
            window.location.href = '../../home_admin/index.html';
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

// Fungsi untuk menampilkan notifikasi
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

// Fungsi untuk mengirim form konfigurasi channel
function submitForm(event) {
    event.preventDefault();

    const humidityChannel = document.getElementById('channelIDMoisture').value.trim();
    const slopeChannel = document.getElementById('channelIDSlope').value.trim();
    const regex = /^[0-9]{7}$/;

    if (!regex.test(humidityChannel)) {
        showNotification('Channel ID - Kelembapan Tanah harus berupa 7 digit angka.', 'error');
        return;
    }

    if (!regex.test(slopeChannel)) {
        showNotification('Channel ID - Kemiringan harus berupa 7 digit angka.', 'error');
        return;
    }

    const formData = new URLSearchParams();
    formData.append('humidity_channel', humidityChannel);
    formData.append('slope_channel', slopeChannel);

    fetch('../backend/php/update_channel.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showNotification(data.message, 'success');
        } else {
            showNotification(data.message || 'Terjadi kesalahan saat mengupdate konfigurasi.', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Gagal mengirim data ke server.', 'error');
    });
}

// Fungsi untuk mengirim URL stream kamera
function submitStreamURL(event) {
    event.preventDefault();

    const cameraStreamUrl = document.getElementById('cameraStreamUrl').value.trim();
    
    // **PERBAIKAN:** Validasi URL dihapus, sekarang hanya memeriksa apakah input tidak kosong.
    if (!cameraStreamUrl) {
        showNotification('URL Stream Kamera tidak boleh kosong.', 'error');
        return;
    }

    localStorage.setItem('cameraStreamUrl', cameraStreamUrl);
    
    const formData = new URLSearchParams();
    formData.append('camera_stream_url', cameraStreamUrl);

    // Menggunakan fetch untuk konsistensi
    fetch('../backend/php/update_camera_url.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
    })
    .then(response => {
        if (response.ok) {
            showNotification('URL Kamera berhasil disimpan.', 'success');
        } else {
            throw new Error('Gagal menyimpan URL Kamera.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification(error.message, 'error');
    });
}

// Event listener dijalankan setelah semua konten HTML dimuat
document.addEventListener("DOMContentLoaded", function () {
    // 1. Memeriksa sesi pengguna
    fetch("../backend/php/check_session.php")
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            console.log("Check Session Response:", data);
            if (data.status !== "success" || !data.session_data || !data.session_data.name) {
                console.error("Sesi tidak valid, kembali ke login.");
                window.location.href = "login.html";
            } else {
                // 2. Mengatur nama pengguna dari data sesi
                const userName = data.session_data.name;
                const userNameElement = document.getElementById("user-name");

                document.title = `Home Page - ${userName}`;
                if (userNameElement) {
                    userNameElement.innerText = userName;
                } else {
                    console.warn("Elemen #user-name tidak ditemukan!");
                }
            }
        })
        .catch(error => {
            console.error("Gagal memeriksa sesi:", error);
            window.location.href = "login.html";
        });

    // 3. Mengisi otomatis URL kamera dari localStorage
    const savedUrl = localStorage.getItem('cameraStreamUrl');
    if (savedUrl) {
        const cameraInput = document.getElementById('cameraStreamUrl');
        if (cameraInput) {
            cameraInput.value = savedUrl;
        }
    }
});