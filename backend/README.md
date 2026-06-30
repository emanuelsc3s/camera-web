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
npm run test:connection
```

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

Esta fase não implementa inspeções, fotos nem Face ID.
