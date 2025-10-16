// src/config.ts

/**
 * Berkas ini berisi variabel konfigurasi untuk SAT18 Engine.
 * Di lingkungan produksi, variabel ini harus dikelola melalui environment variables
 * atau layanan konfigurasi yang aman.
 */
export const DEPLOYMENT_CONFIG = {
    API_ENDPOINT: "https://jobs.hidencloud.com:24700/upload",
    
    /**
     * Endpoint untuk melakukan secure handshake dan mendapatkan session token sementara.
     */
    HANDSHAKE_ENDPOINT: "https://jobs.hidencloud.com:24700/auth/handshake",

    /**
     * Kunci API untuk otentikasi dengan SAT18 VPS.
     * PENTING: Ganti placeholder ini dengan kunci API deployment Anda yang sebenarnya.
     * Kegagalan mengkonfigurasi kunci ini akan menyebabkan proses deployment gagal.
     */
    API_KEY: "SAT18_DEPLOY_SECRET_KEY_PLACEHOLDER",
};
