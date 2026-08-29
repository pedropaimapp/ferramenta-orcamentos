import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { formatarReais } from '@/lib/format';
import type { Oficina, Orcamento, OrcamentoItem } from '@/lib/types';

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

function TabelaItens({ titulo, itens }: { titulo: string; itens: OrcamentoItem[] }) {
  if (itens.length === 0) return null;
  return (
    <View style={styles.secao}>
      <Text style={{ fontWeight: 700, marginBottom: 4 }}>{titulo}</Text>
      <View style={styles.tabelaHeader}>
        <Text style={styles.coluna}>Descrição</Text>
        <Text style={styles.coluna}>Qtd</Text>
        <Text style={styles.coluna}>Valor unit.</Text>
        <Text style={styles.coluna}>Subtotal</Text>
      </View>
      {itens.map((item) => (
        <View key={item.id} style={styles.tabelaLinha}>
          <Text style={styles.coluna}>{item.descricao}</Text>
          <Text style={styles.coluna}>{item.quantidade}</Text>
          <Text style={styles.coluna}>{formatarReais(item.valorUnitarioCentavos)}</Text>
          <Text style={styles.coluna}>{formatarReais(item.quantidade * item.valorUnitarioCentavos)}</Text>
        </View>
      ))}
    </View>
  );
}

export function OrcamentoPdfDocument({
  oficina,
  consultorNome,
  orcamento,
  itens,
  totalCentavos,
  entradaCentavos,
  parcelas,
  desconto,
  cartaoPorto,
}: {
  oficina: Oficina;
  consultorNome: string;
  orcamento: Orcamento;
  itens: OrcamentoItem[];
  totalCentavos: number;
  entradaCentavos: number;
  parcelas: number[];
  desconto: { descontoCentavos: number; valorComDescontoCentavos: number };
  cartaoPorto: { parcelas: number; valorParcelaCentavos: number };
}) {
  const pecas = itens.filter((i) => i.tipo === 'peca');
  const servicos = itens.filter((i) => i.tipo === 'servico');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {oficina.logoUrl && <Image src={oficina.logoUrl} style={styles.logo} />}
          <View>
            <Text style={styles.oficinaNome}>{oficina.nome}</Text>
            <Text>{oficina.endereco}</Text>
            <Text>{oficina.telefone}</Text>
          </View>
        </View>

        <View style={styles.secao}>
          <Text>Cliente: {orcamento.clienteNome}</Text>
          <Text>
            Veículo: {orcamento.veiculoModelo} - Placa {orcamento.veiculoPlaca}
          </Text>
          <Text>Consultor: {consultorNome}</Text>
        </View>

        <TabelaItens titulo="Peças" itens={pecas} />
        <TabelaItens titulo="Serviços" itens={servicos} />

        <View style={styles.secao}>
          <Text style={styles.linha}>Total: {formatarReais(totalCentavos)}</Text>
          <Text style={styles.linha}>
            Desconto à vista no Pix/Débito: {formatarReais(desconto.descontoCentavos)} → {formatarReais(desconto.valorComDescontoCentavos)}
          </Text>
          <Text style={styles.linha}>
            Entrada mínima: {formatarReais(entradaCentavos)} + {parcelas.length}x de {formatarReais(parcelas[0])} no crédito sem juros
          </Text>
          <Text style={styles.linha}>
            Alternativa: Cartão Porto em até {cartaoPorto.parcelas}x de {formatarReais(cartaoPorto.valorParcelaCentavos)} sem juros
          </Text>
        </View>

        <Text>
          Orçamento emitido em {new Date(orcamento.createdAt).toLocaleDateString('pt-BR')}, válido por {orcamento.validadeDias} dias.
        </Text>
      </Page>
    </Document>
  );
}
