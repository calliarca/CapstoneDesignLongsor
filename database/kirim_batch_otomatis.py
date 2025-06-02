import json
import requests
import time
import os
from datetime import datetime

# Fungsi send_batches_and_log tetap sama seperti versi sebelumnya yang sudah bisa:
# - Membuat file log per trial (batch_sending_summary_log_TRIAL_X.txt)
# - Mengakumulasi statistik per trial (processed, saved, skipped, db_errors, dll.)
# - Menampilkan ringkasan di terminal dan di akhir file log.

def send_batches_and_log(json_file_path, batch_script_url, trial_num_for_log_file):
    if not os.path.exists(json_file_path):
        print(f"  Error: File JSON '{json_file_path}' tidak ditemukan untuk Trial #{trial_num_for_log_file}.")
        # Buat file log error jika file tidak ditemukan agar ada jejak
        error_log_filename = f"batch_sending_summary_log_TRIAL_{trial_num_for_log_file}.txt"
        with open(error_log_filename, 'w') as log_f_err: # Menggunakan 'w' untuk membuat file baru jika tidak ada
            log_f_err.write(f"Log Pengiriman Batch - Trial #{trial_num_for_log_file} - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            log_f_err.write(f"Error: File Data '{json_file_path}' tidak ditemukan.\n")
        return None

    try:
        with open(json_file_path, 'r') as f:
            all_batches_data = json.load(f)
        print(f"  Berhasil memuat {len(all_batches_data)} batch dari '{json_file_path}'.")
    except json.JSONDecodeError:
        print(f"  Error: File '{json_file_path}' bukan format JSON yang valid.")
        error_log_filename = f"batch_sending_summary_log_TRIAL_{trial_num_for_log_file}.txt"
        with open(error_log_filename, 'w') as log_f_err:
            log_f_err.write(f"Log Pengiriman Batch - Trial #{trial_num_for_log_file} - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            log_f_err.write(f"Error: File '{json_file_path}' bukan format JSON yang valid.\n")
        return None
    except Exception as e:
        print(f"  Terjadi error saat membaca file JSON: {e}")
        error_log_filename = f"batch_sending_summary_log_TRIAL_{trial_num_for_log_file}.txt"
        with open(error_log_filename, 'w') as log_f_err:
            log_f_err.write(f"Log Pengiriman Batch - Trial #{trial_num_for_log_file} - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            log_f_err.write(f"Terjadi error saat membaca file JSON: {e}\n")
        return None

    if not isinstance(all_batches_data, list) or not all_batches_data: # Tambah cek jika list kosong
        print(f"  Error: Isi file JSON '{json_file_path}' harus berupa array non-kosong dari objek batch.")
        error_log_filename = f"batch_sending_summary_log_TRIAL_{trial_num_for_log_file}.txt"
        with open(error_log_filename, 'w') as log_f_err:
            log_f_err.write(f"Log Pengiriman Batch - Trial #{trial_num_for_log_file} - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            log_f_err.write(f"Error: Isi file JSON '{json_file_path}' harus berupa array non-kosong dari objek batch.\n")
        return None

    headers = {'Content-Type': 'application/json'}
    
    trial_total_processed_server = 0
    trial_total_saved_server = 0    
    trial_total_skipped_server = 0  
    trial_db_errors_server = 0      
    
    trial_php_error_batches_count = 0
    trial_send_failure_batches_count = 0
    total_data_points_in_file = sum(len(b.get('dataPoints', [])) for b in all_batches_data)


    log_file_name = f"batch_sending_summary_log_TRIAL_{trial_num_for_log_file}.txt"
    print(f"  Hasil detail akan disimpan di: {log_file_name}")

    with open(log_file_name, 'w') as log_f:
        log_f.write(f"Log Pengiriman Batch - Trial #{trial_num_for_log_file} - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        log_f.write(f"File Data: {json_file_path}\n")
        log_f.write(f"URL Target: {batch_script_url}\n")
        log_f.write(f"Total batch yang akan dikirim: {len(all_batches_data)}\n")
        
        if all_batches_data:
            first_batch_sample = all_batches_data[0]
            sim_name_log = first_batch_sample.get("simulationName", "N/A")
            kemiringan_log = first_batch_sample.get("derajatKemiringanInput", "N/A")
            curah_hujan_log = first_batch_sample.get("curahHujanInput", "N/A")
            log_f.write(f"Nama Simulasi (dari file): {sim_name_log}\n")
            log_f.write(f"Input Kemiringan (dari file): {kemiringan_log}\n")
            log_f.write(f"Input Curah Hujan (dari file): {curah_hujan_log}\n")
        log_f.write("--------------------------------------------------\n\n")

        for i, single_batch_payload in enumerate(all_batches_data):
            batch_number_in_file = i + 1
            log_entry_prefix = f"Batch #{batch_number_in_file} dari {len(all_batches_data)} (Trial {trial_num_for_log_file})"
            print(f"\n--- {log_entry_prefix} ---")
            log_f.write(f"--- {log_entry_prefix} ---\n")
            print(f"  Mengirim batch #{batch_number_in_file}...")

            if not isinstance(single_batch_payload, dict) or \
               'simulationName' not in single_batch_payload or \
               'dataPoints' not in single_batch_payload or \
               not isinstance(single_batch_payload.get('dataPoints'), list):
                warning_msg = "Struktur batch tidak valid. Dilewati."
                print(f"  Peringatan: {warning_msg}")
                log_f.write(f"  Peringatan: {warning_msg}\n")
                log_f.write(f"  Isi batch (parsial): {json.dumps(single_batch_payload, indent=2)[:200]}...\n\n")
                trial_php_error_batches_count += 1
                continue

            try:
                num_dp_in_batch = len(single_batch_payload.get('dataPoints', []))
                log_f.write(f"  Jumlah Data Points di Batch ini: {num_dp_in_batch}\n")
                if num_dp_in_batch == 0:
                    log_f.write(f"  Peringatan: Batch #{batch_number_in_file} tidak memiliki data points. Dilewati.\n")
                    print(f"  Peringatan: Batch #{batch_number_in_file} tidak memiliki data points. Dilewati.")
                    continue # Lewati batch kosong

                first_dp_ts_log = single_batch_payload['dataPoints'][0]['client_timestamp'] if single_batch_payload['dataPoints'] else "N/A"
                log_f.write(f"  Timestamp Data Point Pertama: {first_dp_ts_log}\n")
                
                response = requests.post(batch_script_url, headers=headers, data=json.dumps(single_batch_payload), timeout=30)
                
                log_f.write(f"  Status Code Server: {response.status_code}\n")
                print(f"  Status Code Server: {response.status_code}")

                response_json_parsed_successfully = False
                try:
                    response_json = response.json()
                    response_json_parsed_successfully = True
                    log_f.write(f"  Respons Server (JSON): {json.dumps(response_json)}\n")
                    print(f"  Respons Server (JSON): {json.dumps(response_json, indent=2)}")

                    trial_total_processed_server += response_json.get("processed", 0)
                    trial_total_saved_server += response_json.get("saved", 0)
                    trial_total_skipped_server += response_json.get("skipped_total", 0)
                    
                    if "db_errors_details" in response_json and response_json["db_errors_details"]:
                        num_db_errors_in_batch = len(response_json["db_errors_details"])
                        trial_db_errors_server += num_db_errors_in_batch
                        # Hitung sebagai PHP error batch jika ada DB error DAN statusnya error
                        if num_db_errors_in_batch > 0 and response_json.get("status") == "error":
                             trial_php_error_batches_count +=1
                    
                    # Hitung sebagai PHP error batch jika statusnya error dan belum dihitung sebagai DB error batch
                    if response_json.get("status") == "error":
                        is_counted_as_db_error_batch = "db_errors_details" in response_json and response_json["db_errors_details"] and len(response_json["db_errors_details"]) > 0 and response_json.get("status") == "error"
                        if not is_counted_as_db_error_batch:
                            trial_php_error_batches_count +=1


                except json.JSONDecodeError:
                    error_text = f"  Respons Server (Bukan JSON): {response.text[:500]}...\n"
                    print(error_text)
                    log_f.write(error_text)
                    if response.status_code >= 400 : # Jika status code error dan bukan JSON, hitung sbg PHP error
                        trial_php_error_batches_count +=1
                
                response.raise_for_status() # Akan raise error untuk status codes 4xx/5xx

            except requests.exceptions.HTTPError as http_err:
                error_detail = f"  Terjadi HTTP error untuk batch #{batch_number_in_file}: {http_err}\n"
                print(error_detail)
                log_f.write(error_detail)
                if response is not None and response.text:
                     log_f.write(f"  Response Body: {response.text[:500]}\n")
                trial_send_failure_batches_count += 1 # Dihitung sebagai send failure karena HTTP error dari server
                # Tidak break, lanjutkan ke batch berikutnya
            except requests.exceptions.RequestException as req_err:
                error_detail = f"  Terjadi Request error (misal koneksi) untuk batch #{batch_number_in_file}: {req_err}\n"
                print(error_detail)
                log_f.write(error_detail)
                trial_send_failure_batches_count += 1
                # REVISI: Jangan break, lanjutkan ke batch berikutnya
                print(f"  Melanjutkan ke batch berikutnya setelah RequestException...")
                log_f.write(f"  Melanjutkan ke batch berikutnya setelah RequestException...\n")
                # break # BARIS INI DIHAPUS/DIKOMENTARI
                continue # Lanjutkan ke batch berikutnya
            except Exception as e:
                error_detail = f"  Terjadi error tidak terduga saat memproses batch #{batch_number_in_file}: {e}\n"
                print(error_detail)
                log_f.write(error_detail)
                trial_send_failure_batches_count += 1 # Atau kategori error lain jika perlu
                # Tidak break, lanjutkan ke batch berikutnya
            
            log_f.write("\n")
            print(f"  Batch #{batch_number_in_file} selesai diproses. Menunggu sebelum batch berikutnya...")
            time.sleep(0.1) # Mengurangi sleep time sedikit

        log_f.write("\n--- RINGKASAN UNTUK TRIAL INI ---\n")
        log_f.write(f"Total Data Points Seharusnya (dari file JSON): {total_data_points_in_file}\n")
        log_f.write(f"Total Batch di File Sumber: {len(all_batches_data)}\n")
        log_f.write(f"Total Batch Gagal Terkirim (Network/Timeout/HTTP Error dari requests): {trial_send_failure_batches_count}\n")
        log_f.write(f"Total Batch dengan Respons Error dari PHP (Struktur Salah/DB Error/PHP Internal Error): {trial_php_error_batches_count}\n")
        log_f.write("----------------------------------\n")
        log_f.write(f"Total Data Points (berdasarkan respons server untuk trial ini):\n")
        log_f.write(f"  - Diproses oleh Server: {trial_total_processed_server}\n")
        log_f.write(f"  - Berhasil Disimpan (Data Valid menurut Server): {trial_total_saved_server}\n")
        log_f.write(f"  - Dilewati (Validasi/Duplikat oleh PHP): {trial_total_skipped_server}\n")
        log_f.write(f"  - Error Database (berdasarkan 'db_errors_details' pada respons): {trial_db_errors_server}\n")
        log_f.write("--------------------------------------------------\n")

        return {
            "trial_num": trial_num_for_log_file,
            "file_path": json_file_path,
            "total_dp_in_file": total_data_points_in_file,
            "processed_dp_server": trial_total_processed_server,
            "saved_dp_server": trial_total_saved_server,      
            "skipped_dp_server": trial_total_skipped_server,
            "db_errors_dp_server": trial_db_errors_server,
            "php_error_batches": trial_php_error_batches_count,
            "send_failure_batches": trial_send_failure_batches_count,
            "total_batches_in_file": len(all_batches_data)
        }

if __name__ == "__main__":
    url_skrip_php = "http://twins.gradien.my.id/landslide/backend/php/save_simulation_batch.php"
    # Pastikan ini adalah nama folder yang dihasilkan oleh skrip generate_data_simulasi.py terakhir
    data_folder = "data_simulasi_5_trial_target_80_valid_low_start_humidity_v1" 
    
    overall_stats_filename = "overall_validation_stats_php_ch_adj_v1.json" # Sesuaikan nama file output
    
    print(f"Skrip Otomatisasi Pengiriman Batch Data dengan Logging untuk 5 Trial")
    print(f"==================================================================")
    print(f"Menggunakan data dari folder: '{data_folder}'")
    print(f"Hasil ringkasan akan disimpan di file 'batch_sending_summary_log_TRIAL_X.txt'")
    print(f"Statistik gabungan akan disimpan di '{overall_stats_filename}'")
    print(f"Pastikan server lokal (XAMPP, dll.) dan database MySQL sudah berjalan.")
    print(f"Pastikan juga skrip 'generate_data_simulasi.py' sudah dijalankan dan menghasilkan file di folder '{data_folder}'.")
    
    all_trials_summary_for_visualization = []

    # Sesuaikan dengan konfigurasi di generate_data_simulasi.py (terutama curah_hujan untuk trial 3)
    trials_config_for_sending = [
        {"trial_num": "1", "kemiringan": 10, "curah_hujan": 5,  "deskripsi": "KmrRendah_HujanRingan"},
        {"trial_num": "2", "kemiringan": 20, "curah_hujan": 18, "deskripsi": "KmrSedang_HujanTinggi"},
        {"trial_num": "3", "kemiringan": 35, "curah_hujan": 2,  "deskripsi": "KmrTinggi_HujanSangatRingan"}, # Diubah dari 3 ke 2
        {"trial_num": "4", "kemiringan": 5,  "curah_hujan": 0,  "deskripsi": "KmrSangatRendah_TanpaHujan"},
        {"trial_num": "5", "kemiringan": 40, "curah_hujan": 12, "deskripsi": "KmrSangatTinggi_HujanSedang"}
    ]

    for trial_number_loop in range(1, 6):
        nama_file_json_data_trial = os.path.join(data_folder, f"data_simulasi_trial_{trial_number_loop}.json")
        
        current_trial_config = {}
        for tc in trials_config_for_sending:
            if tc["trial_num"] == str(trial_number_loop):
                current_trial_config = tc
                break
        
        print(f"\n\n====================================================")
        print(f"MEMULAI PENGUJIAN UNTUK TRIAL #{trial_number_loop}: {current_trial_config.get('deskripsi', f'K:{current_trial_config.get("kemiringan", "N/A")}, CH:{current_trial_config.get("curah_hujan", "N/A")}mm')}")
        print(f"File data: {nama_file_json_data_trial}")
        print(f"====================================================")
        
        # input(f"Tekan Enter untuk memulai pengiriman Trial #{trial_number_loop}...") 

        trial_run_results = send_batches_and_log(nama_file_json_data_trial, url_skrip_php, trial_number_loop)
        
        if trial_run_results:
            persentase_valid_trial = 0
            if trial_run_results['total_dp_in_file'] > 0 :
                persentase_valid_trial = (trial_run_results['saved_dp_server'] / trial_run_results['total_dp_in_file']) * 100
            
            summary_for_vis = {
                "trial": trial_run_results['trial_num'],
                "status_trial": "COMPLETED",
                "deskripsi": current_trial_config.get('deskripsi', 'N/A'),
                "file": trial_run_results['file_path'],
                "derajatKemiringanInput": current_trial_config.get("kemiringan", "N/A"),
                "curahHujanInput": current_trial_config.get("curah_hujan", "N/A"),
                "total_raw_data": trial_run_results['total_dp_in_file'],
                "total_valid_data_server": trial_run_results['saved_dp_server'], 
                "total_skipped_data_server": trial_run_results['skipped_dp_server'],
                "persentase_valid_server": round(persentase_valid_trial, 2)
            }
            all_trials_summary_for_visualization.append(summary_for_vis)
            
            print(f"\n--- Ringkasan untuk Trial #{trial_run_results['trial_num']} (tersimpan di log juga) ---")
            print(f"  Total Batch di File: {trial_run_results['total_batches_in_file']}")
            print(f"  Total DP di File (Raw): {trial_run_results['total_dp_in_file']}")
            print(f"  DP Diproses Server: {trial_run_results['processed_dp_server']}, Disimpan Server (Valid): {trial_run_results['saved_dp_server']}, Dilewati Server: {trial_run_results['skipped_dp_server']}")
            print(f"  Persentase Valid (berdasarkan server): {persentase_valid_trial:.2f}%")
            print(f"  Batch Gagal Kirim (Network/HTTP Error): {trial_run_results['send_failure_batches']}")
            print(f"  Batch dengan Respons Error dari PHP: {trial_run_results['php_error_batches']}")
        else: 
             all_trials_summary_for_visualization.append({
                "trial": trial_number_loop, 
                "status_trial": "FAILED_TO_PROCESS_FILE (File not found or JSON error)",
                "deskripsi": current_trial_config.get('deskripsi', 'N/A'),
                "file": nama_file_json_data_trial,
                "derajatKemiringanInput": current_trial_config.get("kemiringan", "N/A"),
                "curahHujanInput": current_trial_config.get("curah_hujan", "N/A"),
                "total_raw_data": 0,
                "total_valid_data_server": 0,
                "persentase_valid_server": 0
            })
        
        if trial_number_loop < 5:
            print("\nMenunggu 1 detik sebelum trial berikutnya...") 
            time.sleep(1) # Mengurangi waktu tunggu antar trial
    
    with open(overall_stats_filename, 'w') as f_stats:
        json.dump(all_trials_summary_for_visualization, f_stats, indent=2)
    print(f"\nStatistik gabungan untuk visualisasi disimpan di: '{overall_stats_filename}'")

    print(f"\n\n===== RINGKASAN SEMUA TRIAL PENGUJIAN (dari file {overall_stats_filename}) =====")
    grand_total_raw = 0
    grand_total_valid_server = 0
    completed_trials_count = 0

    for summary_item in all_trials_summary_for_visualization:
        print(f"Trial #{summary_item.get('trial', 'N/A')} - {summary_item.get('deskripsi', '')}:")
        if "COMPLETED" not in summary_item.get('status_trial', ""):
            print(f"  Status: {summary_item['status_trial']} - File: {summary_item['file']}")
        else:
            completed_trials_count +=1
            print(f"  File Data: {summary_item.get('file', 'N/A')}")
            print(f"  Input: Kmr={summary_item.get('derajatKemiringanInput','N/A')}°, CH={summary_item.get('curahHujanInput','N/A')}mm")
            print(f"  Total Data Raw: {summary_item.get('total_raw_data', 'N/A')}")
            print(f"  Total Data Valid (Server): {summary_item.get('total_valid_data_server', 'N/A')}")
            print(f"  Total Data Dilewati (Server): {summary_item.get('total_skipped_data_server', 'N/A')}")
            print(f"  Persentase Valid (Server): {summary_item.get('persentase_valid_server', 'N/A')}%")
            grand_total_raw += summary_item.get('total_raw_data', 0)
            grand_total_valid_server += summary_item.get('total_valid_data_server', 0)
        print("-------------------------------------------")
    
    if grand_total_raw > 0:
        overall_percentage_valid = (grand_total_valid_server / grand_total_raw) * 100
        print(f"\nTotal Keseluruhan dari {completed_trials_count} Trial yang Berhasil Diproses:")
        print(f"  Total Data Raw Keseluruhan: {grand_total_raw}")
        print(f"  Total Data Valid Keseluruhan (Server): {grand_total_valid_server}")
        print(f"  Persentase Valid Keseluruhan (Server): {overall_percentage_valid:.2f}%")
    elif completed_trials_count == 0 and len(all_trials_summary_for_visualization) > 0:
        print("\nTidak ada trial yang berhasil diproses. Tidak dapat menghitung statistik keseluruhan.")


    print("\n===== SEMUA TRIAL PENGUJIAN SELESAI =====")
    print(f"Cek file 'batch_sending_summary_log_TRIAL_X.txt' untuk detail setiap trial dan '{overall_stats_filename}' untuk data grafik.")
    print("Pastikan server PHP/MySQL berjalan dan siap menerima data.")
    print("Selesai.")   