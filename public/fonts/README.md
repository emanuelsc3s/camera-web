# Fontes Roboto - Versão Local (Offline)

Este diretório contém as fontes **Roboto** para uso offline no projeto SysView.

## 📦 Arquivos Incluídos

### Fontes TTF (TrueType)
- `Roboto-Light.ttf` (300) - Peso leve
- `Roboto-Regular.ttf` (400) - Peso normal/padrão
- `Roboto-Medium.ttf` (500) - Peso médio
- `Roboto-Bold.ttf` (700) - Peso negrito

## 🎨 Sobre a Fonte Roboto

**Roboto** é a fonte sans-serif padrão do Google, desenvolvida especificamente para interfaces digitais. É uma das fontes mais utilizadas em aplicações web e mobile.

### Características:
- ✅ Design moderno e limpo
- ✅ Excelente legibilidade em telas
- ✅ Similar às fontes do sistema (ui-sans-serif, system-ui)
- ✅ Otimizada para interfaces de usuário
- ✅ Suporte completo a caracteres latinos

## 🔧 Uso

As fontes são carregadas automaticamente através do arquivo `roboto.css` que está linkado no `index.html`:

```html
<link rel="stylesheet" href="/fonts/roboto.css" />
```

A configuração no Tailwind CSS já está definida para usar Roboto como fonte padrão:

```javascript
fontFamily: {
  sans: ['Roboto', 'ui-sans-serif', 'system-ui', ...],
}
```

## 📝 Licença

Roboto é uma fonte de código aberto licenciada sob a **Apache License 2.0**.

Veja o arquivo `LICENSE.txt` para mais detalhes.

## 🔗 Fonte Original

- **Projeto:** [Google Fonts - Roboto](https://fonts.google.com/specimen/Roboto)
- **GitHub:** [google/fonts](https://github.com/google/fonts/tree/main/apache/roboto)
- **Designer:** Christian Robertson

## 💾 Tamanho dos Arquivos

```
Roboto-Light.ttf     290 KB
Roboto-Regular.ttf   290 KB
Roboto-Medium.ttf    290 KB
Roboto-Bold.ttf      290 KB
```

**Total:** ~1.1 MB

## ⚡ Performance

- **font-display: swap** - Garante que o texto seja exibido imediatamente
- **Formato TTF** - Compatível com todos os navegadores
- **Offline First** - Funciona sem conexão com internet

## 🌐 Compatibilidade

- ✅ Chrome/Edge (todos)
- ✅ Firefox (todos)
- ✅ Safari (todos)
- ✅ Opera (todos)
- ✅ Navegadores mobile

## 🔧 Manutenção

Para atualizar as fontes:

1. Acesse o [repositório oficial](https://github.com/google/fonts/tree/main/apache/roboto/static)
2. Baixe os arquivos `.ttf` atualizados
3. Substitua os arquivos neste diretório
4. Atualize o `roboto.css` se necessário

## 💡 Alternativas

Se preferir usar fontes variáveis (menor tamanho):
- Baixe `Roboto[wdth,wght].ttf` do repositório oficial
- Atualize o `roboto.css` para usar fonte variável
- Redução de tamanho: ~60% menor

