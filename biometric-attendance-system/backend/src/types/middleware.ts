// src/types/middleware.ts (Backend)
// import type { Request } from 'express';
import type Express from 'express';

export interface RateLimitOptions {
  windowMs: number
  max: number
  message?: string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

export interface UploadOptions {
  maxFileSize: number
  allowedMimeTypes: string[]
  destination: string
  filename?: (req: Request, file: Express.Multer.File) => string
}

export interface CacheOptions {
  ttl: number
  key?: string
  condition?: (req: Request) => boolean
}