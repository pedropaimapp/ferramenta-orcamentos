# Ferramenta de Montagem de Orçamentos — Design

**Data:** 2026-08-27
**Status:** Aprovado para planejamento de implementação

## Contexto e objetivo

A oficina (duas unidades, quatro computadores no total) hoje usa um sistema que
exige cadastro completo de cliente e veículo antes de montar um orçamento
simples, o que trava o atendimento. O objetivo desta ferramenta é permitir que
o consultor monte um orçamento digitando poucos campos, gere um PDF para
impressão/download, e envie ao cliente uma mensagem de WhatsApp já formatada
com os detalhes — sem burocracia de cadastro prévio.

A pesquisa de preço no distribuidor pela placa **não** será automatizada nesta
versão: o consultor continua pesquisando manualmente e digita os valores no
orçamento. Isso fica registrado como possível evolução futura, fora do escopo
atual.

## Escopo

### Dentro do escopo
- Criação rápida de orçamento sem cadastro prévio de cliente/veículo.
- Catálogo compartilhado de itens (peças/serviços) reaproveitável entre as
  duas oficinas, com criação de novos itens "na hora" durante um orçamento.
- Cálculo automático de condição de pagamento por faixa de valor, com
  desconto à vista e alternativa de parcelamento no cartão Porto.
- Geração de PDF para impressão/download.
- Geração de mensagem de WhatsApp formatada, aberta via link `wa.me`
  pré-preenchido (sem envio automático de arquivo).
- Login individual por consultor, com painel próprio de orçamentos.
- Papel de administrador com acesso total (orçamentos de todos, gestão de
  consultores, catálogo e faixas de pagamento).
- Duas oficinas com identidade própria (nome, endereço, telefone, logo).

### Fora do escopo (não construir nesta versão)
- Consulta automática de preço no site do distribuidor pela placa.
- Envio automático do PDF por WhatsApp via API paga (Z-API/Meta Cloud API).
- Relatórios/dashboards analíticos.
- App mobile nativo ou modo offline.

## Arquitetura

- **Aplicação:** Next.js (React), hospedada na Vercel — um único app cobrindo
  login, painel do consultor, painel do admin e criação/edição de orçamento.
- **Banco de dados e autenticação:** Supabase (Postgres gerenciado + Auth para
  login/senha + Storage para logos das oficinas).
- **PDF:** gerado no servidor (rota da própria aplicação) a partir dos dados
  do orçamento, sem depender de navegador headless; baixado pelo consultor.
- **WhatsApp:** mensagem de texto formatada montada no navegador e aberta via
  link `wa.me` com o telefone do cliente e a mensagem pré-preenchida — o
  consultor confere e envia manualmente dentro do WhatsApp.

Justificativa: usar auth/banco/storage gerenciados pelo Supabase reduz o
código de segurança escrito à mão (login/senha, isolamento de dados por
consultor) e mantém o time de infraestrutura mínimo, adequado ao volume de uso
(4 consultores, 2 oficinas). Ambos os planos gratuitos (Vercel + Supabase)
cobrem esse volume; custo estimado sobe para ~R$100–150/mês somente se o uso
crescer muito além disso.

## Modelo de dados

```
oficinas
  id, nome, endereco, telefone, logo_url

consultores
  id, nome, login, senha_hash, papel ('consultor' | 'admin'),
  oficina_id (nulo para admin), ativo (bool)

catalogo_itens
  id, descricao, tipo ('peca' | 'servico'), marca_codigo (opcional),
  valor_padrao

faixas_pagamento
  id, valor_min, valor_max (nulo = sem limite superior),
  parcelas_credito_sem_juros

orcamentos
  id, cliente_nome, cliente_telefone, veiculo_placa, veiculo_modelo,
  consultor_id, oficina_id, status ('rascunho' | 'enviado' | 'aprovado' | 'recusado'),
  validade_dias (padrão 7), criado_em, atualizado_em

orcamento_itens
  id, orcamento_id, catalogo_item_id (opcional, se veio do catálogo),
  descricao, tipo ('peca' | 'servico'), quantidade, valor_unitario
```

Regras de negócio ficam em `faixas_pagamento` (editável pelo admin) e em
constantes de configuração para as regras fixas (desconto à vista 5%,
entrada mínima 30%, cartão Porto até 6x com parcela mínima de R$100).

## Fluxo de criação do orçamento

1. Consultor loga → "Novo orçamento".
2. Preenche: nome do cliente, telefone, placa, modelo/marca do veículo.
3. Adiciona itens: busca no catálogo (autocompletar) ou digita um item novo,
   que passa a ficar disponível no catálogo compartilhado; marca cada item
   como Peça ou Serviço; define quantidade e valor unitário.
4. O total é recalculado em tempo real, junto com a condição de pagamento da
   faixa correspondente, o desconto à vista e a alternativa do cartão Porto —
   todos exibidos com valores já calculados em reais.
5. Consultor salva (status inicial "Rascunho"); pode gerar o PDF e/ou clicar
   em "Enviar por WhatsApp" a qualquer momento.
6. O orçamento pode ser reaberto e editado livremente (itens, valores,
   status) a qualquer momento; alterar itens recalcula a condição de
   pagamento automaticamente.
7. O consultor pode duplicar um orçamento existente como ponto de partida
   para um novo.

## Regra de condição de pagamento

Faixas por valor total do orçamento (valor exato no limite entra na faixa de
cima — a condição melhor):

| Faixa | Condição principal |
|---|---|
| Menos de R$1.000,00 | Entrada mínima 30% (Pix ou débito) + saldo em 1x no crédito sem juros |
| De R$1.000,00 até menos de R$2.500,00 | Entrada mínima 30% + saldo em 2x sem juros |
| De R$2.500,00 até menos de R$4.000,00 | Entrada mínima 30% + saldo em 3x sem juros |
| A partir de R$4.000,00 | Entrada mínima 30% + saldo em 4x sem juros |

Regras válidas em **todas** as faixas, exibidas junto com a condição
principal:
- **Cartão Porto:** parcelamento alternativo em até 6x sem juros, com parcela
  mínima de R$100. Se `total / 6 < 100`, o sistema calcula o maior número de
  parcelas (entre 1 e 6) cuja parcela resultante seja ≥ R$100.
- **Desconto à vista:** 5% de desconto sobre o total para pagamento integral
  via Pix ou débito.

Todos os valores (entrada em R$, valor de cada parcela, total com desconto)
são calculados e exibidos — não apenas o texto da regra.

Faixas e percentuais são editáveis pelo admin via painel (sem alterar
código); os valores acima são a carga inicial dos dados.

## PDF

- Cabeçalho: logo, nome, endereço e telefone da oficina do consultor.
- Dados do cliente e veículo.
- Tabela de itens separada em Peças e Serviços (descrição, quantidade, valor
  unitário, subtotal).
- Total geral, desconto à vista calculado, condição de pagamento da faixa
  (valores calculados) e alternativa do cartão Porto.
- Nome do consultor, data de emissão, validade (dias restantes a partir da
  data de emissão, padrão 7 dias).
- Botão "Baixar PDF" na tela do orçamento.

## Mensagem de WhatsApp

- Botão "Enviar por WhatsApp" monta um texto usando a formatação nativa do
  WhatsApp (negrito/itálico) contendo: nome da oficina e do consultor, dados
  do veículo, lista de itens com valores, total, desconto à vista, condição
  de pagamento calculada e validade.
- Abre `wa.me/<telefone-do-cliente>?text=<mensagem-codificada>` — o
  consultor revisa e envia manualmente dentro do WhatsApp Web/App.
- O PDF **não** é anexado automaticamente por esse fluxo; se o consultor
  quiser enviar o PDF, faz isso manualmente à parte (baixa e anexa).

## Painéis e permissões

**Papéis:** `consultor` e `admin` (login/senha via Supabase Auth).

**Painel do consultor:**
- Lista apenas os próprios orçamentos, com filtro por status e busca por
  cliente/placa.
- Pode duplicar um orçamento antigo.

**Painel do admin:**
- Vê e edita orçamentos de todos os consultores das duas oficinas; também
  cria os seus próprios orçamentos.
- Gerencia consultores (cadastra, edita, desativa — nome, login, senha,
  oficina vinculada).
- Gerencia catálogo de itens (cria/edita/remove).
- Gerencia faixas de pagamento (valores mínimo/máximo, parcelas, percentual
  de entrada, desconto à vista, parâmetros do cartão Porto).
- Gerencia dados de cada oficina (nome, endereço, telefone, logo).

## Tratamento de erros

- Telefone do cliente inválido/incompleto → aviso antes de permitir gerar o
  link de WhatsApp.
- Orçamento sem nenhum item → bloqueia salvar/gerar PDF, com mensagem clara.
- Falha ao gerar PDF → mensagem de erro, orçamento permanece salvo (não perde
  dados já digitados).
- Login inválido → mensagem genérica (não indica se o erro foi usuário ou
  senha).

## Testes

- Unitários: cálculo de faixa de pagamento (limites exatos, parcela mínima do
  cartão Porto, desconto à vista).
- Unitários: montagem do texto da mensagem de WhatsApp e do link `wa.me`
  (encoding do telefone e da mensagem).
- Integração: fluxo completo de criação de orçamento → cálculo → geração de
  PDF.
- Integração: isolamento de dados entre consultores (um consultor não
  acessa orçamento de outro; admin acessa todos).
- Manual: impressão do PDF gerado, verificação visual do layout com logo.

## Próximos passos

Este design será detalhado em um plano de implementação via skill
`writing-plans`.
