# SolveFlow AI

Initial MERN project scaffold for SolveFlow AI.

## Prerequisites

- Node.js 22 or later
- MongoDB (optional during initial setup)

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
