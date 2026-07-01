# Migrations Firebird - Estado Atual

Esta pasta contém SQLs revisáveis para Firebird 2.5. O banco informado pelo cliente em 01/07/2026 já possui:

- `TBUSUARIO`, com `MATRICULA` e `FAILED_ATTEMPTS`
- `TBUSUARIO_FACEID`, sem `MATRICULA` e sem `ATIVO`
- `TBINSPECAO_MANUAL`, com `DELETADO`, auditoria, FKs para `TBOP` e `TBLINHA_PRODUCAO`

## Regra de Uso

Não aplique todos os arquivos desta pasta automaticamente. Antes de executar qualquer SQL:

1. Faça backup do banco.
2. Compare o metadata real com `../08-face-id-database-schema.md`.
3. Execute somente a migration necessária para o estado de origem do cliente.
4. Não recrie tabelas que já existem.

## Scripts de Criação

- `20260630221757_criar_tbinspecao_manual.sql`: referência de criação da `TBINSPECAO_MANUAL` alinhada à DDL atual.
- `20260701084635_criar_tbusuario_faceid.sql`: referência de criação da `TBUSUARIO_FACEID` alinhada à DDL atual.

## Scripts de Transição Legados

Os scripts abaixo foram gerados para estados intermediários de documentação e só devem ser usados se o banco de origem ainda tiver aquele layout antigo:

- `20260701085747_mover_matricula_para_tbusuario.sql`
- `20260701090701_remover_matricula_tbusuario.sql`
- `20260701093204_adicionar_matricula_remover_ativo_faceid.sql`

No schema atual enviado pelo cliente, `TBUSUARIO.MATRICULA` deve permanecer e `TBUSUARIO_FACEID.ATIVO` não existe.
