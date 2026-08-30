// Renders the orçamento PDF in a plain, un-bundled Node process.
//
// Why this exists: Next.js 15's App Router compiles every file reachable from a
// route handler against its own internally vendored React copy (a React 19
// canary), regardless of the project's installed React version (18.3.1).
// @react-pdf/renderer's reconciler is built against real React 18 semantics, so
// an element created by Next's vendored React fails its validity check and
// every render throws "Minified React error #31". Running entirely in a
// separate `node` process sidesteps Next's webpack bundling (and its
// react-19-canary substitution) altogether: this script resolves 'react' and
// '@react-pdf/renderer' the normal way, straight from node_modules. This is
// the only place the PDF layout is defined — plain React.createElement, no
// JSX/TS, so it needs zero build step to run.
//
// Also note: pdfkit's built-in fonts (Helvetica here) only support WinAnsi
// encoding — stick to Latin-1 characters (Portuguese accents are fine) and
// avoid symbols like "→"; they render as garbled glyphs instead of throwing.
// For the same reason, the brand identity here comes from color/layout/logo
// rather than a custom font file.
//
// Protocol: reads one JSON payload from stdin (see the `Payload` shape mirrored
// below), writes the resulting PDF as raw bytes to stdout. Any error is reported
// as `{"erro": "..."}` JSON on stderr with a non-zero exit code.

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { Document, Page, View, Text, Image, Svg, Line, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

const e = React.createElement;

// Paleta oficial do guia de marca (Centro Automotivo Porto) — ver
// "Guia - uso da marca Centro Automotivo Porto.pdf".
const COR = {
  azul: '#00A1FC',
  azulEscuro: '#0046C0',
  preto: '#0B0D10',
  amarelo: '#E1E640',
  offWhite: '#EFF4EF',
  cinza: '#748A96',
  cinzaClaro: '#E4E9EA',
};

const logoBranco = (() => {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'brand', 'logo-white.png');
    return fs.readFileSync(logoPath);
  } catch {
    return null;
  }
})();

function formatarReais(centavos) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);
}

function formatarData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

const styles = StyleSheet.create({
  page: { fontSize: 10, fontFamily: 'Helvetica', color: COR.preto },

  // Faixa de cabeçalho escura, com a logo e os dados da oficina.
  headerBand: {
    backgroundColor: COR.preto,
    paddingTop: 28,
    paddingBottom: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logo: { width: 108, height: 40 },
  oficinaNome: { fontSize: 13, fontWeight: 700, color: '#FFFFFF', marginBottom: 3 },
  oficinaDado: { fontSize: 8.5, color: '#C9D3D8', marginBottom: 1 },

  body: { paddingHorizontal: 32, paddingTop: 20, paddingBottom: 60 },

  tituloDocumento: { fontSize: 16, fontWeight: 700, color: COR.preto, marginBottom: 2 },
  subtituloDocumento: { fontSize: 8.5, color: COR.cinza, marginBottom: 16 },

  infoRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  infoCard: { flex: 1, backgroundColor: COR.offWhite, borderRadius: 8, padding: 10 },
  infoLabel: { fontSize: 7.5, fontWeight: 700, color: COR.cinza, marginBottom: 3, textTransform: 'uppercase' },
  infoValor: { fontSize: 10, fontWeight: 700, color: COR.preto, marginBottom: 1 },
  infoValorSecundario: { fontSize: 9, color: COR.preto },

  secaoTitulo: {
    fontSize: 9,
    fontWeight: 700,
    color: COR.azulEscuro,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 14,
  },
  tabela: { borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: COR.cinzaClaro },
  tabelaHeader: { flexDirection: 'row', backgroundColor: COR.offWhite, paddingVertical: 6, paddingHorizontal: 8 },
  tabelaHeaderTexto: { fontSize: 8, fontWeight: 700, color: COR.cinza, textTransform: 'uppercase' },
  tabelaLinha: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: COR.cinzaClaro },
  tabelaLinhaPar: { backgroundColor: '#F7F9F9' },
  colDescricao: { flex: 3 },
  colQtd: { flex: 1, textAlign: 'center' },
  colValor: { flex: 1.4, textAlign: 'right' },

  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  totalLabel: { fontSize: 10, color: COR.cinza, marginRight: 8 },
  totalValor: { fontSize: 13, fontWeight: 700, color: COR.preto },

  pagamentoCard: { backgroundColor: COR.azulEscuro, borderRadius: 10, padding: 16, marginTop: 20 },
  pagamentoTitulo: { fontSize: 9, fontWeight: 700, color: COR.amarelo, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  pagamentoLinha: { fontSize: 10, color: '#FFFFFF', marginBottom: 5, lineHeight: 1.3 },
  pagamentoDestaque: { fontWeight: 700 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    paddingTop: 10,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: COR.cinzaClaro,
  },
  footerTexto: { fontSize: 8, color: COR.cinza },
});

/** Recria as listras diagonais do guia de marca (faixa de pedestre) via SVG. */
function listrasDiagonais() {
  const linhas = [];
  const total = 9;
  for (let i = 0; i < total; i++) {
    const x = i * 15;
    linhas.push(e(Line, { key: i, x1: x, y1: 20, x2: x + 10, y2: 0, stroke: COR.azul, strokeWidth: 4 }));
  }
  return e(Svg, { width: 150, height: 20, style: { position: 'absolute', right: 0, bottom: -1 } }, ...linhas);
}

function linhaTabela(item, index) {
  const subtotal = item.quantidade * item.valorUnitarioCentavos;
  return e(
    View,
    { key: item.id, style: [styles.tabelaLinha, index % 2 === 1 ? styles.tabelaLinhaPar : null] },
    e(Text, { style: styles.colDescricao }, item.descricao),
    e(Text, { style: styles.colQtd }, String(item.quantidade)),
    e(Text, { style: styles.colValor }, formatarReais(item.valorUnitarioCentavos)),
    e(Text, { style: styles.colValor }, formatarReais(subtotal))
  );
}

function tabelaItens(titulo, itens) {
  if (itens.length === 0) return null;
  return e(
    View,
    { style: { marginTop: 4 } },
    e(Text, { style: styles.secaoTitulo }, titulo),
    e(
      View,
      { style: styles.tabela },
      e(
        View,
        { style: styles.tabelaHeader },
        e(Text, { style: [styles.tabelaHeaderTexto, styles.colDescricao] }, 'Descrição'),
        e(Text, { style: [styles.tabelaHeaderTexto, styles.colQtd] }, 'Qtd'),
        e(Text, { style: [styles.tabelaHeaderTexto, styles.colValor] }, 'Valor unit.'),
        e(Text, { style: [styles.tabelaHeaderTexto, styles.colValor] }, 'Subtotal')
      ),
      ...itens.map(linhaTabela)
    )
  );
}

function orcamentoPdfDocument({ oficina, consultorNome, orcamento, itens, totalCentavos, entradaCentavos, parcelas, desconto, cartaoPorto }) {
  const pecas = itens.filter((i) => i.tipo === 'peca');
  const servicos = itens.filter((i) => i.tipo === 'servico');

  return e(
    Document,
    null,
    e(
      Page,
      { size: 'A4', style: styles.page },

      // Cabeçalho de marca.
      e(
        View,
        { style: styles.headerBand },
        logoBranco ? e(Image, { src: logoBranco, style: styles.logo }) : e(Text, { style: styles.oficinaNome }, 'TOP STOP'),
        e(
          View,
          { style: { alignItems: 'flex-end' } },
          e(Text, { style: styles.oficinaNome }, oficina.nome),
          oficina.endereco ? e(Text, { style: styles.oficinaDado }, oficina.endereco) : null,
          oficina.telefone ? e(Text, { style: styles.oficinaDado }, oficina.telefone) : null
        ),
        listrasDiagonais()
      ),

      e(
        View,
        { style: styles.body },

        e(Text, { style: styles.tituloDocumento }, 'Orçamento de serviços'),
        e(
          Text,
          { style: styles.subtituloDocumento },
          `Emitido em ${formatarData(orcamento.createdAt)} - válido por ${orcamento.validadeDias} dias`
        ),

        // Dados do cliente / veículo / consultor.
        e(
          View,
          { style: styles.infoRow },
          e(
            View,
            { style: styles.infoCard },
            e(Text, { style: styles.infoLabel }, 'Cliente'),
            e(Text, { style: styles.infoValor }, orcamento.clienteNome)
          ),
          e(
            View,
            { style: styles.infoCard },
            e(Text, { style: styles.infoLabel }, 'Veículo'),
            e(Text, { style: styles.infoValor }, orcamento.veiculoModelo),
            e(Text, { style: styles.infoValorSecundario }, `Placa ${orcamento.veiculoPlaca}`)
          ),
          e(
            View,
            { style: styles.infoCard },
            e(Text, { style: styles.infoLabel }, 'Consultor'),
            e(Text, { style: styles.infoValor }, consultorNome)
          )
        ),

        tabelaItens('Peças', pecas),
        tabelaItens('Serviços', servicos),

        e(
          View,
          { style: styles.totalRow },
          e(Text, { style: styles.totalLabel }, 'Total do orçamento'),
          e(Text, { style: styles.totalValor }, formatarReais(totalCentavos))
        ),

        // Condições de pagamento, em destaque.
        e(
          View,
          { style: styles.pagamentoCard },
          e(Text, { style: styles.pagamentoTitulo }, 'Condições de pagamento'),
          e(
            Text,
            { style: styles.pagamentoLinha },
            e(Text, { style: styles.pagamentoDestaque }, `Entrada mínima de ${formatarReais(entradaCentavos)}`),
            ` + ${parcelas.length}x de ${formatarReais(parcelas[0])} no crédito sem juros`
          ),
          e(
            Text,
            { style: styles.pagamentoLinha },
            'Desconto à vista no Pix/Débito: ',
            e(Text, { style: styles.pagamentoDestaque }, formatarReais(desconto.descontoCentavos)),
            ` -> total de ${formatarReais(desconto.valorComDescontoCentavos)}`
          ),
          e(
            Text,
            { style: [styles.pagamentoLinha, { marginBottom: 0 }] },
            'Alternativa: Cartão Porto em até ',
            e(Text, { style: styles.pagamentoDestaque }, `${cartaoPorto.parcelas}x de ${formatarReais(cartaoPorto.valorParcelaCentavos)}`),
            ' sem juros'
          )
        )
      ),

      e(
        View,
        { style: styles.footer },
        e(
          Text,
          { style: styles.footerTexto },
          `Orçamento válido por ${orcamento.validadeDias} dias a partir da emissão. Top Stop Centro Automotivo.`
        )
      )
    )
  );
}

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));

  const buffer = await renderToBuffer(orcamentoPdfDocument(payload));
  process.stdout.write(buffer);
}

main().catch((err) => {
  process.stderr.write(JSON.stringify({ erro: err instanceof Error ? err.message : 'Erro ao gerar PDF' }));
  process.exitCode = 1;
});
