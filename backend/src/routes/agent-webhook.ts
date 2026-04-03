import { Router } from "express";
import type { Request, Response } from "express";
import { authenticationMiddleware } from "../middleware/auth.js";
import { ApiClient } from "@mondaydotcomorg/api";

export const agentWebhookRouter = Router();

agentWebhookRouter.use(authenticationMiddleware);

agentWebhookRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { payload } = req.body;
    const triggerNodeId = payload?.inboundFieldValues?.triggerNodeId;
    const triggerOutput = payload?.inboundFieldValues?.triggerOutput;

    console.log("=== AGENT WEBHOOK HIT ===");
    console.log("Trigger node:", triggerNodeId);
    console.log("Trigger output:", JSON.stringify(triggerOutput, null, 2));
    console.log("Account:", req.session?.accountId, "User:", req.session?.userId);

    if (triggerNodeId === "2") {
      const itemId = triggerOutput?.itemId?.["1"];
      const token = req.session?.shortLivedToken;



      console.log("Agent ASSIGNED to item:", itemId);

      if (!itemId || !token) {
        console.error("Missing itemId or shortLivedToken");
        return res.status(400).json({ error: "Missing itemId or token" });
      }

      const mondayApi = new ApiClient({ token, apiVersion: "2024-10", endpoint: process.env.MONDAY_API_ENDPOINT });

      console.log("Sending create_update via API SDK for item:", itemId);

      const result = await mondayApi.request<{ create_update: { id: string } }>(
        `mutation ($itemId: ID!, $body: String!) {
          create_update(item_id: $itemId, body: $body) {
            id
          }
        }`,
        {
          itemId: String(itemId),
          body: "👋 Hi! I've been assigned to this item. How can I help?",
        }
      );

      console.log("API response:", JSON.stringify(result, null, 2));
    } else if (triggerNodeId === "1") {
      // Agent was mentioned — data is under key "0"
      const updateId = triggerOutput?.updateId?.["0"];
      const itemId = triggerOutput?.itemId?.["0"] || triggerOutput?.itemId?.["1"];
      const updateBody = triggerOutput?.updateBody?.["0"];
      const token = req.session?.shortLivedToken;

      console.log("Agent MENTIONED in update:", updateId, "item:", itemId);
      console.log("Update body:", updateBody);

      if (!updateId || !token) {
        console.error("Missing updateId or shortLivedToken");
        return res.status(400).json({ error: "Missing updateId or token" });
      }

      const mondayApi = new ApiClient({ token, apiVersion: "2024-10", endpoint: process.env.MONDAY_API_ENDPOINT });

      console.log("Sending reply to update:", updateId);

      const result = await mondayApi.request<{ create_update: { id: string } }>(
        `mutation ($itemId: ID!, $body: String!, $parentId: ID!) {
          create_update(item_id: $itemId, body: $body, parent_id: $parentId) {
            id
          }
        }`,
        {
          itemId: String(itemId),
          parentId: String(updateId),
          body: "👋 Hey! You mentioned me. How can I help?",
        }
      );

      console.log("API response:", JSON.stringify(result, null, 2));
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Agent webhook error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
