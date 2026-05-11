import { app, initDB } from "../server.js";

// Initializing database for serverless context
let isInitialized = false;

app.use(async (req, res, next) => {
  if (!isInitialized) {
    try {
      await initDB();
      isInitialized = true;
    } catch (err) {
      console.error("DB initialization failed in serverless function:", err);
    }
  }
  next();
});

export default app;
