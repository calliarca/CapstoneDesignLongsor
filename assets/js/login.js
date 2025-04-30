document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("loginForm").addEventListener("submit", function (e) {
        e.preventDefault();

        let formData = new FormData(this);

        fetch("php/submit-login.php", {
            method: "POST",
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            console.log("Login Response:", data); // Debugging

            alert(data.message); // Menampilkan pesan dari server

            if (data.status === "success") {
                if (data.account_type) {
                    sessionStorage.setItem("account_type", data.account_type); // Simpan account_type

                    if (data.account_type === "admin") {
                        window.location.href = "home-admin.html";
                    } else if (data.account_type === "user") {
                        window.location.href = "home-user.html";
                    } else {
                        console.error("Unknown account_type:", data.account_type);
                        alert("Tipe akun tidak dikenali!");
                    }
                } else {
                    console.error("account_type not found in response:", data);
                    alert("Tipe akun tidak dikenali!");
                }
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Terjadi kesalahan saat menghubungkan ke server.");
        });
    });
});
