# Pasta de Gabaritos

Esta pasta contém os arquivos PDF de gabarito que serão exibidos no modal.

## Como adicionar novos gabaritos:

1. Adicione arquivos PDF nesta pasta (`public/data/`)
2. Atualize a lista de arquivos em `src/components/inspection/GabaritoModal.tsx`
3. Os arquivos serão exibidos automaticamente no modal de Gabarito

## Configuração:

Para adicionar novos PDFs, edite o array `files` no componente `GabaritoModal.tsx`:

```typescript
const files: PdfFile[] = [
  { name: 'Nome do Gabarito 1', path: '/data/seu-arquivo-1.pdf' },
  { name: 'Nome do Gabarito 2', path: '/data/seu-arquivo-2.pdf' },
]
```

## Formatos suportados:

- `.pdf` - Arquivos PDF padrão

## Nota:

Os arquivos .txt são apenas para demonstração inicial.
Substitua por arquivos PDF reais para uso em produção.
