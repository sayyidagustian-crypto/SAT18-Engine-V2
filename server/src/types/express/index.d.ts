// server/src/types/express/index.d.ts
import { Buffer } from 'buffer';

declare global {
    namespace Express {
        export interface Request {
            session?: {
                key: Buffer;
                createdAt: number;
                expiresAt: number;
            };
        }
    }
}

// This export is necessary to make this file a module
export {};