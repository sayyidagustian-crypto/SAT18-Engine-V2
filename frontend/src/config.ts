// frontend/src/config.ts

/**
 * Berkas ini berisi variabel konfigurasi untuk klien frontend SAT18 Engine.
 * Karena frontend berjalan di browser, endpoint ini bersifat relatif.
 * Server pengembangan Vite akan mem-proxy permintaan ini ke server backend.
 * Di produksi, Nginx akan melakukan hal yang sama.
 */
export const DEPLOYMENT_CONFIG = {
    /**
     * Endpoint untuk mengunggah paket build.
     */
    API_ENDPOINT: "/upload",
    
    /**
     * Endpoint untuk melakukan secure handshake dan mendapatkan session token sementara.
     */
    HANDSHAKE_ENDPOINT: "/auth/handshake",

    /**
     * Kunci API untuk otentikasi dengan SAT18 VPS.
     * PENTING: Ganti placeholder ini dengan kunci API deployment Anda yang sebenarnya.
     * Di lingkungan produksi, ini sebaiknya disuntikkan saat build, bukan di-hardcode.
     */
    API_KEY: "SAT18_DEPLOY_SECRET_KEY_PLACEHOLDER",
};