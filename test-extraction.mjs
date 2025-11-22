import { readFileSync } from 'fs';
import { extractProcessDataFromPDF } from './server/processExtractor.js';

const pdfPath = '/home/ubuntu/upload/40064335120258260009_3572df58056841e33e6a5768b141c0f2.pdf';
const pdfBuffer = readFileSync(pdfPath);

console.log('📄 Testando extração de dados do PDF...\n');

try {
  const result = await extractProcessDataFromPDF(pdfBuffer);
  console.log('✅ Extração bem-sucedida!\n');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error('❌ Erro na extração:', error.message);
  process.exit(1);
}
