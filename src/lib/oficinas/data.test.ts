import { describe, it, expect, vi } from 'vitest';
import { listarOficinas, criarOficina, atualizarOficina } from './data';

function fakeSupabase(response: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(response);
  const select = vi.fn(() => ({ single, order: vi.fn().mockResolvedValue(response), eq: () => ({ select: () => ({ single }) }) }));
  const insert = vi.fn(() => ({ select: () => ({ single }) }));
  const update = vi.fn(() => ({ eq: () => ({ select: () => ({ single }) }) }));
  return { from: vi.fn(() => ({ select, insert, update })) } as any;
}

describe('listarOficinas', () => {
  it('mapeia as linhas do banco (snake_case) para o tipo de domínio (camelCase)', async () => {
    const supabase = fakeSupabase({
      data: [{ id: '1', nome: 'Top Stop Centro', endereco: 'Rua A', telefone: '11999999999', logo_url: null }],
      error: null,
    });
    const oficinas = await listarOficinas(supabase);
    expect(oficinas).toEqual([{ id: '1', nome: 'Top Stop Centro', endereco: 'Rua A', telefone: '11999999999', logoUrl: null }]);
  });

  it('lança erro quando a consulta falha', async () => {
    const supabase = fakeSupabase({ data: null, error: { message: 'falhou' } });
    await expect(listarOficinas(supabase)).rejects.toThrow('falhou');
  });
});

describe('criarOficina', () => {
  it('insere e retorna a oficina criada', async () => {
    const supabase = fakeSupabase({
      data: { id: '2', nome: 'Top Stop Norte', endereco: 'Rua B', telefone: '11888888888', logo_url: null },
      error: null,
    });
    const criada = await criarOficina(supabase, { nome: 'Top Stop Norte', endereco: 'Rua B', telefone: '11888888888' });
    expect(criada.id).toBe('2');
    expect(supabase.from).toHaveBeenCalledWith('oficinas');
  });
});

describe('atualizarOficina', () => {
  it('atualiza e retorna a oficina', async () => {
    const supabase = fakeSupabase({
      data: { id: '1', nome: 'Novo Nome', endereco: 'Rua A', telefone: '11999999999', logo_url: 'http://x/logo.png' },
      error: null,
    });
    const atualizada = await atualizarOficina(supabase, '1', { nome: 'Novo Nome', endereco: 'Rua A', telefone: '11999999999' });
    expect(atualizada.nome).toBe('Novo Nome');
  });
});
