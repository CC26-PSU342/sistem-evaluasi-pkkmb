# data Kuesioner_pkkmb.csv
Data mentah yang digunakan untuk analisis sentimen.
---
## penjelasan kolom
## 1. Response
ID unik setiap responden, digunakan sebagai penanda data.

## 2. Submitted on
Waktu pengisian respon (tanggal dan jam), bisa untuk analisis tren waktu.

## 3. Q16_KRITIK DAN SARAN
Isi komentar/kritik dari responden, digunakan sebagai data utama analisis sentimen.

## 4. sentimen
Label hasil analisis sentimen:
- positif: komentar baik
- negatif: komentar keluhan
- netral : komentar biasa/tidak emosional
---
sumber : spbm universitas pamulang
## =================================================

# Data Slangword-indonesian.xlsm
data tambahan untuk proses slang word pada komentar/masukan pkkmb
---
## penjelasan kolom
## 1. slang
Berisi kata tidak formal/bahasa gaul yang akan dinormalisasi.
## 2. formal
Berisi bentuk kata baku dari slang

---
sumber : https://github.com/luthfilkhairi/kamus/blob/master/Slangword-indonesian.xlsm
## =================================================

# Data Sentimen_Cleaned.csv
Data output dari hasil preprocessing data Kuesioner_pkkmb.csv untuk diproses ke tahap berikutnya
---
## penjelasan kolom
## 1. Response
ID unik setiap responden sebagai penanda data.

## 2. Submitted on
Waktu pengiriman data (tanggal dan jam lengkap).

## 3. Kritik dan saran
Teks asli dari responden sebelum diproses.

## 4. Sentimen
Label hasil analisis sentimen (positif/negatif/netral).

## 5. tanggal
Hasil ekstraksi tanggal dari kolom waktu.

## 6. jam
Hasil ekstraksi jam dari timestamp.

## 7. hari
Hari pengisian data (contoh: Monday, Sunday).

## 8. normalisasi
Teks yang sudah dibersihkan dari format awal.

## 9. case_folding
Teks yang sudah diubah menjadi huruf kecil semua.

## 10. tokenizing
Teks yang sudah dipecah menjadi kata-kata (token).

## 11. filtering
Token yang sudah difilter dari kata tidak penting (stopword removal).

## 12. stemming
Kata yang sudah dikembalikan ke bentuk dasar.

## 13. clean_review
Hasil akhir teks yang sudah bersih untuk model ML.

## 14. Sentimen_Biner
Label sentimen dalam bentuk angka:
- 1 = positif
- -1 = negatif
- 0 = netral

---
sumber : output dari EDA_Analysis.ipynb
