import { GoogleGenAI, Type } from "@google/genai";
import type { VpsLogEntry, SystemHealthInsight, SystemHealthLevel } from '../types';

// IMPORTANT: This key is managed by the execution environment. Do not change this.
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

function calculateMetrics(logs: VpsLogEntry[]): { successRate: number, avgDeployTime: number, hasErrors: boolean } {
    const deployStart = logs.find(l => l.text.toLowerCase().includes('starting deployment'));
    const deployEnd = logs.find(l => l.level === 'success' || l.level === 'error');
    const hasErrors = logs.some(l => l.level === 'error');

    let avgDeployTime = 0;
    if (deployStart?.timestamp && deployEnd?.timestamp) {
        avgDeployTime = (deployEnd.timestamp - deployStart.timestamp) / 1000;
    }

    // This is a simplified metric for the current deployment
    const successRate = hasErrors ? 0 : 100;

    return { successRate, avgDeployTime, hasErrors };
}

function createLogSummary(logs: VpsLogEntry[]): string {
    return logs
        .map(log => `[${log.level?.toUpperCase()}] ${log.text}`)
        .join('\n');
}

export async function getSystemHealthInsights(logs: VpsLogEntry[]): Promise<SystemHealthInsight> {
    const metrics = calculateMetrics(logs);
    const logSummary = createLogSummary(logs);

    const prompt = `
        You are a DevOps expert analyzing a deployment log summary. 
        Based on the provided log and metrics, determine the system health level (Nominal, Warning, or Critical)
        and provide a concise, one-sentence insight for the user.
        
        Metrics:
        - Deployment Result: ${metrics.hasErrors ? 'FAILURE' : 'SUCCESS'}
        - Deployment Time: ${metrics.avgDeployTime.toFixed(1)} seconds

        Log Summary:
        ---
        ${logSummary}
        ---

        Respond ONLY with a JSON object matching this schema:
        {
            "level": "Nominal" | "Warning" | "Critical",
            "message": "Your one-sentence analysis and recommendation."
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        level: { type: Type.STRING },
                        message: { type: Type.STRING }
                    },
                    required: ["level", "message"]
                }
            }
        });
        
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);

        return {
            level: result.level as SystemHealthLevel,
            message: result.message,
            metrics: {
                successRate: metrics.successRate,
                avgDeployTime: metrics.avgDeployTime
            }
        };

    } catch (e) {
        console.error("Gemini health analysis failed:", e);
        // Fallback in case of API error
        return {
            level: "Unknown",
            message: "AI analysis could not be performed. Please review logs manually.",
            metrics: {
                successRate: metrics.successRate,
                avgDeployTime: metrics.avgDeployTime
            }
        };
    }
}