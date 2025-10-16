# SAT18 Engine – Deployment & Maintenance Guide

Dokumentasi ini menjelaskan cara menyiapkan dan menjalankan sistem *Deployment Bridge* untuk SAT18 Engine (HidenCloud VPS).

---

## 🧱 1. Struktur Direktori Server

```
/srv/sat18/
├── releases/           # Setiap rilis build tersimpan di sini
├── current -> releases/<id>  # Symlink aktif ke rilis berjalan
├── logs/               # Log proses deploy dan runtime
├── deployment-state.json
├── handshake-ws.js     # Server WebSocket + Handshake API
├── ecosystem.config.js # Konfigurasi PM2
├── deploy-local.js     # Skrip deployment otomatis
└── cleanup-releases.sh # Pembersihan rilis lama
```

---

## 👤 2. Setup User & Permission

```bash
# Jalankan sebagai root sekali saja
useradd -m -s /bin/bash svc_deploy
mkdir -p /srv/sat18/releases /srv/sat18/logs
chown -R svc_deploy:svc_deploy /srv/sat18
chmod -R 755 /srv/sat18
```

Gunakan user `svc_deploy` untuk menjalankan semua proses deployment.

---

## 🔐 3. Environtment Variable

Tambahkan pada `.env` atau sistem environment:

```bash
DEPLOY_API_KEY=ubah_dengan_api_key_rahasia
PORT=8081
DOMAIN=sat18.site
```

> Jangan pernah commit `.env` ke git.

---

## ⚙️ 4. Menjalankan Server Handshake

### Opsi 1 — Manual

```bash
node handshake-ws.js
```

### Opsi 2 — Menggunakan PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Server akan:

* Melayani endpoint `POST /handshake`
* Menginisialisasi WebSocket `wss://DOMAIN/logs`
* Mengelola `sessionToken` dan `sessionKeyBase64` secara aman

---

## 🔒 5. Nginx + TLS Setup

Contoh konfigurasi minimal reverse proxy (Ubuntu):

```nginx
server {
    server_name sat18.site;

    location / {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/sat18.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sat18.site/privkey.pem;
}

server {
    if ($host = sat18.site) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name sat18.site;
    return 404;
}
```

Aktifkan TLS:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d sat18.site
```

---

## 🚀 6. Menjalankan Deployment Manual

Gunakan Node.js 18+:

```bash
node deploy-local.js /path/to/build.zip
```

Skrip akan:

1. Mengekstrak paket ke `/srv/sat18/releases/<timestamp>`
2. Menjalankan health check (`health-check.sh`)
3. Mengupdate symlink `/srv/sat18/current`
4. Menulis status ke `deployment-state.json`
5. Menghapus rilis lama jika melebihi batas retensi

---

## 🔁 7. Menjaga Server Tetap Bersih

Tambahkan cron job (sebagai `svc_deploy`):

```bash
crontab -e
```

Isi:

```
0 3 * * * /srv/sat18/cleanup-releases.sh >> /srv/sat18/logs/cleanup.log 2>&1
```

---

## 💡 8. Monitoring

* **Log proses**: `/srv/sat18/logs/deploy.log`
* **State aktif**: `/srv/sat18/deployment-state.json`
* **Log handshake**: `/srv/sat18/logs/handshake.log`
* **Current release**: `ls -l /srv/sat18/current`

---

## 🛡️ 9. Keamanan

* Jalankan semua service di bawah user `svc_deploy`
* Gunakan firewall: hanya buka port 80, 443
* Simpan backup mingguan `deployment-state.json`
* Rotasi log setiap 7 hari
* Gunakan `ufw` atau `fail2ban` untuk mencegah brute-force

---

## ✅ 10. Recovery Manual

Jika rollback otomatis gagal:

```bash
cd /srv/sat18
ln -sfn releases/<id_stabil> current
# systemctl reload nginx # Use 'sudo' if run as svc_deploy
echo '{"state":"manualRollback"}' > deployment-state.json
```

---

**Maintainer:** Said Agustian
**Organization:** Sat18 Official
**Version:** v3.0 — Production Release