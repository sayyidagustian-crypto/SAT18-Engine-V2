// src/modules/executionController.ts

import { getAction } from '../registry/actionRegistry';
// Konseptual: Fungsi-fungsi ini sebenarnya diimpor dan dijalankan di sisi server.
// import { getDecisionById, updateDecisionExecution } from '../../server/src/services/reinforcementMemory';
import type { IDTAction } from '../types';

// Placeholder for the conceptual server-side function
const updateDecisionExecution = (
  decisionId: string, 
  status: 'applied' | 'failed',
  approvedBy: string,
  notes: string,
  result: object
) => {
    console.log(`[CONCEPTUAL] Updating decision ${decisionId} with status ${status}.`);
};

/**
 * Execution Controller adalah titik pusat untuk menangani tindakan
 * yang direkomendasikan oleh Intelligent Decision Tree (IDT).
 *
 * Ia memvalidasi tindakan terhadap Action Registry dan mengorkestrasi eksekusinya.
 * Komponen ini dikonseptualisasikan untuk berjalan di sisi server.
 */
export class ExecutionController {
  
  /**
   * Memproses daftar tindakan dari sebuah keputusan IDT.
   * @param decisionId ID unik dari keputusan yang disimpan di database.
   * @param actions Array tindakan yang direkomendasikan oleh IDT.
   */
  async processActions(decisionId: string, actions: IDTAction[]): Promise<void> {
    console.log(`[ExecController] Memproses ${actions.length} tindakan untuk keputusan ${decisionId}`);
    
    for (const action of actions) {
      const registeredAction = getAction(action.id);

      if (!registeredAction) {
        console.warn(`[ExecController] Tindakan "${action.id}" tidak terdaftar. Dilewati.`);
        continue;
      }

      // Logika untuk eksekusi otomatis vs. persetujuan manual
      if (action.auto && registeredAction.riskLevel !== 'HIGH') {
        await this.execute(decisionId, action, 'auto');
      } else {
        // Untuk tindakan berisiko tinggi atau yang direkomendasikan manual,
        // status keputusan tetap 'pending' hingga operator menyetujuinya.
        const reason = registeredAction.riskLevel === 'HIGH' ? 'High risk level' : 'Manual recommendation';
        console.log(`[ExecController] Tindakan "${action.id}" memerlukan persetujuan manual (${reason}). Status tetap 'pending'.`);
      }
    }
  }

  /**
   * Mengeksekusi satu tindakan yang telah divalidasi.
   * @param decisionId ID dari keputusan induk.
   * @param action Tindakan yang akan dieksekusi.
   * @param approvedBy Identifier untuk siapa yang menyetujui tindakan ('auto' atau 'operator:<id>').
   */
  private async execute(decisionId: string, action: IDTAction, approvedBy: string): Promise<void> {
    const registeredAction = getAction(action.id)!;
    
    try {
      console.log(`[ExecController] Mengeksekusi tindakan: ${action.id} dengan payload:`, action.payload);
      
      // Memanggil handler dari registry. Di skenario nyata, ini akan
      // memanggil `actionExecutor` yang menjalankan skrip terisolasi.
      const resultSummary = await registeredAction.handler(action.payload);
      
      // Memperbarui status keputusan di database (panggilan konseptual).
      updateDecisionExecution(
        decisionId, 
        'applied',
        approvedBy,
        `Tindakan dieksekusi secara otomatis.`,
        { summary: resultSummary }
      );

      console.log(`[ExecController] Tindakan "${action.id}" selesai dengan sukses. Hasil: ${resultSummary}`);

    } catch (error) {
      console.error(`[ExecController] Tindakan "${action.id}" gagal:`, error);

      // Memperbarui status keputusan menjadi FAILED (panggilan konseptual).
      updateDecisionExecution(
        decisionId, 
        'failed',
        approvedBy,
        'Eksekusi tindakan gagal.',
        { error: (error as Error).message }
      );
    }
  }
}