import { describe, it, expect, vi, beforeEach } from 'vitest';
import { garantirItemNoCatalogo } from './actions';

vi.mock('../auth/guards', () => ({ exigirConsultor: vi.fn().mockResolvedValue({ id: 'c1', ativo: true }) }));

const maybeSingleMock = vi.fn();
const singleMock = vi.fn();
const ilikeMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ ilike: ilikeMock }));
const insertSelectMock = vi.fn(() => ({ single: singleMock }));
const insertMock = vi.fn(() => ({ select: insertSelectMock }));

vi.mock('../supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({ select: selectMock, insert: insertMock }),
  }),
}));

beforeEach(() => {
  maybeSingleMock.mockReset();
  singleMock.mockReset();
  ilikeMock.mockClear();
  selectMock.mockClear();
  insertSelectMock.mockClear();
  insertMock.mockClear();
});

describe('garantirItemNoCatalogo', () => {
  it('retorna o item existente sem inserir quando já há um com a mesma descrição (case-insensitive)', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { id: 'cat-1', descricao: 'Pastilha de freio', tipo: 'peca', marca_codigo: null, valor_padrao_centavos: 15000 },
      error: null,
    });

    const item = await garantirItemNoCatalogo({ descricao: 'pastilha de freio', tipo: 'peca', valorPadraoCentavos: 16000 });

    expect(item).toEqual({ id: 'cat-1', descricao: 'Pastilha de freio', tipo: 'peca', marcaCodigo: null, valorPadraoCentavos: 15000 });
    expect(ilikeMock).toHaveBeenCalledWith('descricao', 'pastilha de freio');
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('cria um novo item quando não existe nenhum com essa descrição', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    singleMock.mockResolvedValue({
      data: { id: 'cat-2', descricao: 'Filtro de ar', tipo: 'peca', marca_codigo: null, valor_padrao_centavos: 5000 },
      error: null,
    });

    const item = await garantirItemNoCatalogo({ descricao: '  Filtro de ar  ', tipo: 'peca', valorPadraoCentavos: 5000 });

    expect(item.id).toBe('cat-2');
    expect(insertMock).toHaveBeenCalledWith({ descricao: 'Filtro de ar', tipo: 'peca', marca_codigo: null, valor_padrao_centavos: 5000 });
  });

  it('propaga erro quando a busca falha', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: { message: 'falha na busca' } });

    await expect(garantirItemNoCatalogo({ descricao: 'X', tipo: 'peca', valorPadraoCentavos: 100 })).rejects.toThrow('falha na busca');
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('propaga erro quando a criação falha', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    singleMock.mockResolvedValue({ data: null, error: { message: 'falha ao criar' } });

    await expect(garantirItemNoCatalogo({ descricao: 'Y', tipo: 'servico', valorPadraoCentavos: 100 })).rejects.toThrow('falha ao criar');
  });
});
