# Documentação dos Endpoints da API

## Base URL

```
http://localhost:8000/api
```

---

## 1. Health Check

### GET `/health`

Verifica a saúde da API.

**Response 200 OK:**
```json
{
  "status": "OK",
  "timestamp": "2025-11-04T14:30:00.000Z",
  "uptime": 123.456
}
```

---

## 2. Produtos

### 2.1 GET `/produtos/:op`

Busca dados de referência por OP (Ordem de Produção). A consulta usa `TBOP` como fonte principal e complementa o nome do produto via `TBPRODUTO` quando necessário.

**Parâmetros:**
- `op` (path) - OP do produto

**Response 200 OK:**
```json
{
  "op": "12345",
  "lote": "L2024001",
  "validade": "12/2025",
  "produto": "Medicamento XYZ 500mg - Caixa com 30 comprimidos",
  "registroAnvisa": "1.0234.5678",
  "gtin": "7891234567890",
  "linhaProducaoId": 1
}
```

**Response 404 Not Found:**
```json
{
  "error": "Produto não encontrado"
}
```

---

### 2.2 GET `/produtos/gtin/:gtin`

Busca dados de referência por código GTIN. A consulta usa `TBOP.GTIN` e complementa o cadastro via `TBPRODUTO`.

**Parâmetros:**
- `gtin` (path) - Código GTIN do produto

**Response 200 OK:**
```json
{
  "op": "12345",
  "lote": "L2024001",
  "validade": "12/2025",
  "produto": "Medicamento XYZ 500mg",
  "registroAnvisa": "1.0234.5678",
  "gtin": "7891234567890",
  "linhaProducaoId": 1
}
```

---

### 2.3 GET `/produtos`

Lista produtos cadastrados em `TBPRODUTO` com paginação.

**Query Parameters:**
- `page` (number, opcional) - Número da página (padrão: 1)
- `limit` (number, opcional) - Registros por página (padrão: 50)

**Response 200 OK:**
```json
[
  {
    "PRODUTO_ID": 1,
    "ERP_PRODUTO": "001234",
    "PRODUTO": "Medicamento XYZ 500mg",
    "MENSAGEM": "Texto cadastrado para impressão",
    "DATA_INC": "2025-11-04T10:00:00.000Z",
    "DELETADO": "N"
  }
]
```

---

## 3. Inspeções

Todas as inspeções criadas por este projeto são persistidas em `TBINSPECAO_MANUAL`. A tabela `TBINSPECAO` existente não é usada por esta API, pois permanece reservada ao projeto SICFAR.

### 3.1 POST `/inspecoes`

Cria nova inspeção.

**Request Body:**
```json
{
  "fotoBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "referenceData": {
    "op": "12345",
    "lote": "L2024001",
    "validade": "12/2025",
    "produto": "Medicamento XYZ 500mg - Caixa com 30 comprimidos",
    "registroAnvisa": "1.0234.5678",
    "gtin": "7891234567890"
  },
  "inspectionStates": {
    "gtin": true,
    "datamatrix": true,
    "lote": false,
    "validade": true
  },
  "fase": "Fase 1",
  "observacoes": "Lote com falha na impressão",
  "usuarioId": 12,
  "usuario": "João Silva"
}
```

`usuarioId` e `usuario` são opcionais, mas devem ser enviados quando houver usuário autenticado. Na criação eles preenchem `USUARIO_ID`/`USUARIO` e também a auditoria de inclusão (`USUARIO_I`/`USUARIONOME_I`), enquanto `DATA_INC` é preenchida com `CURRENT_TIMESTAMP`. O campo `fase` deve ter no máximo 10 caracteres.

No banco, os campos `GTIN_CONFORME`, `DATAMATRIX_CONFORME`, `LOTE_CONFORME` e `VALIDADE_CONFORME` são gravados como `VARCHAR(3)` com `Sim`, `Não` ou `NULL`. O `STATUS` é `VARCHAR(10)`, seguindo a `TBINSPECAO`: `Aprovado` quando todos os itens estiverem conformes, `Rejeitado` quando houver algum item não conforme e `Aberto` quando houver marcação pendente.

**Response 201 Created:**
```json
{
  "id": 123,
  "message": "Inspeção criada com sucesso"
}
```

**Response 400 Bad Request:**
```json
{
  "error": "Dados incompletos",
  "errors": [
    "Campo 'op' é obrigatório em referenceData",
    "Estado 'gtin' é obrigatório em inspectionStates"
  ]
}
```

---

### 3.2 GET `/inspecoes`

Lista inspeções com paginação e filtros.

**Query Parameters:**
- `page` (number, opcional) - Número da página (padrão: 1)
- `limit` (number, opcional) - Registros por página (padrão: 10)
- `campo` (string, opcional) - Campo para filtrar: 'op', 'lote', 'produto', 'gtin', 'usuario', 'fase', 'status', 'linhaProducaoId'
- `termo` (string, opcional) - Termo de busca

**Exemplos:**
```
GET /api/inspecoes?page=1&limit=10
GET /api/inspecoes?page=2&limit=25
GET /api/inspecoes?campo=op&termo=12345
GET /api/inspecoes?campo=usuario&termo=João
GET /api/inspecoes?campo=fase&termo=Fase%201
GET /api/inspecoes?campo=status&termo=Rejeitado
GET /api/inspecoes?campo=linhaProducaoId&termo=1
```

**Response 200 OK:**
```json
{
  "data": [
    {
      "id": "1",
      "timestamp": 1730745123456,
      "dataHora": "05/11/2025 14:32:03",
      "foto": "/api/fotos/2025/11/05/1_1730745123456.jpg",
      "referenceData": {
        "op": "12345",
        "lote": "L2024001",
        "validade": "12/2025",
        "produto": "Medicamento XYZ 500mg",
        "registroAnvisa": "1.0234.5678",
        "gtin": "7891234567890"
      },
      "inspectionStates": {
        "gtin": true,
        "datamatrix": true,
        "lote": false,
        "validade": true
      },
      "linhaProducaoId": 1,
      "fase": "Fase 1",
      "status": "Rejeitado",
      "auditoria": {
        "criadoEm": "2025-11-05T14:32:03.000Z",
        "criadoPorId": 12,
        "criadoPorNome": "João Silva",
        "alteradoEm": null,
        "alteradoPorId": null,
        "alteradoPorNome": null,
        "excluidoEm": null,
        "excluidoPorId": null,
        "excluidoPorNome": null
      },
      "observacoes": "Lote com falha na impressão",
      "usuario": "João Silva"
    }
  ],
  "total": 150,
  "page": 1,
  "pageSize": 10,
  "totalPages": 15
}
```

---

### 3.3 GET `/inspecoes/:id`

Busca inspeção específica por ID.

**Parâmetros:**
- `id` (path) - ID da inspeção

**Response 200 OK:**
```json
{
  "id": "1",
  "timestamp": 1730745123456,
  "dataHora": "05/11/2025 14:32:03",
  "foto": "/api/fotos/2025/11/05/1_1730745123456.jpg",
  "referenceData": {
    "op": "12345",
    "lote": "L2024001",
    "validade": "12/2025",
    "produto": "Medicamento XYZ 500mg",
    "registroAnvisa": "1.0234.5678",
    "gtin": "7891234567890"
  },
  "inspectionStates": {
    "gtin": true,
    "datamatrix": true,
    "lote": false,
    "validade": true
  },
  "linhaProducaoId": 1,
  "fase": "Fase 1",
  "status": "Rejeitado",
  "auditoria": {
    "criadoEm": "2025-11-05T14:32:03.000Z",
    "criadoPorId": 12,
    "criadoPorNome": "João Silva",
    "alteradoEm": null,
    "alteradoPorId": null,
    "alteradoPorNome": null,
    "excluidoEm": null,
    "excluidoPorId": null,
    "excluidoPorNome": null
  },
  "observacoes": null,
  "usuario": null
}
```

**Response 404 Not Found:**
```json
{
  "error": "Inspeção não encontrada"
}
```

---

### 3.4 DELETE `/inspecoes/:id`

Exclui logicamente inspeção.

A exclusão é lógica. A API atualiza `DELETADO = 'S'` e preenche `DATA_DEL`, `USUARIO_D` e `USUARIONOME_D`; o registro e a foto permanecem armazenados para auditoria.

**Parâmetros:**
- `id` (path) - ID da inspeção

**Request Body opcional:**
```json
{
  "usuarioId": 12,
  "usuario": "João Silva"
}
```

**Response 200 OK:**
```json
{
  "message": "Inspeção excluída logicamente com sucesso"
}
```

**Response 404 Not Found:**
```json
{
  "error": "Inspeção não encontrada"
}
```

---

### 3.5 DELETE `/inspecoes/batch`

Exclui logicamente múltiplas inspeções.

**Request Body:**
```json
{
  "ids": [1, 2, 3, 4, 5],
  "usuarioId": 12,
  "usuario": "João Silva"
}
```

**Response 200 OK:**
```json
{
  "message": "5 inspeção(ões) excluída(s) logicamente com sucesso",
  "deletedCount": 5
}
```

**Response 400 Bad Request:**
```json
{
  "error": "IDs inválidos"
}
```

---

### 3.6 GET `/inspecoes/export/json`

Exporta todas as inspeções como JSON.

**Response 200 OK:**
```json
[
  {
    "id": "1",
    "timestamp": 1730745123456,
    "dataHora": "05/11/2025 14:32:03",
    "foto": "/api/fotos/2025/11/05/1_1730745123456.jpg",
    "referenceData": { },
    "inspectionStates": { },
    "linhaProducaoId": 1,
    "fase": "Fase 1",
    "status": "Rejeitado",
    "auditoria": {
      "criadoEm": "2025-11-05T14:32:03.000Z",
      "criadoPorId": 12,
      "criadoPorNome": "João Silva",
      "alteradoEm": null,
      "alteradoPorId": null,
      "alteradoPorNome": null,
      "excluidoEm": null,
      "excluidoPorId": null,
      "excluidoPorNome": null
    }
  }
]
```

**Headers:**
```
Content-Type: application/json
Content-Disposition: attachment; filename=inspecoes_1730745123456.json
```

---

## 4. Fotos

### 4.1 GET `/fotos/:year/:month/:day/:filename`

Serve arquivo de foto.

**Parâmetros:**
- `year` (path) - Ano (ex: 2025)
- `month` (path) - Mês (ex: 11)
- `day` (path) - Dia (ex: 05)
- `filename` (path) - Nome do arquivo (ex: 1_1730745123456.jpg)

**Exemplo:**
```
GET /api/fotos/2025/11/05/1_1730745123456.jpg
```

**Response 200 OK:**
- Retorna o arquivo de imagem (JPEG)
- Content-Type: `image/jpeg`

**Response 404 Not Found:**
```json
{
  "error": "Foto não encontrada"
}
```

---

## 5. Códigos de Status HTTP

| Código | Significado | Quando Ocorre |
|--------|-------------|---------------|
| 200 | OK | Requisição bem-sucedida |
| 201 | Created | Recurso criado com sucesso |
| 400 | Bad Request | Dados inválidos ou incompletos |
| 404 | Not Found | Recurso não encontrado |
| 500 | Internal Server Error | Erro no servidor ou banco de dados |
| 503 | Service Unavailable | Serviço temporariamente indisponível |

---

## 6. Tratamento de Erros

Todos os erros seguem o formato:

```json
{
  "error": "Mensagem de erro descritiva"
}
```

Ou com detalhes adicionais:

```json
{
  "error": "Erro de validação",
  "details": "Mensagem detalhada do erro"
}
```

Em modo de desenvolvimento (`NODE_ENV=development`), erros 500 incluem stack trace:

```json
{
  "error": "Erro interno do servidor",
  "stack": "Error: ...\n    at ..."
}
```

---

## 7. Limitações e Restrições

### Upload de Fotos
- **Tamanho máximo:** 10MB (configurável via `MAX_FILE_SIZE`)
- **Formatos aceitos:** JPEG, JPG, PNG
- **Encoding:** Base64

### Paginação
- **Limite mínimo:** 1 registro por página
- **Limite máximo:** 100 registros por página
- **Padrão:** 10 registros por página

### Timeout
- **Requisições:** 30 segundos (configurável no cliente)

---

## 8. Exemplos de Uso com cURL

### Criar Inspeção
```bash
curl -X POST http://localhost:8000/api/inspecoes \
  -H "Content-Type: application/json" \
  -d '{
    "fotoBase64": "data:image/jpeg;base64,/9j/4AAQ...",
    "referenceData": {
      "op": "12345",
      "lote": "L2024001",
      "validade": "12/2025",
      "produto": "Medicamento XYZ 500mg",
      "registroAnvisa": "1.0234.5678",
      "gtin": "7891234567890"
    },
    "inspectionStates": {
      "gtin": true,
      "datamatrix": true,
      "lote": false,
      "validade": true
    },
    "fase": "Fase 1",
    "usuarioId": 12,
    "usuario": "João Silva"
  }'
```

### Listar Inspeções
```bash
curl http://localhost:8000/api/inspecoes?page=1&limit=10
```

### Buscar Produto por OP
```bash
curl http://localhost:8000/api/produtos/12345
```

### Deletar Inspeção
```bash
curl -X DELETE http://localhost:8000/api/inspecoes/1 \
  -H "Content-Type: application/json" \
  -d '{
    "usuarioId": 12,
    "usuario": "João Silva"
  }'
```

### Exportar JSON
```bash
curl http://localhost:8000/api/inspecoes/export/json -o inspecoes.json
```

---

**Documento criado em:** 04/11/2025
**Versão:** 1.0
