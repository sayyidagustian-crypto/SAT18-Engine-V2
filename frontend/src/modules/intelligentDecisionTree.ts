// src/modules/intelligentDecisionTree.ts
import type { DecisionContext, IDTNode, IDTAction } from '../types';

/**
 * evaluateDecisionTree
 * Traverses the tree top-down and returns the first matching result,
 * including actions and diagnostics for auditing.
 */
export function evaluateDecisionTree(root: IDTNode, ctx: DecisionContext) {
  const trace: Array<{ nodeId: string; matched: boolean; reason?: string }> = [];
  const actions: IDTAction[] = [];

  function visit(node: IDTNode): boolean {
    let matched = true;
    if (typeof node.condition === 'function') {
      try {
        matched = node.condition(ctx);
      } catch (err) {
        matched = false;
        trace.push({ nodeId: node.id, matched: false, reason: `condition error: ${(err as Error).message}` });
      }
    }
    trace.push({ nodeId: node.id, matched, reason: matched ? 'condition true' : 'condition false' });

    if (!matched) return false;

    // If node has children, try them in order
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const childMatched = visit(child);
        if (childMatched) {
          // child handled actions; return true to stop sibling processing
          return true;
        }
      }
      // If no child matched, fall back to node's fallback or node.actions
      if (node.fallback && node.fallback.length > 0) {
        actions.push(...node.fallback);
        return true;
      }
    }

    if (node.actions && node.actions.length > 0) {
      actions.push(...node.actions);
      return true;
    }

    return true;
  }

  visit(root);

  // Consolidate actions (deduplicate by id)
  const deduped = dedupeActions(actions);

  return {
    trace,
    actions: deduped,
    decisionTimestamp: new Date().toISOString(),
    contextSnapshot: ctx,
  };
}

function dedupeActions(actions: IDTAction[]) {
  const seen = new Set<string>();
  const out: IDTAction[] = [];
  for (const a of actions) {
    if (!seen.has(a.id)) {
      seen.add(a.id);
      out.push(a);
    }
  }
  return out;
}

/**
 * Helper to build a Condition easily (factory)
 */
export const cond = {
  cpuAbove: (pct: number) => (ctx: DecisionContext) => !!ctx.metrics && (ctx.metrics.cpu ?? 0) > pct,
  cpuBelow: (pct: number) => (ctx: DecisionContext) => !!ctx.metrics && (ctx.metrics.cpu ?? 0) < pct,
  errorRateAbove: (th: number) => (ctx: DecisionContext) => !!ctx.metrics && (ctx.metrics.errorRate ?? 0) > th,
  recentAccuracyBelow: (th: number) => (ctx: DecisionContext) => !!ctx.recentTrend && (ctx.recentTrend.accuracy7d ?? 1) < th,
  healthChecksFailedAtLeast: (n: number) => (ctx: DecisionContext) => !!ctx.metrics && (ctx.metrics.healthChecksFailed ?? 0) >= n,
  outcomeIsFail: () => (ctx: DecisionContext) => ctx.outcome === 'FAIL',
};