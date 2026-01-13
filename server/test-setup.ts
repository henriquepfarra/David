import { config } from 'dotenv';
import path from 'path';

// Força o carregamento do .env que está na raiz do projeto
config({ path: path.resolve(__dirname, '../.env') });

console.log('✅ [Setup] Variáveis de ambiente carregadas para os testes.');