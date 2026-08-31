'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { OrcamentoForm, type DadosOrcamentoFormulario } from '@/components/orcamento/OrcamentoForm';
import { salvarEdicaoOrcamento, mudarStatusOrcamento, removerOrcamento } from '@/lib/orcamento/actions';
import { montarLinkWhatsApp, montarMensagemOrcamento } from '@/lib/orcamento/whatsapp';
import { calcularTotalItens } from '@/lib/orcamento/totals';
import { encontrarFaixa, calcularEntradaMinima, dividirEmParcelas } from '@/lib/payment/faixas';
import { calcularDescontoAVista, calcularCartaoPorto } from '@/lib/payment/alternativas';
import type { CatalogoItem, FaixaPagamento, ConfiguracaoPagamento, Orcamento, OrcamentoItem, StatusOrcamento } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Field, Select } from '@/components/ui/Input';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { STATUS_LABEL, StatusBadge } from '@/components/ui/Badge';

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
  const router = useRouter();
  const [status, setStatus] = useState(orcamento.status);
  const [erroStatus, setErroStatus] = useState<string | null>(null);
  const [erroWhatsApp, setErroWhatsApp] = useState<string | null>(null);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  async function enviarPorWhatsApp() {
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

      // Envio pelo WhatsApp marca o orçamento como "Enviado" — só quando ainda
      // está em Rascunho, pra não desfazer uma aprovação/recusa já registrada
      // caso alguém reenvie uma cópia depois.
      if (status === 'rascunho') {
        await alterarStatus('enviado');
      }
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

  async function excluir() {
    setErroExcluir(null);
    if (!window.confirm(`Excluir o orçamento de ${orcamento.clienteNome}? Essa ação não pode ser desfeita.`)) return;
    try {
      await removerOrcamento(orcamento.id);
      router.push('/dashboard');
    } catch (err) {
      setErroExcluir(err instanceof Error ? err.message : 'Erro desconhecido');
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
    <div className="space-y-6">
      <Card className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Status" htmlFor="status" className="max-w-xs">
            <Select id="status" value={status} onChange={(e) => alterarStatus(e.target.value as StatusOrcamento)}>
              {Object.entries(STATUS_LABEL).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </Select>
          </Field>
          <StatusBadge status={status} />
          {status === 'enviado' && (
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="success" onClick={() => alterarStatus('aprovado')}>
                Aprovado
              </Button>
              <Button type="button" size="sm" variant="danger" onClick={() => alterarStatus('recusado')}>
                Recusado
              </Button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/orcamentos/${orcamento.id}/pdf`} target="_blank" rel="noreferrer" className={buttonClasses('outline')}>
            Baixar PDF
          </Link>
          <Button type="button" variant="outline" onClick={enviarPorWhatsApp}>
            Enviar por WhatsApp
          </Button>
          <Button type="button" variant="danger" onClick={excluir}>
            Excluir orçamento
          </Button>
        </div>
      </Card>
      {erroStatus && <Alert>{erroStatus}</Alert>}
      {erroWhatsApp && <Alert>{erroWhatsApp}</Alert>}
      {erroExcluir && <Alert>{erroExcluir}</Alert>}

      <OrcamentoForm catalogo={catalogo} faixas={faixas} config={config} valoresIniciais={valoresIniciais} aoSalvar={aoSalvar} />
    </div>
  );
}
