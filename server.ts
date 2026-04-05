import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to initialize Firebase Admin lazily
let firebaseAdminInstance: any = null;
let isInitializing = false;

async function getFirebaseAdmin() {
  try {
    // Dynamic import to avoid top-level issues
    const admin = await import("firebase-admin");
    const adminApp = admin.default || admin;

    if (adminApp.apps.length > 0) return adminApp;
    if (firebaseAdminInstance) return firebaseAdminInstance;
    
    if (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (adminApp.apps.length > 0) return adminApp;
    }

    isInitializing = true;
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountStr) {
      console.warn("FIREBASE_SERVICE_ACCOUNT not found.");
      isInitializing = false;
      return null;
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountStr);
    } catch (parseError) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", parseError);
      isInitializing = false;
      return null;
    }
    
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    if (!adminApp.apps.length) {
      adminApp.initializeApp({
        credential: adminApp.credential.cert(serviceAccount),
      });
      console.log("Firebase Admin initialized successfully.");
    }
    firebaseAdminInstance = adminApp;
    return firebaseAdminInstance;
  } catch (error) {
    console.error("CRITICAL Error in getFirebaseAdmin:", error);
    return null;
  } finally {
    isInitializing = false;
  }
}

const app = express();
app.use(express.json());

// Log environment status on startup (but don't log the actual secret)
console.log("Server starting. FIREBASE_SERVICE_ACCOUNT present:", !!process.env.FIREBASE_SERVICE_ACCOUNT);
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.log("FIREBASE_SERVICE_ACCOUNT length:", process.env.FIREBASE_SERVICE_ACCOUNT.length);
}

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), vercel: !!process.env.VERCEL });
});

// Push Notification Endpoint
app.post("/api/send-notification", async (req, res) => {
  console.log("Received send-notification request");
  try {
    const { token, title, body, data } = req.body;
    console.log("Request body:", JSON.stringify({ token: token ? token.substring(0, 10) + "..." : null, title, body, data }));

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const firebaseAdmin = await getFirebaseAdmin();
    if (!firebaseAdmin) {
      return res.status(503).json({ 
        error: "Firebase Admin not initialized", 
        details: "Check server logs for FIREBASE_SERVICE_ACCOUNT issues. Make sure the environment variable is set correctly in Vercel." 
      });
    }

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
    console.error("CRITICAL Error in send-notification handler:", error);
    
    const errorDetails = {
      message: error.message,
      code: error.code,
      stack: error.stack
    };
    
    res.status(500).json({ 
      error: "Failed to send notification", 
      details: error.message,
      firebaseError: errorDetails,
      timestamp: new Date().toISOString()
    });
  }
});

// Global error handler for Express (MUST be after routes)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global Express Error Catch-all:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
});

async function startServer() {
  const PORT = 3000;

  // ONLY run Vite or static serving if NOT on Vercel
  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      // Production static serving (for non-Vercel environments)
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
}

// Export for Vercel
export default app;

if (process.env.NODE_ENV !== "production") {
  startServer();
} else if (!process.env.VERCEL) {
  // In production but not on Vercel (e.g. a regular VPS or container)
  startServer();
}
