'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { OrcamentoForm, type DadosOrcamentoFormulario } from '@/components/orcamento/OrcamentoForm';
import { salvarEdicaoOrcamento, mudarStatusOrcamento } from '@/lib/orcamento/actions';
import { montarLinkWhatsApp, montarMensagemOrcamento } from '@/lib/orcamento/whatsapp';
import { calcularTotalItens } from '@/lib/orcamento/totals';
import { encontrarFaixa, calcularEntradaMinima, dividirEmParcelas } from '@/lib/payment/faixas';
import { calcularDescontoAVista, calcularCartaoPorto } from '@/lib/payment/alternativas';
import type { CatalogoItem, FaixaPagamento, ConfiguracaoPagamento, Orcamento, OrcamentoItem, StatusOrcamento } from '@/lib/types';

const STATUS_LABEL: Record<StatusOrcamento, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
};

export function OrcamentoDetalheClient({
  orcamento,
  itens,
  catalogo,
  faixas,
  config,
  oficinaNome,
  consultorNome,
}: {
  orcamento: Orcamento;
  itens: OrcamentoItem[];
  catalogo: CatalogoItem[];
  faixas: FaixaPagamento[];
  config: ConfiguracaoPagamento;
  oficinaNome: string;
  consultorNome: string;
}) {
  const [status, setStatus] = useState(orcamento.status);
  const [erroStatus, setErroStatus] = useState<string | null>(null);
  const [erroWhatsApp, setErroWhatsApp] = useState<string | null>(null);

  function enviarPorWhatsApp() {
    setErroWhatsApp(null);
    try {
      const totalCentavos = calcularTotalItens(itens);
      const faixa = encontrarFaixa(totalCentavos, faixas);
      const entradaCentavos = calcularEntradaMinima(totalCentavos, config);
      const parcelas = dividirEmParcelas(totalCentavos - entradaCentavos, faixa.parcelasSemJuros);
      const desconto = calcularDescontoAVista(totalCentavos, config);
      const cartaoPorto = calcularCartaoPorto(totalCentavos, config);

      const mensagem = montarMensagemOrcamento({
        oficinaNome,
        consultorNome,
        clienteNome: orcamento.clienteNome,
        veiculoModelo: orcamento.veiculoModelo,
        veiculoPlaca: orcamento.veiculoPlaca,
        itens: itens.map((item) => ({
          descricao: item.descricao,
          tipo: item.tipo,
          quantidade: item.quantidade,
          valorTotalCentavos: item.quantidade * item.valorUnitarioCentavos,
        })),
        totalCentavos,
        descontoCentavos: desconto.descontoCentavos,
        valorComDescontoCentavos: desconto.valorComDescontoCentavos,
        entradaCentavos,
        parcelas,
        cartaoPorto,
        validadeDias: orcamento.validadeDias,
      });

      window.open(montarLinkWhatsApp(orcamento.clienteTelefone, mensagem), '_blank');
    } catch (err) {
      setErroWhatsApp(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  async function aoSalvar(dados: DadosOrcamentoFormulario) {
    await salvarEdicaoOrcamento(orcamento.id, dados);
  }

  async function alterarStatus(novoStatus: StatusOrcamento) {
    setErroStatus(null);
    try {
      await mudarStatusOrcamento(orcamento.id, novoStatus);
      setStatus(novoStatus);
    } catch (err) {
      setErroStatus(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  const valoresIniciais: DadosOrcamentoFormulario = {
    clienteNome: orcamento.clienteNome,
    clienteTelefone: orcamento.clienteTelefone,
    veiculoPlaca: orcamento.veiculoPlaca,
    veiculoModelo: orcamento.veiculoModelo,
    itens: itens.map((item) => ({
      id: item.id,
      catalogoItemId: item.catalogoItemId,
      descricao: item.descricao,
      tipo: item.tipo,
      quantidade: item.quantidade,
      valorUnitarioCentavos: item.valorUnitarioCentavos,
    })),
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm" htmlFor="status">
        Status
        <select id="status" value={status} onChange={(e) => alterarStatus(e.target.value as StatusOrcamento)} className="mt-1 block rounded border px-2 py-1">
          {Object.entries(STATUS_LABEL).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </label>
      {erroStatus && (
        <p role="alert" className="text-sm text-red-600">
          {erroStatus}
        </p>
      )}
      <OrcamentoForm catalogo={catalogo} faixas={faixas} config={config} valoresIniciais={valoresIniciais} aoSalvar={aoSalvar} />
      <Link href={`/orcamentos/${orcamento.id}/pdf`} target="_blank" rel="noreferrer" className="inline-block rounded border px-3 py-1 text-sm">
        Baixar PDF
      </Link>
      {erroWhatsApp && (
        <p role="alert" className="text-sm text-red-600">
          {erroWhatsApp}
        </p>
      )}
      <button type="button" onClick={enviarPorWhatsApp} className="rounded border px-3 py-1 text-sm">
        Enviar por WhatsApp
      </button>
    </div>
  );
}
