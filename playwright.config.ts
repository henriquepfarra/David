import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Compatibilidade com ES modules (sem __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Playwright Configuration for David Frontend E2E Tests
 * 
 * AUTENTICAÇÃO:
 * 1. Rode: npx playwright test --project=setup --headed
 * 2. Faça login no browser que abrir
 * 3. Testes subsequentes usarão a sessão salva
 */

// Caminho para o arquivo de autenticação salvo
const authFile = join(__dirname, 'playwright/.auth/user.json');

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',

    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },

    projects: [
        // Setup project que faz login e salva estado
        {
            name: 'setup',
            testMatch: /.*\.setup\.ts/,
        },
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                // Usar estado de autenticação salvo
                storageState: authFile,
            },
            dependencies: ['setup'],
        },
    ],

    /* Run local dev server before starting tests */
    webServer: {
        command: 'pnpm dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
    },
});
