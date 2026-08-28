import { describe, it, expect, vi, beforeEach } from 'vitest';

const createClientMock = vi.fn().mockReturnValue({ mocked: 'admin-client' });
vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));

describe('createAdminClient', () => {
  beforeEach(() => {
    createClientMock.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  it('cria o cliente usando a service role key, sem persistir sessão', async () => {
    const { createAdminClient } = await import('./admin');
    const cliente = createAdminClient();
    expect(createClientMock).toHaveBeenCalledWith('https://example.supabase.co', 'service-role-key', {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    expect(cliente).toEqual({ mocked: 'admin-client' });
  });
});
