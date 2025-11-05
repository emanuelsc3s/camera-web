# Documentação: Integração Firebird - SysView Camera

## 📋 Índice de Documentos

Esta documentação completa cobre a migração do sistema de inspeções de câmeras do **localStorage** para **Firebird** com backend Node.js + Express.

---

## 📚 Documentos Disponíveis

### 1. [00-mapeamento-sistema-atual.md](./00-mapeamento-sistema-atual.md)
**Mapeamento do Sistema Atual - LocalStorage para Firebird**

Análise completa do sistema existente e como ele será mapeado para o Firebird:
- 📊 Estrutura de dados atual (LocalStorage)
- 🗄️ Estrutura de tabelas Firebird (TB_PRODUTOS, TB_INSPECOES)
- 🔄 Mapeamento de funções (LocalStorage → API)
- 💾 Estratégia de armazenamento de fotos
- 📝 Transformação de dados
- 🔍 Impacto em arquivos frontend

**Leia este documento primeiro para entender o mapeamento completo!**

---

### 2. [01-visao-geral.md](./01-visao-geral.md)
**Visão Geral da Integração**

Apresentação da arquitetura completa:
- 🏗️ Arquitetura atual vs. futura (diagramas)
- 🔄 Fluxos de dados principais
- 🛠️ Stack tecnológica completa
- ⏱️ Estimativa de esforço (30-44 horas)
- ⚠️ Riscos e mitigações
- 📖 Referências aos próximos documentos

---

### 3. [02-backend-setup.md](./02-backend-setup.md) + [02-backend-setup-parte2.md](./02-backend-setup-parte2.md)
**Backend Setup Completo - Node.js + Express + Firebird**

Guia completo de implementação do backend:
- 📁 Estrutura de diretórios
- ⚙️ Configuração de variáveis de ambiente (.env)
- 🔌 Configuração do pool de conexões Firebird
- 🔧 Implementação de serviços (produtos, inspeções, fotos)
- 🎮 Implementação de controllers
- 🛤️ Configuração de rotas
- 🔒 Middlewares (CORS, error handler, validators)
- 🚀 Server.js (entry point)
- 📦 package.json completo
- 🗄️ Scripts SQL para criação de tabelas
- ✅ Testes iniciais

---

### 4. [03-frontend-integration.md](./03-frontend-integration.md)
**Frontend Integration - React + API**

Adaptação do frontend React para consumir a API:
- 🌐 Cliente HTTP (axios) com interceptors
- 📡 Serviço de API (apiService.ts)
- 🪝 Hooks React Query (useInspections, useProducts)
- 🔄 Adaptação HomePage.tsx (busca de OP, criação)
- 📋 Adaptação ConsultaPage.tsx (listagem, filtros, exclusão)
- ⚙️ Atualização de variáveis de ambiente
- ✅ Checklist de migração

---

### 5. [04-api-endpoints.md](./04-api-endpoints.md)
**Documentação Completa dos Endpoints da API**

Referência detalhada de todos os endpoints:
- 🏥 Health Check
- 📦 Produtos (GET /produtos/:op, /produtos/gtin/:gtin)
- 🔍 Inspeções (POST, GET, DELETE)
- 📤 Exportação (JSON)
- 📷 Fotos (GET /fotos/:caminho)
- ⚠️ Códigos de status HTTP
- 🚨 Tratamento de erros
- 📝 Exemplos com cURL

---

### 6. [05-deployment-options.md](./05-deployment-options.md)
**Opções de Deployment e Execução**

Todas as formas de rodar o sistema:
- **Opção 1:** Dois terminais separados (simples)
- **Opção 2:** concurrently (recomendado para dev) ⭐
- **Opção 3:** Docker Compose (produção)
- **Opção 4:** PM2 (produção em servidor)
- 📊 Comparação entre opções
- 💡 Recomendações por ambiente
- 🔧 Troubleshooting

---

### 7. [06-proximos-passos.md](./06-proximos-passos.md)
**Próximos Passos e Roadmap**

Plano completo de implementação:
- 📅 Roadmap dividido em 8 fases
- ✅ Checklists detalhados
- ⏱️ Estimativas de tempo (12-18 dias)
- 🚀 Melhorias futuras (curto, médio e longo prazo)
- 📋 Checklist final de validação
- 🔗 Recursos úteis e suporte

---

## 🎯 Por Onde Começar?

### Se você é **novo no projeto:**
1. 📖 Leia [01-visao-geral.md](./01-visao-geral.md) para entender a arquitetura
2. 🔍 Leia [00-mapeamento-sistema-atual.md](./00-mapeamento-sistema-atual.md) para ver o mapeamento
3. 📋 Vá para [06-proximos-passos.md](./06-proximos-passos.md) para o plano de ação

### Se você vai **implementar o backend:**
1. 📖 Leia [02-backend-setup.md](./02-backend-setup.md) e [parte 2](./02-backend-setup-parte2.md)
2. 🗄️ Execute os scripts SQL para criar as tabelas
3. ⚙️ Configure o .env com suas credenciais Firebird
4. 🧪 Teste a conexão com o script test-connection.js

### Se você vai **adaptar o frontend:**
1. 📖 Leia [03-frontend-integration.md](./03-frontend-integration.md)
2. 📡 Implemente o api-client.ts e apiService.ts
3. 🪝 Crie os hooks com React Query
4. 🔄 Adapte HomePage.tsx e ConsultaPage.tsx

### Se você vai fazer **deployment:**
1. 📖 Leia [05-deployment-options.md](./05-deployment-options.md)
2. 🎯 Escolha a opção adequada ao seu ambiente
3. ⚙️ Configure scripts no package.json

---

## 📊 Estrutura do Sistema

```
LocalStorage (Atual)          →          Firebird + Backend (Futuro)
┌─────────────────┐                     ┌─────────────────────────────┐
│  React Frontend │                     │     React Frontend          │
│  - HomePage     │                     │  - HomePage (API)           │
│  - ConsultaPage │                     │  - ConsultaPage (API)       │
│  - localStorage │                     │  - React Query hooks        │
└─────────────────┘                     └────────────┬────────────────┘
                                                     │ HTTP/REST
                                                     ↓
                                        ┌────────────────────────────┐
                                        │   Backend Node.js/Express  │
                                        │  - Routes                  │
                                        │  - Controllers             │
                                        │  - Services                │
                                        │  - Firebird connection     │
                                        └────────────┬───────────────┘
                                                     │ SQL
                                                     ↓
                                        ┌────────────────────────────┐
                                        │    Firebird Database       │
                                        │  - TB_PRODUTOS             │
                                        │  - TB_INSPECOES            │
                                        └────────────────────────────┘
```

---

## 🔑 Conceitos-Chave

### Backend
- **Node.js** - Runtime JavaScript
- **Express** - Framework web minimalista
- **node-firebird** - Cliente Firebird para Node.js
- **Pool de conexões** - Reutilização eficiente de conexões
- **REST API** - Arquitetura de comunicação

### Frontend
- **axios** - Cliente HTTP para requisições
- **React Query** - Gerenciamento de estado do servidor
- **Hooks customizados** - Encapsulamento de lógica de API
- **TypeScript** - Tipagem estática

### Database
- **Firebird** - SGBD relacional open-source
- **TB_PRODUTOS** - Tabela de produtos/referências
- **TB_INSPECOES** - Tabela de inspeções
- **Generators/Triggers** - Auto-incremento de IDs

---

## 💡 Dicas Importantes

### ⚠️ Antes de Começar
- ✅ Faça backup do banco de dados Firebird
- ✅ Exporte dados do localStorage (se houver)
- ✅ Teste conexão com Firebird antes de codificar
- ✅ Valide permissões do usuário no banco

### 🔒 Segurança
- ❌ Nunca commite o arquivo `.env`
- ✅ Use variáveis de ambiente para credenciais
- ✅ Valide todos os inputs
- ✅ Limite tamanho de upload de fotos

### 📈 Performance
- ✅ Use índices nas tabelas Firebird
- ✅ Implemente paginação na listagem
- ✅ Configure cache no React Query
- ✅ Comprima fotos antes do upload (opcional)

### 🧪 Testes
- ✅ Teste cada endpoint com Postman/cURL
- ✅ Teste criação de inspeção completa
- ✅ Teste paginação e filtros
- ✅ Teste exclusão (verifica se foto é deletada)
- ✅ Teste em diferentes navegadores

---

## 📞 Suporte

### Problemas Comuns

**❌ Erro de conexão Firebird**
```
Solução: Verificar host, porta, database path, user e password no .env
```

**❌ CORS error no frontend**
```
Solução: Verificar CORS_ORIGIN no backend/.env
Verificar que backend está rodando
```

**❌ Foto não carrega**
```
Solução: Verificar se caminho no banco está correto
Verificar se arquivo existe em backend/uploads/fotos/
```

**❌ Porta já em uso**
```bash
# Encontrar processo
lsof -i :8000
# Matar processo
kill -9 <PID>
```

---

## 📝 Changelog

### Versão 1.0 (04/11/2025)
- ✅ Documentação inicial completa
- ✅ Mapeamento localStorage → Firebird
- ✅ Guia completo de implementação backend
- ✅ Guia de integração frontend
- ✅ Documentação de endpoints
- ✅ Opções de deployment
- ✅ Roadmap de implementação

---

## 🎯 Objetivo Final

Transformar o sistema de inspeções de câmeras em uma aplicação **robusta**, **escalável** e **centralized**, substituindo o armazenamento limitado do localStorage por um banco de dados **Firebird** profissional, com todas as vantagens de:

- ✅ Persistência confiável de dados
- ✅ Compartilhamento entre dispositivos
- ✅ Backup e recuperação
- ✅ Controle de acesso
- ✅ Auditoria e rastreabilidade
- ✅ Escalabilidade ilimitada

---

**Boa sorte com a implementação! 🚀**

**Criado por:** Claude Code
**Data:** 04/11/2025
**Versão:** 1.0
