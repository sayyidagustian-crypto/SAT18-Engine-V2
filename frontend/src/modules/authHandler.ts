import { DEPLOYMENT_CONFIG } from '../config';
import type { HandshakeResponse } from '../types';
import { Logger } from './logger';

export interface SecureSession {
    token: string;
    expiry: number; // timestamp in ms
    sessionKeyBase64: string;
    wsUrl: string;
}

// Modul state untuk menyimpan sesi saat ini di memori.
let currentSession: SecureSession | null = null;

/**
 * Mengelola siklus hidup otentikasi sesi sementara dengan SAT18 VPS.
 */
export const authHandler = {
    /**
     * Memulai proses handshake untuk mendapatkan session token sementara.
     * @returns {Promise<SecureSession>} Sesi aman yang berisi token, kunci, dll.
     * @throws {Error} Jika handshake gagal atau kunci API tidak dikonfigurasi.
     */
    async initiateHandshake(): Promise<SecureSession> {
        const { HANDSHAKE_ENDPOINT, API_KEY } = DEPLOYMENT_CONFIG;

        if (!API_KEY || API_KEY === 'SAT18_DEPLOY_SECRET_KEY_PLACEHOLDER') {
            throw new Error('Deployment API key is not configured in src/config.ts');
        }

        try {
            const response = await fetch(HANDSHAKE_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data: HandshakeResponse = await response.json();
                currentSession = {
                    token: data.sessionToken,
                    // Tambahkan buffer 5 detik untuk mengantisipasi latensi jaringan
                    expiry: Date.now() + ((data.expiresIn - 5) * 1000),
                    sessionKeyBase64: data.sessionKeyBase64,
                    wsUrl: data.wsUrl,
                };
                Logger.log('success', `Secure session established. Token is valid for ${data.expiresIn} seconds.`);
                return currentSession;
            } else {
                const errorText = await response.text();
                 if (response.status === 401 || response.status === 403) {
                    throw new Error("Authentication failed. Please check your main API key.");
                }
                throw new Error(`Handshake failed with status ${response.status}: ${errorText}`);
            }

        } catch (err) {
            Logger.log('error', `Handshake process failed: ${err instanceof Error ? err.message : String(err)}`);
            currentSession = null;
            // Re-throw error untuk ditangani oleh pemanggil (vpsDeployer)
            throw err;
        }
    },

    /**
     * Mengambil sesi aman yang sedang aktif.
     * @returns {SecureSession | null} Sesi aktif atau null jika tidak ada.
     */
    getActiveSession(): SecureSession | null {
        return currentSession;
    },

    /**
     * Membersihkan sesi yang sedang aktif.
     */
    clearSession() {
        currentSession = null;
        Logger.log('info', 'Secure session has been cleared.');
    }
};