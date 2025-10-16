import type { AdaptiveConfig, AdaptivePolicy } from '../types';

// Helper validation functions
const isNumber = (v: any): v is number => typeof v === 'number' && isFinite(v);
const isString = (v: any): v is string => typeof v === 'string' && v.trim().length > 0;
const isArrayOfString = (v: any): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/**
 * Safely parses and validates the raw response from the Gemini API for AdaptiveConfig.
 * It provides a safe fallback configuration if the response is invalid, malformed,
 * or has a low confidence score.
 *
 * @param raw - The raw data received from the Gemini API (can be an object or a JSON string).
 * @returns A validated AdaptiveConfig object.
 */
export function safeParseAdaptiveConfig(raw: any): AdaptiveConfig {
  // Define a secure, default fallback configuration.
  const fallback: AdaptiveConfig = {
    policy: "MANUAL_APPROVAL",
    deployDelayInSeconds: 0,
    cooldownSeconds: 300,
    maxConcurrentDeploys: 1,
    reason: "Fallback to MANUAL_APPROVAL due to an invalid or uncertain AI response.",
    confidence: 0,
    suggestedActions: ["Manual review of system logs and metrics is required before proceeding."],
    generatedAt: new Date().toISOString(),
  };

  try {
    // If the raw input is a string (as some LLMs might return), parse it as JSON.
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    
    if (typeof obj !== 'object' || obj === null) {
        return fallback;
    }

    // Validate the 'policy' field. It must be one of the allowed values.
    const policy = obj.policy;
    if (!["IMMEDIATE", "DELAYED", "MANUAL_APPROVAL"].includes(policy)) {
        return fallback;
    }

    // Validate the 'confidence' score.
    const confidence = Number(obj.confidence);
    if (!isNumber(confidence) || confidence < 0 || confidence > 1) {
        return { ...fallback, reason: "Fallback: AI response contained an invalid confidence score." };
    }

    // Enforce a confidence threshold. If the AI is not confident enough, default to manual approval.
    const CONFIDENCE_THRESHOLD = 0.6;
    if (confidence < CONFIDENCE_THRESHOLD) {
      return { 
          ...fallback, 
          reason: `Low confidence (${(confidence * 100).toFixed(0)}%). AI reasoning: "${obj.reason || 'N/A'}"`,
          confidence: confidence, // Keep original low confidence score for display
          generatedAt: new Date().toISOString() 
      };
    }

    // The user's mock responses use 'delaySeconds', but the Gemini schema and app types use 'deployDelayInSeconds'.
    // We will check for both for robustness, preferring the correct one.
    const delayFromApi = obj.deployDelayInSeconds ?? obj.delaySeconds;
    const deployDelayInSeconds = isNumber(delayFromApi) && delayFromApi >= 0 ? delayFromApi : 0;
    
    // Validate and sanitize other fields, providing sensible defaults if they are missing or invalid.
    const cooldownSeconds = isNumber(obj.cooldownSeconds) && obj.cooldownSeconds >= 0 ? obj.cooldownSeconds : 300;
    const maxConcurrentDeploys = isNumber(obj.maxConcurrentDeploys) && obj.maxConcurrentDeploys > 0 ? obj.maxConcurrentDeploys : 1;
    const reason = isString(obj.reason) ? obj.reason : "No specific reason provided by AI.";
    const suggestedActions = isArrayOfString(obj.suggestedActions) ? obj.suggestedActions : [];

    const parsed: AdaptiveConfig = {
      policy: policy as AdaptivePolicy,
      deployDelayInSeconds,
      cooldownSeconds,
      maxConcurrentDeploys,
      reason,
      confidence,
      suggestedActions,
      generatedAt: isString(obj.generatedAt) ? obj.generatedAt : new Date().toISOString(),
    };

    return parsed;
  } catch (err) {
    // If any parsing error occurs (e.g., invalid JSON), return the secure fallback.
    return fallback;
  }
}
