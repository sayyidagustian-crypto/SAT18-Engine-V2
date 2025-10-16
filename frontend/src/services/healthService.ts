import type { VpsLogEntry, SystemHealthInsight } from '../types';
import { authHandler } from '../modules/authHandler';

/**
 * Fetches system health insights by sending deployment logs to the secure backend endpoint.
 * The backend will then call the Gemini API.
 * @param logs The VPS log entries from the current deployment.
 * @returns A promise that resolves to a SystemHealthInsight object.
 */
export async function getSystemHealthInsights(logs: VpsLogEntry[]): Promise<SystemHealthInsight> {
    const session = authHandler.getActiveSession();
    if (!session) {
        // This case should ideally not be hit if a deployment has occurred.
        throw new Error("Cannot get health insights without an active session.");
    }
    
    try {
        // The API endpoint is proxied by Vite in dev and Nginx in prod.
        const endpoint = '/api/health-insights';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
            body: JSON.stringify({ logs }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response from server.' }));
            throw new Error(errorData.error || `Server responded with status ${response.status}`);
        }

        const insights: SystemHealthInsight = await response.json();
        return insights;
        
    } catch (e) {
        console.error("Health insight service failed:", e);
        // Provide a fallback object to prevent the UI from crashing.
        return {
            level: "Unknown",
            message: `AI analysis failed: ${e instanceof Error ? e.message : 'A network or server error occurred.'}`,
            metrics: {
                successRate: logs.some(l => l.level === 'error') ? 0 : 100,
                avgDeployTime: 0
            }
        };
    }
}