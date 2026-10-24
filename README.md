# SolveFlow AI

Initial MERN project scaffold for SolveFlow AI.

## Prerequisites

- Node.js 22 or later
- MongoDB (required to run the API)

## Commands

```bash
npm install
npm --prefix client install
npm --prefix server install
npm run dev
```

The React app runs at `http://localhost:5173` and the API runs at `http://localhost:5000`.

## Checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

`GET /api/health` reports the API status. Copy each `.env.example` file to `.env` and provide values when ready.

## Authentication setup

The API requires `MONGODB_URI` and a unique `JWT_SECRET` of at least 32 characters before it starts. Public registration creates only `customer` accounts. Technicians are created by an administrator, and administrators are created only through the restricted setup endpoint below.

Sessions use an HttpOnly cookie. The browser first obtains a CSRF cookie from `/api/v1/auth/csrf`, then sends the token in `X-CSRF-Token` for every state-changing request. The client does this automatically and does not save an authentication token in localStorage.

The restricted `POST /api/v1/auth/setup-admin` endpoint exists only for initial secure setup. It requires the `ADMIN_SETUP_SECRET` value in the `X-Admin-Setup-Secret` request header and refuses to create an administrator after one exists. Do not expose that secret in frontend code.

## Local configuration

Copy `server/.env.example` to `server/.env`. For local MongoDB, use a URI such as `mongodb://127.0.0.1:27017/solveflow-ai`. For MongoDB Atlas or another hosted provider, create a database user with only the required database permissions, allow your development IP address, and paste that provider's connection string into `MONGODB_URI`.

Set `OPENAI_API_KEY` only in `server/.env`; it is optional, and reports still save when it is absent. Set `OPENAI_MODEL` to a model available to your OpenAI account that supports structured JSON output, such as `gpt-4.1-mini`. Never use a `VITE_` variable for the OpenAI key and never commit `.env` files.

For production, use a long random `JWT_SECRET`, set `COOKIE_SECURE=true`, set `NODE_ENV=production`, and set `CLIENT_ORIGIN` to the deployed frontend URL.

## Deploy: Vercel + Render

The included `client/vercel.json` enables React Router deep links on Vercel. Create a Vercel project with **Root Directory** set to `client`. Its build command is `npm run build` and its output directory is `dist`. Set `VITE_API_URL` to the full Render API URL followed by `/api/v1`, for example `https://your-api.onrender.com/api/v1`. This value is public by design; never add backend secrets to Vercel.

The included `render.yaml` creates the Render API service from the `server` directory. Create it through **New > Blueprint**, select this repository, and provide values for the prompted variables. Set `CLIENT_ORIGIN` to the exact Vercel production URL (no trailing slash), `MONGODB_URI`, `OPENAI_API_KEY`, and a supported `OPENAI_MODEL`. Render generates the JWT and restricted setup secrets. The API health check is `/api/health`.

For the Vercel and Render default domains, use `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none` (already set in `render.yaml`) so secure cookie authentication works across the two HTTPS origins. If browser privacy settings block third-party cookies, use custom subdomains of one domain (for example `app.example.com` on Vercel and `api.example.com` on Render), or configure an authenticated same-origin proxy. Never use localStorage for authentication tokens.

Render's filesystem is ephemeral. Optional image attachments will be lost after a redeploy unless you attach a paid persistent disk and point `UPLOAD_DIRECTORY` to its mount path, or replace local uploads with an object-storage provider such as S3 or Cloudinary.
