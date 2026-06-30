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

Esta fase nao implementa produtos, inspecoes, fotos nem Face ID.
