# 🚀 Quickstart - Integração Firebird

## TL;DR (Too Long; Didn't Read)

Este guia rápido resume os passos essenciais para implementar a integração Firebird. Para detalhes completos, consulte os documentos individuais.

---

## 📋 O que você vai fazer

Migrar o sistema de inspeções de **localStorage** → **Firebird + Backend Node.js**

**Resultado:**
- Backend REST API servindo dados do Firebird
- Frontend React consumindo API ao invés de localStorage
- Fotos armazenadas no servidor
- Dados persistentes e compartilháveis

---

## ⚡ Passos Rápidos

### 1️⃣ Preparação (30 min)

```bash
# Verificar Node.js
node --version  # Deve ser >= 18

# Verificar Firebird
# Anote: host, porta, caminho do database, usuário, senha

# Fazer backup do banco (se houver dados)
```

---

### 2️⃣ Backend - Setup Inicial (1h)

```bash
cd /home/emanuel/camera

# Criar estrutura
mkdir -p backend/src/{config,controllers,services,routes,middlewares,utils}
mkdir -p backend/uploads/fotos
mkdir -p backend/logs

# Inicializar
cd backend
npm init -y

# Instalar dependências
npm install express node-firebird cors dotenv morgan multer
npm install --save-dev nodemon
```

**Criar `.env`:**
```env
NODE_ENV=development
PORT=8000
FIREBIRD_HOST=localhost
FIREBIRD_PORT=3050
FIREBIRD_DATABASE=/caminho/para/seu/database.fdb
FIREBIRD_USER=SYSDBA
FIREBIRD_PASSWORD=masterkey
CORS_ORIGIN=http://localhost:8080
```

---

### 3️⃣ Backend - Arquivos Principais (3-4h)

**Copiar da documentação:**
1. `src/config/database.js` - [02-backend-setup.md](./02-backend-setup.md#41-arquivo-srcconfigdatabasejs)
2. `src/services/*.js` - [02-backend-setup.md](./02-backend-setup.md#5-serviços-business-logic)
3. `src/controllers/*.js` - [02-backend-setup-parte2.md](./02-backend-setup-parte2.md#6-controllers)
4. `src/routes/*.js` - [02-backend-setup-parte2.md](./02-backend-setup-parte2.md#7-routes)
5. `src/middlewares/*.js` - [02-backend-setup-parte2.md](./02-backend-setup-parte2.md#8-middlewares)
6. `server.js` - [02-backend-setup-parte2.md](./02-backend-setup-parte2.md#9-server-entry-point)

**Atualizar `package.json`:**
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

---

### 4️⃣ Backend - Criar Tabela Manual Firebird (30 min)

**Executar SQL** (usando isql, FlameRobin ou outro cliente):

```sql
-- Script em 02-backend-setup-parte2.md seção 12.1
-- Pré-requisitos: TBOP e TBPRODUTOS já existem no banco.
-- Não usar a tabela TBINSPECAO existente; ela é reservada ao SICFAR.
CREATE TABLE TBINSPECAO_MANUAL (...);
-- Generators, triggers, índices...
```

---

### 5️⃣ Backend - Testar (30 min)

```bash
cd /home/emanuel/camera/backend

# Iniciar servidor
npm run dev

# Em outro terminal, testar:
curl http://localhost:8000/api/health
# Deve retornar: {"status":"OK",...}
```

**Testar com Postman:**
- GET `http://localhost:8000/api/produtos/:op`
- POST `http://localhost:8000/api/inspecoes` (ver corpo em [04-api-endpoints.md](./04-api-endpoints.md))

---

### 6️⃣ Frontend - Setup (1h)

```bash
cd /home/emanuel/camera

# Instalar axios
npm install axios

# Atualizar .env
echo "VITE_API_URL=http://localhost:8000/api" >> .env
```

**Criar arquivos:**
1. `src/lib/api-client.ts` - [03-frontend-integration.md](./03-frontend-integration.md#31-arquivo-srclibapi-clientts)
2. `src/services/apiService.ts` - [03-frontend-integration.md](./03-frontend-integration.md#41-arquivo-srcservicesapiservicets)
3. `src/hooks/useInspections.ts` - [03-frontend-integration.md](./03-frontend-integration.md#51-arquivo-srchooksuseinspectionsts)
4. `src/hooks/useProducts.ts` - [03-frontend-integration.md](./03-frontend-integration.md#52-arquivo-srchooksuseproductsts)

---

### 7️⃣ Frontend - Adaptar Componentes (2h)

**HomePage.tsx:**
- Adicionar campo de busca de OP
- Usar hook `useProductByOP()`
- Usar hook `useCreateInspection()`
- Adicionar loading states

**ConsultaPage.tsx:**
- Usar hook `useInspections()`
- Usar hook `useDeleteInspection()`
- Adicionar loading states

Ver alterações detalhadas em [03-frontend-integration.md](./03-frontend-integration.md#6-adaptação-dos-componentes)

---

### 8️⃣ Rodar Ambos (Opção 1: Simples)

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

Acessar: `http://localhost:8080`

---

### 8️⃣ Rodar Ambos (Opção 2: concurrently - Recomendado)

```bash
cd /home/emanuel/camera

# Instalar concurrently
npm install --save-dev concurrently

# Adicionar ao package.json:
# "dev:backend": "cd backend && npm run dev",
# "dev:all": "concurrently --names \"FRONT,BACK\" --prefix-colors \"cyan,magenta\" \"npm run dev\" \"npm run dev:backend\""

# Rodar tudo de uma vez:
npm run dev:all
```

Ver detalhes em [05-deployment-options.md](./05-deployment-options.md#3-opção-2-scripts-combinados-com-concurrently-recomendado)

---

## ✅ Checklist Rápido

### Backend
- [ ] Node.js >= 18 instalado
- [ ] Firebird rodando e acessível
- [ ] `TBINSPECAO_MANUAL` criada no banco
- [ ] `TBOP` e `TBPRODUTOS` existentes e acessíveis
- [ ] Dependências instaladas (`npm install`)
- [ ] `.env` configurado
- [ ] `server.js` implementado
- [ ] Serviços, controllers, routes criados
- [ ] Servidor inicia sem erros
- [ ] Health check retorna 200 OK
- [ ] Endpoint de produtos funciona
- [ ] Endpoint de inspeções funciona

### Frontend
- [ ] axios instalado
- [ ] `VITE_API_URL` configurado no `.env`
- [ ] `api-client.ts` criado
- [ ] `apiService.ts` criado
- [ ] Hooks criados (`useInspections`, `useProducts`)
- [ ] `HomePage.tsx` adaptado
- [ ] `ConsultaPage.tsx` adaptado
- [ ] Frontend conecta com backend
- [ ] Busca de produto funciona
- [ ] Criação de inspeção funciona
- [ ] Listagem funciona
- [ ] Exclusão funciona

---

## 🔥 Comandos Mais Usados

```bash
# Backend
cd /home/emanuel/camera/backend
npm run dev                    # Inicia servidor em dev
npm start                      # Inicia servidor em prod

# Frontend
cd /home/emanuel/camera
npm run dev                    # Inicia Vite
npm run build                  # Build para produção

# Ambos (com concurrently)
cd /home/emanuel/camera
npm run dev:all                # Inicia frontend + backend

# Testar API
curl http://localhost:8000/api/health
curl http://localhost:8000/api/produtos/12345

# Verificar processos rodando
lsof -i :8000                  # Backend
lsof -i :8080                  # Frontend
```

---

## 🆘 Problemas Comuns

| Problema | Solução |
|----------|---------|
| `EADDRINUSE: port 8000 already in use` | `lsof -i :8000` → `kill -9 <PID>` |
| `Error connecting to Firebird` | Verificar credenciais no `.env` |
| `CORS error` | Verificar `CORS_ORIGIN` no backend |
| `404 on /api/produtos` | Verificar se backend está rodando |
| Foto não carrega | Verificar caminho no banco e arquivo no disco |

---

## 📖 Documentação Completa

- **Mapeamento completo:** [00-mapeamento-sistema-atual.md](./00-mapeamento-sistema-atual.md)
- **Visão geral:** [01-visao-geral.md](./01-visao-geral.md)
- **Backend:** [02-backend-setup.md](./02-backend-setup.md) + [parte 2](./02-backend-setup-parte2.md)
- **Frontend:** [03-frontend-integration.md](./03-frontend-integration.md)
- **Endpoints:** [04-api-endpoints.md](./04-api-endpoints.md)
- **Deployment:** [05-deployment-options.md](./05-deployment-options.md)
- **Roadmap:** [06-proximos-passos.md](./06-proximos-passos.md)

---

## ⏱️ Tempo Estimado

- **Backend completo:** 6-8 horas
- **Frontend adaptação:** 3-4 horas
- **Testes e ajustes:** 2-3 horas
- **Total:** 11-15 horas (se seguir este guia)

---

## 🎯 Próximo Passo

1. ✅ Revisar este quickstart
2. 📖 Ler [00-mapeamento-sistema-atual.md](./00-mapeamento-sistema-atual.md) para entender detalhes
3. 🔨 Começar implementação pelo backend
4. 🎨 Adaptar frontend
5. 🧪 Testar tudo

**Boa implementação! 🚀**
