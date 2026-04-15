import { Router } from "express";
import type { Request, Response } from "express";
import { authenticationMiddleware } from "../middleware/auth.js";
import { ApiClient } from "@mondaydotcomorg/api";
import { Trigger } from "../types/trigger.js";

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

    const token = req.session?.shortLivedToken;
    if (!token) {
      console.error("Missing token");
      return res.status(400).json({ error: "Missing token" });
    }

    const mondayApi = new ApiClient({ token, apiVersion: "2024-10", endpoint: process.env.MONDAY_API_ENDPOINT });


    if (triggerNodeId === Trigger.ASSIGNED) {
      const itemId = triggerOutput?.itemId?.["1"];
      console.log("Agent ASSIGNED to item:", itemId);

      if (!itemId) {
        console.error("Missing itemId");
        return res.status(400).json({ error: "Missing itemId" });
      }

      // Step 1: Query the item to get its board ID
      console.log("Querying board ID for item:", itemId);

      const itemResult = await mondayApi.request<{ items: { board: { id: string } }[] }>(
        `query ($itemId: [ID!]!) { items(ids: $itemId) { board { id } } }`,
        { itemId: [String(itemId)] }
      );

      console.log("Item query response:", JSON.stringify(itemResult, null, 2));

      const boardId = itemResult?.items?.[0]?.board?.id;
      if (!boardId) {
        console.error("Could not retrieve board ID for item:", itemId);
        return res.status(400).json({ error: "Could not retrieve board ID" });
      }

      console.log("Found board ID:", boardId);

      // Step 2: Create a new empty item on that board
      console.log("Creating new item on board:", boardId);

      const createItemResult = await mondayApi.request<{ create_item: { id: string; name: string } }>(
        `mutation ($boardId: ID!, $itemName: String!) { create_item(board_id: $boardId, item_name: $itemName) { id name } }`,
        { boardId: String(boardId), itemName: "New item" }
      );

      console.log("Create item response:", JSON.stringify(createItemResult, null, 2));

      const createdItem = createItemResult?.create_item;
      if (!createdItem) {
        console.error("Failed to create item on board:", boardId);
        return res.status(500).json({ error: "Failed to create item" });
      }

      console.log("Created item:", createdItem.id, createdItem.name);

      // Step 3: Post an update on the item reporting what was created
      console.log("Posting update on item:", itemId);

      const result = await mondayApi.request<{ create_update: { id: string } }>(
        `mutation ($itemId: ID!, $body: String!) {
          create_update(item_id: $itemId, body: $body) {
            id
          }
        }`,
        {
          itemId: String(itemId),
          body: `Done! I created a new item: "${createdItem.name}" (ID: ${createdItem.id})`,
        }
      );

      console.log("API response:", JSON.stringify(result, null, 2));
    } else if (triggerNodeId === Trigger.MENTIONED) {
      // Agent was mentioned — data is under key "0"
      const updateId = triggerOutput?.updateId?.["0"];
      const itemId = triggerOutput?.itemId?.["0"] || triggerOutput?.itemId?.["1"];
      const updateBody = triggerOutput?.updateBody?.["0"];

      console.log("Agent MENTIONED in update:", updateId, "item:", itemId);
      console.log("Update body:", updateBody);

      if (!updateId) {
        console.error("Missing updateId");
        return res.status(400).json({ error: "Missing updateId" });
      }

      if (!itemId) {
        console.error("Missing itemId");
        return res.status(400).json({ error: "Missing itemId" });
      }

      // Step 1: Query the item to get its board ID
      console.log("Querying board ID for item:", itemId);

      const itemResult = await mondayApi.request<{ items: { board: { id: string } }[] }>(
        `query ($itemId: [ID!]!) { items(ids: $itemId) { board { id } } }`,
        { itemId: [String(itemId)] }
      );

      console.log("Item query response:", JSON.stringify(itemResult, null, 2));

      const boardId = itemResult?.items?.[0]?.board?.id;
      if (!boardId) {
        console.error("Could not retrieve board ID for item:", itemId);
        return res.status(400).json({ error: "Could not retrieve board ID" });
      }

      console.log("Found board ID:", boardId);

      // Step 2: Create a new empty item on that board
      console.log("Creating new item on board:", boardId);

      const createItemResult = await mondayApi.request<{ create_item: { id: string; name: string } }>(
        `mutation ($boardId: ID!, $itemName: String!) { create_item(board_id: $boardId, item_name: $itemName) { id name } }`,
        { boardId: String(boardId), itemName: "New item" }
      );

      console.log("Create item response:", JSON.stringify(createItemResult, null, 2));

      const createdItem = createItemResult?.create_item;
      if (!createdItem) {
        console.error("Failed to create item on board:", boardId);
        return res.status(500).json({ error: "Failed to create item" });
      }

      console.log("Created item:", createdItem.id, createdItem.name);

      // Step 3: Reply to the original update thread referencing the created item
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
          body: `Done! I created a new item: "${createdItem.name}" (ID: ${createdItem.id})`,
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
