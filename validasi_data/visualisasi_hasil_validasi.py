import json
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import os
import numpy as np
import pandas as pd # Untuk membaca CSV lebih mudah
from datetime import datetime

# --- Konfigurasi Global untuk Plot ---
plt.style.use('seaborn-v0_8-whitegrid') # Menggunakan style yang umum tersedia
# Konfigurasi font kustom dihapus untuk menggunakan font default Matplotlib
output_image_dir = "grafik_validasi"

# Konstanta yang mungkin digunakan dari skrip generator, untuk konsistensi plot
MAX_CURAH_HUJAN_OUTPUT_DP_PHP_VALIDATION_LIMIT = 25 # Batas atas validasi PHP untuk output curah hujan

# Pastikan folder output ada
if not os.path.exists(output_image_dir):
    os.makedirs(output_image_dir)
    print(f"Folder '{output_image_dir}' telah dibuat untuk menyimpan gambar grafik.")

# Warna yang konsisten untuk grafik
colors = ['#2E86C1', '#E74C3C', '#2ECC71', '#F39C12', '#8E44AD'] # Biru, Merah, Hijau, Oranye, Ungu
color_raw = '#AED6F1'       # Biru muda untuk data mentah
color_valid = '#28B463'     # Hijau untuk data valid
color_skipped = '#E74C3C'   # Merah untuk data dilewati/error
color_input = '#F39C12'     # Oranye untuk nilai input
color_output = '#3498DB'    # Biru untuk nilai output sensor
color_humidity = '#1ABC9C'  # Pirus untuk kelembaban
color_rain_period = '#D2B4DE' # Lavender muda untuk periode hujan

def plot_chasing_graph(csv_filepath, trial_num, deskripsi_trial, kemiringan_input_val, curah_hujan_input_val):
    """
    Membuat dan menyimpan grafik 'mengejar' (chasing graph) untuk data sensor dari satu trial.
    Grafik ini akan menampilkan output sensor dibandingkan dengan nilai inputnya dari waktu ke waktu,
    serta data kelembaban tanah dan periode hujan.
    """
    if not os.path.exists(csv_filepath):
        print(f"  PERINGATAN: File CSV data detail '{csv_filepath}' untuk Trial {trial_num} TIDAK DITEMUKAN. Grafik mengejar dilewati.")
        return

    try:
        df = pd.read_csv(csv_filepath)
    except Exception as e:
        print(f"  Error membaca file CSV '{csv_filepath}': {e}. Grafik mengejar dilewati.")
        return

    if df.empty or 't_seconds' not in df.columns:
        print(f"  File CSV '{csv_filepath}' kosong atau tidak memiliki kolom 't_seconds'. Grafik mengejar dilewati.")
        return

    sample_rate = max(1, len(df) // 1000) # Ambil maksimal 1000 poin untuk plot
    df_sample = df.iloc[::sample_rate,:].copy()

    if df_sample.empty:
        print(f"  Tidak ada data sampel di '{csv_filepath}' setelah sampling. Grafik mengejar dilewati.")
        return

    time_seconds = df_sample['t_seconds']

    fig, ax1 = plt.subplots(figsize=(14, 7))
    # Menggunakan font default untuk suptitle
    fig.suptitle(f'Analisis Data Sensor vs Input - {deskripsi_trial} (Trial {trial_num})', fontsize=14, fontweight='bold', y=0.97)

    # Plot Kemiringan
    ax1.plot(time_seconds, df_sample['outputKemiringan_before_error'], label=f'Output Kemiringan Sensor (°)', color=color_output, linewidth=2)
    ax1.axhline(y=kemiringan_input_val, color=color_input, linestyle='--', label=f'Input Kemiringan Target ({kemiringan_input_val}°)')
    ax1.set_xlabel('Waktu Simulasi (detik)') # Font default
    ax1.set_ylabel('Kemiringan (°)', color=color_output) # Font default
    ax1.tick_params(axis='y', labelcolor=color_output)
    ax1.grid(True, linestyle=':', linewidth=0.7, alpha=0.7)

    # Buat sumbu Y kedua untuk Curah Hujan
    ax2 = ax1.twinx()
    ax2.plot(time_seconds, df_sample['outputCurahHujan_before_error'], label=f'Output Curah Hujan Sensor (mm/jam)', color=color_rain_period, linewidth=2, linestyle='-')
    if curah_hujan_input_val > 0: 
        ax2.axhline(y=curah_hujan_input_val, color=color_input, linestyle=':', label=f'Input Curah Hujan Target ({curah_hujan_input_val} mm/jam)', alpha=0.7)
    ax2.set_ylabel('Curah Hujan (mm/jam)', color=color_rain_period) # Font default
    ax2.tick_params(axis='y', labelcolor=color_rain_period)
    ax2.set_ylim(min(0, df_sample['outputCurahHujan_before_error'].min() -1), max(MAX_CURAH_HUJAN_OUTPUT_DP_PHP_VALIDATION_LIMIT + 2, df_sample['outputCurahHujan_before_error'].max() + 2) )
    
    # Plot Kelembaban Tanah (misal kt1_sim) di sumbu Y ketiga jika ada
    if 'kt1_sim' in df_sample.columns:
        ax3 = ax1.twinx()
        ax3.spines["right"].set_position(("outward", 60)) 
        ax3.plot(time_seconds, df_sample['kt1_sim'], label='Kelembaban Tanah 1 (%)', color=color_humidity, linestyle='-.', linewidth=1.5)
        ax3.set_ylabel('Kelembaban Tanah (%)', color=color_humidity) # Font default
        ax3.tick_params(axis='y', labelcolor=color_humidity)
        ax3.set_ylim(0, 105) 

    if 'is_raining_period' in df_sample.columns:
        rain_periods = df_sample[df_sample['is_raining_period'] == 1]
        if not rain_periods.empty:
            start_rain = None
            for idx, row in df_sample.iterrows():
                if row['is_raining_period'] == 1 and start_rain is None:
                    start_rain = row['t_seconds']
                elif row['is_raining_period'] == 0 and start_rain is not None:
                    ax1.axvspan(start_rain, row['t_seconds'], facecolor=color_rain_period, alpha=0.2, label='Periode Hujan (Simulasi)' if start_rain == rain_periods['t_seconds'].iloc[0] else "_nolegend_")
                    start_rain = None
            if start_rain is not None: 
                 ax1.axvspan(start_rain, time_seconds.iloc[-1], facecolor=color_rain_period, alpha=0.2, label='Periode Hujan (Simulasi)' if start_rain == rain_periods['t_seconds'].iloc[0] else "_nolegend_")

    lines, labels = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    if 'ax3' in locals(): 
        lines3, labels3 = ax3.get_legend_handles_labels()
        fig.legend(lines + lines2 + lines3, labels + labels2 + labels3, loc='upper center', ncol=3, bbox_to_anchor=(0.5, 0.92)) # Tanpa prop
    else:
        fig.legend(lines + lines2, labels + labels2, loc='upper center', ncol=3, bbox_to_anchor=(0.5, 0.92)) # Tanpa prop

    plt.title(f"Input Kemiringan: {kemiringan_input_val}°, Input Curah Hujan: {curah_hujan_input_val} mm/jam", fontsize=10, y=1.08) 
    
    ax1.set_ylim(min(0, df_sample['outputKemiringan_before_error'].min() - 5), max(46, df_sample['outputKemiringan_before_error'].max() + 5))

    plt.tight_layout(rect=[0, 0, 1, 0.92]) 
    filename_chasing = os.path.join(output_image_dir, f"grafik_mengejar_trial_{trial_num}.png")
    plt.savefig(filename_chasing, dpi=150)
    print(f"  Grafik 'mengejar' untuk Trial {trial_num} disimpan di: {filename_chasing}")
    plt.close(fig)


def plot_per_trial_validation_summary(trials_data):
    """
    Membuat dan menyimpan grafik batang yang merangkum persentase validasi
    dan perbandingan data mentah vs valid untuk setiap trial.
    """
    if not trials_data:
        print("Tidak ada data trial untuk divisualisasikan (per trial).")
        return

    num_trials = len(trials_data)
    trial_labels = [f"Trial {t['trial']}\n({t.get('deskripsi','').replace('_', ' ')[:20]})" for t in trials_data]
    persentase_valid = [t['persentase_valid_server'] for t in trials_data]
    total_raw = [t['total_raw_data'] for t in trials_data]
    total_valid = [t['total_valid_data_server'] for t in trials_data]
    total_skipped = [t.get('total_skipped_data_server', t['total_raw_data'] - t['total_valid_data_server']) for t in trials_data]

    fig1, ax1 = plt.subplots(figsize=(max(10, num_trials * 1.8), 6))
    bars_percent = ax1.bar(trial_labels, persentase_valid, color=colors[:num_trials], alpha=0.8, edgecolor='grey')
    ax1.set_ylabel('Persentase Valid (%)') # Font default
    ax1.set_title('Persentase Data Valid per Trial Simulasi (Menurut Server)', fontsize=14, fontweight='bold') # Font default
    ax1.set_ylim(0, 110)
    ax1.yaxis.set_major_formatter(mticker.PercentFormatter())
    ax1.grid(True, linestyle='--', linewidth=0.5, alpha=0.7, axis='y')
    
    for bar in bars_percent:
        yval = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width()/2.0, yval + 2, f"{yval:.2f}%", ha='center', va='bottom', fontsize=9)

    plt.xticks(rotation=15, ha="right") # Font default
    plt.yticks() # Font default
    plt.tight_layout(pad=1.5)
    filename_percent = os.path.join(output_image_dir, "grafik_validasi_persentase_per_trial.png")
    plt.savefig(filename_percent, dpi=150)
    print(f"Grafik persentase valid per trial disimpan di: {filename_percent}")
    plt.close(fig1)

    fig2, ax2 = plt.subplots(figsize=(max(12, num_trials * 2.2), 7))
    x = np.arange(num_trials)
    width = 0.28

    rects1 = ax2.bar(x - width, total_raw, width, label='Total Data Mentah (File)', color=color_raw, alpha=0.9, edgecolor='darkgrey')
    rects2 = ax2.bar(x, total_valid, width, label='Data Valid (Disimpan Server)', color=color_valid, alpha=0.9, edgecolor='darkgrey')
    rects3 = ax2.bar(x + width, total_skipped, width, label='Data Dilewati (Server)', color=color_skipped, alpha=0.7, edgecolor='darkgrey')

    ax2.set_ylabel('Jumlah Data Points') # Font default
    ax2.set_title('Perbandingan Jumlah Data Mentah, Valid, dan Dilewati per Trial', fontsize=14, fontweight='bold') # Font default
    ax2.set_xticks(x)
    ax2.set_xticklabels(trial_labels) # Font default
    ax2.legend() # Tanpa prop
    ax2.grid(True, linestyle=':', linewidth=0.5, alpha=0.6, axis='y')
    ax2.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x_val, pos: f'{int(x_val):,}'))

    def autolabel(rects, ax):
        for rect in rects:
            height = rect.get_height()
            if height > 0: 
                ax.annotate(f'{int(height):,}',
                            xy=(rect.get_x() + rect.get_width() / 2, height),
                            xytext=(0, 3),
                            textcoords="offset points",
                            ha='center', va='bottom', fontsize=8)
    autolabel(rects1, ax2)
    autolabel(rects2, ax2)
    autolabel(rects3, ax2)
    
    plt.xticks(rotation=15, ha="right") # Font default
    plt.yticks() # Font default
    plt.tight_layout(pad=1.5)
    filename_counts = os.path.join(output_image_dir, "grafik_validasi_jumlah_data_per_trial.png")
    plt.savefig(filename_counts, dpi=150)
    print(f"Grafik jumlah data per trial disimpan di: {filename_counts}")
    plt.close(fig2)


def plot_overall_total_validation(all_trials_data):
    if not all_trials_data:
        print("Tidak ada data untuk membuat grafik total keseluruhan.")
        return

    grand_total_raw = sum(t['total_raw_data'] for t in all_trials_data if t.get('status_trial') == "COMPLETED")
    grand_total_valid_server = sum(t['total_valid_data_server'] for t in all_trials_data if t.get('status_trial') == "COMPLETED")
    
    if grand_total_raw == 0:
        print("Total data mentah adalah 0, tidak dapat membuat grafik total keseluruhan.")
        return
        
    overall_percentage_valid_all_trials = (grand_total_valid_server / grand_total_raw) * 100 if grand_total_raw > 0 else 0
    labels_overall = ['Total Data Mentah', 'Total Data Valid (Server)']
    values_overall = [grand_total_raw, grand_total_valid_server]

    fig, ax = plt.subplots(figsize=(8, 6))
    bars_overall_total = ax.bar(labels_overall, values_overall, color=[color_raw, color_valid], width=0.5, alpha=0.8, edgecolor='grey')
    
    ax.set_ylabel('Jumlah Data Points') # Font default
    ax.set_title(f'Total Data Raw vs Valid dari Semua Simulasi', fontsize=14, fontweight='bold') # Font default
    ax.text(0.5, 0.94, f'(Persentase Valid Keseluruhan: {overall_percentage_valid_all_trials:.2f}%)', 
             horizontalalignment='center', verticalalignment='center', transform=ax.transAxes, fontsize=10, color='dimgray')
    ax.grid(True, linestyle='-', linewidth=0.5, alpha=0.6, axis='y')
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x_val, pos: f'{int(x_val):,}'))

    for bar in bars_overall_total:
        yval = bar.get_height()
        if yval > 0:
            ax.text(bar.get_x() + bar.get_width()/2.0, yval + max(1, 0.01 * grand_total_raw) , f"{int(yval):,}", ha='center', va='bottom', fontsize=9, fontweight='medium') 
    
    plt.xticks() # Font default
    plt.yticks() # Font default
    plt.tight_layout(pad=2.0)
    filename_overall_total = os.path.join(output_image_dir, "grafik_validasi_total_gabungan.png")
    plt.savefig(filename_overall_total, dpi=150)
    print(f"Grafik total keseluruhan disimpan di: {filename_overall_total}")
    plt.close(fig)


def main():
    data_folder_from_generator = "data_simulasi_5_trial_target_80_valid_low_start_humidity_v1" 
    summary_json_filename = "overall_validation_stats_php_ch_adj_v1.json" 
    trial_1_csv_filename = "trial_1_sensor_data_low_start_humidity.csv"
    trial_1_csv_filepath = os.path.join(data_folder_from_generator, trial_1_csv_filename)

    print(f"Memulai Visualisasi Hasil Validasi...")
    print(f"Membaca data dari: {summary_json_filename}")
    print(f"Mencari CSV untuk Trial 1 di: {trial_1_csv_filepath}")

    if not os.path.exists(summary_json_filename):
        print(f"Error: File statistik '{summary_json_filename}' tidak ditemukan.")
        print("Pastikan skrip 'kirim_batch_otomatis.py' sudah dijalankan dan menghasilkan file ini.")
        return

    try:
        with open(summary_json_filename, 'r') as f:
            all_trials_summary_data = json.load(f)
    except json.JSONDecodeError:
        print(f"Error: File '{summary_json_filename}' bukan format JSON yang valid.")
        return
    except Exception as e:
        print(f"Error saat membaca file '{summary_json_filename}': {e}")
        return

    if not all_trials_summary_data or not isinstance(all_trials_summary_data, list):
        print(f"File '{summary_json_filename}' kosong atau formatnya tidak sesuai (harus berupa list JSON).")
        return
        
    completed_trials_data = [t for t in all_trials_summary_data if t.get('status_trial') == "COMPLETED"]

    if not completed_trials_data:
        print("Tidak ada trial yang berhasil diselesaikan (status 'COMPLETED') dalam file ringkasan.")
    else:
        plot_per_trial_validation_summary(completed_trials_data)
        plot_overall_total_validation(completed_trials_data)

    trial_1_data = next((item for item in all_trials_summary_data if str(item.get("trial")) == "1"), None)

    if trial_1_data and trial_1_data.get('status_trial') == "COMPLETED":
        plot_chasing_graph(
            csv_filepath=trial_1_csv_filepath,
            trial_num="1",
            deskripsi_trial=trial_1_data.get('deskripsi', 'Trial 1'),
            kemiringan_input_val=trial_1_data.get('derajatKemiringanInput', 0),
            curah_hujan_input_val=trial_1_data.get('curahHujanInput', 0)
        )
    elif os.path.exists(trial_1_csv_filepath): 
         print(f"  INFO: Data Trial 1 di '{summary_json_filename}' mungkin tidak lengkap, tapi file CSV '{trial_1_csv_filepath}' ditemukan. Mencoba membuat grafik mengejar dengan nilai input default.")
         kemiringan_input_default = 10 
         curah_hujan_input_default = 5  
         deskripsi_default = "KmrRendah_HujanRingan" 

         if trial_1_data: 
             kemiringan_input_default = trial_1_data.get('derajatKemiringanInput', kemiringan_input_default)
             curah_hujan_input_default = trial_1_data.get('curahHujanInput', curah_hujan_input_default)
             deskripsi_default = trial_1_data.get('deskripsi', deskripsi_default)

         plot_chasing_graph(
            csv_filepath=trial_1_csv_filepath,
            trial_num="1",
            deskripsi_trial=deskripsi_default,
            kemiringan_input_val=kemiringan_input_default,
            curah_hujan_input_val=curah_hujan_input_default
        )
    else:
        print(f"Data untuk Trial 1 tidak ditemukan atau tidak lengkap di '{summary_json_filename}', dan file CSV '{trial_1_csv_filepath}' juga tidak ditemukan. Grafik mengejar untuk Trial 1 dilewati.")

    print(f"\nVisualisasi selesai. Grafik disimpan di folder: '{output_image_dir}'")

if __name__ == "__main__":
    main()
