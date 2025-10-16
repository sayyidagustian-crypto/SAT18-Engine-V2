import { DEPLOYMENT_CONFIG } from '../config';
import { authHandler, SecureSession } from './authHandler';
import type { DeployResponse } from '../types';

export interface DeployResult {
  success: boolean;
  message: string;
  session: SecureSession | null;
}

export async function deployToVps(
  zipBlob: Blob,
  onProgress: (message: string) => void
): Promise<DeployResult> {
  if (!navigator.onLine) {
    return {
      success: false,
      message: 'Cannot deploy. You are currently offline.',
      session: null
    };
  }

  try {
    onProgress('🔐 Initiating secure handshake with SAT18 VPS...');
    const session = await authHandler.initiateHandshake();
    
    onProgress('✅ Handshake successful. Secure session established.');
    
    const formData = new FormData();
    formData.append('file', zipBlob, 'sat18-deployment.zip');

    onProgress('📤 Uploading package with session token...');
    
    const response = await fetch(DEPLOYMENT_CONFIG.API_ENDPOINT, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${session.token}`,
      },
      body: formData,
    });

    const data: DeployResponse = await response.json();
    
    // Log stream is now handled via WebSocket, no encrypted logs in response.
    
    if (response.ok) {
      onProgress('🚀 Server is processing the deployment...');
      return {
        success: true,
        message: data.message,
        session: session
      };
    } else {
      let errorMessage = `Server responded with status ${response.status}: ${data.message}`;
      if (response.status === 401 || response.status === 403) {
          errorMessage = "Authentication failed. The session token may have expired or is invalid.";
      }
      return {
        success: false,
        message: errorMessage,
        session: null
      };
    }
  } catch (err) {
    console.error("Deployment error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Deployment process failed: ${errorMessage}`,
      session: null
    };
  }
  // Session is now managed by App.tsx and cleared on reset or when the stream closes.
}