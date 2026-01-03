/// <reference types="node" />
/**
 * Script de teste da busca híbrida
 */

import "dotenv/config";
import { hybridSearch, formatForContext } from "../server/_core/knowledgeSearch.js";

async function testSearch() {
  console.log("🔍 TESTANDO BUSCA HÍBRIDA\n");
  console.log("=".repeat(60));

  // Teste 1: Busca exata por número
  console.log("\n📌 TESTE 1: Súmula 54 (busca exata)");
  console.log("-".repeat(60));
  const result1 = await hybridSearch("Súmula 54", undefined, 3);
  if (result1.length === 0) {
    console.log("Nenhum resultado encontrado");
  } else {
    for (const doc of result1) {
      console.log(`• ${doc.title}`);
      console.log(`  ${doc.content.substring(0, 200)}...`);
      console.log(`  Similaridade: ${doc.similarity?.toFixed(4) || "N/A (exata)"}`);
    }
  }

  // Teste 2: Busca exata por número
  console.log("\n\n📌 TESTE 2: Súmula 7 (busca exata)");
  console.log("-".repeat(60));
  const result2 = await hybridSearch("Súmula 7", undefined, 3);
  if (result2.length === 0) {
    console.log("Nenhum resultado encontrado");
  } else {
    for (const doc of result2) {
      console.log(`• ${doc.title}`);
      console.log(`  ${doc.content.substring(0, 200)}...`);
      console.log(`  Similaridade: ${doc.similarity?.toFixed(4) || "N/A (exata)"}`);
    }
  }

  // Teste 3: Busca semântica por conceito
  console.log("\n\n📌 TESTE 3: juros moratórios (busca semântica)");
  console.log("-".repeat(60));
  const result3 = await hybridSearch("juros moratórios dano moral", undefined, 5);
  if (result3.length === 0) {
    console.log("Nenhum resultado encontrado");
  } else {
    for (const doc of result3) {
      console.log(`• ${doc.title}`);
      console.log(`  ${doc.content.substring(0, 200)}...`);
      console.log(`  Similaridade: ${doc.similarity?.toFixed(4)}`);
    }
  }

  // Mostrar formatação para contexto
  console.log("\n\n📋 FORMATO PARA CONTEXTO DA LLM:");
  console.log("-".repeat(60));
  console.log(formatForContext(result3, 800));

  console.log("\n✅ Teste concluído!");
  process.exit(0);
}

testSearch().catch((error) => {
  console.error("❌ Erro:", error);
  process.exit(1);
});
