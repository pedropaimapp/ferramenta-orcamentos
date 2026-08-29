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
//
// Protocol: reads one JSON payload from stdin (see the `Payload` shape mirrored
// below), writes the resulting PDF as raw bytes to stdout. Any error is reported
// as `{"erro": "..."}` JSON on stderr with a non-zero exit code.

import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

const e = React.createElement;

function formatarReais(centavos) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  logo: { width: 60, height: 60, objectFit: 'contain' },
  oficinaNome: { fontSize: 16, fontWeight: 700 },
  secao: { marginBottom: 12 },
  linha: { marginBottom: 4 },
  tabelaHeader: { flexDirection: 'row', borderBottom: 1, paddingBottom: 4, marginBottom: 4, fontWeight: 700 },
  tabelaLinha: { flexDirection: 'row', paddingVertical: 2 },
  coluna: { flex: 1 },
});

function tabelaItens(titulo, itens) {
  if (itens.length === 0) return null;
  return e(
    View,
    { style: styles.secao },
    e(Text, { style: { fontWeight: 700, marginBottom: 4 } }, titulo),
    e(
      View,
      { style: styles.tabelaHeader },
      e(Text, { style: styles.coluna }, 'Descrição'),
      e(Text, { style: styles.coluna }, 'Qtd'),
      e(Text, { style: styles.coluna }, 'Valor unit.'),
      e(Text, { style: styles.coluna }, 'Subtotal')
    ),
    ...itens.map((item) =>
      e(
        View,
        { key: item.id, style: styles.tabelaLinha },
        e(Text, { style: styles.coluna }, item.descricao),
        e(Text, { style: styles.coluna }, String(item.quantidade)),
        e(Text, { style: styles.coluna }, formatarReais(item.valorUnitarioCentavos)),
        e(Text, { style: styles.coluna }, formatarReais(item.quantidade * item.valorUnitarioCentavos))
      )
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
      e(
        View,
        { style: styles.header },
        oficina.logoUrl ? e(Image, { src: oficina.logoUrl, style: styles.logo }) : null,
        e(
          View,
          null,
          e(Text, { style: styles.oficinaNome }, oficina.nome),
          e(Text, null, oficina.endereco),
          e(Text, null, oficina.telefone)
        )
      ),
      e(
        View,
        { style: styles.secao },
        e(Text, null, `Cliente: ${orcamento.clienteNome}`),
        e(Text, null, `Veículo: ${orcamento.veiculoModelo} - Placa ${orcamento.veiculoPlaca}`),
        e(Text, null, `Consultor: ${consultorNome}`)
      ),
      tabelaItens('Peças', pecas),
      tabelaItens('Serviços', servicos),
      e(
        View,
        { style: styles.secao },
        e(Text, { style: styles.linha }, `Total: ${formatarReais(totalCentavos)}`),
        e(
          Text,
          { style: styles.linha },
          `Desconto à vista no Pix/Débito: ${formatarReais(desconto.descontoCentavos)} -> ${formatarReais(desconto.valorComDescontoCentavos)}`
        ),
        e(
          Text,
          { style: styles.linha },
          `Entrada mínima: ${formatarReais(entradaCentavos)} + ${parcelas.length}x de ${formatarReais(parcelas[0])} no crédito sem juros`
        ),
        e(
          Text,
          { style: styles.linha },
          `Alternativa: Cartão Porto em até ${cartaoPorto.parcelas}x de ${formatarReais(cartaoPorto.valorParcelaCentavos)} sem juros`
        )
      ),
      e(
        Text,
        null,
        `Orçamento emitido em ${new Date(orcamento.createdAt).toLocaleDateString('pt-BR')}, válido por ${orcamento.validadeDias} dias.`
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
