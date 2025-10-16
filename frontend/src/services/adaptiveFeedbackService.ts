// src/services/adaptiveFeedbackService.ts
// Client-Side Reinforcement Memory Layer - API Bridge

import type { FeedbackRecord, FeedbackSummary } from "../types";
import { v4 as uuidv4 } from "uuid";
import { authHandler } from "../modules/authHandler";
import { Logger } from "../modules/logger";

/**
 * Sends a new feedback record to the centralized server.
 * @param record - The result of the AI's decision vs. the actual outcome.
 */
export async function addFeedbackRecord(record: Omit<FeedbackRecord, 'id' | 'createdAt'>): Promise<void> {
  const session = authHandler.getActiveSession();
  if (!session) {
    Logger.log('warning', "Cannot add feedback record: No active secure session.");
    return;
  }
  
  const newRecord: FeedbackRecord = { 
      ...record, 
      id: uuidv4(),
      createdAt: Date.now() 
  };

  try {
    const endpoint = '/api/feedback';
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`,
        },
        body: JSON.stringify(newRecord),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }
    Logger.log('info', `Successfully sent feedback record to server for project: ${record.project}`);
  } catch (error) {
      Logger.log('error', `Failed to send feedback record: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fetches the AI performance summary (accuracy, confidence, trend) from the server.
 * @param project - The name of the project to get a summary for.
 * @returns {Promise<FeedbackSummary | null>} A summary of the AI's performance, or null on failure.
 */
export async function getFeedbackSummary(project: string): Promise<FeedbackSummary | null> {
    const session = authHandler.getActiveSession();
    // A session is required to get a summary. A handshake is performed before any deployment.
    // If there's no session, it means no recent activity that would require a summary.
    if (!session) {
      // Return a default empty state if no session exists, as there's nothing to query
      return { accuracyRate: 0, total: 0, successCount: 0, averageConfidence: null, trend: [] };
    }

    try {
        const endpoint = new URL('/api/feedback/summary', window.location.origin);
        endpoint.searchParams.set('project', project);
        
        const response = await fetch(endpoint.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${session.token}`,
            },
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }
        
        const summaryData: FeedbackSummary = await response.json();
        return summaryData;
        
    } catch(error) {
        Logger.log('error', `Failed to fetch feedback summary: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}