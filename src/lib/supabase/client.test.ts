import { describe, it, expect, vi, beforeEach } from 'vitest';

const createBrowserClientMock = vi.fn().mockReturnValue({ mocked: 'browser-client' });
vi.mock('@supabase/ssr', () => ({ createBrowserClient: createBrowserClientMock }));

describe('createBrowserClient', () => {
  beforeEach(() => {
    createBrowserClientMock.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  it('cria o cliente usando a URL e a chave anônima do ambiente', async () => {
    const { createBrowserClient } = await import('./client');
    const cliente = createBrowserClient();
    expect(createBrowserClientMock).toHaveBeenCalledWith('https://example.supabase.co', 'anon-key');
    expect(cliente).toEqual({ mocked: 'browser-client' });
  });
});
