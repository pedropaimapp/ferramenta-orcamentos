import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from './page';

const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
vi.mock('next/navigation', () => ({ redirect: (path: string) => redirectMock(path) }));

const getConsultorLogadoMock = vi.fn();
vi.mock('@/lib/auth/session', () => ({ getConsultorLogado: () => getConsultorLogadoMock() }));

const consultor = { id: 'c1', authUserId: 'a1', nome: 'João', login: 'j@x.com', papel: 'consultor' as const, oficinaIds: ['o1'], ativo: true };

describe('LoginPage (Server Component)', () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getConsultorLogadoMock.mockReset();
  });

  it('redireciona para /dashboard quando já existe uma sessão válida', async () => {
    getConsultorLogadoMock.mockResolvedValue(consultor);
    await expect(LoginPage()).rejects.toThrow('REDIRECT:/dashboard');
  });

  it('mostra o formulário (não redireciona) quando a sessão existe mas o consultor está inativo', async () => {
    getConsultorLogadoMock.mockResolvedValue({ ...consultor, ativo: false });
    const result = await LoginPage();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it('mostra o formulário (não redireciona) quando não há sessão', async () => {
    getConsultorLogadoMock.mockResolvedValue(null);
    const result = await LoginPage();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});
