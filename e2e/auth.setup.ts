/**
 * Auth Setup - Salva estado de autenticação para testes subsequentes
 * 
 * Se já existe auth file salvo (< 24h), pula a etapa de login.
 */

import { test as setup } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, statSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const authFile = join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
    // Se auth file já existe e é recente, pular setup
    if (existsSync(authFile)) {
        try {
            const stats = statSync(authFile);
            const fileAge = Date.now() - stats.mtimeMs;
            const maxAge = 24 * 60 * 60 * 1000; // 24 horas

            if (fileAge < maxAge && stats.size > 100) {
                console.log('✅ Usando autenticação salva anteriormente (< 24h)\n');
                console.log(`📁 Arquivo: ${authFile}\n`);
                return; // Pula o setup - não precisa fazer nada
            }
        } catch (e) {
            console.log('⚠️ Erro ao ler auth file, refazendo login...\n');
        }
    }

    // Navegar para a página do David
    await page.goto('/david');
    await page.waitForLoadState('networkidle');

    // Verificar se já está logado
    const isLoggedIn = await page.locator('text=Olá').isVisible({ timeout: 5000 }).catch(() => false);

    if (isLoggedIn) {
        console.log('✅ Já está logado! Salvando estado...\n');
    } else {
        console.log('\n🔐 FAÇA LOGIN NO BROWSER');
        console.log('   Execute com --headed para ver o browser\n');

        // Esperar login (ou falhar se em CI)
        if (process.env.CI) {
            throw new Error('Auth file não encontrado. Execute "npx playwright test --project=setup --headed" primeiro.');
        }

        await page.locator('text=Olá').waitFor({ timeout: 120000 });
        console.log('✅ Login detectado!\n');
    }

    await page.context().storageState({ path: authFile });
    console.log(`📁 Salvo em: ${authFile}\n`);
});
