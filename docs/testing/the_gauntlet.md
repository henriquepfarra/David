# The Gauntlet - Test Suite para Orquestração

## Categoria 1: Perguntas Conceituais (CONCEPTUAL)
**Esperado:** Intent: CONCEPTUAL, Motors: [], RAG: OFF

1. "o que é direito processual?"
2. "explique o princípio do contraditório"
3. "qual a diferença entre sentença e acórdão?"

---

## Categoria 2: Busca Pura em KB (JURISPRUDENCE)
**Esperado:** Intent: JURISPRUDENCE, Motors: C, RAG: STF_STJ

4. "súmula 7 do STJ"
5. "existe súmula vinculante sobre prova ilícita?"
6. "súmulas STJ sobre citação por whatsapp"

---

## Categoria 3: Análise de Processo (DRAFT com Motor A ativo)
**Esperado:** Intent: DRAFT, Motors: A+C, RAG: ON
**Requer:** Processo vinculado

7. "analise a inicial e me dê um parecer"
8. "faça um resumo dos fatos"
9. "identifique os pedidos principais"

---

## Categoria 4: Edge Cases Ambíguos

10. "o que você acha da súmula 7?" 
    - **Desafio:** Parece conceitual mas menciona súmula específica
    - **Esperado:** JURISPRUDENCE (tem número específico)

11. "preciso de ajuda com meu processo"
    - **Desafio:** Vago, pode ser CONCEPTUAL ou PROCESS_ANALYSIS
    - **Esperado:** CONCEPTUAL (sem processo vinculado) ou PROCESS_ANALYSIS (com processo)

12. "redija uma contestação sobre prescrição"
    - **Desafio:** DRAFT mas sem processo? Pode ser CONCEPTUAL
    - **Esperado:** CONCEPTUAL (teoria) ou DRAFT se tiver processo

---

## Categoria 5: Perguntas Compostas (Multi-Intent)

13. "o que diz a súmula 7 do STJ e como aplicar no meu caso?"
    - **Desafio:** JURISPRUDENCE + DRAFT
    - **Esperado:** JURISPRUDENCE (prioritário)

14. "explique o contraditório e me mostre súmulas sobre isso"
    - **Desafio:** CONCEPTUAL + JURISPRUDENCE
    - **Esperado:** JURISPRUDENCE (tem pedido explícito de súmulas)

---

## Categoria 6: Filtros Específicos (RAG Filter)

15. "súmula STF sobre prisão"
    - **Esperado:** ragFilter: STF

16. "súmula STJ 429"
    - **Esperado:** ragFilter: STJ

17. "existe súmula vinculante 11?"
    - **Esperado:** ragFilter: STF (vinculantes são do STF)

---

## Categoria 7: Perguntas Informais/Casuais

18. "oi, tudo bem?"
    - **Esperado:** CASUAL

19. "obrigado!"
    - **Esperado:** CASUAL

20. "pode repetir a última resposta?"
    - **Esperado:** REFINEMENT

---

## Critérios de Sucesso

✅ **PASSOU** se:
- 18+ perguntas classificadas corretamente (90% accuracy)
- Motors ativados conforme esperado
- RAG filtros aplicados corretamente
- Sem crashes ou timeouts

⚠️ **ATENÇÃO** se:
- 15-17 corretas (75-89% accuracy)
- Alguns filtros incorretos mas intent ok

❌ **FALHOU** se:
- <15 corretas (<75% accuracy)
- Crashes frequentes
- Filtros completamente errados
