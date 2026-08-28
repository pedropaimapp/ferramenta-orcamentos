import { formatarReais } from '../format';
import { normalizarTelefone } from './telefone';

export interface MensagemOrcamentoInput {
  oficinaNome: string;
  consultorNome: string;
  clienteNome: string;
  veiculoModelo: string;
  veiculoPlaca: string;
  itens: { descricao: string; tipo: 'peca' | 'servico'; quantidade: number; valorTotalCentavos: number }[];
  totalCentavos: number;
  descontoCentavos: number;
  valorComDescontoCentavos: number;
  entradaCentavos: number;
  parcelas: number[];
  cartaoPorto: { parcelas: number; valorParcelaCentavos: number };
  validadeDias: number;
}

export function montarLinkWhatsApp(telefone: string, mensagem: string): string {
  const numero = normalizarTelefone(telefone);
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

export function montarMensagemOrcamento(dados: MensagemOrcamentoInput): string {
  const linhasItens = dados.itens
    .map(
      (item) =>
        `- ${item.descricao} (${item.tipo === 'peca' ? 'Peça' : 'Serviço'}) x${item.quantidade}: ${formatarReais(item.valorTotalCentavos)}`
    )
    .join('\n');

  const linhaParcelas = `Entrada de ${formatarReais(dados.entradaCentavos)} + ${dados.parcelas.length}x de ${formatarReais(
    dados.parcelas[0]
  )} no crédito sem juros`;

  return [
    `*${dados.oficinaNome}*`,
    `Consultor: ${dados.consultorNome}`,
    '',
    `Orçamento para *${dados.clienteNome}*`,
    `Veículo: ${dados.veiculoModelo} - Placa ${dados.veiculoPlaca}`,
    '',
    '*Itens:*',
    linhasItens,
    '',
    `*Total: ${formatarReais(dados.totalCentavos)}*`,
    `Desconto à vista no Pix/Débito: ${formatarReais(dados.descontoCentavos)} → *${formatarReais(dados.valorComDescontoCentavos)}*`,
    '',
    '*Condição de pagamento:*',
    linhaParcelas,
    `Alternativa: Cartão Porto em até ${dados.cartaoPorto.parcelas}x de ${formatarReais(dados.cartaoPorto.valorParcelaCentavos)} sem juros`,
    '',
    `Orçamento válido por ${dados.validadeDias} dias.`,
  ].join('\n');
}
