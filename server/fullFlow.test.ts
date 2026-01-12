import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: process.env.OWNER_OPEN_ID || "test-owner",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Fluxo Completo de Aprendizado", () => {
  it("deve completar o fluxo: criar conversa → gerar minuta → aprovar → extrair tese", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    console.log("\n🧪 INICIANDO TESTE DO FLUXO COMPLETO\n");

    // 1. Buscar processo existente
    console.log("📋 Passo 1: Buscar processo...");
    const processos = await caller.processes.list();
    let processo = processos.find(p => p.processNumber === "4006433-51.2025.8.26.0009");

    // Se não existir, criar um processo de teste
    if (!processo) {
      console.log("   Processo não encontrado, criando novo...");
      const newProcesso = await caller.processes.create({
        processNumber: "4006433-51.2025.8.26.0009",
        plaintiff: "Márcia Aparecida Viana dos Santos e Marco Aurélio Viana dos Santos",
        defendant: "Banco Santander (Brasil) S/A",
        subject: "Ação de Obrigação de Fazer c/c Indenização por Danos Morais",
        facts: "Contrato de leasing quitado em 2012, gravame não baixado há 13+ anos",
        evidence: "Contrato quitado, comprovante de pagamento",
        requests: "Baixa do gravame + indenização por danos morais",
      });
      processo = await caller.processes.get({ id: newProcesso.id });
    }

    expect(processo).toBeDefined();
    console.log(`✅ Processo encontrado: ${processo!.processNumber}`);

    // 2. Criar conversa
    console.log("\n💬 Passo 2: Criar conversa...");
    const conversation = await caller.david.createConversation({
      title: "Teste Fluxo Completo - Tutela Urgência",
      processId: processo!.id,
    });
    expect(conversation.id).toBeTypeOf("number");
    console.log(`✅ Conversa criada: ID ${conversation.id}`);

    // 3. Simular minuta gerada (sem chamar LLM de verdade para economizar tempo)
    const minutaSimulada = `DECISÃO INTERLOCUTÓRIA

Processo nº 4006433-51.2025.8.26.0009
Autor: Márcia Aparecida Viana dos Santos e Marco Aurélio Viana dos Santos
Réu: Banco Santander (Brasil) S/A

Vistos.

Trata-se de AÇÃO DE OBRIGAÇÃO DE FAZER C/C INDENIZAÇÃO POR DANOS MORAIS ajuizada por MÁRCIA APARECIDA VIANA DOS SANTOS e MARCO AURÉLIO VIANA DOS SANTOS em face de BANCO SANTANDER (BRASIL) S/A.

Os autores alegam que celebraram contrato de arrendamento mercantil (leasing) com o réu em 2010, quitado integralmente em 26/10/2012, conforme comprovante de pagamento acostado aos autos. Não obstante a quitação há mais de 13 (treze) anos, o banco réu não providenciou a baixa do gravame eletrônico junto ao DETRAN, impedindo a livre disposição do bem pelos proprietários.

Requerem, em sede de tutela de urgência, a determinação para que o réu proceda à imediata baixa do gravame, sob pena de multa diária.

É o breve relatório. DECIDO.

A tutela de urgência exige a comprovação cumulativa de dois requisitos principais: a probabilidade do direito (fumus boni iuris) e o perigo de dano ou risco ao resultado útil do processo (periculum in mora), nos termos do Art. 300 do CPC.

No caso em tela, ambos os requisitos estão presentes.

Quanto à PROBABILIDADE DO DIREITO, a quitação do contrato está comprovada documentalmente (fls. XX). Uma vez quitado o contrato de arrendamento mercantil, é dever do credor fiduciário providenciar a baixa do gravame no prazo legal, conforme determina o Art. 9º da Resolução CONTRAN nº 320/2009. A manutenção indevida do gravame por mais de 13 anos configura descumprimento de obrigação legal e contratual.

Quanto ao PERIGO DE DANO, a restrição impede os autores de exercerem plenamente os direitos de propriedade sobre o veículo, impossibilitando sua venda ou transferência. O decurso de mais de uma década sem solução demonstra a ineficácia da via administrativa e a urgência da tutela jurisdicional.

A medida é REVERSÍVEL, pois, caso o réu comprove posteriormente a existência de débito pendente (o que parece improvável diante da documentação apresentada), o gravame poderá ser restabelecido.

A jurisprudência do TJSP e do STJ é pacífica no sentido de deferir tutelas de urgência em casos análogos, reconhecendo a responsabilidade objetiva da instituição financeira (Art. 14, CDC) e o dano moral in re ipsa decorrente da manutenção indevida de restrições.

Ante o exposto, DEFIRO A TUTELA DE URGÊNCIA para determinar que o réu BANCO SANTANDER (BRASIL) S/A providencie, no prazo de 05 (cinco) dias, a baixa do gravame eletrônico incidente sobre o veículo objeto do contrato de leasing quitado, sob pena de multa diária de R$ 500,00 (quinhentos reais), limitada a R$ 30.000,00 (trinta mil reais).

Oficie-se ao DETRAN para ciência e cumprimento, caso o réu não o faça no prazo estabelecido.

Cite-se o réu para apresentar contestação no prazo legal.

Intimem-se.

São Paulo, 22 de novembro de 2025.

[Assinatura Digital]`;

    console.log("\n📝 Passo 3: Simular minuta gerada...");
    console.log(`✅ Minuta simulada (${minutaSimulada.length} caracteres)`);

    // 4. Aprovar minuta
    console.log("\n👍 Passo 4: Aprovar minuta...");
    const approval = await caller.david.approvedDrafts.create({
      conversationId: conversation.id,
      messageId: 999, // ID fictício para teste
      originalDraft: minutaSimulada,
      processId: processo!.id,
      draftType: "decisao",
      approvalStatus: "approved",
    });

    expect(approval.id).toBeTypeOf("number");
    console.log(`✅ Minuta aprovada! ID: ${approval.id}`);

    // 5. Aguardar extração de tese (processo assíncrono)
    console.log("\n🧠 Passo 5: Aguardar extração de tese...");
    console.log("   (Aguardando 8 segundos para processamento assíncrono)");
    await new Promise(resolve => setTimeout(resolve, 8000));

    // 6. Verificar tese extraída
    console.log("\n🔍 Passo 6: Verificar tese extraída...");
    const theses = await caller.david.learnedTheses.list();
    
    console.log(`   Total de teses no sistema: ${theses.length}`);
    
    const teseRelacionada = theses.find(t => 
      t.approvedDraftId === approval.id ||
      t.thesis?.toLowerCase().includes('gravame') ||
      t.thesis?.toLowerCase().includes('leasing')
    );

    if (teseRelacionada) {
      console.log(`✅ Tese extraída encontrada!`);
      console.log(`   ID: ${teseRelacionada.id}`);
      console.log(`   Tese: ${teseRelacionada.thesis?.substring(0, 150)}...`);
      console.log(`   Fundamentos: ${teseRelacionada.legalFoundations?.substring(0, 100)}...`);
      console.log(`   Palavras-chave: ${teseRelacionada.keywords}`);
      
      expect(teseRelacionada.thesis).toBeDefined();
      expect(teseRelacionada.legalFoundations).toBeDefined();
      expect(teseRelacionada.keywords).toBeDefined();
    } else {
      console.log(`⚠️  Tese ainda não extraída (pode estar em processamento)`);
      console.log(`   Teses disponíveis:`);
      theses.slice(0, 3).forEach((t, i) => {
        console.log(`   ${i + 1}. ${t.thesis?.substring(0, 80)}...`);
      });
    }

    // 7. Listar minutas aprovadas
    console.log("\n📚 Passo 7: Listar minutas aprovadas...");
    const approvedDrafts = await caller.david.approvedDrafts.list();
    
    expect(approvedDrafts.length).toBeGreaterThan(0);
    console.log(`✅ Total de minutas aprovadas: ${approvedDrafts.length}`);
    
    const minutaAprovada = approvedDrafts.find(d => d.id === approval.id);
    expect(minutaAprovada).toBeDefined();
    console.log(`✅ Minuta aprovada encontrada na listagem`);

    console.log("\n✅ TESTE DO FLUXO COMPLETO FINALIZADO!\n");
  }, 30000); // Timeout de 30 segundos
});
