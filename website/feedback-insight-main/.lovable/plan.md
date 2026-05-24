## Tujuan

Membuat akun admin default agar Anda bisa langsung login ke `/admin` tanpa perlu daftar manual, sekaligus menutup pendaftaran publik di halaman `/auth`.

## Kredensial Default

- **Email:** `admin@pkkmb.ac.id`
- **Password:** `Admin#PKKMB2026`

## Perubahan

### 1. Seed akun admin di backend
Membuat akun admin secara langsung di sistem autentikasi Lovable Cloud melalui migration SQL:
- Insert user ke `auth.users` dengan email & password ter-hash, status email sudah terkonfirmasi
- Insert profile ke tabel `profiles`
- Assign role `admin` di tabel `user_roles`
- Operasi idempotent (aman dijalankan ulang — kalau akun sudah ada, dilewati)

### 2. Update halaman `/auth` (frontend)
- **Sembunyikan tab "Daftar"** — hanya menampilkan form Masuk
- Tambahkan **info box** kecil di bawah form yang menampilkan kredensial default agar mudah diingat saat demo:
  > Akun admin default: `admin@pkkmb.ac.id` / `Admin#PKKMB2026`
- Tombol kecil "Isi otomatis" untuk mengisi form dengan kredensial default dalam satu klik (mempercepat demo)
- Hapus komponen `Tabs` dan kode handler signup karena tidak lagi dipakai

### 3. Nonaktifkan signup publik
Mengonfigurasi auth Lovable Cloud agar `disable_signup: true` — pendaftaran lewat API juga ditolak, jadi hanya akun yang sudah di-seed yang bisa masuk.

## Catatan Keamanan

Karena ini sistem demo akademik dan kredensial sengaja diketahui, password disimpan apa adanya. Untuk produksi nyata sebaiknya password diganti setelah login pertama — tapi ini di luar scope permintaan saat ini.

## File yang Disentuh

- Migration SQL baru (seed admin user)
- `src/pages/Auth.tsx` (hapus tab daftar, tambah info kredensial + tombol isi otomatis)
- Konfigurasi auth Lovable Cloud (disable signup)
