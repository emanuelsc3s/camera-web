# Sistema de Reconhecimento Facial (Face ID) - Documentação Completa

## 📋 Visão Geral

Este conjunto de documentos descreve a implementação completa do sistema de reconhecimento facial integrado ao banco de dados Firebird 2.5, incluindo backend Node.js, API REST, modelagem de banco de dados, segurança e conformidade com LGPD.

---

## 📚 Documentos Disponíveis

### 1. [07-face-id-backend-api.md](./07-face-id-backend-api.md)
**API REST para Reconhecimento Facial**

**Conteúdo:**
- Arquitetura do sistema (atual vs. futuro)
- 7 endpoints REST completos:
  - POST /face-id/register (Cadastro)
  - POST /face-id/authenticate (Autenticação)
  - GET /face-id/users (Listar usuários)
  - GET /face-id/users/:id (Buscar usuário)
  - PUT /face-id/users/:id (Atualizar)
  - DELETE /face-id/users/:id (Deletar)
  - GET /face-id/users/:id/attempts (Histórico)
- Algoritmo de matching (distância euclidiana)
- Conversão Float32Array ↔ BLOB
- Requisitos de segurança e LGPD

**Quando usar:** Para entender a API e como integrar o frontend com o backend.

---

### 2. [08-face-id-database-schema.md](./08-face-id-database-schema.md)
**Modelagem de Banco de Dados**

**Conteúdo:**
- Tabela TBUSUARIO_FACEID (dados biométricos)
  - Estrutura DDL completa
  - Generators e triggers
  - Índices para otimização
  - Descrição detalhada de campos
- **Controle de Tentativas Falhas (TBUSUARIO.FAILED_ATTEMPTS)**
  - Incremento automático a cada falha
  - Reset automático após sucesso
  - Bloqueio após 10 tentativas
  - Queries de monitoramento e reset
- Uso da tabela TBACESSO (existente) para auditoria
  - Mapeamento de campos para eventos Face ID
  - Formato JSON do campo ATIVIDADE
  - Queries de auditoria e histórico
- Queries úteis (cadastro, autenticação, histórico)
- Política descriptor-only: foto não persistida
- Considerações de performance
- Scripts DDL completos para instalação

**Quando usar:** Para criar as tabelas no Firebird e entender a estrutura de dados.

**Notas importantes:**
- Não é necessário criar tabela adicional de tentativas
- A tabela TBACESSO é usada para auditoria (histórico completo)
- O campo TBUSUARIO.FAILED_ATTEMPTS é a fonte de verdade para contagem de falhas

---

### 3. [09-face-id-backend-implementation.md](./09-face-id-backend-implementation.md)
**Implementação Completa do Backend**

**Conteúdo:**
- Estrutura de arquivos do projeto
- Utilitários de matemática vetorial (vectorMath.js)
  - Cálculo de distância euclidiana
  - Validação de descritores
  - Conversão Buffer ↔ Array
  - Algoritmo de matching
- Serviço principal Face ID (faceId.service.js)
  - Cadastro de usuários
  - Autenticação facial
  - Listagem e busca
  - Atualização e exclusão
  - Histórico de tentativas

**Quando usar:** Para implementar o backend Node.js do sistema Face ID.

---

### 4. [10-face-id-security-flows.md](./10-face-id-security-flows.md)
**Fluxos de Segurança e Conformidade LGPD**

**Conteúdo:**
- Fluxo completo de cadastro (diagrama de sequência)
- Fluxo completo de autenticação (diagrama de sequência)
- Algoritmo de matching detalhado
- **Controle de Tentativas Falhas (FAILED_ATTEMPTS)**:
  - Implementação de incremento/reset
  - Verificação de bloqueio
  - Reset manual (suporte técnico)
  - Monitoramento de usuários bloqueados
- Conformidade com LGPD:
  - Consentimento explícito
  - Finalidade específica
  - Minimização de dados
  - Direito ao esquecimento
  - Transparência e auditoria
- Termo de consentimento (exemplo)
- Criptografia de dados (em trânsito e em repouso)
- Rate limiting e proteção contra ataques
- Logs de auditoria
- Testes (unitários, integração, segurança)
- Monitoramento e métricas
- Troubleshooting

**Quando usar:** Para entender os aspectos de segurança, privacidade e conformidade legal.

---

## 🚀 Guia de Implementação Rápida

### Passo 1: Criar Tabelas no Firebird

Execute o script DDL completo do documento **08-face-id-database-schema.md** (Seção 7):

```sql
-- Criar TBUSUARIO_FACEID
-- Criar generators e triggers
-- Criar índices
-- TBACESSO já existe e será usada para auditoria
```

### Passo 2: Implementar Backend

Siga o documento **09-face-id-backend-implementation.md**:

1. Criar estrutura de diretórios
2. Implementar utilitários (vectorMath.js)
3. Implementar serviço principal (`faceId.service.js`)
4. Criar controllers e rotas
5. Adicionar middlewares de validação e rate limiting

### Passo 3: Configurar Segurança

Siga o documento **10-face-id-security-flows.md**:

1. Configurar execução local por `localhost`/`127.0.0.1` nos terminais ou HTTPS local quando necessário
2. Configurar rate limiting
3. Adicionar logs de auditoria
4. Implementar termo de consentimento no frontend
5. Configurar criptografia (opcional)

### Passo 4: Integrar Frontend

Use a API documentada em **07-face-id-backend-api.md**:

```javascript
// Cadastro
const response = await fetch('/api/face-id/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'João Silva',
    matricula: 'MAT001',
    descriptor: [0.123, -0.456, ...] // 128 dimensões
  })
})

// Autenticação
const response = await fetch('/api/face-id/authenticate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    descriptor: [0.123, -0.456, ...], // 128 dimensões
    threshold: 0.6
  })
})
```

---

## 🔑 Conceitos Importantes

### Descriptor Facial
- Vetor de 128 números (Float32Array)
- Representa características únicas do rosto
- Gerado pela biblioteca face-api.js
- Armazenado como BLOB no Firebird
- A foto usada para gerar o descriptor não é persistida

### Matching (Correspondência)
- Algoritmo: Distância Euclidiana
- Threshold padrão: 0.6
- Quanto menor a distância, maior a similaridade
- Match = distância < threshold

### Segurança
- Dados biométricos são sensíveis (LGPD)
- Requer consentimento explícito
- Criptografia recomendada
- Auditoria obrigatória
- Rate limiting essencial

### Câmera em Máquinas Isoladas
- Sem HTTPS, rodar frontend e backend localmente em cada terminal e abrir por `http://localhost` ou `http://127.0.0.1`.
- Evitar acesso por `http://servidor:porta` a partir dos terminais, porque navegadores modernos tendem a bloquear câmera fora de contexto seguro.
- O Firebird central armazena os descriptors; por isso o login por Face ID funciona em todos os terminais sem copiar fotos.

---

## 📊 Arquitetura Resumida

```
┌──────────────┐   localhost    ┌──────────────┐     Pool     ┌──────────────┐
│   Frontend   │ ◄────────────► │   Backend    │ ◄──────────► │  Firebird    │
│  React +     │                │  Node.js +   │              │  2.5         │
│  face-api.js │                │  Express     │              │              │
└──────────────┘                └──────────────┘              └──────────────┘
       │                               │                             │
       │ Captura rosto                 │ Matching                    │
       │ Extrai descriptor             │ Criptografia                │ TBUSUARIO_FACEID
       │ (128 floats)                  │ Rate limiting               │ TBACESSO (auditoria)
       │                               │ Auditoria                   │
       │                               │                             │
       │                               ▼                             │
       │                        Sem persistência de foto             │
```

---

## ⚠️ Requisitos

### Backend
- Node.js 16+
- Express 4+
- node-firebird
- Firebird 2.5+

### Frontend
- React 18+
- face-api.js
- Webcam funcional
- Origem segura para câmera: `localhost`, `127.0.0.1` ou HTTPS local

### Banco de Dados
- Firebird 2.5 ou superior
- Tabela TBUSUARIO existente
- Tabela TBACESSO existente (para auditoria)
- Todos os terminais apontando para o mesmo Firebird ou para uma rotina controlada de sincronização

---

## 📝 Checklist de Implementação

- [ ] Criar tabela TBUSUARIO_FACEID no Firebird
- [ ] Verificar existência da tabela TBACESSO (já deve existir)
- [ ] Implementar utilitários de matemática vetorial
- [ ] Implementar serviço principal de Face ID
- [ ] Adaptar método de auditoria para usar TBACESSO
- [ ] Criar controllers e rotas
- [ ] Adicionar validações e rate limiting
- [ ] Configurar execução local por `localhost`/`127.0.0.1` nos terminais
- [ ] Implementar logs de auditoria via TBACESSO
- [ ] Adicionar termo de consentimento no frontend
- [ ] Testar cadastro de Face ID
- [ ] Testar autenticação facial
- [ ] Testar segurança (rate limiting, validações)
- [ ] Documentar variáveis de ambiente
- [ ] Configurar backup de dados biométricos

---

**Documentação criada em:** 22/11/2025  
**Versão:** 1.0  
**Compatibilidade:** Firebird 2.5+, Node.js 16+, React 18+

