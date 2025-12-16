# Modelos Face-API.js - Versão Local (Offline)

Este diretório contém os modelos de IA necessários para o reconhecimento facial usando a biblioteca **face-api.js**.

## 📦 Modelos Incluídos

### 1. SSD MobileNet V1 (Detecção de Rostos)
- **Arquivos**:
  - `ssd_mobilenetv1_model-weights_manifest.json`
  - `ssd_mobilenetv1_model-shard1`
  - `ssd_mobilenetv1_model-shard2`
- **Tamanho**: ~5.4 MB
- **Função**: Detecta rostos em imagens/vídeo
- **Características**: Leve e rápido, otimizado para dispositivos móveis

### 2. Face Landmark 68 (Pontos Faciais)
- **Arquivos**:
  - `face_landmark_68_model-weights_manifest.json`
  - `face_landmark_68_model-shard1`
- **Tamanho**: ~350 KB
- **Função**: Detecta 68 pontos de referência no rosto
- **Uso**: Alinhamento facial, análise de expressões

### 3. Face Recognition (Reconhecimento Facial)
- **Arquivos**:
  - `face_recognition_model-weights_manifest.json`
  - `face_recognition_model-shard1`
  - `face_recognition_model-shard2`
- **Tamanho**: ~6.2 MB
- **Função**: Extrai descritores faciais (128 dimensões)
- **Uso**: Comparação e reconhecimento de rostos

## 🔧 Configuração

Os modelos são carregados automaticamente pelo arquivo `src/lib/faceApiLoader.ts`:

```typescript
const MODEL_URL = '/models'

await Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
  faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
  faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
])
```

## 📊 Tamanho Total

- **Total**: ~11 MB
- **Formato**: TensorFlow.js (JSON + Binary Shards)

## 🌐 Uso Offline

✅ **Todos os modelos estão armazenados localmente**
- Não requer conexão com internet
- Carregamento rápido (sem latência de rede)
- Funciona em ambientes isolados

## 🔄 Atualização

Para atualizar os modelos:

1. Acesse o [repositório oficial](https://github.com/justadudewhohacks/face-api.js/tree/master/weights)
2. Baixe os arquivos atualizados
3. Substitua os arquivos neste diretório
4. Mantenha a estrutura de nomes

## 📝 Licença

Os modelos são distribuídos sob a licença MIT do projeto face-api.js.

## 🔗 Referências

- [face-api.js GitHub](https://github.com/justadudewhohacks/face-api.js)
- [Documentação Oficial](https://justadudewhohacks.github.io/face-api.js/docs/index.html)
- [Modelos Pré-treinados](https://github.com/justadudewhohacks/face-api.js/tree/master/weights)

