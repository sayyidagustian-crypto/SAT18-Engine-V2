// server/ecosystem.config.js
module.exports = {
  apps : [{
    name   : "sat18-engine-server",
    script : "./dist/handshake-ws.js",
    watch  : false, // Nonaktifkan watch mode di produksi untuk stabilitas
    env: {
      "NODE_ENV": "production",
      // PM2 akan otomatis menggunakan variabel environment dari sistem.
      // Pastikan DEPLOY_API_KEY dan PORT sudah di-set di environment server.
      "DEPLOY_API_KEY": process.env.DEPLOY_API_KEY,
      "PORT": process.env.PORT || 24700
    },
    // Arahkan log ke file terpusat untuk memudahkan audit
    output: '/srv/sat18/logs/server-out.log',
    error: '/srv/sat18/logs/server-err.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};