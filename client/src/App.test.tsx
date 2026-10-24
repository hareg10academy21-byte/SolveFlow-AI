import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./services/api', () => ({
  fetchTickets: vi.fn().mockResolvedValue([]),
  createTicket: vi.fn(),
  updateTicket: vi.fn(),
}));

vi.mock('./contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-id', name: 'Alex Morgan', email: 'alex@example.com', role: 'customer' },
    loading: false,
    logout: vi.fn(),
    updateProfile: vi.fn(),
  }),
}));

vi.mock('./services/auth', () => ({
  api: {
    get: vi.fn().mockResolvedValue({
      data: {
        data: {
          summary: {
            total: 0,
            newTickets: 0,
            assigned: 0,
            inProgress: 0,
            resolved: 0,
            highPriority: 0,
          },
        },
      },
    }),
  },
}));

describe('App', () => {
  it('renders the project name', async () => {
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: 'Track the issues you reported.' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('No tickets yet')).toBeInTheDocument();
  });
});
