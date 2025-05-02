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

        // Function to validate the form
        function validateForm() {
            // Get the values of the input fields
            const channelIDMoisture = document.getElementById('channelIDMoisture').value;
            const channelIDSlope = document.getElementById('channelIDSlope').value;
  
            // Regular expression to allow only 6 digits
            const regex = /^[0-9]{6}$/;
  
            // Validate Channel ID - Kelembapan Tanah
            if (!regex.test(channelIDMoisture)) {
              showNotification('Channel ID - Kelembapan Tanah harus berupa 6 digit angka.', 'error');
              return false; // Prevent form submission
            }
  
            // Validate Channel ID - Kemiringan
            if (!regex.test(channelIDSlope)) {
              showNotification('Channel ID - Kemiringan harus berupa 6 digit angka.', 'error');
              return false; // Prevent form submission
            }
  
            // If validation is successful, show success message
            showNotification('Pengaturan berhasil disimpan!', 'success');
            return false; // Prevent form submission for demonstration purposes
          }
  
    // Function to show notification
    function showNotification(message, type) {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');
    
    // Set the message and type
    notificationMessage.textContent = message;
    
    // Change the style based on type
    if (type === 'success') {
        notification.classList.add('alert-success');
        notification.classList.remove('alert-danger');
    } else {
        notification.classList.add('alert-danger');
        notification.classList.remove('alert-success');
    }
    
    // Display the notification
    notification.style.display = 'block';

    // Hide the notification after 3 seconds
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}


   // Fungsi untuk mengirim form via AJAX
   function submitForm(event) {
    event.preventDefault();  // Mencegah form dari submit biasa

    // Ambil nilai input dari form
    let humidityChannel = document.getElementById('channelIDMoisture').value;
    let slopeChannel = document.getElementById('channelIDSlope').value;

    // Siapkan AJAX request
    let xhr = new XMLHttpRequest();
    xhr.open('POST', 'php/update_channel.php', true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

    xhr.onload = function() {
        if (xhr.status == 200) {
            // Tampilkan notifikasi jika sukses
            document.getElementById('notification').style.display = 'block';
            document.getElementById('notificationMessage').textContent = xhr.responseText;
        } else {
            // Tampilkan notifikasi jika gagal
            document.getElementById('notification').style.display = 'block';
            document.getElementById('notificationMessage').textContent = 'Terjadi kesalahan saat mengupdate konfigurasi';
        }
    };

    // Kirimkan data ke server
    xhr.send('humidity_channel=' + encodeURIComponent(humidityChannel) + '&slope_channel=' + encodeURIComponent(slopeChannel));
}