# 🔧 Issue: PromptsModal - Melhorias de Acessibilidade e Código

**Criada em**: 17/01/2026
**Origem**: Code review do PR de extração do PromptsModal
**Prioridade**: Baixa

---

## Descrição
Melhorias de acessibilidade e código identificadas no code review.

## Tarefas

### Acessibilidade
- [ ] Adicionar `aria-label` nos botões de ícone do PromptsModal:
  - Linha 235: Botão voltar (ArrowLeft)
  - Linha 239: Botão fechar (X)
  - Linha 300, 304: Botões na view de visualização
  - Outros botões de ícone similares

### Código
- [ ] Substituir inline styles por classes Tailwind:
  - `style={{ height: '55vh' }}` → `className="h-[55vh] max-h-[55vh]"`
  - Linhas afetadas: 233, 298, 339

### Arquitetura (futuro)
- [ ] Considerar agrupar props do PromptsModal em objetos para reduzir verbosidade

## Arquivos Afetados
- `client/src/components/prompts/PromptsModal.tsx`

## Labels
`enhancement`, `accessibility`, `refactoring`
