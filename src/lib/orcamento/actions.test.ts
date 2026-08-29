import { describe, it, expect, vi, beforeEach } from 'vitest';
import { salvarNovoOrcamento, salvarEdicaoOrcamento, mudarStatusOrcamento } from './actions';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const exigirConsultorMock = vi.fn();
vi.mock('../auth/guards', () => ({ exigirConsultor: () => exigirConsultorMock() }));
vi.mock('../supabase/server', () => ({ createServerClient: async () => ({}) }));

const criarOrcamentoMock = vi.fn();
const atualizarOrcamentoMock = vi.fn();
const atualizarStatusOrcamentoMock = vi.fn();
vi.mock('./data', () => ({
  criarOrcamento: (...args: unknown[]) => criarOrcamentoMock(...args),
  atualizarOrcamento: (...args: unknown[]) => atualizarOrcamentoMock(...args),
  atualizarStatusOrcamento: (...args: unknown[]) => atualizarStatusOrcamentoMock(...args),
}));

const dados = { clienteNome: 'Maria', clienteTelefone: '5511987654321', veiculoPlaca: 'ABC1D23', veiculoModelo: 'Onix', itens: [] };

describe('salvarNovoOrcamento', () => {
  beforeEach(() => {
    exigirConsultorMock.mockReset();
    criarOrcamentoMock.mockReset();
  });

  it('usa a oficina do próprio consultor quando ele não é admin', async () => {
    exigirConsultorMock.mockResolvedValue({ id: 'c1', papel: 'consultor', oficinaId: 'of1' });
    criarOrcamentoMock.mockResolvedValue({ id: 'o1' });

    const resultado = await salvarNovoOrcamento(dados);

    expect(criarOrcamentoMock).toHaveBeenCalledWith({}, 'c1', 'of1', dados);
    expect(resultado).toEqual({ id: 'o1' });
  });

  it('usa a oficina informada quando quem cria é admin', async () => {
    exigirConsultorMock.mockResolvedValue({ id: 'admin1', papel: 'admin', oficinaId: null });
    criarOrcamentoMock.mockResolvedValue({ id: 'o2' });

    await salvarNovoOrcamento(dados, 'of-escolhida');

    expect(criarOrcamentoMock).toHaveBeenCalledWith({}, 'admin1', 'of-escolhida', dados);
  });

  it('lança erro quando nenhuma oficina está disponível', async () => {
    exigirConsultorMock.mockResolvedValue({ id: 'admin1', papel: 'admin', oficinaId: null });
    await expect(salvarNovoOrcamento(dados)).rejects.toThrow('Selecione uma oficina');
  });
});

describe('salvarEdicaoOrcamento', () => {
  it('atualiza o orçamento existente', async () => {
    exigirConsultorMock.mockResolvedValue({ id: 'c1', papel: 'consultor', oficinaId: 'of1' });
    await salvarEdicaoOrcamento('o1', dados);
    expect(atualizarOrcamentoMock).toHaveBeenCalledWith({}, 'o1', dados);
  });
});

describe('mudarStatusOrcamento', () => {
  it('atualiza o status do orçamento', async () => {
    exigirConsultorMock.mockResolvedValue({ id: 'c1', papel: 'consultor', oficinaId: 'of1' });
    await mudarStatusOrcamento('o1', 'enviado');
    expect(atualizarStatusOrcamentoMock).toHaveBeenCalledWith({}, 'o1', 'enviado');
  });
});
