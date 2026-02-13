# ⚖️ David - Assistente Jurídico com IA
> **BETA - PRODUCTION READY** | *Orquestração Cognitiva para o Judiciário*

O **David** é um assistente jurídico de última geração projetado para elevar a produtividade de gabinetes e escritórios. Diferente de chatbots comuns, o David utiliza uma arquitetura de **Orquestração Cognitiva** onde múltiplos agentes especializados (Leitor, Pesquisador, Jurista, Auditor) colaboram para produzir minutas, análises e peças processuais com precisão e estilo personalizado.

---

## 🚀 Diferenciais de Tecnologia

### 🧠 Inteligência Artificial (Next-Gen)
O David é construído sobre os modelos de fundação mais avançados disponíveis, garantindo raciocínio lógico superior e capacidade de processamento massivo de contexto.

* **Google (Gemini 3)** - Provider padrão
    * **Gemini 3 Flash Preview**: Modelo padrão. Velocidade extrema para triagem e análises em tempo real.
    * **Gemini 3 Pro Preview**: Raciocínio jurídico complexo, multimodalidade nativa e janelas de contexto massivas.
* **OpenAI (GPT-5)**
    * **GPT-5.2**: Capacidade de agência, planejamento e estruturação lógica superior.
    * **GPT-5 Mini**: Modelo leve e econômico para tarefas rápidas.
* **Anthropic (Claude 4.5)**
    * **Claude 4.5 Sonnet**: A referência em redação jurídica natural, nuance e aderência a instruções complexas.
    * **Claude 4.5 Haiku**: Rápido com boa qualidade de redação.

### 🧩 Arquitetura Híbrida
* **RAG Híbrido**: Combina busca vetorial (semântica) com busca textual (keywords) para encontrar jurisprudência exata.
* **Motores Especializados**:
    * **Motor A (Leitor)**: Extrai e estrutura dados de PDFs complexos (e-Proc, PJe).
    * **Motor B (Estilo)**: Aprende e imita o estilo de escrita do magistrado/advogado.
    * **Motor C (Jurista)**: Aplica o direito material e processual aos fatos.
    * **Motor D (Auditor)**: Revisa a peça final contra regras de *compliance* e qualidade.

---

## 💎 Modelo de Acesso e Planos

O David oferece flexibilidade para diferentes perfis de uso, desde testadores individuais até grandes bancas.

### 1. Planos Geridos (Padrão)
*Ideal para a maioria dos usuários. Simplicidade e previsibilidade.*
* **Níveis**: Tester / Free / Pro.
* **Sistema de créditos**: 1 crédito = 1.000 tokens. Quotas diárias por plano.
* **Como funciona**: O sistema gerencia e custeia o acesso aos modelos de IA (Gemini, GPT, Claude). O usuário paga apenas a assinatura do plano.
* **Benefício**: Zero configuração técnica. Acesso imediato aos melhores modelos.

### 2. Modo Avançado (Híbrido)
*Exclusivo para Power Users e Desenvolvedores.*
* **Funcionalidade**: **BYOK (Bring Your Own Key)** - Traga Sua Própria Chave.
* **Como funciona**: No menu *Configurações > Avançado*, você pode inserir sua chave pessoal da API (Google AI Studio, OpenAI, Anthropic).
* **Benefício**: Remove limites de uso da plataforma. O usuário paga o consumo diretamente ao provedor da IA, obtendo custo de atacado para alto volume.

---

## 🛠️ Stack Tecnológica

O projeto é construído com tecnologias modernas voltadas para performance e tipagem segura.

* **Frontend**: React 19, TailwindCSS, Radix UI, Lucide Icons.
* **Backend**: Node.js, Express, tRPC (Type-safe API).
* **Banco de Dados**: MySQL (via Drizzle ORM com auto-migration).
* **Segurança**: Helmet.js (CSP), Circuit Breaker (opossum), Rate Limiting com planos.
* **Monitoramento**: Sentry (frontend + backend).
* **Infraestrutura**: Containerizado (Docker), deploy em Railway.

---

## 📚 Documentação

A documentação detalhada técnica e de negócio encontra-se na pasta [`/docs`](./docs):

* **[Arquitetura e Design](./docs/architecture)**: Detalhes sobre o sistema de orquestração e fluxos.
* **[Modelo de Negócio](./docs/MODELO_NEGOCIO_API.md)**: Estratégia de precificação e análise de custos.
* **[Relatórios de Segurança](./docs/RELATORIOS)**: Auditorias de segurança e estabilidade.

---

## 🔧 Instalação (Desenvolvimento)

1. **Clone o repositório**
2. **Configure o ambiente**
   Crie um arquivo `.env` baseado no `.env.example`.
   > **Nota**: As chaves `GEMINI_API_KEY`, `OPENAI_API_KEY`, etc. no `.env` são as chaves do **sistema** (usadas nos Planos Geridos).

3. **Instale as dependências**
   ```bash
   pnpm install
   ```

4. **Banco de Dados**
   ```bash
   pnpm run db:push  # Cria as tabelas (também executa automaticamente no start)
   pnpm run seed     # Popula dados iniciais (súmulas, enunciados)
   ```

5. **Inicie o servidor**
   ```bash
   pnpm run dev      # Desenvolvimento (servidor + cliente com hot reload)
   pnpm run start    # Produção (auto-migration + servidor)
   ```

---

*David AI - Transformando o Direito com Inteligência.*
