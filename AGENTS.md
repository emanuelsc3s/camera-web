# LANGUAGE

Sempre me responda, escreva comentários no código, gere documentações no idioma português do Brasil.

# TIPOGRAFIA

**REGRA CRÍTICA - Fonte Roboto Offline**:

Este projeto utiliza **EXCLUSIVAMENTE** a fonte **Roboto** armazenada localmente em `public/fonts/`.

## Diretrizes Obrigatórias:

1. **NUNCA baixar fontes da internet** (Google Fonts, CDN, etc.)
2. **NUNCA usar outras fontes** além da Roboto
3. **SEMPRE usar a fonte Roboto local** disponível em `/public/fonts/`
4. **Variar apenas os pesos** quando necessário (300, 400, 500, 700)
5. **Ambiente offline** - O projeto será usado em máquinas sem internet

## Fontes Disponíveis:

```
public/fonts/
├── Roboto-Light.ttf      (peso 300)
├── Roboto-Regular.ttf    (peso 400 - padrão)
├── Roboto-Medium.ttf     (peso 500)
├── Roboto-Bold.ttf       (peso 700)
└── roboto.css            (configuração @font-face)
```

## Configuração Atual:

- **HTML**: `<link rel="stylesheet" href="/fonts/roboto.css" />`
- **Tailwind**: `fontFamily.sans: ['Roboto', 'ui-sans-serif', 'system-ui', ...]`
- **CSS**: `font-family: 'Roboto', ui-sans-serif, system-ui, ...`

## Uso em Componentes:

```tsx
// ✅ CORRETO - Usar classes Tailwind (usa Roboto automaticamente)
<h1 className="text-2xl font-bold">Título</h1>
<p className="text-base font-normal">Texto normal</p>
<span className="text-sm font-medium">Texto médio</span>

// ❌ ERRADO - Não especificar outras fontes
<h1 style={{ fontFamily: 'Arial' }}>Título</h1>
<p className="font-serif">Texto</p>
```

**IMPORTANTE**: Se precisar de estilos tipográficos diferentes, varie apenas o peso da Roboto (font-light, font-normal, font-medium, font-bold).

# BANCO DE DADOS

## Registro de Migrations Firebird 2.5

- Sempre que uma mudança alterar estrutura da base de dados, criar um SQL de migration para Firebird 2.5 em `docs/firebird-integration/migrations/`.
- Não aplicar migrations automaticamente na base do cliente. O fluxo deste projeto é gerar o arquivo SQL revisável e orientar a execução manual com backup prévio.
- A nomenclatura obrigatória dos arquivos deve ser `YYYYMMDDHHMMSS_descricao_em_snake_case.sql`.
- O timestamp no formato `YYYYMMDDHHMMSS` deve ser único, crescente e baseado no fuso horário do projeto (GMT -3:00). A descrição deve ser curta, em `snake_case`, sem acentos e sem espaços.
- O SQL deve ser compatível com Firebird 2.5, incluindo `CREATE GENERATOR`/`SET GENERATOR`, `SET TERM` para triggers e `COMMIT` nos pontos adequados.
- Ao criar ou alterar tabelas, seguir os padrões existentes do metadata atual: chaves primárias nomeadas, generators para IDs, triggers `BEFORE INSERT` para auto-incremento, campos de auditoria quando aplicável e exclusão lógica quando o domínio exigir.
- Não usar recursos de outros bancos, como Supabase CLI, PostgreSQL, `SERIAL`, `IDENTITY`, `JSONB`, `UUID` nativo ou comandos que não existam no Firebird 2.5.
- A migration deve ser autocontida: criar/alterar tabelas, constraints, índices, generators e triggers necessários, além de consultas simples de validação quando útil.
- Se uma estrutura já existir no metadata enviado pelo usuário, não recriá-la; apenas referenciar ou alterar o que for necessário.
- Para este projeto, `TBINSPECAO` permanece reservada ao SICFAR. Registros de inspeção manual devem usar `TBINSPECAO_MANUAL`.
