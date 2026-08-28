import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exigirConsultor, exigirAdmin } from './guards';

const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
vi.mock('next/navigation', () => ({ redirect: (path: string) => redirectMock(path) }));

const getConsultorLogadoMock = vi.fn();
vi.mock('./session', () => ({ getConsultorLogado: () => getConsultorLogadoMock() }));

const consultor = { id: 'c1', authUserId: 'a1', nome: 'João', login: 'j@x.com', papel: 'consultor' as const, oficinaId: 'o1', ativo: true };
const admin = { id: 'c2', authUserId: 'a2', nome: 'Ana', login: 'ana@x.com', papel: 'admin' as const, oficinaId: null, ativo: true };

describe('exigirConsultor', () => {
  beforeEach(() => getConsultorLogadoMock.mockReset());

  it('redireciona para /login quando não há sessão', async () => {
    getConsultorLogadoMock.mockResolvedValue(null);
    await expect(exigirConsultor()).rejects.toThrow('REDIRECT:/login');
  });

  it('redireciona para /login quando o consultor está desativado', async () => {
    getConsultorLogadoMock.mockResolvedValue({ ...consultor, ativo: false });
    await expect(exigirConsultor()).rejects.toThrow('REDIRECT:/login');
  });

  it('retorna o consultor quando autenticado e ativo', async () => {
    getConsultorLogadoMock.mockResolvedValue(consultor);
    await expect(exigirConsultor()).resolves.toEqual(consultor);
  });
});

describe('exigirAdmin', () => {
  beforeEach(() => getConsultorLogadoMock.mockReset());

  it('redireciona para /dashboard quando o consultor não é admin', async () => {
    getConsultorLogadoMock.mockResolvedValue(consultor);
    await expect(exigirAdmin()).rejects.toThrow('REDIRECT:/dashboard');
  });

  it('retorna o consultor quando é admin', async () => {
    getConsultorLogadoMock.mockResolvedValue(admin);
    await expect(exigirAdmin()).resolves.toEqual(admin);
  });
});
