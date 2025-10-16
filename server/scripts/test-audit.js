// server/scripts/test-audit.js
// An integration test to verify the Reinforcement Memory Layer's database interactions.
import { addDecision, getDecisionById, updateDecisionExecution } from '../src/services/reinforcementMemory.js';

async function runTest() {
  console.log('--- [Audit Test] Starting RML Integrity Check ---');
  
  const mockDecisionPayload = {
    trace: [{ nodeId: 'high-cpu', matched: true }],
    actions: [{ id: 'delay-deploy', label: 'Delay next deployment', level: 'WARN', payload: { delaySeconds: 300 } }],
    decisionTimestamp: new Date().toISOString(),
    contextSnapshot: {
      project: 'SAT18-Test-Project',
      metrics: { cpu: 92.5 }
    },
  };

  try {
    // 1. Test Insertion
    console.log('[Step 1/3] Testing decision insertion...');
    const { decisionId } = addDecision(mockDecisionPayload);
    if (!decisionId) throw new Error('addDecision did not return a decisionId.');
    console.log(` > Success: Inserted decision with ID: ${decisionId}`);

    // 2. Test Retrieval
    console.log('[Step 2/3] Testing decision retrieval...');
    const record = getDecisionById(decisionId);
    if (!record || record.decision_id !== decisionId) {
      throw new Error(`getDecisionById failed to retrieve the correct record.`);
    }
    if (record.execution_status !== 'pending') {
      throw new Error(`Initial status should be 'pending', but was '${record.execution_status}'.`);
    }
    console.log(' > Success: Retrieved record matches inserted data.');

    // 3. Test Update
    console.log('[Step 3/3] Testing decision status update...');
    updateDecisionExecution(
      decisionId,
      'applied',
      'operator:test-runner',
      'Test execution completed successfully.',
      { final_cpu: 75.1 }
    );
    const updatedRecord = getDecisionById(decisionId);
    if (!updatedRecord || updatedRecord.execution_status !== 'applied') {
      throw new Error(`Record status did not update to 'applied'.`);
    }
    if (updatedRecord.approved_by !== 'operator:test-runner') {
      throw new Error(`'approved_by' field was not updated correctly.`);
    }
    console.log(' > Success: Record status and metadata updated correctly.');

    console.log('\n--- ✅ [Audit Test] All checks passed. RML is operating nominally. ---');

  } catch (error) {
    console.error('\n--- ❌ [Audit Test] A check failed ---');
    console.error(error);
    process.exit(1);
  }
}

runTest();