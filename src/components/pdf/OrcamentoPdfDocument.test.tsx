// @vitest-environment node
import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import { OrcamentoPdfDocument } from './OrcamentoPdfDocument';

describe('OrcamentoPdfDocument', () => {
  it('renderiza um PDF válido com os dados do orçamento', async () => {
    const buffer = await renderToBuffer(
      <OrcamentoPdfDocument
        oficina={{ id: 'of1', nome: 'Top Stop Centro', endereco: 'Rua A', telefone: '11999999999', logoUrl: null }}
        consultorNome="João"
        orcamento={{
          id: 'o1',
          clienteNome: 'Maria',
          clienteTelefone: '5511987654321',
          veiculoPlaca: 'ABC1D23',
          veiculoModelo: 'Onix',
          consultorId: 'c1',
          oficinaId: 'of1',
          status: 'rascunho',
          validadeDias: 7,
          createdAt: '2026-08-28T00:00:00Z',
          updatedAt: '2026-08-28T00:00:00Z',
        }}
        itens={[{ id: 'i1', orcamentoId: 'o1', catalogoItemId: null, descricao: 'Troca de óleo', tipo: 'servico', quantidade: 1, valorUnitarioCentavos: 10000 }]}
        totalCentavos={10000}
        entradaCentavos={3000}
        parcelas={[7000]}
        desconto={{ descontoCentavos: 500, valorComDescontoCentavos: 9500 }}
        cartaoPorto={{ parcelas: 1, valorParcelaCentavos: 10000 }}
      />
    );

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
