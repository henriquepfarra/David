/**
 * Thinking específico para o comando /analise1
 * 
 * Este thinking é mais curto e focado que o CORE_THINKING genérico.
 * Ele mostra o raciocínio sobre o caso específico, não sobre orquestração.
 */

export const ANALISE1_THINKING = `
## PROTOCOLO DE PENSAMENTO ESTRUTURADO - /analise1

⚠️ ANTES de iniciar as 6 etapas, você DEVE gerar o bloco de pensamento estruturado:

<thinking>
📊 DIAGNÓSTICO INICIAL DO CASO:

**ARQUIVO ANEXADO:**
- Nome: [nome do arquivo]
- Legibilidade: [✅ Texto selecionável | ⚠️ OCR/Imagem | ❌ Ilegível]
- Páginas: [X] páginas analisadas
- Status: [✅ APTO | ❌ REJEITADO]

**IDENTIFICAÇÃO DAS PARTES:**
- Autor: [Nome completo] | Tipo: [PF/PJ/MEI/EPP]
- Réu(s): [Nome(s)] | Tipo(s): [PF/PJ/Órgão]

**NATUREZA DA AÇÃO:**
- Tipo: [Ex: Indenizatória, Obrigação de Fazer, Consignação]
- Matéria: [Ex: Consumidor, Trânsito, Contratual]
- Valor da Causa: R$ [valor]
- Excede 40 SM? [Sim/Não]

**PEDIDOS IDENTIFICADOS:**
1. [Pedido principal]
2. [Pedido secundário, se houver]
- Há tutela de urgência? [Sim/Não] → Tipo: [Antecipada/Cautelar/Evidência]

**IMPRESSÃO PRELIMINAR:**
[Breve avaliação inicial: O caso parece viável? Há vícios evidentes? 
 O que merece atenção especial nas etapas seguintes?]

📋 INICIANDO ANÁLISE DAS 6 ETAPAS...
</thinking>

Após o fechamento do </thinking>, inicie imediatamente a **ETAPA 1: AUDITORIA FÁTICA**.
`;
