import { describe, it, expect } from 'vitest';
import { montarLinkWhatsApp, montarMensagemOrcamento } from './whatsapp';

describe('montarLinkWhatsApp', () => {
  it('monta um link wa.me com telefone normalizado e mensagem codificada', () => {
    const link = montarLinkWhatsApp('11987654321', 'Olá mundo');
    expect(link).toBe('https://wa.me/5511987654321?text=Ol%C3%A1%20mundo');
  });
});

describe('montarMensagemOrcamento', () => {
  it('inclui oficina, cliente, veículo, itens, total, desconto, condição e validade', () => {
    const mensagem = montarMensagemOrcamento({
      oficinaNome: 'Top Stop Centro',
      consultorNome: 'João',
      clienteNome: 'Maria',
      veiculoModelo: 'Onix',
      veiculoPlaca: 'ABC1D23',
      itens: [
        { descricao: 'Pastilha de freio', tipo: 'peca', quantidade: 1, valorTotalCentavos: 15000 },
        { descricao: 'Troca de óleo', tipo: 'servico', quantidade: 1, valorTotalCentavos: 10000 },
      ],
      totalCentavos: 25000,
      descontoCentavos: 1250,
      valorComDescontoCentavos: 23750,
      entradaCentavos: 7500,
      parcelas: [17500],
      cartaoPorto: { parcelas: 1, valorParcelaCentavos: 25000 },
      validadeDias: 7,
    });

    expect(mensagem).toContain('Top Stop Centro');
    expect(mensagem).toContain('João');
    expect(mensagem).toContain('Maria');
    expect(mensagem).toContain('Onix');
    expect(mensagem).toContain('ABC1D23');
    expect(mensagem).toContain('Pastilha de freio');
    expect(mensagem).toContain('Troca de óleo');
    expect(mensagem).toContain('R$ 250,00');
    expect(mensagem).toContain('R$ 12,50');
    expect(mensagem).toContain('7 dias');
  });
});
