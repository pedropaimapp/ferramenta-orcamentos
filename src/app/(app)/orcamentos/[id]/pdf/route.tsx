import React from 'react';
import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { getConsultorLogado } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { obterOrcamentoComItens } from '@/lib/orcamento/data';
import { listarFaixas, obterConfiguracao } from '@/lib/pagamento/data';
import { listarOficinas } from '@/lib/oficinas/data';
import { listarConsultores } from '@/lib/consultores/data';
import { calcularTotalItens } from '@/lib/orcamento/totals';
import { encontrarFaixa, calcularEntradaMinima, dividirEmParcelas } from '@/lib/payment/faixas';
import { calcularDescontoAVista, calcularCartaoPorto } from '@/lib/payment/alternativas';
import { OrcamentoPdfDocument } from '@/components/pdf/OrcamentoPdfDocument';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const consultor = await getConsultorLogado();
  if (!consultor || !consultor.ativo) {
    return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createServerClient();

  try {
    const [{ orcamento, itens }, faixas, config, oficinas, consultores] = await Promise.all([
      obterOrcamentoComItens(supabase, id),
      listarFaixas(supabase),
      obterConfiguracao(supabase),
      listarOficinas(supabase),
      listarConsultores(supabase),
    ]);

    const oficina = oficinas.find((o) => o.id === orcamento.oficinaId);
    const consultorDoOrcamento = consultores.find((c) => c.id === orcamento.consultorId);
    if (!oficina || !consultorDoOrcamento) {
      return NextResponse.json({ erro: 'Dados incompletos para gerar o PDF' }, { status: 500 });
    }

    const totalCentavos = calcularTotalItens(itens);
    const faixa = encontrarFaixa(totalCentavos, faixas);
    const entradaCentavos = calcularEntradaMinima(totalCentavos, config);
    const parcelas = dividirEmParcelas(totalCentavos - entradaCentavos, faixa.parcelasSemJuros);
    const desconto = calcularDescontoAVista(totalCentavos, config);
    const cartaoPorto = calcularCartaoPorto(totalCentavos, config);

    const buffer = await renderToBuffer(
      <OrcamentoPdfDocument
        oficina={oficina}
        consultorNome={consultorDoOrcamento.nome}
        orcamento={orcamento}
        itens={itens}
        totalCentavos={totalCentavos}
        entradaCentavos={entradaCentavos}
        parcelas={parcelas}
        desconto={desconto}
        cartaoPorto={cartaoPorto}
      />
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="orcamento-${orcamento.veiculoPlaca}.pdf"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ erro: err instanceof Error ? err.message : 'Erro ao gerar PDF' }, { status: 500 });
  }
}
