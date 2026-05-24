import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";

import feedbackRouter from "./routes/feedback.js";
import { notFound, errorHandler } from "./middleware/error.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("tiny"));

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

// API root — discoverability
app.get("/api/v1", (_req, res) => {
  res.json({
    name: "PKKMB Feedback API",
    version: "1.0.0",
    resources: {
      feedback: {
        list: "GET    /api/v1/feedback",
        retrieve: "GET    /api/v1/feedback/:id",
        create: "POST   /api/v1/feedback   (admin)",
        update: "PUT    /api/v1/feedback/:id (admin)",
        delete: "DELETE /api/v1/feedback/:id (admin)",
      },
    },
  });
});

// Resources
app.use("/api/v1/feedback", feedbackRouter);

// 404 + error
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Feedback API listening on http://localhost:${PORT}`);
});
