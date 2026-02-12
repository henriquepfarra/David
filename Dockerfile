# Dockerfile customizado para Railway
# Evita problemas com Nixpacks gerando ENV blank

FROM node:22-slim

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Instalar pnpm via corepack
RUN npm install -g corepack@latest && corepack enable

WORKDIR /app

# Copiar arquivos de dependência primeiro (cache do Docker)
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches/

# Instalar dependências
RUN pnpm install --frozen-lockfile

# Copiar resto do código
COPY . .

# Build args
ARG VITE_APP_TITLE
ARG VITE_APP_LOGO
ARG VITE_ANALYTICS_ENDPOINT
ARG VITE_ANALYTICS_WEBSITE_ID

# Build da aplicação
RUN pnpm run build

# Expor porta
EXPOSE 3001

# Comando de start
CMD ["pnpm", "run", "start"]
