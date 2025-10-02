// // src/app.ts - Main Express Server
// import express from "express";
// import cors from "cors";
// import helmet from "helmet";
// import compression from "compression";
// import morgan from "morgan";
// import cookieParser from "cookie-parser";
// import rateLimit from "express-rate-limit";
// import { createServer } from "https";
// import { readFileSync } from "fs";
// import { Server as SocketIOServer } from "socket.io";
// import path from "path";

// import { config } from "./config/env";
// import { prisma } from "./config/database";
// import { errorHandler, notFound } from "./middleware/errorHandler";
// import { logger } from "./utils/logger";

// // Route imports
// import authRoutes from "./routes/auth";
// import studentRoutes from "./routes/students";
// import courseRoutes from "./routes/courses";
// import attendanceRoutes from "./routes/attendance";
// import biometricRoutes from "./routes/biometric";
// import dashboardRoutes from "./routes/dashboard";
// import reportsRoutes from "./routes/reports";

// const app = express();

// // Trust proxy for proper IP detection
// app.set("trust proxy", 1);

// // Security middleware
// app.use(
//   helmet({
//     contentSecurityPolicy: {
//       directives: {
//         defaultSrc: ["'self'"],
//         styleSrc: ["'self'", "'unsafe-inline'"],
//         scriptSrc: ["'self'"],
//         imgSrc: ["'self'", "data:", "https:"],
//         connectSrc: ["'self'", "wss:", "ws:"],
//         fontSrc: ["'self'"],
//         objectSrc: ["'none'"],
//         mediaSrc: ["'self'"],
//         frameSrc: ["'none'"],
//       },
//     },
//     crossOriginEmbedderPolicy: false,
//   })
// );

// // CORS configuration
// app.use(
//   cors({
//     origin: config.CORS_ORIGIN,
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
//   })
// );

// // Rate limiting
// const limiter = rateLimit({
//   windowMs: config.RATE_LIMIT_WINDOW_MS,
//   max: config.RATE_LIMIT_MAX_REQUESTS,
//   message: {
//     error: "Too many requests from this IP, please try again later.",
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });
// app.use("/", limiter);

// // Body parsing middleware
// app.use(express.json({ limit: "10mb" }));
// app.use(express.urlencoded({ extended: true, limit: "10mb" }));
// app.use(cookieParser());
// app.use(compression());

// // Logging middleware
// if (config.NODE_ENV !== "test") {
//   app.use(
//     morgan("combined", {
//       stream: {
//         write: (message: string) => logger.info(message.trim()),
//       },
//     })
//   );
// }

// // Health check endpoint
// app.get("/health", (req, res) => {
//   res.json({
//     status: "OK",
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//     environment: config.NODE_ENV,
//     database: "connected", // We'll add actual DB health check later
//   });
// });

// // API Routes
// app.use("/api/auth", authRoutes);
// app.use("/api/students", studentRoutes);
// app.use("/api/courses", courseRoutes);
// app.use("/api/attendance", attendanceRoutes);
// app.use("/api/biometric", biometricRoutes);
// app.use("/api/dashboard", dashboardRoutes);
// app.use("/api/reports", reportsRoutes);

// // Serve static files from uploads directory
// app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// // Error handling middleware
// app.use(notFound);
// app.use(errorHandler);

// // Create HTTPS server
// const server = createServer(
//   {
//     key: readFileSync(config.SSL_KEY_PATH),
//     cert: readFileSync(config.SSL_CERT_PATH),
//   },
//   app
// );

// // Socket.IO setup for real-time features
// const io = new SocketIOServer(server, {
//   cors: {
//     origin: config.CORS_ORIGIN,
//     methods: ["GET", "POST"],
//   },
// });

// // Socket.IO authentication middleware
// io.use((socket, next) => {
//   const token = socket.handshake.auth.token;
//   if (token) {
//     // TODO: Verify JWT token
//     // For now, just allow connection
//     next();
//   } else {
//     next(new Error("Authentication error"));
//   }
// });

// // Socket.IO connection handling
// io.on("connection", (socket) => {
//   logger.info(`Socket connected: ${socket.id}`);

//   socket.on("join-session", (sessionId) => {
//     socket.join(`session-${sessionId}`);
//     logger.info(`Socket ${socket.id} joined session ${sessionId}`);
//   });

//   socket.on("disconnect", () => {
//     logger.info(`Socket disconnected: ${socket.id}`);
//   });
// });

// // Make io available globally for emitting events
// app.set("io", io);

// // Graceful shutdown
// process.on("SIGTERM", async () => {
//   logger.info("SIGTERM received, shutting down gracefully");
//   server.close(() => {
//     logger.info("Process terminated");
//   });
//   await prisma.$disconnect();
// });

// process.on("SIGINT", async () => {
//   logger.info("SIGINT received, shutting down gracefully");
//   server.close(() => {
//     logger.info("Process terminated");
//   });
//   await prisma.$disconnect();
// });

// app.get('/', (req, res) => {
//   res.json({ message: 'Server is running!', timestamp: new Date().toISOString() });
// });

// app.get('/health', (req, res) => {
//   res.json({ status: 'OK', port: process.env.PORT });
// });

// // Start server
// const PORT = process.env.PORT || 5000;
// console.log('About to start server on port:', PORT);
// console.log('Environment PORT:', process.env.PORT);

// // Add error handling for the server
// server.on('error', (error) => {
//   console.error('Server error:', error);
//   process.exit(1);
// });

// server.listen(PORT, '0.0.0.0', () => {
//   console.log(`Server successfully started on ${PORT}`);
//   console.log('Server address:', server.address());
//   logger.info(`🚀 Server running on port ${PORT}`);
  
//   // Keep-alive check
//   setInterval(() => {
//     console.log('Server still running...');
//   }, 30000); // Log every 30 seconds
// });

// // Handle uncaught exceptions
// process.on('uncaughtException', (error) => {
//   console.error('Uncaught Exception:', error);
//   process.exit(1);
// });

// process.on('unhandledRejection', (reason, promise) => {
//   console.error('Unhandled Rejection at:', promise, 'reason:', reason);
//   process.exit(1);
// });

// export default app;



// src/app.ts - Main Express Server
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { createServer as createHttpServer } from "http";
import { createServer as createHttpsServer } from "https";
import { readFileSync, existsSync } from "fs";
import { Server as SocketIOServer } from "socket.io";
import path from "path";

import { config } from "./config/env";
import { prisma } from "./config/database";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { logger } from "./utils/logger";

// Route imports
import authRoutes from "./routes/auth";
import studentRoutes from "./routes/students";
import courseRoutes from "./routes/courses";
import attendanceRoutes from "./routes/attendance";
import biometricRoutes from "./routes/biometric";
import dashboardRoutes from "./routes/dashboard";
import reportsRoutes from "./routes/reports";

const app = express();

// Trust proxy for proper IP detection
app.set("trust proxy", 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "ws:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(compression());

// Logging middleware
if (config.NODE_ENV !== "test") {
  app.use(
    morgan("combined", {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    })
  );
}

// Add request logging to see if requests are coming in
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Biometric Attendance System API is running!', 
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    port: process.env.PORT
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    port: process.env.PORT,
    database: "connected", // We'll add actual DB health check later
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/biometric", biometricRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportsRoutes);

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Create server (HTTP for production/Render, HTTPS for local development)
let server;
const isProduction = config.NODE_ENV === "production";
const hasSSLCerts = existsSync(config.SSL_KEY_PATH) && existsSync(config.SSL_CERT_PATH);

if (isProduction || !hasSSLCerts) {
  // Use HTTP server for production/Render or when SSL certs don't exist
  console.log("Creating HTTP server");
  server = createHttpServer(app);
} else {
  // Use HTTPS server for local development
  console.log("Creating HTTPS server");
  server = createHttpsServer(
    {
      key: readFileSync(config.SSL_KEY_PATH),
      cert: readFileSync(config.SSL_CERT_PATH),
    },
    app
  );
}

// Socket.IO setup for real-time features
const io = new SocketIOServer(server, {
  cors: {
    origin: config.CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
});

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (token) {
    // TODO: Verify JWT token
    // For now, just allow connection
    next();
  } else {
    next(new Error("Authentication error"));
  }
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on("join-session", (sessionId) => {
    socket.join(`session-${sessionId}`);
    logger.info(`Socket ${socket.id} joined session ${sessionId}`);
  });

  socket.on("disconnect", () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Make io available globally for emitting events
app.set("io", io);

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated");
  });
  await prisma.$disconnect();
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated");
  });
  await prisma.$disconnect();
});

// Start server
const PORT = process.env.PORT || 5000;
console.log('About to start server on port:', PORT);
console.log('Environment PORT:', process.env.PORT);
console.log('Server type:', isProduction || !hasSSLCerts ? 'HTTP' : 'HTTPS');

// Add error handling for the server
server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server successfully started on ${PORT}`);
  console.log('Server address:', server.address());
  logger.info(`🚀 Server running on port ${PORT}`);
  
  // Keep-alive check
  setInterval(() => {
    console.log('Server still running...');
  }, 30000); // Log every 30 seconds
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;