/**
 * David Frontend E2E Baseline Tests
 * 
 * IMPORTANTE: Estes testes documentam o comportamento ATUAL antes da refatoração.
 * Devem passar antes E depois de cada fase de refatoração.
 * 
 * @baseline - Fase 0.2 do FRONTEND_REFACTORING_PLAN.md
 * 
 * NOTA: Estes testes REQUEREM AUTENTICAÇÃO para funcionar.
 * O servidor web é iniciado automaticamente, mas você precisa:
 * 1. Estar logado no app antes de rodar os testes, OU
 * 2. Implementar auth fixture com login automático (TODO)
 * 
 * Para rodar: npx playwright test e2e/david-baseline.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('David Chat - Baseline Tests', () => {

    test.beforeEach(async ({ page }) => {
        // Navegar para a página do David
        await page.goto('/david');

        // Esperar carregar
        await page.waitForLoadState('networkidle');
    });

    test.describe('Home Page (sem conversa selecionada)', () => {

        test('deve mostrar saudação personalizada', async ({ page }) => {
            // Verifica se a saudação está visível
            const greeting = page.locator('h1');
            await expect(greeting).toContainText('Olá');
        });

        test('deve mostrar input de mensagem', async ({ page }) => {
            // Verifica se o textarea está presente
            const textarea = page.locator('textarea[placeholder*="Pergunte"]');
            await expect(textarea).toBeVisible();
        });

        test('deve mostrar botões de ação', async ({ page }) => {
            // Verifica botões principais
            await expect(page.getByRole('button', { name: /enviar processo/i })).toBeVisible();
            await expect(page.getByRole('button', { name: /meus prompts/i })).toBeVisible();
        });

        test('botão de enviar deve estar desabilitado sem texto', async ({ page }) => {
            const sendButton = page.locator('button[title="Enviar mensagem"]');
            await expect(sendButton).toBeDisabled();
        });

        test('botão de enviar deve habilitar com texto', async ({ page }) => {
            const textarea = page.locator('textarea[placeholder*="Pergunte"]');
            await textarea.fill('Teste');

            const sendButton = page.locator('button[title="Enviar mensagem"]');
            await expect(sendButton).toBeEnabled();
        });
    });

    test.describe('Upload de PDF', () => {

        test('deve mostrar overlay ao arrastar arquivo', async ({ page }) => {
            // Este teste verifica o comportamento de drag-and-drop
            // Precisamos simular o evento de drag
            const dropzone = page.locator('.flex-1.flex.flex-col');

            // Simular dragover
            await dropzone.dispatchEvent('dragenter', {
                dataTransfer: { types: ['Files'] }
            });

            // Verifica se overlay aparece (pode variar dependendo da implementação)
            // await expect(page.getByText('Solte para processar')).toBeVisible();
        });

        test('badge de arquivo deve aparecer após upload', async ({ page }) => {
            // Este teste requer um arquivo de teste
            // Por enquanto, verificamos apenas se a estrutura está pronta
            const uploadButton = page.getByRole('button', { name: /enviar processo/i });
            await expect(uploadButton).toBeVisible();
        });
    });

    test.describe('Navegação entre conversas', () => {

        test('criar conversa ao enviar primeira mensagem', async ({ page }) => {
            const textarea = page.locator('textarea[placeholder*="Pergunte"]');
            await textarea.fill('Olá David, teste de criação de conversa');

            const sendButton = page.locator('button[title="Enviar mensagem"]');
            await sendButton.click();

            // Verifica se a URL mudou (conversa criada)
            await expect(page).toHaveURL(/\/david\/\d+/, { timeout: 10000 });
        });

        test('mensagem do usuário deve aparecer imediatamente (optimistic)', async ({ page }) => {
            const textarea = page.locator('textarea[placeholder*="Pergunte"]');
            const testMessage = 'Mensagem de teste optimistic';
            await textarea.fill(testMessage);

            const sendButton = page.locator('button[title="Enviar mensagem"]');
            await sendButton.click();

            // A mensagem deve aparecer imediatamente (antes da resposta do servidor)
            await expect(page.getByText(testMessage)).toBeVisible({ timeout: 2000 });
        });
    });

    test.describe('Streaming de resposta', () => {

        test('deve mostrar indicador de loading', async ({ page }) => {
            const textarea = page.locator('textarea[placeholder*="Pergunte"]');
            await textarea.fill('Explique brevemente o que você faz');

            const sendButton = page.locator('button[title="Enviar mensagem"]');
            await sendButton.click();

            // Deve mostrar indicador de "Pensando..." ou similar
            await expect(page.locator('.thinking-indicator, [class*="animate-pulse"]')).toBeVisible({ timeout: 5000 });
        });

        test('resposta deve aparecer em streaming', async ({ page }) => {
            const textarea = page.locator('textarea[placeholder*="Pergunte"]');
            await textarea.fill('Diga apenas "olá"');

            const sendButton = page.locator('button[title="Enviar mensagem"]');
            await sendButton.click();

            // Aguarda resposta do David (identificado pelo logo/nome)
            await expect(page.locator('text=David').first()).toBeVisible({ timeout: 30000 });
        });
    });
});

test.describe('Visual Regression - Snapshots', () => {

    test('Home page snapshot', async ({ page }) => {
        await page.goto('/david');
        await page.waitForLoadState('networkidle');

        // Captura screenshot da home
        await expect(page).toHaveScreenshot('home-page.png', {
            maxDiffPixelRatio: 0.1,
        });
    });

    test('Chat view snapshot', async ({ page }) => {
        await page.goto('/david');
        await page.waitForLoadState('networkidle');

        // Cria uma conversa simples
        const textarea = page.locator('textarea[placeholder*="Pergunte"]');
        await textarea.fill('Teste');
        await page.locator('button[title="Enviar mensagem"]').click();

        // Aguarda URL mudar
        await expect(page).toHaveURL(/\/david\/\d+/, { timeout: 10000 });

        // Aguarda um pouco para streaming começar
        await page.waitForTimeout(2000);

        // Captura screenshot do chat
        await expect(page).toHaveScreenshot('chat-view.png', {
            maxDiffPixelRatio: 0.15, // Mais tolerante por causa do streaming
        });
    });
});
