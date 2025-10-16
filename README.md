# SAT18 Engine v2 - Monorepo

Selamat datang di repositori utama untuk SAT18 Engine v2. Proyek ini disusun sebagai monorepo yang berisi dua paket utama:

1.  **`/frontend`**: Aplikasi React (dibangun dengan Vite) yang berfungsi sebagai antarmuka pengguna untuk menganalisis, membangun, dan men-deploy proyek.
2.  **`/server`**: Server Node.js (dengan Express) yang menangani otentikasi (handshake), streaming log terenkripsi via WebSocket, dan API untuk Reinforcement Memory Layer.

## 🚀 Prasyarat

-   Node.js (v18.x atau lebih tinggi)
-   npm (biasanya terinstal bersama Node.js)
-   `concurrently` untuk menjalankan kedua server secara bersamaan dalam mode pengembangan.

## ⚙️ Instalasi

1.  **Install Dependensi Root & Server:**
    Dari direktori root proyek, jalankan:
    ```bash
    npm install
    ```
    Ini akan menginstal `concurrently` di root dan semua dependensi yang diperlukan untuk paket `/server`.

2.  **Install Dependensi Frontend:**
    Pindah ke direktori frontend dan instal dependensinya:
    ```bash
    cd frontend
    npm install
    cd ..
    ```

## ▶️ Menjalankan dalam Mode Pengembangan

Dari direktori **root**, jalankan perintah berikut untuk memulai server backend dan frontend secara bersamaan:

```bash
npm run dev
```

-   Frontend akan berjalan di `http://localhost:5173`.
-   Server backend akan berjalan di `http://localhost:24700`.

Vite di frontend sudah dikonfigurasi dengan *proxy*, sehingga semua permintaan API ke `/api` atau `/auth` akan otomatis diteruskan ke server backend.

## 🏗️ Struktur Proyek

```
/
├── .github/workflows/         # Konfigurasi CI/CD GitHub Actions
├── frontend/                  # Aplikasi React (Vite)
│   ├── public/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── server/                    # Server Node.js (Express & WebSocket)
│   ├── src/
│   ├── migrations/
│   ├── scripts/
│   ├── handshake-ws.js
│   └── package.json
├── package.json               # Skrip untuk manajemen monorepo
└── README.md                  # Dokumentasi ini
```

## 🔐 Konfigurasi Server

Konfigurasi untuk server (seperti `DEPLOY_API_KEY` dan `DB_ENGINE`) dikelola melalui environment variables. Lihat `server/README.md` for detail.