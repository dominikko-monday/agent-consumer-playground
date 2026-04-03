import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  console.log("Health check", _req);
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});
