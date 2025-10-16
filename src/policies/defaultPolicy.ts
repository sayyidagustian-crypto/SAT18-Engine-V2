// src/policies/defaultPolicy.ts
import { cond } from '../modules/intelligentDecisionTree';
import type { IDTNode } from '../types';

const nodeCriticalFailure: IDTNode = {
  id: 'critical-failure',
  description: 'Jika deploy gagal dan health checks gagal banyak => rollback segera',
  condition: (ctx) => ctx.outcome === 'FAIL' && (ctx.metrics?.healthChecksFailed ?? 0) >= 1,
  actions: [
    { id: 'rollback', label: 'Rollback to previous release', level: 'CRITICAL', auto: false, recommendManual: true, payload: { method: 'atomic-symlink-rollback' } },
    { id: 'alert-oncall', label: 'Alert on-call team', level: 'CRITICAL', auto: false, recommendManual: true, payload: { channel: 'pagerduty' } },
  ]
};

const nodeHighCpu: IDTNode = {
  id: 'high-cpu',
  description: 'Jika CPU > 85% dalam deployment baru',
  condition: cond.cpuAbove(85),
  actions: [
    { id: 'delay-deploy', label: 'Delay next deployment', level: 'WARN', auto: true, recommendManual: false, payload: { delaySeconds: 300 } },
    { id: 'scale-up', label: 'Recommend scaling up instance group / increase replicas', level: 'WARN', auto: false, recommendManual: true, payload: { scaleBy: 1 } }
  ]
};

const nodeLowAccuracyTrend: IDTNode = {
  id: 'low-accuracy-trend',
  description: 'Jika akurasi model rendah dalam 7 hari terakhir',
  condition: cond.recentAccuracyBelow(0.8), // Threshold 80%
  actions: [
    { id: 'manual-audit', label: 'Request operator audit due to low historical accuracy', level: 'WARN', auto: false, recommendManual: true }
  ]
};

export const defaultPolicy: IDTNode = {
  id: 'root',
  description: 'Root policy for SAT18 IDT',
  children: [nodeCriticalFailure, nodeHighCpu, nodeLowAccuracyTrend],
  fallback: [
    { id: 'no-op', label: 'System nominal. Monitor.', level: 'INFO', auto: true }
  ]
};