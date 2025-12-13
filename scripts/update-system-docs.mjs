import { drizzle } from 'drizzle-orm/mysql2';
import { eq, or } from 'drizzle-orm';
import { knowledgeBase } from '../drizzle/schema.ts';

const db = drizzle(process.env.DATABASE_URL);

// Títulos dos documentos originais que devem ser marcados como "sistema"
const systemDocTitles = [
  'Enunciados FONAJE - Fórum Nacional de Juizados Especiais',
  'Enunciados FOJESP - Fórum Permanente de Juízes Coordenadores dos Juizados Especiais Cíveis e Criminais do Estado de São Paulo',
  'Decisões Relevantes 2025 - TJSP',
  'Minutas Modelo - Referências Antigas',
  'Teses e Diretrizes - DAVID'
];

async function updateSystemDocs() {
  console.log('🔍 Buscando documentos para atualizar...');
  
  // Buscar documentos com os títulos especificados
  const docs = await db.select()
    .from(knowledgeBase)
    .where(
      or(
        ...systemDocTitles.map(title => eq(knowledgeBase.title, title))
      )
    );
  
  console.log(`📄 Encontrados ${docs.length} documentos:`);
  docs.forEach(doc => {
    console.log(`  - ${doc.title} (source: ${doc.source})`);
  });
  
  // Atualizar para source = "sistema"
  for (const title of systemDocTitles) {
    const result = await db.update(knowledgeBase)
      .set({ source: 'sistema' })
      .where(eq(knowledgeBase.title, title));
    
    console.log(`✅ Atualizado: ${title}`);
  }
  
  console.log('\n🎉 Atualização concluída!');
  process.exit(0);
}

updateSystemDocs().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
