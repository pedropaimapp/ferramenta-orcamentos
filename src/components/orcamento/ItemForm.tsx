'use client';

import React, { useMemo, useState, type FormEvent } from 'react';
import { parseReaisParaCentavos } from '@/lib/format';
import type { CatalogoItem } from '@/lib/types';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export interface NovoItem {
  catalogoItemId: string | null;
  descricao: string;
  tipo: 'peca' | 'servico';
  quantidade: number;
  valorUnitarioCentavos: number;
}

const LIMITE_SUGESTOES = 8;

export function ItemForm({ catalogo, onAdicionar }: { catalogo: CatalogoItem[]; onAdicionar: (item: NovoItem) => void }) {
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<'peca' | 'servico'>('peca');
  const [quantidade, setQuantidade] = useState('1');
  const [valor, setValor] = useState('');
  const [catalogoItemId, setCatalogoItemId] = useState<string | null>(null);
  const [sugestoesAbertas, setSugestoesAbertas] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Sugestões do catálogo filtradas pelo tipo escolhido (peça/serviço) e pelo
  // texto já digitado; se o item não existir, o usuário digita livremente e
  // ele é tratado como novo (catalogoItemId fica null).
  const sugestoes = useMemo(() => {
    const busca = descricao.trim().toLowerCase();
    if (!busca) return [];
    return catalogo.filter((item) => item.tipo === tipo && item.descricao.toLowerCase().includes(busca)).slice(0, LIMITE_SUGESTOES);
  }, [catalogo, descricao, tipo]);

  function selecionarTipo(novoTipo: 'peca' | 'servico') {
    setTipo(novoTipo);
    setCatalogoItemId(null);
  }

  function alterarDescricao(valorDigitado: string) {
    setDescricao(valorDigitado);
    setCatalogoItemId(null);
    setSugestoesAbertas(true);
  }

  function selecionarSugestao(item: CatalogoItem) {
    setCatalogoItemId(item.id);
    setDescricao(item.descricao);
    setTipo(item.tipo);
    setValor((item.valorPadraoCentavos / 100).toFixed(2).replace('.', ','));
    setSugestoesAbertas(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    try {
      if (!descricao.trim()) throw new Error('Descrição é obrigatória');
      const quantidadeNumero = Number(quantidade);
      if (!Number.isFinite(quantidadeNumero) || quantidadeNumero <= 0) throw new Error('Quantidade deve ser maior que zero');
      const valorUnitarioCentavos = parseReaisParaCentavos(valor);

      onAdicionar({ catalogoItemId, descricao: descricao.trim(), tipo, quantidade: quantidadeNumero, valorUnitarioCentavos });

      setDescricao('');
      setTipo('peca');
      setQuantidade('1');
      setValor('');
      setCatalogoItemId(null);
      setSugestoesAbertas(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  return (
    <Card as="form" onSubmit={handleSubmit} className="space-y-3">
      <CardTitle>Adicionar item</CardTitle>
      <div className="flex gap-2" role="group" aria-label="Tipo">
        <button
          type="button"
          aria-pressed={tipo === 'peca'}
          onClick={() => selecionarTipo('peca')}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            tipo === 'peca' ? 'border-porto-black bg-porto-black text-white' : 'border-slate-300 text-porto-black hover:border-porto-blue'
          }`}
        >
          Peça
        </button>
        <button
          type="button"
          aria-pressed={tipo === 'servico'}
          onClick={() => selecionarTipo('servico')}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            tipo === 'servico' ? 'border-porto-black bg-porto-black text-white' : 'border-slate-300 text-porto-black hover:border-porto-blue'
          }`}
        >
          Serviço
        </button>
      </div>
      <div className="relative">
        <Input
          placeholder="Descrição"
          value={descricao}
          onChange={(e) => alterarDescricao(e.target.value)}
          onFocus={() => setSugestoesAbertas(true)}
          onBlur={() => setSugestoesAbertas(false)}
          autoComplete="off"
          required
        />
        {sugestoesAbertas && sugestoes.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            {sugestoes.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  // onMouseDown (não onClick) para rodar antes do onBlur do input e,
                  // com preventDefault, evitar que o input perca o foco e feche a
                  // lista antes de registrarmos a seleção.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selecionarSugestao(item);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-porto-black hover:bg-porto-blue/10"
                >
                  {item.descricao}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Input placeholder="Quantidade" type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} required />
      <Input placeholder="Valor unitário (R$)" value={valor} onChange={(e) => setValor(e.target.value)} required />
      {erro && <Alert>{erro}</Alert>}
      <Button type="submit">Adicionar item</Button>
    </Card>
  );
}
