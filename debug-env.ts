import "dotenv/config";

const url = process.env.DATABASE_URL || "";
try {
    // Tenta fazer parse manual simples
    const parts = url.split("://")[1].split("@")[0].split(":");
    const user = parts[0];
    const password = parts[1];

    console.log(`Usuário: ${user}`);
    console.log(`Senha tamanho: ${password ? password.length : 0}`);
    console.log(`Senha é vazia? ${password === "" ? "SIM" : "NÃO"}`);
} catch (e: any) {
    console.log("Erro ao parsear URL:", e.message);
    console.log("URL bruta:", url);
}
