import { describe, it, expect, vi, beforeEach } from 'vitest';
import { criarConsultor, atualizarConsultor, desativarConsultor } from './actions';

vi.mock('../auth/guards', () => ({ exigirAdmin: vi.fn().mockResolvedValue({ id: 'admin1' }) }));

const createUserMock = vi.fn();
const deleteUserMock = vi.fn();
const singleMock = vi.fn();
const consultorInsertMock = vi.fn(() => ({ select: () => ({ single: singleMock }) }));
const consultorUpdateEqMock = vi.fn();
const consultorUpdateMock = vi.fn(() => ({ eq: consultorUpdateEqMock }));
const oficinasInsertMock = vi.fn();
const oficinasDeleteEqMock = vi.fn();
const oficinasDeleteMock = vi.fn(() => ({ eq: oficinasDeleteEqMock }));

vi.mock('../supabase/admin', () => ({
  createAdminClient: () => ({
    auth: { admin: { createUser: createUserMock, deleteUser: deleteUserMock } },
    from: (table: string) =>
      table === 'consultor_oficinas'
        ? { insert: oficinasInsertMock, delete: oficinasDeleteMock }
        : { insert: consultorInsertMock, update: consultorUpdateMock },
  }),
}));

beforeEach(() => {
  createUserMock.mockReset();
  deleteUserMock.mockReset();
  singleMock.mockReset();
  consultorInsertMock.mockClear();
  consultorUpdateEqMock.mockReset().mockResolvedValue({ error: null });
  consultorUpdateMock.mockClear();
  oficinasInsertMock.mockReset().mockResolvedValue({ error: null });
  oficinasDeleteEqMock.mockReset().mockResolvedValue({ error: null });
  oficinasDeleteMock.mockClear();
});

describe('criarConsultor', () => {
  it('cria o usuário no Auth, o registro em consultores e vincula as oficinas informadas', async () => {
    createUserMock.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null });
    singleMock.mockResolvedValue({
      data: { id: 'c1', auth_user_id: 'auth-1', nome: 'João', login: 'joao@topstop.local', papel: 'consultor', ativo: true },
      error: null,
    });

    const consultor = await criarConsultor({
      nome: 'João',
      login: 'joao@topstop.local',
      senha: 'segredo123',
      papel: 'consultor',
      oficinaIds: ['of-1', 'of-2'],
    });

    expect(createUserMock).toHaveBeenCalledWith({ email: 'joao@topstop.local', password: 'segredo123', email_confirm: true });
    expect(oficinasInsertMock).toHaveBeenCalledWith([
      { consultor_id: 'c1', oficina_id: 'of-1' },
      { consultor_id: 'c1', oficina_id: 'of-2' },
    ]);
    expect(consultor).toEqual({
      id: 'c1',
      authUserId: 'auth-1',
      nome: 'João',
      login: 'joao@topstop.local',
      papel: 'consultor',
      oficinaIds: ['of-1', 'of-2'],
      ativo: true,
    });
  });

  it('não vincula nenhuma oficina quando a lista vem vazia', async () => {
    createUserMock.mockResolvedValue({ data: { user: { id: 'auth-3' } }, error: null });
    singleMock.mockResolvedValue({
      data: { id: 'c3', auth_user_id: 'auth-3', nome: 'Ana', login: 'ana@topstop.local', papel: 'admin', ativo: true },
      error: null,
    });

    await criarConsultor({ nome: 'Ana', login: 'ana@topstop.local', senha: 'segredo123', papel: 'admin', oficinaIds: [] });

    expect(oficinasInsertMock).not.toHaveBeenCalled();
  });

  it('desfaz a criação do usuário no Auth se salvar em consultores falhar', async () => {
    createUserMock.mockResolvedValue({ data: { user: { id: 'auth-2' } }, error: null });
    singleMock.mockResolvedValue({ data: null, error: { message: 'login duplicado' } });

    await expect(
      criarConsultor({ nome: 'Ana', login: 'ana@topstop.local', senha: 'segredo123', papel: 'consultor', oficinaIds: [] })
    ).rejects.toThrow('login duplicado');

    expect(deleteUserMock).toHaveBeenCalledWith('auth-2');
  });

  it('desfaz a criação do usuário no Auth se vincular as oficinas falhar', async () => {
    createUserMock.mockResolvedValue({ data: { user: { id: 'auth-4' } }, error: null });
    singleMock.mockResolvedValue({
      data: { id: 'c4', auth_user_id: 'auth-4', nome: 'Zé', login: 'ze@topstop.local', papel: 'consultor', ativo: true },
      error: null,
    });
    oficinasInsertMock.mockResolvedValue({ error: { message: 'oficina inexistente' } });

    await expect(
      criarConsultor({ nome: 'Zé', login: 'ze@topstop.local', senha: 'segredo123', papel: 'consultor', oficinaIds: ['of-x'] })
    ).rejects.toThrow('oficina inexistente');

    expect(deleteUserMock).toHaveBeenCalledWith('auth-4');
  });

  it('lança erro quando a criação do usuário no Auth falha', async () => {
    createUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'e-mail inválido' } });
    await expect(
      criarConsultor({ nome: 'Ana', login: 'invalido', senha: 'segredo123', papel: 'consultor', oficinaIds: [] })
    ).rejects.toThrow('e-mail inválido');
  });
});

describe('atualizarConsultor', () => {
  it('atualiza nome e papel, e substitui as oficinas vinculadas', async () => {
    await atualizarConsultor('c1', { nome: 'João Silva', papel: 'admin', oficinaIds: ['of-9'] });

    expect(consultorUpdateMock).toHaveBeenCalledWith({ nome: 'João Silva', papel: 'admin' });
    expect(consultorUpdateEqMock).toHaveBeenCalledWith('id', 'c1');
    expect(oficinasDeleteMock).toHaveBeenCalled();
    expect(oficinasDeleteEqMock).toHaveBeenCalledWith('consultor_id', 'c1');
    expect(oficinasInsertMock).toHaveBeenCalledWith([{ consultor_id: 'c1', oficina_id: 'of-9' }]);
  });

  it('não insere nenhum vínculo novo quando a lista de oficinas vem vazia', async () => {
    await atualizarConsultor('c1', { nome: 'João Silva', papel: 'admin', oficinaIds: [] });
    expect(oficinasInsertMock).not.toHaveBeenCalled();
  });
});

describe('desativarConsultor', () => {
  it('marca o consultor como inativo', async () => {
    await desativarConsultor('c1');
    expect(consultorUpdateMock).toHaveBeenCalledWith({ ativo: false });
  });
});
