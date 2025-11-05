# Opções de Deployment e Execução

## 1. Visão Geral

Com a arquitetura de frontend + backend, existem várias formas de rodar e gerenciar os dois processos. Este documento apresenta as opções disponíveis.

---

## 2. Opção 1: Dois Terminais Separados (Mais Simples)

### Vantagens
- ✅ Configuração simples
- ✅ Logs separados e fáceis de ler
- ✅ Facilita debug individual
- ✅ Reiniciar processos independentemente

### Desvantagens
- ❌ Precisa gerenciar dois terminais
- ❌ Mais trabalhoso para iniciar/parar

### Como Usar

**Terminal 1 - Backend:**
```bash
cd /home/emanuel/camera/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd /home/emanuel/camera
npm run dev
```

**URLs:**
- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:8000`

---

## 3. Opção 2: Scripts Combinados com `concurrently` (Recomendado)

### Vantagens
- ✅ Um único comando para rodar tudo
- ✅ Logs coloridos identificando cada processo
- ✅ Mata ambos os processos ao sair (Ctrl+C)
- ✅ Profissional e eficiente

### Desvantagens
- ❌ Logs misturados (mas com cores diferentes)
- ❌ Necessita instalar dependência extra

### Instalação

**No diretório raiz do projeto:**
```bash
cd /home/emanuel/camera
npm install --save-dev concurrently
```

### Configuração do package.json

**Editar `/home/emanuel/camera/package.json`:**

```json
{
  "name": "camera",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "dev:backend": "cd backend && npm run dev",
    "dev:all": "concurrently --names \"FRONT,BACK\" --prefix-colors \"cyan,magenta\" \"npm run dev\" \"npm run dev:backend\"",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "install:all": "npm install && cd backend && npm install"
  },
  "dependencies": {
    // ... (suas dependências atuais)
  },
  "devDependencies": {
    "concurrently": "^8.2.0",
    // ... (suas dev dependencies atuais)
  }
}
```

### Como Usar

**Instalação inicial (apenas uma vez):**
```bash
cd /home/emanuel/camera
npm run install:all
```

**Rodar frontend + backend:**
```bash
cd /home/emanuel/camera
npm run dev:all
```

**Saída esperada:**
```
[FRONT] VITE v5.0.0  ready in 500 ms
[FRONT] ➜  Local:   http://localhost:8080/
[BACK]  🚀 Servidor iniciado com sucesso!
[BACK]  📍 URL: http://localhost:8000
```

**Para parar:**
- Pressione `Ctrl+C` (mata ambos os processos)

---

## 4. Opção 3: Docker Compose (Produção)

### Vantagens
- ✅ Ambiente isolado e reproduzível
- ✅ Fácil deployment em servidores
- ✅ Inclui banco de dados no stack
- ✅ Escalável

### Desvantagens
- ❌ Requer Docker instalado
- ❌ Mais complexo de configurar
- ❌ Overhead de recursos

### Arquivos Necessários

**1. Backend Dockerfile** (`backend/Dockerfile`)

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copia package files
COPY package*.json ./

# Instala dependências
RUN npm install --production

# Copia código fonte
COPY . .

# Cria diretório de uploads
RUN mkdir -p uploads/fotos

# Expõe porta
EXPOSE 8000

# Comando de inicialização
CMD ["npm", "start"]
```

**2. Frontend Dockerfile** (`Dockerfile`)

```dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Servidor de produção
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**3. Nginx Config** (`nginx.conf`)

```nginx
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy para API
    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**4. Docker Compose** (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: camera-backend
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - FIREBIRD_HOST=firebird
      - FIREBIRD_PORT=3050
      - FIREBIRD_DATABASE=/firebird/data/database.fdb
      - FIREBIRD_USER=SYSDBA
      - FIREBIRD_PASSWORD=masterkey
    volumes:
      - ./backend/uploads:/app/uploads
      - ./backend/logs:/app/logs
    depends_on:
      - firebird
    networks:
      - camera-network

  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: camera-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - camera-network

  firebird:
    image: jacobalberty/firebird:3.0
    container_name: camera-firebird
    environment:
      - FIREBIRD_USER=SYSDBA
      - FIREBIRD_PASSWORD=masterkey
      - ISC_PASSWORD=masterkey
    volumes:
      - firebird-data:/firebird/data
      - ./backend/scripts:/firebird/scripts
    ports:
      - "3050:3050"
    networks:
      - camera-network

volumes:
  firebird-data:

networks:
  camera-network:
    driver: bridge
```

### Como Usar Docker

```bash
# Build e start de todos os containers
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar containers
docker-compose down

# Rebuild após mudanças
docker-compose up -d --build
```

---

## 5. Opção 4: PM2 (Produção em Servidor Linux)

### Vantagens
- ✅ Gerenciamento robusto de processos
- ✅ Auto-restart em caso de crash
- ✅ Logs centralizados
- ✅ Monitoramento de recursos

### Desvantagens
- ❌ Requer PM2 instalado globalmente
- ❌ Mais complexo que concurrently

### Instalação

```bash
# Instalar PM2 globalmente
npm install -g pm2
```

### Configuração

**Arquivo `ecosystem.config.js` (raiz do projeto):**

```javascript
module.exports = {
  apps: [
    {
      name: 'camera-backend',
      cwd: './backend',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 8000,
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
    },
    {
      name: 'camera-frontend',
      cwd: './',
      script: 'npx',
      args: 'vite preview --port 8080',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
    },
  ],
};
```

### Como Usar PM2

```bash
# Criar diretório de logs
mkdir -p logs backend/logs

# Iniciar ambos os processos
pm2 start ecosystem.config.js

# Ver status
pm2 status

# Ver logs
pm2 logs

# Reiniciar
pm2 restart all

# Parar
pm2 stop all

# Deletar processos
pm2 delete all

# Salvar configuração para auto-start
pm2 save
pm2 startup
```

---

## 6. Comparação das Opções

| Característica | Dois Terminais | Concurrently | Docker | PM2 |
|----------------|----------------|--------------|--------|-----|
| **Facilidade** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **Desenvolvimento** | ✅ Ótimo | ✅ Ótimo | ❌ Pesado | ⚠️ OK |
| **Produção** | ❌ Não recomendado | ❌ Não recomendado | ✅ Excelente | ✅ Excelente |
| **Auto-restart** | ❌ | ❌ | ✅ | ✅ |
| **Isolamento** | ❌ | ❌ | ✅ | ❌ |
| **Recursos** | Leve | Leve | Pesado | Médio |
| **Logs** | Separados | Misturados | Centralizados | Centralizados |

---

## 7. Recomendações por Ambiente

### Desenvolvimento Local
**👉 Opção 2: concurrently**
- Melhor equilíbrio entre facilidade e funcionalidade
- Um comando para rodar tudo
- Logs coloridos facilitam debug

**Alternativa:** Opção 1 (Dois Terminais)
- Se preferir logs completamente separados
- Útil para debug profundo

### Produção em Servidor Dedicado
**👉 Opção 4: PM2**
- Gerenciamento robusto de processos
- Auto-restart em crashes
- Logs centralizados
- Fácil de configurar

### Produção em Cloud/Containers
**👉 Opção 3: Docker Compose**
- Ambiente isolado e reproduzível
- Fácil de escalar
- Integração com CI/CD

---

## 8. Estrutura Final do Projeto (Com Concurrently)

```
/home/emanuel/camera/
├── backend/
│   ├── src/
│   ├── uploads/
│   ├── logs/
│   ├── server.js
│   ├── package.json
│   └── .env
├── src/
├── public/
├── package.json          # Com scripts concurrently
├── vite.config.ts
├── .env
└── README.md
```

**package.json raiz:**
```json
{
  "scripts": {
    "dev": "vite",
    "dev:backend": "cd backend && npm run dev",
    "dev:all": "concurrently --names \"FRONT,BACK\" --prefix-colors \"cyan,magenta\" \"npm run dev\" \"npm run dev:backend\"",
    "install:all": "npm install && cd backend && npm install",
    "build": "tsc -b && vite build",
    "build:backend": "cd backend && npm install --production"
  }
}
```

---

## 9. Comandos Úteis

### Com Concurrently (Recomendado para Dev)

```bash
# Primeira vez - instalar dependências
npm run install:all

# Rodar frontend + backend
npm run dev:all

# Build para produção
npm run build
cd backend && npm run build
```

### Com PM2 (Recomendado para Produção)

```bash
# Build frontend
npm run build

# Iniciar processos
pm2 start ecosystem.config.js

# Monitorar
pm2 monit

# Ver logs em tempo real
pm2 logs --lines 100

# Reiniciar após mudanças
pm2 restart all
```

---

## 10. Troubleshooting

### Porta já em uso

**Problema:** `Error: listen EADDRINUSE: address already in use :::8000`

**Solução:**
```bash
# Encontrar processo usando a porta
lsof -i :8000

# Matar processo
kill -9 <PID>

# Ou mudar a porta no .env
```

### Concurrently não funcionando

**Problema:** `concurrently: command not found`

**Solução:**
```bash
# Instalar como dev dependency
npm install --save-dev concurrently

# Ou rodar com npx
npx concurrently "npm run dev" "npm run dev:backend"
```

### Docker containers não se comunicam

**Problema:** Frontend não consegue acessar backend

**Solução:**
- Verificar se ambos estão na mesma network
- Usar nome do serviço (ex: `http://backend:8000`) ao invés de localhost
- Configurar proxy no nginx.conf

---

**Documento criado em:** 04/11/2025
**Versão:** 1.0
