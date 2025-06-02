import json
from datetime import datetime, timedelta
import random
import os
import csv
import numpy as np # Diperlukan untuk np.log

# --- KONSTANTA UNTUK GENERATE DATA ---
MIN_KELEMBABAN_DP = 0
MAX_KELEMBABAN_DP = 100
MIN_KEMIRINGAN_OUTPUT_DP = 0
MAX_KEMIRINGAN_OUTPUT_DP = 45
MIN_CURAH_HUJAN_OUTPUT_DP = 0 # Rentang dasar output sensor
MAX_CURAH_HUJAN_OUTPUT_DP_PHP_VALIDATION_LIMIT = 25 # Batas atas validasi PHP untuk output
MAX_CURAH_HUJAN_INPUT_BATCH = 25 # Batas atas validasi PHP untuk input per batch (BARU DITAMBAHKAN)

# Threshold Outlier Python (untuk menghasilkan variasi data agar sebagian ditangkap PHP)
# PHP Outlier thresholds: Kemiringan > 10, Curah Hujan > 50, Kelembaban % > 30
OUTLIER_KEMIRINGAN_DEVIATION_DP_PYTHON_BASE = 9
OUTLIER_CURAHHUJAN_DEVIATION_DP_PYTHON_BASE = 9 # PHP tidak akan anggap ini outlier deviasi (threshold 50)
OUTLIER_KELEMBABAN_DEVIATION_PERCENT_DP_PYTHON_BASE = 29
# --- AKHIR KONFIGURASI KONSTANTA ---

def introduce_range_error(data_point_dict, trial_num_str, t_seconds):
    dp = data_point_dict.copy()
    error_type = random.choice(["kt1_high", "kt2_low", "ok_high", "ok_low", "och_high_php_limit"])
    original_values = {k: dp.get(k) for k in ["kelembabanTanah1", "kelembabanTanah2", "outputKemiringan", "outputCurahHujan"]}

    if error_type == "kt1_high":
        dp["kelembabanTanah1"] = MAX_KELEMBABAN_DP + random.uniform(5, 15)
        print(f"    -> Trial {trial_num_str} DETIK {t_seconds}: ERROR RANGE KT1 ({original_values.get('kelembabanTanah1')} -> {dp['kelembabanTanah1']:.2f}) > MAX")
    elif error_type == "kt2_low":
        dp["kelembabanTanah2"] = MIN_KELEMBABAN_DP - random.uniform(5, 15)
        print(f"    -> Trial {trial_num_str} DETIK {t_seconds}: ERROR RANGE KT2 ({original_values.get('kelembabanTanah2')} -> {dp['kelembabanTanah2']:.2f}) < MIN")
    elif error_type == "ok_high":
        dp["outputKemiringan"] = MAX_KEMIRINGAN_OUTPUT_DP + random.uniform(3, 8)
        print(f"    -> Trial {trial_num_str} DETIK {t_seconds}: ERROR RANGE OK ({original_values.get('outputKemiringan')} -> {dp['outputKemiringan']:.2f}) > MAX")
    elif error_type == "ok_low":
        dp["outputKemiringan"] = MIN_KEMIRINGAN_OUTPUT_DP - random.uniform(3, 8)
        print(f"    -> Trial {trial_num_str} DETIK {t_seconds}: ERROR RANGE OK ({original_values.get('outputKemiringan')} -> {dp['outputKemiringan']:.2f}) < MIN")
    elif error_type == "och_high_php_limit":
        dp["outputCurahHujan"] = MAX_CURAH_HUJAN_OUTPUT_DP_PHP_VALIDATION_LIMIT + random.uniform(1, 5)
        print(f"    -> Trial {trial_num_str} DETIK {t_seconds}: ERROR RANGE OCH ({original_values.get('outputCurahHujan')} -> {dp['outputCurahHujan']:.2f}) > MAX_PHP_LIMIT ({MAX_CURAH_HUJAN_OUTPUT_DP_PHP_VALIDATION_LIMIT})")
    return dp

def introduce_outlier_error(data_point_dict, derajat_kemiringan_input_sim, curah_hujan_input_sim, trial_num_str, t_seconds):
    dp = data_point_dict.copy()
    error_type = random.choice(["ok_outlier", "kt_outlier", "och_outlier"])
    original_values = {k: dp.get(k) for k in ["outputKemiringan", "outputCurahHujan"] + [f"kelembabanTanah{j+1}" for j in range(6)]}

    if error_type == "ok_outlier":
        deviation_to_apply = OUTLIER_KEMIRINGAN_DEVIATION_DP_PYTHON_BASE + random.uniform(0.5, 2.5) # Deviasi 9.5 - 11.5
        potential_outlier_value = derajat_kemiringan_input_sim + random.choice([-1, 1]) * deviation_to_apply
        clamped_outlier_value = max(MIN_KEMIRINGAN_OUTPUT_DP, min(MAX_KEMIRINGAN_OUTPUT_DP, potential_outlier_value))
        dp["outputKemiringan"] = round(clamped_outlier_value, 2)
        final_deviation_from_input = abs(dp["outputKemiringan"] - derajat_kemiringan_input_sim)
        php_would_flag_as_outlier = final_deviation_from_input > 10
        print(f"    -> Trial {trial_num_str} DETIK {t_seconds}: OUTLIER Kemiringan (Input: {derajat_kemiringan_input_sim:.2f}, Original: {original_values.get('outputKemiringan'):.2f}, DevTarget: {deviation_to_apply:.2f}, PotOutlier: {potential_outlier_value:.2f}, NewClamped: {dp['outputKemiringan']:.2f}, FinalDevToInput: {final_deviation_from_input:.2f}, PHPOutlier?: {php_would_flag_as_outlier})")

    elif error_type == "kt_outlier":
        sensor_idx_to_make_outlier = random.randint(1, 6)
        kt_values = [dp.get(f"kelembabanTanah{j+1}", random.uniform(30,60)) for j in range(6)]
        other_kt_values = [kt_values[j] for j in range(6) if j != (sensor_idx_to_make_outlier -1)]
        avg_kt_lain = sum(other_kt_values) / len(other_kt_values) if other_kt_values else 45.0
        percentage_deviation_to_apply = OUTLIER_KELEMBABAN_DEVIATION_PERCENT_DP_PYTHON_BASE + random.uniform(0, 4.0) # Deviasi % 29-33%
        if avg_kt_lain < 1.0: potential_outlier_value_kt = round(percentage_deviation_to_apply, 2)
        else: potential_outlier_value_kt = round(avg_kt_lain * (1 + random.choice([-1, 1]) * percentage_deviation_to_apply / 100.0), 2)
        clamped_outlier_value_kt = max(MIN_KELEMBABAN_DP, min(MAX_KELEMBABAN_DP, potential_outlier_value_kt))
        dp[f"kelembabanTanah{sensor_idx_to_make_outlier}"] = clamped_outlier_value_kt
        final_dev_percent_from_avg = float('inf') if avg_kt_lain == 0 and clamped_outlier_value_kt != 0 else (abs((clamped_outlier_value_kt - avg_kt_lain) / avg_kt_lain) * 100 if avg_kt_lain != 0 else 0)
        php_would_flag_as_outlier = final_dev_percent_from_avg > 30
        print(f"    -> Trial {trial_num_str} DETIK {t_seconds}: OUTLIER Kelembaban (KT{sensor_idx_to_make_outlier} Original: {original_values.get(f'kelembabanTanah{sensor_idx_to_make_outlier}'):.2f}, AvgLain: {avg_kt_lain:.2f}, PctDevTarget: {percentage_deviation_to_apply:.2f}%, PotOutlier: {potential_outlier_value_kt:.2f}, NewClamped: {dp[f'kelembabanTanah{sensor_idx_to_make_outlier}']:.2f}, FinalDevPctToAvg: {final_dev_percent_from_avg:.2f}%, PHPOutlier?: {php_would_flag_as_outlier})")

    elif error_type == "och_outlier": # Modifikasi ini tidak akan ditangkap sbg outlier deviasi oleh PHP karena threshold PHP > 50
        deviation_to_apply = OUTLIER_CURAHHUJAN_DEVIATION_DP_PYTHON_BASE + random.uniform(0.5, 2.5)
        if curah_hujan_input_sim > (OUTLIER_CURAHHUJAN_DEVIATION_DP_PYTHON_BASE / 2.0):
            potential_outlier_value_ch = curah_hujan_input_sim + random.choice([-1, 1]) * deviation_to_apply
            clamped_outlier_value_ch = max(MIN_CURAH_HUJAN_OUTPUT_DP, min(MAX_CURAH_HUJAN_OUTPUT_DP_PHP_VALIDATION_LIMIT, potential_outlier_value_ch))
            dp["outputCurahHujan"] = round(clamped_outlier_value_ch, 2)
            final_deviation_from_input = abs(dp["outputCurahHujan"] - curah_hujan_input_sim)
            php_would_flag_as_outlier_dev = final_deviation_from_input > 50
            print(f"    -> Trial {trial_num_str} DETIK {t_seconds}: 'OUTLIER' Curah Hujan (Input: {curah_hujan_input_sim:.2f}, Original: {original_values.get('outputCurahHujan'):.2f}, DevTarget: {deviation_to_apply:.2f}, PotOutlier: {potential_outlier_value_ch:.2f}, NewClamped: {dp['outputCurahHujan']:.2f}, FinalDevToInput: {final_deviation_from_input:.2f}, PHPDevOutlier(>50)?: {php_would_flag_as_outlier_dev})")
        else: # Fallback to slope outlier
            fallback_deviation_ok = OUTLIER_KEMIRINGAN_DEVIATION_DP_PYTHON_BASE + random.uniform(0.5, 2.5)
            potential_outlier_value_ok = derajat_kemiringan_input_sim + random.choice([-1, 1]) * fallback_deviation_ok
            clamped_fallback_ok = max(MIN_KEMIRINGAN_OUTPUT_DP, min(MAX_KEMIRINGAN_OUTPUT_DP, potential_outlier_value_ok))
            dp["outputKemiringan"] = round(clamped_fallback_ok, 2)
            final_dev_fallback_ok = abs(dp["outputKemiringan"] - derajat_kemiringan_input_sim)
            php_would_flag_fallback_ok_as_outlier = final_dev_fallback_ok > 10
            print(f"    -> Trial {trial_num_str} DETIK {t_seconds}: (Fallback OCH) OUTLIER Kemiringan (Input: {derajat_kemiringan_input_sim:.2f}, Original: {original_values.get('outputKemiringan'):.2f}, DevTarget: {fallback_deviation_ok:.2f}, PotOutlier: {potential_outlier_value_ok:.2f}, NewClamped: {dp['outputKemiringan']:.2f}, FinalDevToInput: {final_dev_fallback_ok:.2f}, PHPOutlier?: {php_would_flag_fallback_ok_as_outlier})")
    return dp

def generate_1_hour_simulation_data(trial_num_str, derajat_kemiringan_input_sim, curah_hujan_input_sim, python_modifies_percentage=23.0):
    simulation_name = f"Simulasi {trial_num_str}" 
    if curah_hujan_input_sim > MAX_CURAH_HUJAN_INPUT_BATCH: # Menggunakan konstanta yang baru didefinisikan
        print(f"PERINGATAN: Input curah hujan ({curah_hujan_input_sim}mm) untuk Python melebihi MAX_CURAH_HUJAN_INPUT_BATCH PHP ({MAX_CURAH_HUJAN_INPUT_BATCH}mm).")

    all_data_points = []
    detailed_sensor_data_for_graph = []
    start_datetime = datetime.fromisoformat(f"2025-07-{15 + int(trial_num_str):02d}T{10 + int(trial_num_str):02d}:00:00Z")
    
    current_output_kemiringan_val = float(derajat_kemiringan_input_sim) 
    current_output_curah_hujan_val = 0.0
    current_kt_values = [random.uniform(5, 15) for _ in range(6)] 

    is_raining_sim_period = False 
    rain_event_ended = False 
    last_humidity_during_rain = list(current_kt_values) 
    
    total_data_points_sim = 3600
    num_points_to_modify_by_python = int(total_data_points_sim * (python_modifies_percentage / 100.0))
    modified_seconds_indices = sorted(random.sample(range(total_data_points_sim), num_points_to_modify_by_python))
    modified_idx_pointer = 0

    print(f"  Memulai pembuatan {total_data_points_sim} titik data untuk {simulation_name}...")
    print(f"    Input Kemiringan: {derajat_kemiringan_input_sim}, Input Curah Hujan: {curah_hujan_input_sim} mm")
    print(f"    Target data points untuk dimodifikasi oleh Python: {num_points_to_modify_by_python} (~{python_modifies_percentage:.1f}%)")

    convergence_factor_kemiringan = 0.05 
    convergence_factor_curah_hujan_raining = 0.08 
    convergence_factor_curah_hujan_drying = 0.04 

    for t_seconds in range(total_data_points_sim):
        client_ts_dt = start_datetime + timedelta(seconds=t_seconds)
        client_ts_iso = client_ts_dt.isoformat().replace("+00:00", "Z")

        temp_is_raining_sim_period_now = False 
        if curah_hujan_input_sim > 0.1:
            rain_event_starts_at_sec = 150 + (int(trial_num_str) * 30) % 300 
            duration_factor = min(1.0, curah_hujan_input_sim / 10.0) 
            rain_event_duration_sec = int(800 * duration_factor) + 200 
            rain_event_ends_at_sec = rain_event_starts_at_sec + rain_event_duration_sec
            if rain_event_starts_at_sec <= t_seconds < rain_event_ends_at_sec:
                temp_is_raining_sim_period_now = True
        
        if not is_raining_sim_period and temp_is_raining_sim_period_now: 
            is_raining_sim_period = True
            rain_event_ended = False
        elif is_raining_sim_period and not temp_is_raining_sim_period_now: 
            is_raining_sim_period = False
            rain_event_ended = True 
            last_humidity_during_rain = list(current_kt_values) 

        for i in range(6):
            if is_raining_sim_period: 
                target_humidity_during_rain = MIN_KELEMBABAN_DP + (MAX_KELEMBABAN_DP - MIN_KELEMBABAN_DP) * (0.7 + 0.25 * (min(curah_hujan_input_sim, MAX_CURAH_HUJAN_INPUT_BATCH) / MAX_CURAH_HUJAN_INPUT_BATCH))
                target_humidity_during_rain = min(target_humidity_during_rain, MAX_KELEMBABAN_DP * 0.98)
                current_kt_values[i] += (target_humidity_during_rain - current_kt_values[i]) * 0.03 + random.uniform(-0.2, 0.2)
                last_humidity_during_rain[i] = current_kt_values[i] 
            elif rain_event_ended: 
                decay_rate = 0.0001 
                current_kt_values[i] -= decay_rate * current_kt_values[i] + random.uniform(0.001, 0.005) 
                current_kt_values[i] = max(current_kt_values[i], last_humidity_during_rain[i] * 0.85) 
            else: 
                current_kt_values[i] -= random.uniform(0.015, 0.035) 
            current_kt_values[i] = max(MIN_KELEMBABAN_DP, min(MAX_KELEMBABAN_DP, current_kt_values[i]))

        noise_kemiringan = random.uniform(-0.2, 0.2) 
        current_output_kemiringan_val += (derajat_kemiringan_input_sim - current_output_kemiringan_val) * convergence_factor_kemiringan + noise_kemiringan
        current_output_kemiringan_val = round(max(MIN_KEMIRINGAN_OUTPUT_DP, min(MAX_KEMIRINGAN_OUTPUT_DP, current_output_kemiringan_val)),2)

        target_ch_output = curah_hujan_input_sim if is_raining_sim_period else 0.0
        conv_factor_ch = convergence_factor_curah_hujan_raining if is_raining_sim_period else convergence_factor_curah_hujan_drying
        
        noise_ch = 0
        if is_raining_sim_period:
            noise_ch = random.uniform(-0.05 * target_ch_output, 0.05 * target_ch_output)
        
        current_output_curah_hujan_val += (target_ch_output - current_output_curah_hujan_val) * conv_factor_ch + noise_ch
        if not is_raining_sim_period and current_output_curah_hujan_val < 0.05: 
            current_output_curah_hujan_val = 0.0
        current_output_curah_hujan_val = round(max(MIN_CURAH_HUJAN_OUTPUT_DP, min(MAX_CURAH_HUJAN_OUTPUT_DP_PHP_VALIDATION_LIMIT, current_output_curah_hujan_val)),2)
        
        data_point = {
            "client_timestamp": client_ts_iso,
            "kelembabanTanah1": round(current_kt_values[0], 2),
            "kelembabanTanah2": round(current_kt_values[1], 2),
            "kelembabanTanah3": round(current_kt_values[2], 2),
            "kelembabanTanah4": round(current_kt_values[3], 2),
            "kelembabanTanah5": round(current_kt_values[4], 2),
            "kelembabanTanah6": round(current_kt_values[5], 2),
            "outputKemiringan": current_output_kemiringan_val,
            "outputCurahHujan": current_output_curah_hujan_val
        }

        if trial_num_str == "1":
            detailed_sensor_data_for_graph.append({
                "timestamp_iso": client_ts_iso, "t_seconds": t_seconds,
                "derajatKemiringanInput": derajat_kemiringan_input_sim,
                "outputKemiringan_before_error": current_output_kemiringan_val,
                "curahHujanInput": curah_hujan_input_sim,
                "outputCurahHujan_before_error": current_output_curah_hujan_val,
                "is_raining_period": 1 if is_raining_sim_period else 0,
                "kt1_sim": current_kt_values[0]
            })

        if modified_idx_pointer < len(modified_seconds_indices) and t_seconds == modified_seconds_indices[modified_idx_pointer]:
            if random.random() < 0.65: 
                data_point = introduce_range_error(data_point, trial_num_str, t_seconds)
            else: 
                error_type_for_outlier = random.choice(["ok_outlier", "kt_outlier"])
                temp_dp = data_point.copy()
                if error_type_for_outlier == "ok_outlier":
                    deviation_to_apply = OUTLIER_KEMIRINGAN_DEVIATION_DP_PYTHON_BASE + random.uniform(0.5, 2.5)
                    potential_outlier_value = derajat_kemiringan_input_sim + random.choice([-1, 1]) * deviation_to_apply
                    clamped_outlier_value = max(MIN_KEMIRINGAN_OUTPUT_DP, min(MAX_KEMIRINGAN_OUTPUT_DP, potential_outlier_value))
                    temp_dp["outputKemiringan"] = round(clamped_outlier_value, 2)
                    final_deviation_from_input = abs(temp_dp["outputKemiringan"] - derajat_kemiringan_input_sim)
                    php_would_flag_as_outlier = final_deviation_from_input > 10
                    print(f"    -> Trial {trial_num_str} DETIK {t_seconds}: OUTLIER Kemiringan (Input: {derajat_kemiringan_input_sim:.2f}, Original: {data_point.get('outputKemiringan'):.2f}, DevTarget: {deviation_to_apply:.2f}, PotOutlier: {potential_outlier_value:.2f}, NewClamped: {temp_dp['outputKemiringan']:.2f}, FinalDevToInput: {final_deviation_from_input:.2f}, PHPOutlier?: {php_would_flag_as_outlier})")
                elif error_type_for_outlier == "kt_outlier":
                    sensor_idx_to_make_outlier = random.randint(1, 6)
                    kt_values_current_dp = [temp_dp.get(f"kelembabanTanah{j+1}", random.uniform(30,60)) for j in range(6)] 
                    other_kt_values_current_dp = [kt_values_current_dp[j] for j in range(6) if j != (sensor_idx_to_make_outlier -1)]
                    avg_kt_lain_current_dp = sum(other_kt_values_current_dp) / len(other_kt_values_current_dp) if other_kt_values_current_dp else 45.0
                    percentage_deviation_to_apply = OUTLIER_KELEMBABAN_DEVIATION_PERCENT_DP_PYTHON_BASE + random.uniform(0, 4.0)
                    if avg_kt_lain_current_dp < 1.0: potential_outlier_value_kt = round(percentage_deviation_to_apply, 2)
                    else: potential_outlier_value_kt = round(avg_kt_lain_current_dp * (1 + random.choice([-1, 1]) * percentage_deviation_to_apply / 100.0), 2)
                    clamped_outlier_value_kt = max(MIN_KELEMBABAN_DP, min(MAX_KELEMBABAN_DP, potential_outlier_value_kt))
                    temp_dp[f"kelembabanTanah{sensor_idx_to_make_outlier}"] = clamped_outlier_value_kt
                    final_dev_percent_from_avg = float('inf') if avg_kt_lain_current_dp == 0 and clamped_outlier_value_kt != 0 else (abs((clamped_outlier_value_kt - avg_kt_lain_current_dp) / avg_kt_lain_current_dp) * 100 if avg_kt_lain_current_dp != 0 else 0)
                    php_would_flag_as_outlier = final_dev_percent_from_avg > 30
                    print(f"    -> Trial {trial_num_str} DETIK {t_seconds}: OUTLIER Kelembaban (KT{sensor_idx_to_make_outlier} Original: {data_point.get(f'kelembabanTanah{sensor_idx_to_make_outlier}'):.2f}, AvgLain: {avg_kt_lain_current_dp:.2f}, PctDevTarget: {percentage_deviation_to_apply:.2f}%, PotOutlier: {potential_outlier_value_kt:.2f}, NewClamped: {temp_dp[f'kelembabanTanah{sensor_idx_to_make_outlier}']:.2f}, FinalDevPctToAvg: {final_dev_percent_from_avg:.2f}%, PHPOutlier?: {php_would_flag_as_outlier})")
                data_point = temp_dp
            modified_idx_pointer += 1
        all_data_points.append(data_point)

    print(f"  Pembuatan {total_data_points_sim} titik data untuk {simulation_name} selesai. Aktual data dimodifikasi Python: {modified_idx_pointer}")
    all_batches_data = []
    data_points_per_batch = 30
    for i in range(0, len(all_data_points), data_points_per_batch):
        current_batch_list_of_dps = all_data_points[i : i + data_points_per_batch]
        if not current_batch_list_of_dps: continue
        all_batches_data.append({
            "simulationName": simulation_name,
            "derajatKemiringanInput": derajat_kemiringan_input_sim,
            "curahHujanInput": curah_hujan_input_sim,
            "dataPoints": current_batch_list_of_dps
        })
    print(f"  Pembuatan {len(all_batches_data)} batch untuk {simulation_name} selesai.")
    return all_batches_data, detailed_sensor_data_for_graph

if __name__ == "__main__":
    try:
        import numpy as np
    except ImportError:
        print("Peringatan: Numpy tidak terinstal. Estimasi waktu settling mungkin kurang akurat atau menyebabkan error.")
        class np_mock: 
            def log(self, val):
                return -1.0 
        np = np_mock()

    print("Memulai skrip generate data untuk 5 trial (target validitas PHP ~80%)...\n")
    
    target_python_modifies_percentages = [
        random.uniform(23.0, 24.5), random.uniform(23.0, 24.5), 
        random.uniform(23.0, 24.5), random.uniform(23.0, 24.5),
        random.uniform(23.0, 24.5)
    ]
    random.shuffle(target_python_modifies_percentages)

    trials_config = [
        {"trial_num": "1", "kemiringan": 10, "curah_hujan": 5,  "deskripsi": "KmrRendah_HujanRingan"},
        {"trial_num": "2", "kemiringan": 20, "curah_hujan": 18, "deskripsi": "KmrSedang_HujanTinggi"},
        {"trial_num": "3", "kemiringan": 35, "curah_hujan": 2,  "deskripsi": "KmrTinggi_HujanSangatRingan"},
        {"trial_num": "4", "kemiringan": 5,  "curah_hujan": 0,  "deskripsi": "KmrSangatRendah_TanpaHujan"},
        {"trial_num": "5", "kemiringan": 40, "curah_hujan": 12, "deskripsi": "KmrSangatTinggi_HujanSedang"}
    ]
    
    output_dir = "data_simulasi_5_trial_target_80_valid_low_start_humidity_v1" 
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Folder '{output_dir}' telah dibuat untuk menyimpan file JSON hasil generate.")

    for i, trial_info in enumerate(trials_config):
        print(f"\nGenerating data untuk Simulasi {trial_info['trial_num']}: {trial_info['deskripsi']}")
        current_python_modifies_percentage = target_python_modifies_percentages[i]
        
        if trial_info['curah_hujan'] > MAX_CURAH_HUJAN_INPUT_BATCH: # Menggunakan konstanta
            print(f"ERROR FATAL: Input curah hujan ({trial_info['curah_hujan']}mm) di trials_config untuk Trial {trial_info['trial_num']} melebihi batas MAX_CURAH_HUJAN_INPUT_BATCH PHP ({MAX_CURAH_HUJAN_INPUT_BATCH}mm). Skrip dihentikan.")
            exit()

        generated_batches_for_trial, detailed_data = generate_1_hour_simulation_data(
            trial_num_str=trial_info['trial_num'],
            derajat_kemiringan_input_sim=float(trial_info['kemiringan']),
            curah_hujan_input_sim=float(trial_info['curah_hujan']),
            python_modifies_percentage=current_python_modifies_percentage
        )
        output_filename = os.path.join(output_dir, f"data_simulasi_trial_{trial_info['trial_num']}.json")
        with open(output_filename, "w") as f: json.dump(generated_batches_for_trial, f, indent=2)
        print(f"  Data untuk Simulasi {trial_info['trial_num']} disimpan di: {output_filename}")
        print(f"    Total {len(generated_batches_for_trial)} batch data.")
        print(f"    Total {sum(len(b['dataPoints']) for b in generated_batches_for_trial)} data points.")

        if trial_info['trial_num'] == "1" and detailed_data: 
            detailed_csv_filename = os.path.join(output_dir, f"trial_1_sensor_data_low_start_humidity.csv")
            try:
                with open(detailed_csv_filename, 'w', newline='') as csvfile:
                    if detailed_data:
                        fieldnames = detailed_data[0].keys()
                        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                        writer.writeheader()
                        writer.writerows(detailed_data)
                        print(f"    Data detail untuk grafik Trial #1 disimpan di: {detailed_csv_filename}")
            except Exception as e_csv: print(f"    Gagal menyimpan data detail CSV untuk Trial #1: {e_csv}")
    print(f"\nSemua data untuk 5 trial telah berhasil di-generate di folder '{output_dir}'.")
    print("Selesai.")
