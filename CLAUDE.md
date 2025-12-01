# CLAUDE.md

Este arquivo fornece orientação a Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

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

## Comandos Comuns

### Desenvolvimento
- `npm run dev` - Inicia servidor de desenvolvimento com verificações de ambiente (porta 8080)
- `npm run check-env` - Verifica configuração do ambiente
- `npm run build` - Build para produção (compilação TypeScript + build Vite)
- `npm run build:dev` - Build em modo de desenvolvimento
- `npm run lint` - Executa ESLint com extensões TypeScript
- `npm run preview` - Visualiza build de produção

**IMPORTANTE - Gerenciamento do Servidor**:
- SEMPRE verificar se o servidor já está rodando antes de executar `npm run dev`
- Comando para verificar: `ps aux | grep -E "npm|node|vite" | grep -v grep`
- **NUNCA iniciar o servidor automaticamente** - sempre avisar o usuário para que ele possa gerenciar manualmente
- Se precisar reiniciar: avisar o usuário para fechar o servidor atual e iniciar novamente
- Evitar executar múltiplas instâncias do servidor em portas diferentes para facilitar o gerenciamento do ambiente

### Configuração do Ambiente
O projeto requer variáveis de ambiente configuradas antes do desenvolvimento:
- Verificar existência do arquivo `.env`
- Usar `.env.example` como modelo para criar novo `.env`
- Executar `npm run check-env` para validar configuração

## Arquitetura do Projeto

### Stack Tecnológica
- **Frontend**: React 18 + TypeScript + Vite
- **Biblioteca UI**: componentes shadcn/ui com primitivos Radix UI
- **Estilização**: Tailwind CSS com configurações customizadas
- **Gerenciamento de Estado**: React Query (TanStack Query) para estado do servidor
- **Backend**: A ser definido conforme necessidade do projeto
- **Ícones**: Lucide React
- **Formulários**: React Hook Form com validação Zod
- **Roteamento**: React Router DOM v6

**IMPORTANTE - Ambiente de Produção**:
- **NUNCA usar código de simulação, mockData ou placeholders** - Esta é uma aplicação real de produção
- **SEMPRE implementar soluções concretas e funcionais** conforme a arquitetura definida
- **NUNCA criar dados fictícios ou simulados** a menos que explicitamente solicitado para fins de desenvolvimento
- Quando encontrar código de simulação existente, substituir por implementação adequada

## Análise de Screenshots

**IMPORTANTE**: Para análise de screenshots e resolução de tarefas visuais, sempre consulte o diretório de screenshots do Windows para obter a imagem mais atual:

**Diretório de Screenshots**: 
- **Caminho Windows**: `C:\Users\Administrador\Pictures\Screenshots`
- **Caminho WSL**: `/mnt/c/Users/Administrador/Pictures/Screenshots/`

### Como acessar screenshots no ambiente WSL:

```bash
# Buscar o screenshot mais recente por data de modificação
find /mnt/c/Users/Administrador/Pictures/Screenshots/ -name "*.png" -printf "%T@ %Tc %p\n" | sort -n | tail -1

# Acessar o screenshot mais recente
# Read [caminho do arquivo retornado pelo comando acima]
```

### Diretrizes:
- Sempre use o caminho WSL (`/mnt/c/...`) quando estiver no ambiente Linux
- **SOMENTE** verificar screenshots quando o usuário solicitar EXPLICITAMENTE análise visual de screenshot
- Usar a imagem mais atual para compreender o contexto visual do problema quando solicitado
- NÃO acessar automaticamente a pasta de screenshots sem solicitação expressa do usuário
- adicione essa explicação na parte do screenshot:   1. Bash(find /mnt/c/Users/Administrador/Pictures/Screenshots/:*)

  Função: Comando principal para buscar arquivos no diretório de screenshots
  - O que faz: Procura arquivos .png no diretório de screenshots do Windows
  - Por que precisa: É o comando base que localiza todos os screenshots disponíveis
  - Exemplo: find /mnt/c/Users/Administrador/Pictures/Screenshots/ -name "*.png"

  2. Bash(sort:*)

  Função: Ordena os resultados por timestamp (data/hora de modificação)
  - O que faz: Organiza a lista de arquivos em ordem cronológica
  - Por que precisa: Sem ordenação, não conseguimos identificar qual é o mais recente
  - Exemplo: sort -n (ordena numericamente os timestamps)

  3. Bash(tail:*)

  Função: Seleciona apenas o último item da lista ordenada
  - O que faz: Pega a última linha do resultado (o arquivo mais recente)
  - Por que precisa: Filtra apenas o screenshot mais atual, ignorando os antigos
  - Exemplo: tail -1 (mostra apenas a última linha)