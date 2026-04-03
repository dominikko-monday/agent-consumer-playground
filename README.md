# Agent Consumer Playground

A monday.com app that reacts to AI Platform Agent webhooks. When the agent is **assigned** to an item or **mentioned** in an update, the backend receives the webhook and responds with a comment via the monday.com GraphQL API.

## Features

- **AppFeatureAiPlatformAgent** — mentionable & assignable AI agent
- **AppFeatureAgentWebhookBlock** — receives webhooks when the agent is triggered

### Webhook Triggers

| Trigger | `triggerNodeId` | What happens |
|---------|----------------|--------------|
| Agent assigned to item | `"2"` | Creates an update on the item |
| Agent mentioned in update | `"1"` | Replies to the same update thread |

## Setup

### 1. Install dependencies

```bash
cd backend && yarn install
```

### 2. Configure environment variables

Copy the example and fill in your values:

```bash
cp backend/.env.example backend/.env
```

### Environment Variables

| Variable | Required | Description | Where to find it |
|----------|----------|-------------|-----------------|
| `MONDAY_SIGNING_SECRET` | Yes | Verifies incoming webhooks are from monday.com | Developer Center > Your App > App Credentials > Signing Secret |
| `MONDAY_API_ENDPOINT` | No | Override the monday.com API endpoint (e.g. `https://use1.api.monday.com/v2` for US East 1) | Only needed if default `https://api.monday.com/v2` doesn't work for your region |
| `PORT` | No | Server port (default: `8080`) | — |

### 3. Create the app in monday.com

1. Go to `https://<your-slug>.monday.com/developers/apps`
2. Create a new app
3. Add an **AI Platform Agent** feature (mentionable + assignable)
4. Add an **Agent Webhook Block** feature
5. Copy the **Signing Secret** from App Credentials into your `.env`

### 4. Run locally

Start the backend:

```bash
cd backend && yarn dev
```

Start a tunnel so monday.com can reach your local server:

```bash
mapps tunnel:create -p 8080
```

Set the tunnel URL as the deployment URL for your Agent Webhook Block feature in the Developer Center.

### 5. Test it

- **Assign** the agent to an item on a board — it will post a comment on that item
- **Mention** the agent in an update — it will reply in the same thread

## Project Structure

```
.mondaycoderc          # Node.js 22.x runtime for monday-code
manifest.json          # App manifest with AI agent + webhook block features
backend/
  .env.example         # Environment variable template
  index.js             # monday-code serverless entry point
  src/
    app.ts             # Express app setup
    server.ts          # Local dev server
    middleware/
      auth.ts          # JWT verification using MONDAY_SIGNING_SECRET
    routes/
      health.ts        # Health check endpoint
      agent-webhook.ts # Webhook handler for agent triggers
```
