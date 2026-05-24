# PKKMB Feedback REST API (Express)

RESTful API untuk resource `feedback`, dibangun dengan **Express** murni.
API ini **bukan** bagian dari runtime Lovable — Anda perlu deploy sendiri ke
Render, Railway, Fly.io, VPS, atau host Node.js lainnya. API terhubung ke
database Supabase yang sama dengan project Lovable Cloud Anda via
`SUPABASE_SERVICE_ROLE_KEY`.

## Setup lokal

```bash
cd server
npm install
cp .env.example .env   # isi SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_API_TOKEN
npm run dev
```

Server berjalan di `http://localhost:3000`.

## Konvensi RESTful

| Method | URL                          | Deskripsi                  | Auth   |
|--------|------------------------------|----------------------------|--------|
| GET    | `/api/v1/feedback`           | List + pagination + filter | Public |
| GET    | `/api/v1/feedback/:id`       | Ambil satu feedback        | Public |
| POST   | `/api/v1/feedback`           | Buat feedback baru         | Admin  |
| PUT    | `/api/v1/feedback/:id`       | Update sebagian/penuh      | Admin  |
| DELETE | `/api/v1/feedback/:id`       | Hapus feedback             | Admin  |
| GET    | `/api/v1`                    | API discovery              | Public |
| GET    | `/health`                    | Health check               | Public |

Auth admin: kirim header `Authorization: Bearer <ADMIN_API_TOKEN>`.

### Query params `GET /api/v1/feedback`

- `page` (default 1), `limit` (default 20, max 200)
- `sentiment` = `positive` | `negative` | `neutral`
- `prodi` (ilike match)
- `search` (ilike match pada `comment`)
- `sort` = `created_at` | `confidence` (default `created_at`)
- `order` = `asc` | `desc` (default `desc`)

### Contoh respons list

```json
{
  "data": [ { "id": "...", "prodi": "Informatika", "sentiment": "positive", "...": "..." } ],
  "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

### Contoh request

```bash
# List
curl "http://localhost:3000/api/v1/feedback?sentiment=positive&limit=10"

# Get by id
curl "http://localhost:3000/api/v1/feedback/<uuid>"

# Create (admin)
curl -X POST http://localhost:3000/api/v1/feedback \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prodi":"Informatika","comment":"Acara seru sekali","sentiment":"positive","confidence":0.95}'

# Update (admin)
curl -X PUT http://localhost:3000/api/v1/feedback/<uuid> \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sentiment":"neutral"}'

# Delete (admin)
curl -X DELETE http://localhost:3000/api/v1/feedback/<uuid> \
  -H "Authorization: Bearer $ADMIN_API_TOKEN"
```

## Deploy

- **Render / Railway**: set root directory ke `server/`, build command `npm install`, start command `npm start`. Tambahkan env vars dari `.env.example`.
- **VPS**: `npm install --omit=dev && node src/index.js` (pakai PM2/systemd).
- Pastikan port mendengarkan dari env `PORT` (sudah dihandle).

## Catatan keamanan

- `SUPABASE_SERVICE_ROLE_KEY` melewati semua RLS — **jangan** expose ke client.
- Endpoint write (POST/PUT/DELETE) dilindungi `ADMIN_API_TOKEN`. Gunakan token panjang acak.
- Untuk produksi, batasi `cors()` ke origin tertentu, dan tambahkan rate limiting (mis. `express-rate-limit`).
