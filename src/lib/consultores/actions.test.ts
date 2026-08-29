import { describe, it, expect, vi, beforeEach } from 'vitest';
import { criarConsultor, atualizarConsultor, desativarConsultor } from './actions';

vi.mock('../auth/guards', () => ({ exigirAdmin: vi.fn().mockResolvedValue({ id: 'admin1' }) }));

const createUserMock = vi.fn();
const deleteUserMock = vi.fn();
const singleMock = vi.fn();
const insertMock = vi.fn(() => ({ select: () => ({ single: singleMock }) }));
const eqMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: eqMock }));

vi.mock('../supabase/admin', () => ({
  createAdminClient: () => ({
    auth: { admin: { createUser: createUserMock, deleteUser: deleteUserMock } },
    from: () => ({ insert: insertMock, update: updateMock }),
  }),
}));

describe('criarConsultor', () => {
  beforeEach(() => {
    createUserMock.mockReset();
    deleteUserMock.mockReset();
    singleMock.mockReset();
  });

  it('cria o usuário no Auth e o registro em consultores, retornando o consultor mapeado', async () => {
    createUserMock.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null });
    singleMock.mockResolvedValue({
      data: { id: 'c1', auth_user_id: 'auth-1', nome: 'João', login: 'joao@topstop.local', papel: 'consultor', oficina_id: 'of-1', ativo: true },
      error: null,
    });

    const consultor = await criarConsultor({ nome: 'João', login: 'joao@topstop.local', senha: 'segredo123', papel: 'consultor', oficinaId: 'of-1' });

    expect(createUserMock).toHaveBeenCalledWith({ email: 'joao@topstop.local', password: 'segredo123', email_confirm: true });
    expect(consultor).toEqual({ id: 'c1', authUserId: 'auth-1', nome: 'João', login: 'joao@topstop.local', papel: 'consultor', oficinaId: 'of-1', ativo: true });
  });

  it('desfaz a criação do usuário no Auth se salvar em consultores falhar', async () => {
    createUserMock.mockResolvedValue({ data: { user: { id: 'auth-2' } }, error: null });
    singleMock.mockResolvedValue({ data: null, error: { message: 'login duplicado' } });

    await expect(
      criarConsultor({ nome: 'Ana', login: 'ana@topstop.local', senha: 'segredo123', papel: 'consultor', oficinaId: null })
    ).rejects.toThrow('login duplicado');

    expect(deleteUserMock).toHaveBeenCalledWith('auth-2');
  });

  it('lança erro quando a criação do usuário no Auth falha', async () => {
    createUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'e-mail inválido' } });
    await expect(
      criarConsultor({ nome: 'Ana', login: 'invalido', senha: 'segredo123', papel: 'consultor', oficinaId: null })
    ).rejects.toThrow('e-mail inválido');
  });
});

describe('atualizarConsultor', () => {
  it('atualiza nome, papel e oficina', async () => {
    eqMock.mockResolvedValue({ error: null });
    await atualizarConsultor('c1', { nome: 'João Silva', papel: 'admin', oficinaId: null });
    expect(updateMock).toHaveBeenCalledWith({ nome: 'João Silva', papel: 'admin', oficina_id: null });
  });
});

describe('desativarConsultor', () => {
  it('marca o consultor como inativo', async () => {
    eqMock.mockResolvedValue({ error: null });
    await desativarConsultor('c1');
    expect(updateMock).toHaveBeenCalledWith({ ativo: false });
  });
});
