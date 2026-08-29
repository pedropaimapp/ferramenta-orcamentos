export interface Oficina {
  id: string;
  nome: string;
  endereco: string;
  telefone: string;
  logoUrl: string | null;
}

export interface Consultor {
  id: string;
  authUserId: string;
  nome: string;
  login: string;
  papel: 'consultor' | 'admin';
  oficinaIds: string[];
  ativo: boolean;
}

export interface CatalogoItem {
  id: string;
  descricao: string;
  tipo: 'peca' | 'servico';
  marcaCodigo: string | null;
  valorPadraoCentavos: number;
}

export interface FaixaPagamento {
  id: string;
  valorMinCentavos: number;
  valorMaxCentavos: number | null;
  parcelasSemJuros: number;
}

export interface ConfiguracaoPagamento {
  percentualEntradaMinima: number;
  percentualDescontoAVista: number;
  cartaoPortoMaxParcelas: number;
  cartaoPortoParcelaMinimaCentavos: number;
}

export type StatusOrcamento = 'rascunho' | 'enviado' | 'aprovado' | 'recusado';

export interface Orcamento {
  id: string;
  clienteNome: string;
  clienteTelefone: string;
  veiculoPlaca: string;
  veiculoModelo: string;
  consultorId: string;
  oficinaId: string;
  status: StatusOrcamento;
  validadeDias: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrcamentoItem {
  id: string;
  orcamentoId: string;
  catalogoItemId: string | null;
  descricao: string;
  tipo: 'peca' | 'servico';
  quantidade: number;
  valorUnitarioCentavos: number;
}
