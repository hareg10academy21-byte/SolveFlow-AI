import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { getHealth } from './controllers/health.controller.js';

describe('GET /api/health', () => {
  it('returns the API health status', async () => {
    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    getHealth({} as never, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ status: 'ok', service: 'solveflow-ai-api' });
  });
});
