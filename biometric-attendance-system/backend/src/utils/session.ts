// src/utils/session.ts - Session Management Utilities
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { logger } from "./logger";

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  sessionId?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

// Active sessions store - in production, use Redis
const activeSessions = new Map<string, {
  userId: string;
  createdAt: Date;
  lastActivity: Date;
  userAgent?: string;
  ipAddress?: string;
}>();

export const generateTokenPair = (payload: TokenPayload): TokenPair => {
  const sessionId = generateSessionId();

  // Create access token (short-lived)
  const accessToken = jwt.sign(
    { ...payload, sessionId },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN || "15m" }
  );

  // Create refresh token (long-lived)
  const refreshToken = jwt.sign(
    { userId: payload.userId, sessionId },
    config.JWT_REFRESH_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRES_IN || "7d" }
  );

  // Store session
  activeSessions.set(sessionId, {
    userId: payload.userId,
    createdAt: new Date(),
    lastActivity: new Date(),
  });

  // Calculate expiration
  const expiresAt = new Date();
  expiresAt.setTime(expiresAt.getTime() + (15 * 60 * 1000)); // 15 minutes

  logger.info(`Session created: ${sessionId} for user: ${payload.userId}`);

  return { accessToken, refreshToken, expiresAt };
};

export const verifyAccessToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as TokenPayload;

    // Check if session is still active
    if (decoded.sessionId && !activeSessions.has(decoded.sessionId)) {
      logger.warn(`Invalid session: ${decoded.sessionId}`);
      return null;
    }

    // Update last activity
    if (decoded.sessionId) {
      const session = activeSessions.get(decoded.sessionId);
      if (session) {
        session.lastActivity = new Date();
      }
    }

    return decoded;
  } catch (error) {
    logger.error("Access token verification failed:", error);
    return null;
  }
};

export const verifyRefreshToken = (token: string): { userId: string; sessionId: string } | null => {
  try {
    const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET) as { userId: string; sessionId: string };

    // Check if session exists
    if (!activeSessions.has(decoded.sessionId)) {
      logger.warn(`Refresh token used for invalid session: ${decoded.sessionId}`);
      return null;
    }

    return decoded;
  } catch (error) {
    logger.error("Refresh token verification failed:", error);
    return null;
  }
};

export const refreshAccessToken = (refreshToken: string, userPayload: TokenPayload): string | null => {
  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) return null;

  // Generate new access token with same session
  const newAccessToken = jwt.sign(
    { ...userPayload, sessionId: decoded.sessionId },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN || "15m" }
  );

  logger.info(`Access token refreshed for session: ${decoded.sessionId}`);
  return newAccessToken;
};

export const revokeSession = (sessionId: string): void => {
  if (activeSessions.delete(sessionId)) {
    logger.info(`Session revoked: ${sessionId}`);
  }
};

export const revokeUserSessions = (userId: string): number => {
  let revokedCount = 0;

  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.userId === userId) {
      activeSessions.delete(sessionId);
      revokedCount++;
    }
  }

  logger.info(`Revoked ${revokedCount} sessions for user: ${userId}`);
  return revokedCount;
};

export const getActiveSessionsCount = (userId?: string): number => {
  if (userId) {
    let count = 0;
    for (const session of activeSessions.values()) {
      if (session.userId === userId) count++;
    }
    return count;
  }
  return activeSessions.size;
};

export const cleanupExpiredSessions = (): number => {
  const now = new Date();
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  let cleanedCount = 0;

  for (const [sessionId, session] of activeSessions.entries()) {
    if (now.getTime() - session.lastActivity.getTime() > maxAge) {
      activeSessions.delete(sessionId);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.info(`Cleaned up ${cleanedCount} expired sessions`);
  }

  return cleanedCount;
};

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Cleanup expired sessions every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);