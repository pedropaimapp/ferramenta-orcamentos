import path from 'node:path';
import { execFile } from 'node:child_process';
import { NextResponse } from 'next/server';
import { getConsultorLogado } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { obterOrcamentoComItens } from '@/lib/orcamento/data';
import { listarFaixas, obterConfiguracao } from '@/lib/pagamento/data';
import { listarOficinas } from '@/lib/oficinas/data';
import { listarConsultores } from '@/lib/consultores/data';
import { calcularTotalItens } from '@/lib/orcamento/totals';
import { encontrarFaixa, calcularEntradaMinima, dividirEmParcelas } from '@/lib/payment/faixas';
import { calcularDescontoAVista, calcularCartaoPorto } from '@/lib/payment/alternativas';

// PDF rendering runs in a separate, un-bundled `node` process
// (scripts/render-orcamento-pdf.mjs) rather than calling @react-pdf/renderer
// directly here — see the comment at the top of that script for why: Next's App
// Router bundles this route against its own internal React copy, incompatible
// with @react-pdf/renderer's React-18-based reconciler.
function renderPdfEmProcessoSeparado(payload: unknown): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'render-orcamento-pdf.mjs');
    const child = execFile('node', [scriptPath], { encoding: 'buffer', maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        try {
          const parsed = JSON.parse(stderr.toString('utf8'));
          reject(new Error(parsed.erro ?? error.message));
        } catch {
          reject(new Error(stderr.toString('utf8') || error.message));
        }
        return;
      }
      resolve(stdout);
    });
    child.stdin?.end(JSON.stringify(payload));
  });
}

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

    const buffer = await renderPdfEmProcessoSeparado({
      oficina,
      consultorNome: consultorDoOrcamento.nome,
      orcamento,
      itens,
      totalCentavos,
      entradaCentavos,
      parcelas,
      desconto,
      cartaoPorto,
    });

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
