// src/registry/actionRegistry.ts

/**
 * Mendefinisikan struktur sebuah tindakan yang dapat didaftarkan.
 * Setiap tindakan memiliki ID unik, deskripsi, tingkat risiko, dan fungsi handler
 * yang akan dieksekusi.
 */
export interface RegisteredAction {
  id: string;
  description: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  handler: (payload?: any) => Promise<string>; // Mengembalikan ringkasan hasil
}

// Registry itu sendiri, memetakan ID tindakan ke definisinya.
const registry = new Map<string, RegisteredAction>();

/**
 * Mendaftarkan tindakan baru, membuatnya tersedia untuk execution controller.
 * @param action Definisi tindakan yang akan didaftarkan.
 */
export function registerAction(action: RegisteredAction): void {
  if (registry.has(action.id)) {
    console.warn(`[ActionRegistry] Menimpa tindakan yang sudah terdaftar: ${action.id}`);
  }
  registry.set(action.id, action);
}

/**
 * Mengambil tindakan yang terdaftar berdasarkan ID-nya.
 * @param actionId ID dari tindakan yang akan diambil.
 * @returns Tindakan yang terdaftar atau undefined jika tidak ditemukan.
 */
export function getAction(actionId: string): RegisteredAction | undefined {
  return registry.get(actionId);
}

// --- Contoh Pendaftaran Tindakan (untuk demonstrasi) ---
// Dalam aplikasi nyata, ini akan berada di file terpisah dan diimpor.

registerAction({
  id: 'rollback',
  description: 'Mengembalikan ke rilis terakhir yang berhasil.',
  riskLevel: 'HIGH',
  handler: async (payload) => {
    console.log(`[ActionHandler] Menjalankan rollback untuk rilis: ${payload?.release}`);
    // Di skenario nyata, ini akan memanggil `executeActionSafe` dari actionExecutor.ts
    return `Rollback ke versi ${payload?.release} telah dimulai.`;
  },
});

registerAction({
  id: 'notify-oncall',
  description: 'Mengirim notifikasi ke tim on-call.',
  riskLevel: 'LOW',
  handler: async (payload) => {
    console.log(`[ActionHandler] Memberi tahu channel on-call '${payload?.channel}'`);
    return `Notifikasi terkirim ke ${payload?.channel}.`;
  },
});

registerAction({
  id: 'delay-deploy',
  description: 'Menunda deployment otomatis berikutnya.',
  riskLevel: 'MEDIUM',
  handler: async (payload) => {
    console.log(`[ActionHandler] Menunda deployment berikutnya selama ${payload?.delaySeconds} detik.`);
    return `Deployment berikutnya ditunda.`;
  },
});