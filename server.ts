import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    // In this environment, we might not have a service account file, 
    // so we can try to initialize with default credentials or environment variables.
    // For now, we'll assume the user will provide a service account JSON in an env var.
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
      : null;

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // Fallback for local development if possible, or just log a warning
      console.warn("FIREBASE_SERVICE_ACCOUNT not found. Push notifications will be disabled.");
    }
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Push Notification Endpoint
  app.post("/api/send-notification", async (req, res) => {
    const { token, title, body, data } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    if (!admin.apps.length) {
      return res.status(503).json({ error: "Firebase Admin not initialized" });
    }

    try {
      const message = {
        notification: { title, body },
        token: token,
        data: data || {},
      };

      const response = await admin.messaging().send(message);
      res.json({ success: true, messageId: response });
    } catch (error) {
      console.error("Error sending push notification:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
