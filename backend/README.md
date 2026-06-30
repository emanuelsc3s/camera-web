# Backend Camera Web

Backend Node.js/Express separado do frontend, preparado para Firebird 2.5.

## Configuracao

1. Copie `backend/.env.example` para `backend/.env`.
2. Ajuste as variaveis `FIREBIRD_*` conforme a base do cliente.
3. Instale as dependencias dentro de `backend/`:

```bash
npm install
```

## Comandos

```bash
npm run dev
npm start
npm test
npm run test:unit
npm run test:e2e
npm run check:schema
npm run test:connection
```

`check:schema` é somente leitura: ele valida metadados esperados no Firebird e não aplica migrations.

## Health

```bash
curl http://127.0.0.1:8000/api/health
```

O endpoint retorna `200` quando a API e o ping Firebird estao OK. Se o banco nao estiver configurado ou estiver inacessivel, retorna `503` com erro controlado.

## Produtos

```bash
curl http://127.0.0.1:8000/api/produtos/12345
curl http://127.0.0.1:8000/api/produtos/gtin/7891234567890
curl "http://127.0.0.1:8000/api/produtos?page=1&limit=50"
```

Os endpoints de produtos consultam somente `TBOP` e `TBPRODUTO`.

## Inspeções Manuais

```bash
curl -X POST http://127.0.0.1:8000/api/inspecoes
curl http://127.0.0.1:8000/api/inspecoes
curl http://127.0.0.1:8000/api/inspecoes/1
curl http://127.0.0.1:8000/api/inspecoes/export/json
```

As inspeções gravam somente em `TBINSPECAO_MANUAL`, usando `INSPECAOMANUAL_ID`, exclusão lógica e fotos de evidência em `UPLOAD_DIR`.

## Face ID

```bash
curl -X POST http://127.0.0.1:8000/api/face-id/register
curl -X POST http://127.0.0.1:8000/api/face-id/authenticate
curl http://127.0.0.1:8000/api/face-id/users
```

O Face ID é descriptor-only: o backend rejeita foto/base64 no payload, grava apenas `DESCRIPTOR_FACIAL` em `TBUSUARIO_FACEID`, audita eventos em `TBACESSO` e usa `TBUSUARIO.FAILED_ATTEMPTS` para controle de bloqueio.
