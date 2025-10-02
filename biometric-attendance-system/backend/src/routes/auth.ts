// src/routes/auth.ts - Authentication Routes
import express from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/database";
import { config } from "../config/env";
import { authenticate } from "../middleware/auth";
import { validateRegister, validateLogin } from "../middleware/validation";
import { logger } from "../utils/logger";
import {
  generateTokenPair,
  verifyRefreshToken,
  refreshAccessToken,
  revokeSession,
  revokeUserSessions,
} from "../utils/session";

const router = express.Router();

// Register teacher
router.post("/register", validateRegister, async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      department,
      employeeId,
      registrationKey,
      courses,
    } = req.body;

    // Verify registration key
    if (registrationKey !== config.TEACHER_REGISTRATION_KEY) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration key",
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, config.BCRYPT_ROUNDS);

    // Create user with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          firstName,
          lastName,
          phone,
          department,
          employeeId,
          role: "TEACHER",
        },
      });

      // Create courses if provided
      if (courses && courses.length > 0) {
        // Link teacher to selected courses (courses is now array of course IDs)
        if (courses && courses.length > 0) {
          for (const courseId of courses) {
            // Update course to assign this teacher
            await tx.course.update({
              where: { id: courseId },
              data: { teacherId: user.id },
            });
          }
        }
      }

      return user;
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(result.id);

    // Return user without password
    const { passwordHash: _, ...userWithoutPassword } = result;

    logger.info(`New teacher registered: ${email}`);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
});

// Login
router.post("/login", validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Return user without password
    const { passwordHash, ...userWithoutPassword } = user;

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

// Get current user
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        department: true,
        employeeId: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user information",
    });
  }
});

// Refresh token
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as any;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const tokens = generateTokens(user.id);
    const { passwordHash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        ...tokens,
      },
    });
  } catch (error) {
    logger.error("Refresh token error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
});

// Logout
router.post("/logout", authenticate, async (req, res) => {
  try {
    // In a real app, you might want to blacklist the token
    // For now, we'll just return success
    res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    logger.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
});

export default router;
