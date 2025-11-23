# API Backend para Sistema de Reconhecimento Facial (Face ID)

## Introdução

Este documento especifica os endpoints da API REST necessários para suportar o sistema de reconhecimento facial implementado no frontend, incluindo cadastro de usuários com biometria facial e autenticação por Face ID.

---

## Arquitetura do Sistema Face ID

### Fluxo Atual (Frontend - IndexedDB)

```
┌─────────────────────────────────────────────────────────┐
│                  React Frontend                         │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │  FaceIdModal (Login/Cadastro)                    │ │
│  │  - Captura vídeo da webcam                       │ │
│  │  - Detecta rosto com face-api.js                 │ │
│  │  - Extrai descriptor (vetor 128 dimensões)       │ │
│  │  - Compara com descritores armazenados           │ │
│  └──────────────────────────────────────────────────┘ │
│                      ↓↑                                 │
│  ┌──────────────────────────────────────────────────┐ │
│  │  faceIdStorageService.ts                         │ │
│  │  - Salva/busca usuários no IndexedDB             │ │
│  │  - Armazena: id, name, matricula, descriptors,  │ │
│  │    photoUrl, timestamps                          │ │
│  └──────────────────────────────────────────────────┘ │
│                      ↓↑                                 │
│  ┌──────────────────────────────────────────────────┐ │
│  │  IndexedDB (CameraWebFaceIdDB)                   │ │
│  │  - Armazenamento local no navegador              │ │
│  │  - Não compartilhado entre dispositivos          │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Fluxo Futuro (Backend + Firebird)

```
┌─────────────────────────────────────────────────────────┐
│                  React Frontend                         │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │  FaceIdModal                                     │ │
│  │  - Captura vídeo e detecta rosto                 │ │
│  │  - Extrai descriptor facial                      │ │
│  │  - Envia para API backend                        │ │
│  └──────────────────────────────────────────────────┘ │
│                      ↓↑                                 │
│  ┌──────────────────────────────────────────────────┐ │
│  │  faceIdApiService.ts                             │ │
│  │  - POST /api/face-id/register                    │ │
│  │  - POST /api/face-id/authenticate                │ │
│  │  - GET  /api/face-id/users                       │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTP/REST (JSON)
                   ↓
┌─────────────────────────────────────────────────────────┐
│              Backend Node.js + Express                  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │  faceId.routes.js                                │ │
│  │  - POST   /api/face-id/register                  │ │
│  │  - POST   /api/face-id/authenticate              │ │
│  │  - GET    /api/face-id/users                     │ │
│  │  - DELETE /api/face-id/users/:id                 │ │
│  └──────────────────────────────────────────────────┘ │
│                      ↓                                  │
│  ┌──────────────────────────────────────────────────┐ │
│  │  faceId.service.js                               │ │
│  │  - Validação de descritores faciais              │ │
│  │  - Matching de vetores (similaridade)            │ │
│  │  - Gerenciamento de fotos                        │ │
│  │  - Auditoria via TBACESSO                        │ │
│  └──────────────────────────────────────────────────┘ │
│                      ↓                                  │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Pool de Conexões Firebird                       │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────┬──────────────────────────────────────┘
                   │ SQL
                   ↓
┌─────────────────────────────────────────────────────────┐
│              Firebird 2.5 Database                      │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │  TBUSUARIO (existente)                           │ │
│  │  - USUARIO_ID, NOME, EMAIL, etc.                 │ │
│  └──────────────────────────────────────────────────┘ │
│                      ↑                                  │
│  ┌──────────────────────────────────────────────────┐ │
│  │  TBUSUARIO_FACEID (nova)                         │ │
│  │  - FACEID_ID, USUARIO_ID (FK)                    │ │
│  │  - DESCRIPTOR_FACIAL (BLOB)                      │ │
│  │  - FOTO_URL, MATRICULA                           │ │
│  │  - Campos de auditoria                           │ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │  TBACESSO (existente)                            │ │
│  │  - ACESSO_ID, USUARIO_ID (FK)                    │ │
│  │  - DATA, TIPO, LOCAL                             │ │
│  │  - ATIVIDADE (JSON), IP, CHAVE_ID                │ │
│  │  - Usado para auditoria de Face ID               │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Endpoints da API

### Base URL
```
http://localhost:8000/api/face-id
```

---

## 1. Cadastro de Face ID

### POST `/face-id/register`

Registra um novo usuário com biometria facial.

**Request Body:**
```json
{
  "usuarioId": 123,
  "name": "João Silva",
  "matricula": "MAT001",
  "photoBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "descriptor": [0.123, -0.456, 0.789, ...],  // Array com 128 números (Float32Array convertido)
  "email": "joao.silva@empresa.com"
}
```

**Campos:**
- `usuarioId` (number, opcional) - ID do usuário na tabela TBUSUARIO (se já existir)
- `name` (string, obrigatório) - Nome completo do usuário
- `matricula` (string, opcional) - Matrícula do funcionário
- `photoBase64` (string, obrigatório) - Foto do rosto em Base64
- `descriptor` (number[], obrigatório) - Vetor de 128 dimensões do descritor facial
- `email` (string, opcional) - E-mail do usuário

**Response 201 Created:**
```json
{
  "success": true,
  "message": "Face ID cadastrado com sucesso",
  "data": {
    "faceIdId": 1,
    "usuarioId": 123,
    "name": "João Silva",
    "matricula": "MAT001",
    "photoUrl": "/api/face-id/photos/2025/11/22/1_1732291234567.jpg",
    "createdAt": "2025-11-22T10:30:00.000Z"
  }
}
```

**Response 400 Bad Request:**
```json
{
  "success": false,
  "error": "Dados inválidos",
  "details": [
    "Campo 'name' é obrigatório",
    "Descriptor deve ter exatamente 128 dimensões",
    "Foto em Base64 é obrigatória"
  ]
}
```

**Response 409 Conflict:**
```json
{
  "success": false,
  "error": "Usuário já possui Face ID cadastrado",
  "details": "Já existe um cadastro de Face ID para este usuário"
}
```

---

## 2. Autenticação por Face ID

### POST `/face-id/authenticate`

Autentica usuário através de reconhecimento facial.

**Request Body:**
```json
{
  "descriptor": [0.123, -0.456, 0.789, ...],  // Array com 128 números
  "threshold": 0.6  // Opcional, padrão: 0.6
}
```

**Campos:**
- `descriptor` (number[], obrigatório) - Vetor de 128 dimensões do rosto capturado
- `threshold` (number, opcional) - Limiar de similaridade (0.0 a 1.0, padrão: 0.6)

**Response 200 OK (Match encontrado):**
```json
{
  "success": true,
  "authenticated": true,
  "data": {
    "usuarioId": 123,
    "faceIdId": 1,
    "name": "João Silva",
    "matricula": "MAT001",
    "email": "joao.silva@empresa.com",
    "photoUrl": "/api/face-id/photos/2025/11/22/1_1732291234567.jpg",
    "distance": 0.42,
    "confidence": 0.58
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 200 OK (Nenhum match encontrado):**
```json
{
  "success": true,
  "authenticated": false,
  "message": "Nenhum rosto correspondente encontrado",
  "bestMatch": {
    "distance": 0.85,
    "confidence": 0.15
  }
}
```

**Response 400 Bad Request:**
```json
{
  "success": false,
  "error": "Descriptor inválido",
  "details": "Descriptor deve ter exatamente 128 dimensões"
}
```

**Response 403 Forbidden (Usuário bloqueado):**
```json
{
  "success": false,
  "error": "Usuário bloqueado por excesso de tentativas falhas (10/10). Contate o suporte.",
  "failedAttempts": 10,
  "threshold": 10
}
```

**Observações:**
- A cada falha de autenticação, o campo **TBUSUARIO.FAILED_ATTEMPTS** é incrementado em 1
- Quando a autenticação é bem-sucedida, **FAILED_ATTEMPTS** é zerado
- Se **FAILED_ATTEMPTS >= 10**, o usuário é bloqueado e retorna erro 403
- A tabela **TBACESSO** registra todas as tentativas para auditoria

---

## 3. Listar Usuários com Face ID

### GET `/face-id/users`

Lista todos os usuários cadastrados com Face ID.

**Query Parameters:**
- `page` (number, opcional) - Número da página (padrão: 1)
- `limit` (number, opcional) - Registros por página (padrão: 50)
- `search` (string, opcional) - Busca por nome ou matrícula

**Response 200 OK:**
```json
{
  "success": true,
  "data": [
    {
      "faceIdId": 1,
      "usuarioId": 123,
      "name": "João Silva",
      "matricula": "MAT001",
      "email": "joao.silva@empresa.com",
      "photoUrl": "/api/face-id/photos/2025/11/22/1_1732291234567.jpg",
      "createdAt": "2025-11-22T10:30:00.000Z",
      "updatedAt": "2025-11-22T10:30:00.000Z",
      "ativo": true
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

---

## 4. Buscar Usuário por ID

### GET `/face-id/users/:id`

Busca dados de um usuário específico com Face ID.

**Parâmetros:**
- `id` (path) - ID do Face ID (FACEID_ID)

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "faceIdId": 1,
    "usuarioId": 123,
    "name": "João Silva",
    "matricula": "MAT001",
    "email": "joao.silva@empresa.com",
    "photoUrl": "/api/face-id/photos/2025/11/22/1_1732291234567.jpg",
    "createdAt": "2025-11-22T10:30:00.000Z",
    "updatedAt": "2025-11-22T10:30:00.000Z",
    "ativo": true,
    "acessosRecentes": 5,
    "ultimoAcesso": "2025-11-22T14:30:00.000Z"
  }
}
```

**Response 404 Not Found:**
```json
{
  "success": false,
  "error": "Usuário Face ID não encontrado"
}
```

---

## 5. Atualizar Face ID

### PUT `/face-id/users/:id`

Atualiza dados do Face ID de um usuário (re-cadastro de biometria).

**Request Body:**
```json
{
  "photoBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "descriptor": [0.123, -0.456, 0.789, ...]
}
```

**Response 200 OK:**
```json
{
  "success": true,
  "message": "Face ID atualizado com sucesso",
  "data": {
    "faceIdId": 1,
    "updatedAt": "2025-11-22T15:00:00.000Z"
  }
}
```

---

## 6. Deletar Face ID

### DELETE `/face-id/users/:id`

Remove o cadastro de Face ID de um usuário (soft delete).

**Response 200 OK:**
```json
{
  "success": true,
  "message": "Face ID removido com sucesso"
}
```

---

## 7. Histórico de Acessos por Face ID

### GET `/face-id/users/:id/access-history`

Lista histórico de acessos (autenticações) de um usuário via Face ID usando a tabela TBACESSO.

**Query Parameters:**
- `page` (number, opcional) - Número da página (padrão: 1)
- `limit` (number, opcional) - Registros por página (padrão: 20)
- `startDate` (string, opcional) - Data inicial (ISO 8601)
- `endDate` (string, opcional) - Data final (ISO 8601)

**Response 200 OK:**
```json
{
  "success": true,
  "data": [
    {
      "acessoId": 1234,
      "dataHora": "2025-11-22T14:30:00.000Z",
      "tipo": "FACE_ID_AUTH_SUCCESS",
      "sucesso": true,
      "detalhes": {
        "evento": "autenticacao_facial",
        "resultado": "sucesso",
        "faceIdId": 456,
        "distanciaMatch": 0.42,
        "confianca": 0.70,
        "matricula": "MAT001"
      },
      "ipOrigem": "192.168.1.100",
      "userAgent": "Mozilla/5.0..."
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

---

## 8. Servir Foto de Face ID

### GET `/face-id/photos/:year/:month/:day/:filename`

Serve arquivo de foto do Face ID.

**Exemplo:**
```
GET /api/face-id/photos/2025/11/22/1_1732291234567.jpg
```

**Response 200 OK:**
- Retorna o arquivo de imagem (JPEG)
- Content-Type: `image/jpeg`

**Response 404 Not Found:**
```json
{
  "success": false,
  "error": "Foto não encontrada"
}
```

---

## Segurança e Considerações

### 1. Armazenamento de Descritores Faciais

**Formato do Descriptor:**
- Vetor de 128 dimensões (Float32Array)
- Gerado pela biblioteca face-api.js
- Armazenado como BLOB no Firebird

**Conversão:**
```javascript
// Frontend → Backend (Float32Array → Array)
const descriptorArray = Array.from(descriptor)

// Backend → Firebird (Array → BLOB)
const buffer = Buffer.from(new Float32Array(descriptorArray).buffer)

// Firebird → Backend (BLOB → Array)
const float32Array = new Float32Array(buffer.buffer)
const descriptorArray = Array.from(float32Array)
```

### 2. Matching de Vetores

**Algoritmo de Similaridade:**
- Distância Euclidiana entre vetores
- Threshold padrão: 0.6 (configurável)
- Quanto menor a distância, maior a similaridade

**Cálculo:**
```javascript
function euclideanDistance(a, b) {
  return Math.sqrt(
    a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
  )
}

function isMatch(distance, threshold = 0.6) {
  return distance < threshold
}
```

### 3. Proteção de Dados Biométricos (LGPD)

**Requisitos:**
- ✅ Consentimento explícito do usuário
- ✅ Criptografia dos descritores em repouso
- ✅ Auditoria de acessos via TBACESSO
- ✅ Direito ao esquecimento (soft delete)
- ✅ Minimização de dados (apenas descriptor, não imagem completa)
- ✅ Logs de acesso com retenção limitada

**Campos de Auditoria (TBUSUARIO_FACEID):**
- DATA_INC, USUARIO_I, USUARIONOME_I (criação)
- DATA_ALT, USUARIO_A, USUARIONOME_A (alteração)
- DATA_DEL, USUARIO_D, USUARIONOME_D (exclusão)

**Auditoria de Tentativas (TBACESSO):**
- Todos os eventos de autenticação são registrados na tabela TBACESSO
- LOCAL = 'WEB_FACE_ID'
- TIPO = 'FACE_ID_AUTH_SUCCESS' ou 'FACE_ID_AUTH_FAILED'
- ATIVIDADE contém JSON com detalhes da tentativa

### 4. Rate Limiting

**Proteção contra ataques:**
- Máximo 5 tentativas de autenticação por minuto por IP
- Bloqueio temporário após 10 tentativas falhas consecutivas
- Captcha após 3 tentativas falhas

### 5. Validações

**Descriptor:**
- Deve ter exatamente 128 dimensões
- Valores devem ser números válidos (não NaN, não Infinity)
- Tamanho do BLOB: ~512 bytes (128 floats × 4 bytes)

**Foto:**
- Formato: JPEG, PNG
- Tamanho máximo: 2MB
- Resolução mínima: 320x240
- Deve conter exatamente 1 rosto detectável

---

## Códigos de Status HTTP

| Código | Significado | Quando Ocorre |
|--------|-------------|---------------|
| 200 | OK | Requisição bem-sucedida |
| 201 | Created | Face ID cadastrado com sucesso |
| 400 | Bad Request | Dados inválidos ou incompletos |
| 401 | Unauthorized | Autenticação falhou |
| 404 | Not Found | Recurso não encontrado |
| 409 | Conflict | Face ID já existe para o usuário |
| 429 | Too Many Requests | Rate limit excedido |
| 500 | Internal Server Error | Erro no servidor |

---

## Exemplos de Uso

### Cadastro de Face ID

```javascript
// Frontend
const response = await fetch('/api/face-id/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'João Silva',
    matricula: 'MAT001',
    email: 'joao.silva@empresa.com',
    photoBase64: photoDataUrl,
    descriptor: Array.from(faceDescriptor)
  })
})

const result = await response.json()
```

### Autenticação

```javascript
// Frontend
const response = await fetch('/api/face-id/authenticate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    descriptor: Array.from(capturedDescriptor),
    threshold: 0.6
  })
})

const result = await response.json()

if (result.authenticated) {
  // Login bem-sucedido
  localStorage.setItem('authToken', result.token)
  // Redirecionar para dashboard
}
```

---

**Documento criado em:** 22/11/2025
**Versão:** 1.0
**Autor:** Sistema de Documentação Técnica


