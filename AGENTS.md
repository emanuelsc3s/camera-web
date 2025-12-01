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