import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to initialize Firebase Admin lazily
function getFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!serviceAccountStr) {
        console.warn("FIREBASE_SERVICE_ACCOUNT not found.");
        return null;
      }

      const serviceAccount = JSON.parse(serviceAccountStr);
      
      // Fix private key if it has literal \n
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("Firebase Admin initialized successfully.");
    } catch (error) {
      console.error("Error initializing Firebase Admin:", error);
      return null;
    }
  }
  return admin;
}

const app = express();
app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

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

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(503).json({ error: "Firebase Admin not initialized. Check server logs for FIREBASE_SERVICE_ACCOUNT issues." });
  }

  try {
    console.log(`Attempting to send notification to token: ${token.substring(0, 10)}...`);
    const message = {
      notification: { 
        title: title || "New Notification", 
        body: body || "You have a new update." 
      },
      token: token,
      data: data || {},
    };

    const response = await firebaseAdmin.messaging().send(message);
    console.log(`Successfully sent message: ${response}`);
    res.json({ success: true, messageId: response });
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    
    // Provide more detailed error info to the client for debugging
    const errorDetails = {
      message: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
    
    res.status(500).json({ 
      error: "Failed to send notification", 
      details: error.message,
      firebaseError: errorDetails
    });
  }
});

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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

// Export for Vercel
export default app;

if (process.env.NODE_ENV !== "production") {
  startServer();
} else if (!process.env.VERCEL) {
  // In production but not on Vercel (e.g. a regular VPS or container)
  startServer();
}
