# Configuração Offline - SysView

Este documento descreve as mudanças implementadas para garantir que o sistema funcione **100% offline**, sem dependências de CDNs ou recursos externos.

## 🎯 Problemas Resolvidos

### ❌ Problema 1: Erros de Fontes
**Sintomas:**
- `Failed to decode downloaded font`
- `OTS parsing error: invalid sfntVersion: 168430090`

**Causa:**
- Arquivos `.ttf` em `public/fonts/` eram páginas HTML do GitHub, não fontes válidas
- Navegador tentava decodificar HTML como fonte, causando erros

**Solução:**
- ✅ Substituídos por arquivos WOFF2 válidos do pacote `@fontsource/roboto`
- ✅ Formato WOFF2: 88% menor que TTF, melhor compressão
- ✅ Total: ~82 KB (vs ~1.1 MB em TTF)

### ❌ Problema 2: Modelos Face-API.js Online
**Sintomas:**
- `ERR_CONNECTION_TIMED_OUT` ao carregar modelos
- Tentativa de download de `justadudewhohacks.github.io/face-api.js/models/`

**Causa:**
- `src/lib/faceApiLoader.ts` configurado para carregar modelos de URL externa
- Ambiente offline não conseguia acessar os modelos

**Solução:**
- ✅ Modelos baixados e armazenados em `public/models/` (~11.2 MB)
- ✅ `MODEL_URL` alterado de URL externa para `/models`
- ✅ Biblioteca face-api.js baixada localmente em `public/face-api.min.js`
- ✅ `index.html` atualizado para usar versão local

## 📦 Arquivos Adicionados/Modificados

### Fontes (public/fonts/)
```
✅ Roboto-Light.woff2      (20 KB)
✅ Roboto-Regular.woff2    (20 KB)
✅ Roboto-Medium.woff2     (21 KB)
✅ Roboto-Bold.woff2       (21 KB)
📝 roboto.css              (atualizado para WOFF2)
📄 README.md               (documentação atualizada)
```

### Modelos Face-API.js (public/models/)
```
✅ ssd_mobilenetv1_model-weights_manifest.json
✅ ssd_mobilenetv1_model-shard1                 (4.0 MB)
✅ ssd_mobilenetv1_model-shard2                 (1.4 MB)
✅ tiny_face_detector_model-weights_manifest.json
✅ tiny_face_detector_model-shard1              (189 KB)
✅ face_landmark_68_model-weights_manifest.json
✅ face_landmark_68_model-shard1                (349 KB)
✅ face_recognition_model-weights_manifest.json
✅ face_recognition_model-shard1                (4.0 MB)
✅ face_recognition_model-shard2                (2.2 MB)
📄 README.md                                    (documentação)
```

### Biblioteca Face-API.js (public/)
```
✅ face-api.min.js (649 KB)
```

### Código Modificado
```
📝 index.html                  - Script CDN → Script local
📝 src/lib/faceApiLoader.ts    - MODEL_URL: URL externa → '/models'
📝 public/fonts/roboto.css     - TTF → WOFF2
📝 public/fonts/README.md      - Documentação atualizada
```

## 🚀 Como Funciona Agora

### 1. Carregamento de Fontes
```html
<!-- index.html -->
<link rel="stylesheet" href="/fonts/roboto.css" />
```

```css
/* public/fonts/roboto.css */
@font-face {
  font-family: 'Roboto';
  src: url('/fonts/Roboto-Regular.woff2') format('woff2');
}
```

### 2. Carregamento Face-API.js
```html
<!-- index.html -->
<script src="/face-api.min.js"></script>
```

### 3. Carregamento de Modelos
```typescript
// src/lib/faceApiLoader.ts
const MODEL_URL = '/models'

await Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
  faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
  faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
])
```

## ✅ Verificação

Para verificar se tudo está funcionando offline:

1. **Desconecte da internet**
2. **Inicie o servidor**: `npm run dev`
3. **Acesse**: `http://localhost:8080`
4. **Verifique no console do navegador**:
   - ✅ Sem erros de fontes
   - ✅ Sem erros de modelos
   - ✅ Face-API.js carregado
   - ✅ Modelos carregados com sucesso

## 📊 Tamanho Total dos Recursos Offline

| Recurso | Tamanho |
|---------|---------|
| Fontes Roboto (WOFF2) | ~82 KB |
| Face-API.js | ~649 KB |
| Modelos IA | ~11.2 MB |
| **TOTAL** | **~11.9 MB** |

## 🔒 Garantias

- ✅ **100% Offline**: Nenhuma dependência externa
- ✅ **Sem CDNs**: Todos os recursos locais
- ✅ **Sem Google Fonts**: Roboto local em WOFF2
- ✅ **Modelos Locais**: Face-API.js totalmente offline
- ✅ **Performance**: Carregamento rápido (sem latência de rede)

## 🛠️ Manutenção

### Atualizar Fontes
```bash
npm view @fontsource/roboto dist.tarball
wget [URL do tarball]
tar -xzf roboto-*.tgz
cp package/files/roboto-latin-*-normal.woff2 public/fonts/
```

### Atualizar Modelos
```bash
cd public/models
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/[modelo]
```

### Atualizar Face-API.js
```bash
wget -O public/face-api.min.js https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js
```

## 📝 Notas Importantes

1. **Não remova** os arquivos em `public/fonts/` e `public/models/`
2. **Não altere** os caminhos no código sem atualizar os arquivos
3. **Sempre teste** em modo offline após mudanças
4. **Mantenha** a documentação atualizada nos README.md

---

**Data da Configuração**: 2025-12-16  
**Versão Face-API.js**: 0.22.2  
**Versão Fontsource Roboto**: 5.2.9

