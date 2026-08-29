import { describe, it, expect, vi, beforeEach } from 'vitest';
import { salvarNovoOrcamento, salvarEdicaoOrcamento, mudarStatusOrcamento, duplicarOrcamento } from './actions';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const exigirConsultorMock = vi.fn();
vi.mock('../auth/guards', () => ({ exigirConsultor: () => exigirConsultorMock() }));
vi.mock('../supabase/server', () => ({ createServerClient: async () => ({}) }));

const criarOrcamentoMock = vi.fn();
const atualizarOrcamentoMock = vi.fn();
const atualizarStatusOrcamentoMock = vi.fn();
const obterOrcamentoComItensMock = vi.fn();
vi.mock('./data', () => ({
  criarOrcamento: (...args: unknown[]) => criarOrcamentoMock(...args),
  atualizarOrcamento: (...args: unknown[]) => atualizarOrcamentoMock(...args),
  atualizarStatusOrcamento: (...args: unknown[]) => atualizarStatusOrcamentoMock(...args),
  obterOrcamentoComItens: (...args: unknown[]) => obterOrcamentoComItensMock(...args),
}));

const dados = { clienteNome: 'Maria', clienteTelefone: '5511987654321', veiculoPlaca: 'ABC1D23', veiculoModelo: 'Onix', itens: [] };

describe('salvarNovoOrcamento', () => {
  beforeEach(() => {
    exigirConsultorMock.mockReset();
    criarOrcamentoMock.mockReset();
  });

  it('cria o orçamento na oficina informada quando o consultor tem acesso a ela', async () => {
    exigirConsultorMock.mockResolvedValue({ id: 'c1', papel: 'consultor', oficinaIds: ['of1', 'of2'] });
    criarOrcamentoMock.mockResolvedValue({ id: 'o1' });

    const resultado = await salvarNovoOrcamento(dados, 'of2');

    expect(criarOrcamentoMock).toHaveBeenCalledWith({}, 'c1', 'of2', dados);
    expect(resultado).toEqual({ id: 'o1' });
  });

  it('admin pode criar em qualquer oficina', async () => {
    exigirConsultorMock.mockResolvedValue({ id: 'admin1', papel: 'admin', oficinaIds: [] });
    criarOrcamentoMock.mockResolvedValue({ id: 'o2' });

    await salvarNovoOrcamento(dados, 'of-escolhida');

    expect(criarOrcamentoMock).toHaveBeenCalledWith({}, 'admin1', 'of-escolhida', dados);
  });

  it('lança erro quando nenhuma oficina é informada', async () => {
    exigirConsultorMock.mockResolvedValue({ id: 'admin1', papel: 'admin', oficinaIds: [] });
    await expect(salvarNovoOrcamento(dados, '')).rejects.toThrow('Selecione uma oficina');
  });

  it('lança erro quando o consultor tenta usar uma oficina que não é a dele', async () => {
    exigirConsultorMock.mockResolvedValue({ id: 'c1', papel: 'consultor', oficinaIds: ['of1'] });
    await expect(salvarNovoOrcamento(dados, 'of-outra')).rejects.toThrow('não tem acesso');
    expect(criarOrcamentoMock).not.toHaveBeenCalled();
  });
});

describe('salvarEdicaoOrcamento', () => {
  it('atualiza o orçamento existente', async () => {
    exigirConsultorMock.mockResolvedValue({ id: 'c1', papel: 'consultor', oficinaIds: ['of1'] });
    await salvarEdicaoOrcamento('o1', dados);
    expect(atualizarOrcamentoMock).toHaveBeenCalledWith({}, 'o1', dados);
  });
});

describe('mudarStatusOrcamento', () => {
  it('atualiza o status do orçamento', async () => {
    exigirConsultorMock.mockResolvedValue({ id: 'c1', papel: 'consultor', oficinaIds: ['of1'] });
    await mudarStatusOrcamento('o1', 'enviado');
    expect(atualizarStatusOrcamentoMock).toHaveBeenCalledWith({}, 'o1', 'enviado');
  });
});

describe('duplicarOrcamento', () => {
  beforeEach(() => {
    obterOrcamentoComItensMock.mockReset();
    criarOrcamentoMock.mockReset();
  });

  it('cria um novo orçamento na mesma oficina, com os mesmos dados e itens do original', async () => {
    exigirConsultorMock.mockResolvedValue({ id: 'c1', papel: 'consultor', oficinaIds: ['of1'] });
    obterOrcamentoComItensMock.mockResolvedValue({
      orcamento: { id: 'o1', clienteNome: 'Maria', clienteTelefone: '5511987654321', veiculoPlaca: 'ABC1D23', veiculoModelo: 'Onix', oficinaId: 'of1' },
      itens: [{ id: 'i1', orcamentoId: 'o1', catalogoItemId: null, descricao: 'Troca de óleo', tipo: 'servico', quantidade: 1, valorUnitarioCentavos: 10000 }],
    });
    criarOrcamentoMock.mockResolvedValue({ id: 'o2' });

    const resultado = await duplicarOrcamento('o1');

    expect(criarOrcamentoMock).toHaveBeenCalledWith(
      {},
      'c1',
      'of1',
      expect.objectContaining({
        clienteNome: 'Maria',
        itens: [{ catalogoItemId: null, descricao: 'Troca de óleo', tipo: 'servico', quantidade: 1, valorUnitarioCentavos: 10000 }],
      })
    );
    expect(resultado).toEqual({ id: 'o2' });
  });

  it('admin pode duplicar orçamento de qualquer oficina', async () => {
    exigirConsultorMock.mockResolvedValue({ id: 'admin1', papel: 'admin', oficinaIds: [] });
    obterOrcamentoComItensMock.mockResolvedValue({
      orcamento: { id: 'o1', clienteNome: 'Maria', clienteTelefone: '5511987654321', veiculoPlaca: 'ABC1D23', veiculoModelo: 'Onix', oficinaId: 'of-outra' },
      itens: [],
    });
    criarOrcamentoMock.mockResolvedValue({ id: 'o3' });

    await duplicarOrcamento('o1');

    expect(criarOrcamentoMock).toHaveBeenCalledWith({}, 'admin1', 'of-outra', expect.anything());
  });

  it('lança erro quando o consultor não tem acesso à oficina do orçamento original', async () => {
    exigirConsultorMock.mockResolvedValue({ id: 'c1', papel: 'consultor', oficinaIds: ['of1'] });
    obterOrcamentoComItensMock.mockResolvedValue({
      orcamento: { id: 'o1', clienteNome: 'Maria', clienteTelefone: '5511987654321', veiculoPlaca: 'ABC1D23', veiculoModelo: 'Onix', oficinaId: 'of-outra' },
      itens: [],
    });

    await expect(duplicarOrcamento('o1')).rejects.toThrow('não tem acesso');
    expect(criarOrcamentoMock).not.toHaveBeenCalled();
  });
});
