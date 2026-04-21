# Deploying to monday-code

The exact steps used to deploy this app's backend to monday-code staging. Reproduce them top-to-bottom for a fresh clone.

## 1. Install the `mapps` CLI

```bash
yarn global add @mondaycom/apps-cli
mapps --version   # confirm install
```

## 2. Authenticate

Get a Developer Center token from your monday account, then:

```bash
mapps init -t <YOUR_DEVELOPER_TOKEN>
```

This writes `~/.config/mapps/.mappsrc`.

> The token must be a **Developer Center token** for the same environment you're deploying to (staging token for staging, production for production). A personal API token (`me:write`) authenticates but returns empty bodies and you'll see `ZodError: appVersions Required`.

## 3. Point the CLI at staging

By default `mapps` hits production (`monday-apps-ms.monday.com`). For staging, override the domain:

```bash
export APPS_DOMAIN="https://monday-apps-ms.mondaystaging.com"
```

For production, leave it unset.

## 4. Build the backend

```bash
cd backend
yarn install
yarn build
```

## 5. Push to monday-code

You need the **App Version ID** from the Developer Center (Host on monday > Versions).

```bash
mapps code:push -i <APP_VERSION_ID> --force
```

For our staging deployment we used:

```bash
APPS_DOMAIN="https://monday-apps-ms.mondaystaging.com" \
  mapps code:push -i 10049784 --force -d /absolute/path/to/backend
```

First deployment takes ~5–6 minutes. When it succeeds:

```
✔ Deployment successfully finished, deployment url: https://<hash>-service-<id>.us.mondaystaging.app
```

Clean up the artifact: `rm -f code.tar.gz`.

## 6. Set environment variables

Env vars can only be set **after** the first successful deploy. Use the **App ID** here, not the version ID.

```bash
mapps code:env -i <APP_ID> -m set -k MONDAY_SIGNING_SECRET -v "<your-signing-secret>"
mapps code:env -i <APP_ID> -m set -k MONDAY_API_ENDPOINT  -v "https://api.mondaystaging.com/v2"
```

Use `https://api.monday.com/v2` for production.

`MONDAY_SIGNING_SECRET` comes from Developer Center > App > App Credentials > Signing Secret.

## 7. Redeploy so env vars take effect

Env vars are baked in at deploy time. Push again:

```bash
mapps code:push -i <APP_VERSION_ID> --force
```

## Verify

```bash
curl https://<your-deployment-url>/health
# → {"status":"healthy", ...}
```

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `No monday code release found for this app` | Server-side code not enabled in Developer Center | Open app > Host on monday > enable server-side code (creates the first version) |
| `ZodError: appVersions Required` | Wrong token type or wrong environment | Use a Developer Center token for the same env as `APPS_DOMAIN` |
| `App not found` | Token's account doesn't own this app | Re-run `mapps init` with a token from the right account |
| Env vars not in deployed app | Env vars are baked in at push time | Run `mapps code:push` again after setting vars |
