import { extractTextFromPdfBuffer } from './server/_core/pdfExtractor.ts';
import fs from 'fs';
import path from 'path';

// Criar um PDF mínimo válido manualmente (header + body básico) ou usar um mock se necessário.
// Como criar PDF binário do zero é complexo, vamos testar se a função carrega e falha graciosamente com um buffer inválido, 
// ou (melhor) assumir que a lib funciona se o import funcionar, já que não tenho um arquivo PDF de exemplo à mão.
// Vou tentar criar um PDF "Hello World" mínimo em base64.

const minimalPdfBase64 =
    "JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXwKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSCisgICAgPj4KICA+PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iagoKNSAwIG9iago8PAogIC9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCjcwIDUwIFRECi9GMSAxMiBUZgooSGVsbG8sIHdvcmxkISkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZjAKWHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNjAgMDAwMDAgbiAKMDAwMDAwMDE1NyAwMDAwMCBuIAowMDAwMDAwMzA2IDAwMDAwIG4gCjAwMDAwMDAzODAgMDAwMDAgbiAKdHJhaWxlcgo8PAogIC9TaXplIDYKICAvUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNDc0CiUlRU9GCg==";

async function runTest() {
    try {
        console.log("Iniciando teste de extração de PDF...");
        const buffer = Buffer.from(minimalPdfBase64, 'base64');

        // Como estamos rodando com tsx, podemos importar o arquivo .ts diretamente
        // Mas o arquivo usa pdfjs-dist que pode ter issues em runtime puro se não configurar o worker
        // Vamos ver se o 'legacy' build funciona como esperado.

        const text = await extractTextFromPdfBuffer(buffer);
        console.log("Texto extraído:", text);

        if (text.includes("Hello, world!")) {
            console.log("✅ SUCESSO: Texto extraído corretamente!");
        } else {
            console.log("❌ FALHA: Texto experado não encontrado.");
            console.log("Retorno:", text);
        }
    } catch (error) {
        console.error("❌ ERRO NO TESTE:", error);
    }
}

runTest();
