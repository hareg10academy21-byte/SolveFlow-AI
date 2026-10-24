import cors from 'cors';
import express from 'express';
import { getHealth } from './controllers/health.controller.js';

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  }),
);
app.use(express.json());

app.get('/api/health', getHealth);

export default app;
