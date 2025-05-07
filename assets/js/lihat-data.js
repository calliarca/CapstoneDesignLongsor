let humidityChartInstance = null;
let slopeChartInstance = null;
let rainfallChartInstance = null;

// Fungsi untuk mengganti 'name' menjadi 'simulation_name' di URL
function updateURLParameter() {
  const urlParams = new URLSearchParams(window.location.search);
  const simulationName = urlParams.get('name');
  
  if (simulationName) {
    const newUrl = window.location.href.replace('name=' + encodeURIComponent(simulationName), 'simulation_name=' + encodeURIComponent(simulationName));
    window.history.replaceState({}, '', newUrl); // Mengubah URL tanpa memuat ulang halaman
  }
}

function backToHistory() {
  window.history.back();
}

// Fungsi untuk menampilkan raw data dalam tabel dan grafik
function displayRawData(rows) {
  const tableBody = document.getElementById('simulationTableBody');
  if (!tableBody) {
    console.error('Table body element not found');
    return;
  }

  tableBody.innerHTML = ''; // Kosongkan tabel sebelumnya

  if (rows.length === 0) {
    alert('Tidak ada data yang ditemukan untuk simulasi ini');
    return;
  }

  const ids = [];
  const humidityData = [[], [], [], [], [], []];
  const slopeData = [];
  const outputSlopeData = [];
  const rainfallData = [];
  const outputRainfallData = [];

  rows.forEach((row, index) => {
    const createdAt = row.created_at || '-';
    const kelembaban = [
      row.kelembaban_tanah_1 ?? '-',
      row.kelembaban_tanah_2 ?? '-',
      row.kelembaban_tanah_3 ?? '-',
      row.kelembaban_tanah_4 ?? '-',
      row.kelembaban_tanah_5 ?? '-',
      row.kelembaban_tanah_6 ?? '-'
    ];
    const kemiringan = row.derajat_kemiringan ?? '-';
    const outputKemiringan = row.output_kemiringan ?? '-';
    const curahHujan = row.curah_hujan ?? '-';
    const outputCurahHujan = row.output_curah_hujan ?? '-';

    // Format waktu lengkap untuk ditampilkan di tabel
    const dateTimeObj = createdAt !== '-' ? new Date(createdAt) : null;
    const fullDateTime = dateTimeObj ? dateTimeObj.toLocaleString('id-ID') : '-';

    // Format jam saja untuk sumbu X grafik
    const timeOnly = dateTimeObj ? dateTimeObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `  
      <td>${index + 1}</td>
      <td>${fullDateTime}</td>
      <td>${kelembaban[0]}</td>
      <td>${kelembaban[1]}</td>
      <td>${kelembaban[2]}</td>
      <td>${kelembaban[3]}</td>
      <td>${kelembaban[4]}</td>
      <td>${kelembaban[5]}</td>
      <td>${kemiringan}</td>
      <td>${outputKemiringan}</td>
      <td>${curahHujan}</td>
      <td>${outputCurahHujan}</td>
    `;
    tableBody.appendChild(tr);

    // Simpan nomor ID sebagai label untuk grafik
    ids.push(index + 1); // Menyimpan nomor ID (index + 1)

    kelembaban.forEach((value, i) => {
      humidityData[i].push(value !== '-' ? parseFloat(value) : null);
    });
    slopeData.push(kemiringan !== '-' ? parseFloat(kemiringan) : null);
    outputSlopeData.push(outputKemiringan !== '-' ? parseFloat(outputKemiringan) : null);
    rainfallData.push(curahHujan !== '-' ? parseFloat(curahHujan) : null);
    outputRainfallData.push(outputCurahHujan !== '-' ? parseFloat(outputCurahHujan) : null);
  });

  const rawDataSection = document.getElementById('rawDataSection');
  if (rawDataSection) {
    rawDataSection.style.display = 'block';
  }

  // Panggil fungsi untuk membuat grafik menggunakan nomor ID sebagai label
  createHumidityChart('humidityChart', ids, humidityData);
  createSlopeChart('slopeChart', ids, slopeData, outputSlopeData);
  createRainfallChart('rainfallChart', ids, rainfallData, outputRainfallData);  
}

function fetchRawData(simulationName) {
  if (!simulationName) {
    console.error("Simulation name is missing in the URL");
    return;
  }

  const url = `php/get_data.php?simulation_name=${encodeURIComponent(simulationName)}`;

  showLoadingIndicator(true);

  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      showLoadingIndicator(false);
      if (data.status === 'success') {
        window.originalRows = data.rows; // Simpan data mentah
        // Jangan panggil updateInterval() di sini
      } else {
        alert(data.message || 'Error fetching data');
      }
    })
    
    .catch(error => {
      showLoadingIndicator(false);
      console.error('Error:', error);
      alert('Error fetching data');
    });
}

function showLoadingIndicator(show) {
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = show ? 'block' : 'none';
  } else {
    console.warn('Loading indicator element not found');
  }
}

document.addEventListener('DOMContentLoaded', function () {
  updateURLParameter();
  //fetchLatestInput(); // << Tambahkan ini
  const urlParams = new URLSearchParams(window.location.search);
  const simulationName = urlParams.get('simulation_name');
  if (simulationName) {
    const simulationNameDisplay = document.getElementById('simulationNameDisplay');
    if (simulationNameDisplay) {
      simulationNameDisplay.innerHTML = `Nama Simulasi: <strong>${simulationName}</strong>`;
    }
  
    fetchRawData(simulationName);
  
    // Tambahkan observer tunggu data berhasil di-load sebelum update interval
    const checkDataReady = setInterval(() => {
      if (window.originalRows) {
        updateInterval();
        clearInterval(checkDataReady);
      }
    }, 100); // cek setiap 100ms
  }
  else {
    console.error('Simulation name is missing in the URL');
    alert('Simulation name is missing');
  }
});

// Grafik dan Unduh Excel
function createHumidityChart(id, labels, humidityData) {
  const ctx = document.getElementById(id).getContext('2d');
  
  // Ambil hanya 20 data terakhir sesuai interval
  const interval = 20; // Ganti ini dengan logika interval sesuai keinginan Anda
  const limitedLabels = labels.slice(-interval);  // Gunakan nomor ID untuk sumbu X
  const limitedHumidityData = humidityData.map(data => data.slice(-interval));

  // Destroy chart lama jika ada
  if (humidityChartInstance) {
    humidityChartInstance.destroy();
  }

  humidityChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: limitedLabels,  // Sumbu X menggunakan nomor ID
      datasets: limitedHumidityData.map((data, index) => ({
        label: `Kelembaban Tanah ${index + 1}`,
        data: data,
        fill: false,
        borderColor: `hsl(${index * 60}, 70%, 50%)`,
        tension: 0.1
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Grafik Kelembaban Tanah'
        }
      },
      scales: {
        x: { title: { display: true, text: 'Nomor Simulasi' } }, // Ganti judul sumbu X
        y: { title: { display: true, text: 'Kelembaban (%)' } }
      }
    }
  });
}

function createSlopeChart(id, labels, slopeData, outputSlopeData) {
  const ctx = document.getElementById(id).getContext('2d');

  // Ambil hanya 20 data terakhir sesuai interval
  const interval = 20; // Ganti ini dengan logika interval sesuai keinginan Anda
  const limitedLabels = labels.slice(-interval);  // Gunakan nomor ID untuk sumbu X
  const limitedSlopeData = slopeData.slice(-interval);
  const limitedOutputSlopeData = outputSlopeData.slice(-interval);

  if (slopeChartInstance) {
    slopeChartInstance.destroy();
  }

  slopeChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: limitedLabels,  // Sumbu X menggunakan nomor ID
      datasets: [
        {
          label: 'Input Kemiringan',
          data: limitedSlopeData,
          borderColor: 'rgba(153, 102, 255, 1)',
          fill: false,
          tension: 0.1
        },
        {
          label: 'Output Kemiringan',
          data: limitedOutputSlopeData,
          borderColor: 'rgba(255, 99, 132, 1)',
          fill: false,
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Grafik Kemiringan'
        }
      },
      scales: {
        x: { title: { display: true, text: 'Nomor Simulasi' } }, // Ganti judul sumbu X
        y: { title: { display: true, text: 'Derajat' } }
      }
    }
  });
}

function createRainfallChart(id, labels, rainfallData, outputRainfallData) {
  const ctx = document.getElementById(id).getContext('2d');

  // Ambil hanya 20 data terakhir sesuai interval
  const interval = 20; // Ganti ini dengan logika interval sesuai keinginan Anda
  const limitedLabels = labels.slice(-interval);  // Gunakan nomor ID untuk sumbu X
  const limitedRainfallData = rainfallData.slice(-interval);
  const limitedOutputRainfallData = outputRainfallData.slice(-interval);

  if (rainfallChartInstance) {
    rainfallChartInstance.destroy();
  }

  rainfallChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: limitedLabels,  // Sumbu X menggunakan nomor ID
      datasets: [
        {
          label: 'Input Curah Hujan',
          data: limitedRainfallData,
          borderColor: 'rgba(255, 159, 64, 1)',
          fill: false,
          tension: 0.1
        },
        {
          label: 'Output Curah Hujan',
          data: limitedOutputRainfallData,
          borderColor: 'rgba(255, 206, 86, 1)',
          fill: false,
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Grafik Curah Hujan'
        }
      },
      scales: {
        x: { title: { display: true, text: 'Nomor Simulasi' } }, // Ganti judul sumbu X
        y: { title: { display: true, text: 'Curah Hujan (mm)' } }
      }
    }
  });
}

function downloadExcel() {
  const table = document.getElementById('simulationTableBody');
  const header = ['No', 'Waktu', 'Kelembaban Tanah 1', 'Kelembaban Tanah 2', 'Kelembaban Tanah 3', 'Kelembaban Tanah 4', 'Kelembaban Tanah 5', 'Kelembaban Tanah 6', 'Input Kemiringan', 'Output Kemiringan', 'Curah Hujan'];
  const rows = Array.from(table.rows);

  // Menambahkan header ke data
  const data = [header]; // Menambahkan header pada array data
  rows.forEach(row => {
    const cells = Array.from(row.cells);
    data.push(cells.map(cell => cell.textContent)); // Mengambil konten dari setiap cell di setiap baris
  });

  // Membuat worksheet dari data
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Simulasi");

  // Menulis dan mengunduh file Excel
  XLSX.writeFile(wb, "data_simulasi.xlsx");
}


document.addEventListener('DOMContentLoaded', () => {
  const loadingPage = document.getElementById('loadingPage');
  if (loadingPage) {
    setTimeout(() => {
      loadingPage.classList.add('hidden');
    }, 500);
  }

  const body = document.querySelector('body');
  if (body) {
    body.classList.add('loaded');
  }
});

function updateInterval() {
  const interval = document.getElementById('intervalSelector').value;
  if (!window.originalRows || window.originalRows.length === 0) {
    alert('Data tidak ditemukan');
    return;
  }

  // Ambil waktu akhir simulasi dari baris terakhir
  const lastRow = window.originalRows[window.originalRows.length - 1];
  const endTime = new Date(lastRow.timestamp || lastRow.created_at);

  let filteredRows;

  if (interval === 'all') {
    filteredRows = window.originalRows;
  } else {
    let durationMs = 0;
    if (interval === '5min') durationMs = 5 * 60 * 1000;
    else if (interval === '15min') durationMs = 15 * 60 * 1000;
    else if (interval === '30min') durationMs = 30 * 60 * 1000;
    else if (interval === '1h') durationMs = 60 * 60 * 1000;

    const startTime = new Date(endTime.getTime() - durationMs);

    filteredRows = window.originalRows.filter(row => {
      const rowTime = new Date(row.timestamp || row.created_at);
      return rowTime >= startTime && rowTime <= endTime;
    });
  }

  displayRawData(filteredRows); // Gantikan renderTable dan renderChart
}

// Fungsi untuk memfilter data berdasarkan interval
function filterDataByInterval(rows, interval) {
  if (interval === 'all') {
    return rows; // tampilkan semua data tanpa filter
  }

  const result = [];
  const now = new Date();
  let gapMinutes = 0;

  switch (interval) {
    case '5min': gapMinutes = 5; break;
    case '15min': gapMinutes = 15; break;
    case '30min': gapMinutes = 30; break;
    case '1h': gapMinutes = 60; break;
    default: return rows; // fallback ke semua data
  }

  // Filter berdasarkan waktu dari sekarang ke belakang
  for (const row of rows) {
    const timestamp = new Date(row.created_at);
    const diffMinutes = (now - timestamp) / (1000 * 60); // selisih dalam menit
    if (diffMinutes <= gapMinutes) {
      result.push(row);
    }
  }

  return result;
}
