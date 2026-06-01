# Sistem Evaluasi Kepuasan Mahasiswa Terhadap Kegiatan PKKMB
### Analisis Sentimen Berbasis Web — CC26-PSU342

### Link Akses Model AI: https://drive.google.com/drive/folders/1W_lDbhalUur3cm1feebLLGWEn6qe5oro?usp=sharing 

Sistem berbasis web untuk menganalisis sentimen feedback mahasiswa terhadap kegiatan PKKMB menggunakan Deep Learning dan Generative AI.

---

## Akses Cepat

Aplikasi sudah tersedia secara publik dan dapat langsung diakses tanpa instalasi apapun:

**[https://sistem-evaluasi-pkkmb.vercel.app](https://sistem-evaluasi-pkkmb.vercel.app)**

---

## Cara Menjalankan Secara Lokal

Ikuti langkah-langkah berikut jika ingin menjalankan proyek ini di komputer sendiri.

### Prasyarat

Pastikan perangkat sudah terinstal:

- [Node.js](https://nodejs.org) v18 atau lebih baru
- [Python](https://python.org) v3.11 (bukan 3.12 ke atas)
- [Git](https://git-scm.com)
- Akun [ngrok](https://ngrok.com) (gratis)
- Google Colab (untuk API Generative AI)

---

### 1. Clone Repository

```bash
git clone https://github.com/CC26-PSU342/sistem-evaluasi-pkkmb.git
cd sistem-evaluasi-pkkmb
```

---

### 2. Setup API Sentimen (Deep Learning)

API ini dijalankan secara lokal di komputer menggunakan Python.

#### 2.1 Masuk ke folder API

```bash
cd app/api-sentiment
```

#### 2.2 Install dependencies Python

```bash
pip3 install -r requirements.txt
```

> Jika muncul error *externally managed environment*, tambahkan flag:
> ```bash
> pip3 install -r requirements.txt --break-system-packages
> ```

#### 2.3 Pastikan file model tersedia

Letakkan kedua file berikut di dalam folder `app/api-sentiment/`:
app/api-sentiment/
├── final_model.keras
├── vectorizer_config.json
├── main.py
├── model.py
├── preprocessing.py
├── schemas.py
└── requirements.txt


> File `final_model.keras` dan `vectorizer_config.json` dapat diunduh dari Google Drive tim atau hasil training notebook `Deep_Learning_Final.ipynb`.

#### 2.4 Jalankan API Sentimen

```bash
python3 main.py
```

Pastikan muncul output berikut:
Memuat model...
Model siap. Vocab size: ...
INFO: Uvicorn running on http://0.0.0.0:8000

#### 2.5 Buat ngrok Domain Tetap untuk API Sentimen

1. Login ke [https://dashboard.ngrok.com](https://dashboard.ngrok.com)
2. Buka menu **Domains** → klik **New Domain**
3. Salin domain yang digenerate, contoh: `caring-bengal-primary.ngrok-free.app`
4. Buka terminal baru dan jalankan:

```bash
ngrok http --domain=caring-bengal-primary.ngrok-free.app 800
```

Pastikan muncul status **online** dan URL forwarding aktif.

---

### 3. Setup API Generative AI (Qwen2.5)

API ini dijalankan di Google Colab karena membutuhkan GPU.

#### 3.1 Buka Google Colab

Upload file `api_generative_ai.ipynb` ke Google Colab atau buka langsung dari repository.

#### 3.2 Aktifkan GPU
Runtime → Change runtime type → T4 GPU → Save

#### 3.3 Buat ngrok Domain Tetap untuk API Generative

1. Login ke akun ngrok yang berbeda (atau akun yang sama jika belum punya domain kedua)
2. Buka [https://dashboard.ngrok.com/domains](https://dashboard.ngrok.com/domains) → **New Domain**
3. Salin domain yang digenerate, contoh: `suitable-fox-adapting.ngrok-free.app`
4. Buka [https://dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)
5. Salin auth token

#### 3.4 Isi token dan domain di notebook

Di cell terakhir notebook `api_generative_ai.ipynb`, ubah:

```python
ngrok.set_auth_token("ISI_TOKEN_NGROK")
public_url = ngrok.connect(
    8000,
    domain="suitable-fox-adapting.ngrok-free.app"
)
```

#### 3.5 Jalankan semua cell

Runtime → Run all

Tunggu hingga model selesai dimuat dan muncul output Public URL.

---

### 4. Setup Website (Frontend + Backend)

#### 4.1 Kembali ke root folder

```bash
cd website/feedback-insight-main
```

#### 4.2 Install dependencies Node.js

```bash
npm install
```

#### 4.3 Buat file `.env`

Buat file `.env` di root folder proyek:

```bash
cp .env.example .env
```

Kemudian isi file `.env` dengan URL yang sesuai:

```dotenv
# API Sentimen (FastAPI model prediksi)
VITE_SENTIMENT_API_URL="https://caring-bengal-primary.ngrok-free.app"

# API Backend (Local dev server)
VITE_API_BASE_URL="http://localhost:3000"

# API Generative AI
VITE_GENERATIVE_AI_URL="https://suitable-fox-adapting.ngrok-free.app"
```

> Ganti URL ngrok dengan domain tetap milik Anda yang sudah dibuat di langkah 2.5 dan 3.3.

#### 4.4 Update URL di file proxy backend

Buka file `server/src/routes/proxyGenerateSaran.js` dan pastikan baris berikut menggunakan variabel environment:

```js
const TARGET = process.env.GENERATIVE_AI_URL || "https://suitable-fox-adapting.ngrok-free.app";
```

#### 4.5 Jalankan aplikasi

```bash
npm run dev
```

Buka browser dan akses:

http://localhost:

---

### 5. Checklist Sebelum Menjalankan

Pastikan semua komponen berikut aktif sebelum menggunakan aplikasi:

- [ ] `python3 main.py` berjalan di folder `app/api-sentiment`
- [ ] ngrok untuk API Sentimen aktif di terminal
- [ ] Notebook Colab API Generative AI sudah di-run semua cell
- [ ] File `.env` sudah diisi dengan URL ngrok yang benar
- [ ] `npm run dev` berjalan di root folder

---

## Tim Pengembang

| Nama | Role | ID |
|---|---|---|
| Arga Bona Simarmata | AI Engineer | CACC290D6Y0872 |
| Syifa Zahra Salsabila | AI Engineer | CACC318D6X1172 |
| Aushof Ahmad Fatinun Naim | Data Scientist | CDCC204D6Y1594 |
| Fathul Alim | Data Scientist | CDCC288D6Y2655 |
| Mufidhatul Hanifah | Full-Stack Web Developer | CFCC015D6X2785 |
| Ahmad Abu Jihad Bilhaq | Full-Stack Web Developer | CFCC193D6Y2786 |

---

*Coding Camp 2026 powered by DBS Foundation — CC26-PSU342*

