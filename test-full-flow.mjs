import { appRouter } from './server/routers.js';
import { getDb } from './server/db.js';

// Simular contexto de usuário autenticado
const mockUser = {
  id: 1,
  openId: process.env.OWNER_OPEN_ID,
  email: 'test@example.com',
  name: 'Test User',
  loginMethod: 'manus',
  role: 'admin',
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const mockContext = {
  user: mockUser,
  req: { protocol: 'https', headers: {} },
  res: { clearCookie: () => {} },
};

const caller = appRouter.createCaller(mockContext);

async function testFullFlow() {
  console.log('\n🧪 TESTE COMPLETO DO FLUXO DE APRENDIZADO\n');
  console.log('=' .repeat(60));

  try {
    // 1. Buscar o processo cadastrado
    console.log('\n📋 Passo 1: Buscar processo cadastrado...');
    const processos = await caller.processos.list();
    const processo = processos.find(p => p.numeroProcesso === '4006433-51.2025.8.26.0009');
    
    if (!processo) {
      throw new Error('Processo não encontrado! Cadastre primeiro.');
    }
    console.log(`✅ Processo encontrado: ${processo.numeroProcesso}`);
    console.log(`   Autor: ${processo.autor}`);
    console.log(`   Réu: ${processo.reu}`);

    // 2. Criar nova conversa
    console.log('\n💬 Passo 2: Criar nova conversa...');
    const conversation = await caller.david.createConversation({
      title: 'Teste de Aprendizado - Tutela de Urgência',
      processId: processo.id,
    });
    console.log(`✅ Conversa criada: ID ${conversation.id}`);

    // 3. Enviar mensagem solicitando análise
    console.log('\n🤖 Passo 3: Solicitar análise jurídica...');
    const promptAnalise = `Analise criticamente o processo e documentos anexos para avaliar a viabilidade do pedido de tutela de urgência, com base no Art. 300 do CPC. Considere:

1. PROBABILIDADE DO DIREITO (Fumus Boni Iuris): Avalie se há elementos que demonstrem a probabilidade do direito alegado.
2. PERIGO DE DANO OU RISCO AO RESULTADO ÚTIL DO PROCESSO (Periculum in Mora): Verifique se há urgência que justifique a antecipação da tutela.
3. REVERSIBILIDADE DOS EFEITOS: Analise se a medida é reversível.

Forneça uma análise estruturada com fundamentação legal e recomendação final.`;

    const analiseMsg = await caller.david.sendMessage({
      conversationId: conversation.id,
      content: promptAnalise,
    });
    console.log(`✅ Análise solicitada (mensagem ${analiseMsg.userMessage.id})`);
    console.log(`   Aguardando resposta do DAVID...`);
    
    // Aguardar resposta (simular delay)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Solicitar minuta da decisão
    console.log('\n📝 Passo 4: Solicitar minuta da decisão...');
    const promptMinuta = `Com base na análise anterior, elabore a minuta da decisão de tutela de urgência, seguindo a estrutura formal de uma decisão judicial do JEC.`;

    const minutaMsg = await caller.david.sendMessage({
      conversationId: conversation.id,
      content: promptMinuta,
    });
    console.log(`✅ Minuta solicitada (mensagem ${minutaMsg.userMessage.id})`);
    
    // Aguardar resposta
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5. Buscar mensagens da conversa para pegar a minuta gerada
    console.log('\n📥 Passo 5: Buscar mensagens da conversa...');
    const messages = await caller.david.getMessages({ conversationId: conversation.id });
    const minutaResponse = messages.find(m => 
      m.role === 'assistant' && 
      m.content.toLowerCase().includes('decisão') &&
      m.content.length > 500
    );

    if (!minutaResponse) {
      console.log('⚠️  Minuta não encontrada nas mensagens. Mensagens disponíveis:');
      messages.forEach((m, i) => {
        console.log(`   ${i + 1}. [${m.role}] ${m.content.substring(0, 100)}...`);
      });
      throw new Error('Minuta não gerada');
    }

    console.log(`✅ Minuta encontrada (${minutaResponse.content.length} caracteres)`);
    console.log(`   Prévia: ${minutaResponse.content.substring(0, 200)}...`);

    // 6. Aprovar a minuta
    console.log('\n👍 Passo 6: Aprovar minuta...');
    const approval = await caller.david.approveMinuta({
      conversationId: conversation.id,
      messageId: minutaResponse.id,
      originalDraft: minutaResponse.content,
      draftType: 'decisao_interlocutoria',
    });
    console.log(`✅ Minuta aprovada! ID: ${approval.id}`);

    // 7. Aguardar extração automática de tese
    console.log('\n🧠 Passo 7: Aguardar extração automática de tese...');
    console.log('   (Processo assíncrono - pode demorar alguns segundos)');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 8. Verificar se a tese foi extraída
    console.log('\n🔍 Passo 8: Verificar tese extraída...');
    const theses = await caller.david.getLearnedTheses({ limit: 1 });
    
    if (theses.length === 0) {
      console.log('⚠️  Nenhuma tese encontrada ainda. Pode estar processando...');
    } else {
      const thesis = theses[0];
      console.log(`✅ Tese extraída com sucesso!`);
      console.log(`   ID: ${thesis.id}`);
      console.log(`   Tese: ${thesis.thesis?.substring(0, 200)}...`);
      console.log(`   Fundamentos: ${thesis.legalFoundations?.substring(0, 100)}...`);
      console.log(`   Palavras-chave: ${thesis.keywords}`);
    }

    // 9. Testar busca de casos similares
    console.log('\n🔎 Passo 9: Testar busca de casos similares...');
    const similarCases = await caller.david.getSimilarCases({
      processSubject: 'Ação de Obrigação de Fazer - Baixa de Gravame',
      limit: 5,
    });
    
    console.log(`✅ Encontrados ${similarCases.length} casos similares`);
    similarCases.forEach((c, i) => {
      console.log(`   ${i + 1}. Processo ${c.processNumber || 'N/A'}`);
      console.log(`      Tese: ${c.thesis?.substring(0, 100)}...`);
    });

    // 10. Verificar minutas aprovadas
    console.log('\n📚 Passo 10: Listar minutas aprovadas...');
    const approvedDrafts = await caller.david.getApprovedDrafts({ limit: 5 });
    console.log(`✅ Total de minutas aprovadas: ${approvedDrafts.length}`);
    approvedDrafts.forEach((draft, i) => {
      console.log(`   ${i + 1}. ${draft.draftType} - ${new Date(draft.createdAt).toLocaleString('pt-BR')}`);
      console.log(`      Processo: ${draft.processNumber || 'N/A'}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ TESTE COMPLETO FINALIZADO COM SUCESSO!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testFullFlow();
