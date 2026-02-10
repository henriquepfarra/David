# Modelo de Negócio - API para Servidores Públicos

> Documento de planejamento para comercialização do agente de análise de processos

---

## Índice

1. [Custos Base das APIs](#1-custos-base-das-apis)
2. [Custo por Análise de Processo](#2-custo-por-análise-de-processo)
3. [Modelo de Precificação](#3-modelo-de-precificação)
4. [Estratégia de Vendas](#4-estratégia-de-vendas)
5. [Investimento Inicial](#5-investimento-inicial)
6. [Projeção Financeira](#6-projeção-financeira)
7. [Implementação Técnica](#7-implementação-técnica)

---

## 1. Custos Base das APIs

### Preços por Milhão de Tokens (MTok) - Fevereiro 2026

| Modelo | Input | Output | Observação |
|--------|-------|--------|------------|
| **Claude Sonnet 4.5** | $3.00 | $15.00 | Melhor custo-benefício para análise |
| **GPT-5.2** | $1.75 | $14.00 | Bom para tarefas de código |
| **Gemini 3 Pro** | $2.00 | $12.00 | Mais barato em output |

### Conversão para Real (câmbio $1 = R$6)

| Modelo | Input/MTok | Output/MTok |
|--------|------------|-------------|
| Claude Sonnet 4.5 | R$18.00 | R$90.00 |
| GPT-5.2 | R$10.50 | R$84.00 |
| Gemini 3 Pro | R$12.00 | R$72.00 |

### Fontes de Preços

- [Anthropic Pricing](https://platform.claude.com/docs/pt-BR/about-claude/pricing)
- [OpenAI Pricing](https://platform.openai.com/docs/pricing)
- [Google Gemini Pricing](https://ai.google.dev/gemini-api/docs/pricing)

---

## 2. Custo por Análise de Processo

### Anatomia de uma Requisição

```
┌─────────────────────────────────────────────────────────┐
│                    TOKENS DE INPUT                      │
├─────────────────────────────────────────────────────────┤
│  1. System Prompt (instruções)         ~2.000 tokens    │
│  2. Chunks do RAG (trechos relevantes) ~4.000-15.000    │
│  3. Pergunta do usuário                ~100-500 tokens  │
├─────────────────────────────────────────────────────────┤
│                    TOKENS DE OUTPUT                     │
├─────────────────────────────────────────────────────────┤
│  4. Resposta/Análise gerada            ~1.000-4.000     │
└─────────────────────────────────────────────────────────┘
```

### Cenários de Uso

#### Cenário 1: Análise Simples (consulta pontual)
- RAG retorna 3-5 chunks relevantes
- Resposta curta/média

| Componente | Tokens |
|------------|--------|
| System prompt | 2.000 |
| RAG chunks (5 × 800) | 4.000 |
| Pergunta | 200 |
| **Total Input** | **~6.200** |
| Resposta | 1.000 |
| **Total Output** | **~1.000** |

**Custo (Claude Sonnet 4.5):** ~R$0.20

#### Cenário 2: Análise Média (resumo do processo)
- RAG retorna 10-15 chunks
- Resposta detalhada

| Componente | Tokens |
|------------|--------|
| System prompt | 2.000 |
| RAG chunks (12 × 800) | 9.600 |
| Pergunta | 300 |
| **Total Input** | **~12.000** |
| Resposta | 2.000 |
| **Total Output** | **~2.000** |

**Custo (Claude Sonnet 4.5):** ~R$0.40

#### Cenário 3: Análise Complexa (minuta/parecer)
- RAG retorna 20+ chunks
- Resposta longa e estruturada

| Componente | Tokens |
|------------|--------|
| System prompt | 2.500 |
| RAG chunks (20 × 800) | 16.000 |
| Pergunta + contexto | 500 |
| **Total Input** | **~19.000** |
| Resposta (minuta) | 4.000 |
| **Total Output** | **~4.000** |

**Custo (Claude Sonnet 4.5):** ~R$0.70

### Tabela Resumo de Custos

| Tipo de Análise | Input | Output | Custo Real | Preço Sugerido (2x) |
|-----------------|-------|--------|------------|---------------------|
| Simples | 6k | 1k | R$0.20 | R$0.40 |
| Média | 12k | 2k | R$0.40 | R$0.80 |
| Complexa | 19k | 4k | R$0.70 | R$1.40 |
| Minuta completa | 25k | 6k | R$1.00 | R$2.00 |

---

## 3. Modelo de Precificação

### Opção A: Pay-as-you-go (Pagar Conforme Uso)

#### Preços Sugeridos (margem de 100%)

| Modelo | Input/MTok | Output/MTok |
|--------|------------|-------------|
| Claude Sonnet 4.5 | R$36.00 | R$180.00 |
| GPT-5.2 | R$21.00 | R$168.00 |
| Gemini 3 Pro | R$24.00 | R$144.00 |

**Prós:**
- Justo para todos os níveis de uso
- Sem risco de prejuízo

**Contras:**
- Usuário não sabe quanto vai gastar
- Difícil aprovar em órgãos públicos
- Fricção na decisão de uso

### Opção B: Planos Mensais Fixos (Recomendado)

```
┌────────────────────────────────────────────────────────────┐
│                    PLANOS MENSAIS                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│   BÁSICO          PROFISSIONAL       ILIMITADO            │
│   R$49/mês        R$149/mês          R$399/mês            │
│                                                            │
│   50 análises     200 análises       ~1.000 análises      │
│   ~R$1/análise    ~R$0.75/análise    (fair use)           │
│                                                            │
│   ✓ 3 modelos     ✓ 3 modelos        ✓ 3 modelos          │
│   ✓ Suporte       ✓ Suporte          ✓ Suporte priority   │
│                   ✓ Exportar PDF     ✓ API própria        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Prós:**
- Previsibilidade para o usuário
- Fácil de justificar no órgão
- Maior conversão de vendas

**Contras:**
- Risco de usuários heavy users no plano ilimitado

### Opção C: Híbrido (Avançado)

Para usuários técnicos que querem economizar:

```
┌─────────────────────────────────────────┐
│  "Traga sua própria chave API"          │
│                                         │
│  Plataforma: R$29/mês (só acesso)       │
│  + Custo direto da API (usuário paga)   │
│                                         │
│  Ideal para quem faz 500+ análises/mês  │
└─────────────────────────────────────────┘
```

### Margem por Plano

| Plano | Preço | Uso Esperado | Custo API | Margem |
|-------|-------|--------------|-----------|--------|
| Básico R$49 | R$49 | ~30 análises | R$15 | **R$34 (69%)** |
| Pro R$149 | R$149 | ~120 análises | R$60 | **R$89 (60%)** |
| Ilimitado R$399 | R$399 | ~400 análises | R$200 | **R$199 (50%)** |

---

## 4. Estratégia de Vendas

### Proposta de Valor

**Não venda tecnologia. Venda tempo.**

> "Analise um processo em 2 minutos, não em 2 horas"
>
> "Cada análise que leva 1h, você faz em 5 min"
>
> "20 processos por dia → acabou o backlog"

### Cálculo de ROI para o Cliente

```
Servidor ganha: ~R$8.000/mês (160h)
1 hora de trabalho = R$50

Se o agente economiza 2h por dia:
→ 40h/mês economizadas
→ R$2.000 em produtividade

Custo do plano Pro: R$149
ROI: 13x o investimento
```

### Canais de Aquisição

| Canal | Estratégia |
|-------|------------|
| **LinkedIn** | Posts sobre produtividade no serviço público |
| **Grupos WhatsApp** | Grupos de servidores, sindicatos |
| **Indicação** | "Indique um colega, ganhe 1 mês grátis" |
| **Parcerias** | Sindicatos, associações de servidores |
| **Trial gratuito** | 7 dias ou 10 análises grátis |

### Gatilhos de Conversão

- "Usado por X servidores" (prova social)
- "Especializado no seu trabalho" (nicho)
- "Seus dados ficam seguros" (confiança)
- "Cancele quando quiser" (sem risco)
- "Teste grátis por 7 dias" (baixa barreira)

### Por que Planos Fixos Vendem Melhor

| Pay-as-you-go | Plano Mensal |
|---------------|--------------|
| "Quanto vou gastar?" | "R$149 e pronto" |
| Medo de usar muito | Liberdade de uso |
| Decisão a cada uso | Decisão única |
| Difícil aprovar no órgão | Fácil justificar |

---

## 5. Investimento Inicial

### MVP Enxuto (Recomendado)

| Item | Custo Mensal | Custo Inicial |
|------|--------------|---------------|
| **Servidor (VPS)** | R$50-150 | - |
| **Domínio .com.br** | - | R$40/ano |
| **SSL** | Grátis (Let's Encrypt) | R$0 |
| **Créditos API (buffer)** | - | R$500-1.000 |
| **Gateway pagamento** | 3-5% por venda | R$0 |
| **Landing page** | - | R$0 (DIY) |
| **Total** | ~R$150/mês | **R$600-1.100** |

### Infraestrutura

| Opção | Custo/mês | Observação |
|-------|-----------|------------|
| VPS básica (Hostinger, Contabo) | R$50-80 | Suficiente para começar |
| VPS média (DigitalOcean, Hetzner) | R$100-150 | Mais confiável |
| Vercel/Railway | R$0-100 | Se já usa |

### Gateway de Pagamento

| Opção | Taxa | Setup |
|-------|------|-------|
| **Stripe** | 3.99% + R$0.39 | Grátis |
| **Mercado Pago** | 4.99% | Grátis |
| **Asaas** | 2.99% (boleto/pix) | Grátis |
| **Hotmart/Kiwify** | 8-10% | Grátis, mas caro |

### Créditos de API (Estoque)

| Cenário | Crédito | Cobre |
|---------|---------|-------|
| Conservador | R$500 | ~1.000 análises |
| Confortável | R$1.000 | ~2.000 análises |

> **Nota:** Você só gasta quando usuário usa. O crédito é buffer de segurança.

### Resumo do Investimento

| Fase | Investimento |
|------|--------------|
| Para lançar (MVP) | R$600 - R$1.000 |
| Primeiros 3 meses (buffer) | R$1.500 - R$2.000 |
| Marketing inicial (opcional) | R$0 - R$500 |
| **Total seguro** | **R$1.500 - R$2.500** |

---

## 6. Projeção Financeira

### Fluxo de Caixa Projetado

```
MÊS 1 (Lançamento)
├── Investimento inicial:     -R$1.000
├── Custo fixo (servidor):    -R$100
├── Créditos API usados:      -R$50 (poucos usuários)
├── Receita (5 clientes):     +R$500 (mix de planos)
└── Saldo:                    -R$650

MÊS 2
├── Custo fixo:               -R$100
├── Créditos API:             -R$150
├── Receita (15 clientes):    +R$1.500
└── Saldo:                    +R$600 (breakeven!)

MÊS 3
├── Custo fixo:               -R$100
├── Créditos API:             -R$400
├── Receita (30 clientes):    +R$3.500
└── Saldo:                    +R$2.350
```

### Ponto de Equilíbrio

| Métrica | Valor |
|---------|-------|
| Custo fixo mensal | ~R$150 |
| Margem por cliente (média) | ~R$80 |
| **Breakeven** | **2 clientes pagantes** |

### Cenários de Crescimento

| Clientes | Receita Mensal | Custo API | Lucro Mensal |
|----------|----------------|-----------|--------------|
| 10 | R$1.490 | R$300 | R$1.040 |
| 50 | R$7.450 | R$1.500 | R$5.800 |
| 100 | R$14.900 | R$3.000 | R$11.750 |
| 500 | R$74.500 | R$15.000 | R$59.350 |

---

## 7. Implementação Técnica

### O que Já Existe (David)

- ✅ Sistema de chat funcionando
- ✅ Integração com APIs de LLM
- ✅ RAG configurado
- ✅ Interface de usuário

### O que Precisa Criar

| Funcionalidade | Prioridade | Complexidade |
|----------------|------------|--------------|
| Sistema de login/cadastro | Alta | Média |
| Controle de uso (tokens/análises) | Alta | Média |
| Dashboard do usuário | Alta | Baixa |
| Integração pagamento | Alta | Média |
| Landing page | Alta | Baixa |
| Sistema de planos/limites | Alta | Média |
| Painel administrativo | Média | Média |
| Relatórios de uso | Baixa | Baixa |

### Controle de Uso

A API retorna o uso de tokens em cada resposta:

```json
{
  "usage": {
    "input_tokens": 12500,
    "output_tokens": 2100
  }
}
```

**Fluxo de cobrança:**
1. Antes do request: verifica saldo/limite do usuário
2. Executa o request
3. Após resposta: debita tokens do saldo
4. Se limite atingido: bloqueia novos requests

### Limites Técnicos Recomendados

| Limite | Valor | Motivo |
|--------|-------|--------|
| Rate limit | 10-60 req/min | Evita abuso |
| Contexto máximo | 32k tokens/request | Controle de custo |
| Timeout | 60 segundos | UX |
| Cooldown | Bloqueio após 3 falhas | Segurança |

---

## Checklist de Lançamento

### Fase 1: MVP (Semana 1-2)
- [ ] Sistema de cadastro/login
- [ ] Controle básico de uso (contador de análises)
- [ ] Integração com gateway de pagamento
- [ ] Landing page simples
- [ ] 3 planos configurados

### Fase 2: Validação (Semana 3-4)
- [ ] Convidar 10 usuários beta (grátis)
- [ ] Coletar feedback
- [ ] Ajustar limites e preços
- [ ] Corrigir bugs

### Fase 3: Lançamento (Mês 2)
- [ ] Anunciar em grupos de servidores
- [ ] Ativar programa de indicação
- [ ] Monitorar custos vs receita
- [ ] Iterar baseado em dados

---

## Conclusão

### Números-Chave

| Métrica | Valor |
|---------|-------|
| Investimento inicial | R$1.500 - R$2.500 |
| Custo médio por análise | R$0.30 - R$0.70 |
| Preço médio por análise | R$0.60 - R$1.40 |
| Margem por plano | 50% - 69% |
| Breakeven | 2 clientes |
| Meta mês 3 | 30 clientes / R$2.350 lucro |

### Próximos Passos

1. Definir qual modelo de precificação usar (planos fixos recomendado)
2. Implementar sistema de controle de uso
3. Integrar gateway de pagamento
4. Criar landing page
5. Lançar beta com 10 usuários
6. Iterar e escalar

---

*Documento criado em: Fevereiro 2026*
*Última atualização: 10/02/2026*
