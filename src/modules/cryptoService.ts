// Helper function to decode base64 string to Uint8Array
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper function to convert ArrayBuffer to string
function arrayBufferToString(buffer: ArrayBuffer): string {
    return new TextDecoder().decode(buffer);
}

// Import an AES-GCM key from a base64 string
async function importAesKey(keyB64: string): Promise<CryptoKey> {
  const keyBytes = decodeBase64(keyB64);
  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false, // not exportable
    ['decrypt']
  );
}

/**
 * Decrypts a base64 encoded string using AES-GCM.
 *
 * @param dataB64 - The base64 encoded data to decrypt.
 * @param keyB64 - The base64 encoded AES key.
 * @param nonceB64 - The base64 encoded nonce (IV).
 * @returns A promise that resolves to the decrypted string.
 */
export async function decrypt(dataB64: string, keyB64: string, nonceB64: string): Promise<string> {
    try {
        const key = await importAesKey(keyB64);
        const nonce = decodeBase64(nonceB64);
        const data = decodeBase64(dataB64);

        const decryptedBuffer = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: nonce,
            },
            key,
            data
        );

        return arrayBufferToString(decryptedBuffer);

    } catch(e) {
        console.error("Decryption failed:", e);
        throw new Error("Failed to decrypt the log stream. The data may be corrupt or the key invalid.");
    }
}
