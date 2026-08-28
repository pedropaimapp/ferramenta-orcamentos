import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getConsultorLogado } from './session';

const getUserMock = vi.fn();
const singleMock = vi.fn();
vi.mock('../supabase/server', () => ({
  createServerClient: async () => ({
    auth: { getUser: getUserMock },
    from: () => ({ select: () => ({ eq: () => ({ single: singleMock }) }) }),
  }),
}));

describe('getConsultorLogado', () => {
  beforeEach(() => {
    getUserMock.mockReset();
    singleMock.mockReset();
  });

  it('retorna null quando não há usuário autenticado', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    expect(await getConsultorLogado()).toBeNull();
  });

  it('retorna o consultor mapeado (camelCase) quando autenticado', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'auth-1' } } });
    singleMock.mockResolvedValue({
      data: {
        id: 'c1',
        auth_user_id: 'auth-1',
        nome: 'João',
        login: 'joao@topstop.local',
        papel: 'consultor',
        oficina_id: 'of-1',
        ativo: true,
      },
      error: null,
    });

    expect(await getConsultorLogado()).toEqual({
      id: 'c1',
      authUserId: 'auth-1',
      nome: 'João',
      login: 'joao@topstop.local',
      papel: 'consultor',
      oficinaId: 'of-1',
      ativo: true,
    });
  });

  it('retorna null quando a busca do consultor falha', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'auth-1' } } });
    singleMock.mockResolvedValue({ data: null, error: { message: 'not found' } });
    expect(await getConsultorLogado()).toBeNull();
  });
});
