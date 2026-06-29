# Fontes Roboto - Versão Local (Offline)

Este diretório contém as fontes **Roboto** para uso offline no projeto SysView.

## 📦 Arquivos Incluídos

### Fontes WOFF2 (Web Open Font Format 2)
- `Roboto-Light.woff2` (300) - Peso leve
- `Roboto-Regular.woff2` (400) - Peso normal/padrão
- `Roboto-Medium.woff2` (500) - Peso médio
- `Roboto-Bold.woff2` (700) - Peso negrito

### Por que WOFF2?
- ✅ **Melhor compressão**: ~30% menor que TTF
- ✅ **Suporte universal**: Todos os navegadores modernos (Chrome, Firefox, Safari, Edge)
- ✅ **Otimizado para web**: Carregamento mais rápido
- ✅ **Formato padrão**: Recomendado pelo W3C

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
Roboto-Light.woff2     20 KB
Roboto-Regular.woff2   20 KB
Roboto-Medium.woff2    21 KB
Roboto-Bold.woff2      21 KB
```

**Total:** ~82 KB (88% menor que TTF!)

## ⚡ Performance

- **font-display: swap** - Garante que o texto seja exibido imediatamente
- **Formato WOFF2** - Melhor compressão e performance
- **Offline First** - Funciona sem conexão com internet
- **Carregamento rápido** - Arquivos 88% menores que TTF

## 🌐 Compatibilidade

- ✅ Chrome/Edge (todos)
- ✅ Firefox (todos)
- ✅ Safari (todos)
- ✅ Opera (todos)
- ✅ Navegadores mobile

## 🔧 Manutenção

Para atualizar as fontes:

1. Instale o pacote fontsource: `npm view @fontsource/roboto dist.tarball`
2. Baixe e extraia o arquivo `.tgz`
3. Copie os arquivos `roboto-latin-{peso}-normal.woff2` de `package/files/`
4. Renomeie para `Roboto-{Peso}.woff2` (Light, Regular, Medium, Bold)
5. Substitua os arquivos neste diretório

## 💡 Alternativas

Se preferir usar fontes variáveis (ainda menor):
- Use `Roboto[wdth,wght].woff2` do repositório oficial
- Atualize o `roboto.css` para usar fonte variável
- Redução adicional de tamanho: ~40% menor

