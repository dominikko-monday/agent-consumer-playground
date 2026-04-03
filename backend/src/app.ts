import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health.js";
import { agentWebhookRouter } from "./routes/agent-webhook.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Public routes (no auth)
app.use("/health", healthRouter);

// Agent webhook route (authenticated via monday signing secret)
app.use("/api/agent-webhook", agentWebhookRouter);

export default app;
