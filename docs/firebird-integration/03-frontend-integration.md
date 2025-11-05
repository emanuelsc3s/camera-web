# Frontend Integration - React + API

## 1. Visão Geral

Este documento detalha como adaptar o frontend React para consumir a API do backend ao invés do localStorage.

---

## 2. Instalação de Dependências

```bash
cd /home/emanuel/camera
npm install axios
```

**axios** - Cliente HTTP para fazer requisições à API

---

## 3. Cliente API (HTTP Client)

### 3.1 Arquivo `src/lib/api-client.ts`

```typescript
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Cria instância do axios
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de request (adicionar token de autenticação futuramente)
apiClient.interceptors.request.use(
  (config) => {
    // Aqui você pode adicionar tokens de autenticação
    // const token = localStorage.getItem('authToken');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de response (tratamento de erros global)
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Retry automático em caso de erro de rede (máximo 2 tentativas)
    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      error.response?.status === 503
    ) {
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Aguarda 1s
        return apiClient(originalRequest);
      }
    }

    // Tratamento de erros específicos
    if (error.response) {
      const status = error.response.status;

      switch (status) {
        case 401:
          // Não autorizado - redirecionar para login (futuramente)
          console.error('Não autorizado');
          break;
        case 403:
          // Proibido
          console.error('Acesso proibido');
          break;
        case 404:
          // Não encontrado
          console.error('Recurso não encontrado');
          break;
        case 500:
          // Erro do servidor
          console.error('Erro interno do servidor');
          break;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## 4. Serviço de API

### 4.1 Arquivo `src/services/apiService.ts`

```typescript
import apiClient from '@/lib/api-client';
import type { InspectionRecord, ReferenceData, InspectionStates, PaginatedResult } from '@/types/inspection';

// ==================== PRODUTOS ====================

/**
 * Busca dados de referência por OP
 */
export async function getProductByOP(op: string): Promise<ReferenceData> {
  const response = await apiClient.get(`/produtos/${op}`);
  return response.data;
}

/**
 * Busca dados de referência por GTIN
 */
export async function getProductByGTIN(gtin: string): Promise<ReferenceData> {
  const response = await apiClient.get(`/produtos/gtin/${gtin}`);
  return response.data;
}

/**
 * Lista todos os produtos
 */
export async function getAllProducts(page = 1, limit = 50) {
  const response = await apiClient.get('/produtos', {
    params: { page, limit },
  });
  return response.data;
}

// ==================== INSPEÇÕES ====================

/**
 * Cria nova inspeção
 */
export async function createInspection(data: {
  fotoBase64: string;
  referenceData: ReferenceData;
  inspectionStates: InspectionStates;
  observacoes?: string;
  usuario?: string;
}): Promise<{ id: number; message: string }> {
  const response = await apiClient.post('/inspecoes', data);
  return response.data;
}

/**
 * Lista inspeções com paginação e filtros
 */
export async function getInspections(params: {
  page?: number;
  limit?: number;
  campo?: string;
  termo?: string;
}): Promise<PaginatedResult<InspectionRecord>> {
  const response = await apiClient.get('/inspecoes', { params });
  return response.data;
}

/**
 * Busca inspeção por ID
 */
export async function getInspectionById(id: string): Promise<InspectionRecord> {
  const response = await apiClient.get(`/inspecoes/${id}`);
  return response.data;
}

/**
 * Exclui inspeção
 */
export async function deleteInspection(id: string): Promise<{ message: string }> {
  const response = await apiClient.delete(`/inspecoes/${id}`);
  return response.data;
}

/**
 * Exclui múltiplas inspeções
 */
export async function deleteMultipleInspections(
  ids: string[]
): Promise<{ message: string; deletedCount: number }> {
  const response = await apiClient.delete('/inspecoes/batch', {
    data: { ids },
  });
  return response.data;
}

/**
 * Exporta inspeções como JSON
 */
export async function exportInspectionsAsJSON(): Promise<InspectionRecord[]> {
  const response = await apiClient.get('/inspecoes/export/json');
  return response.data;
}

// ==================== UTILITÁRIOS ====================

/**
 * Verifica saúde da API
 */
export async function checkHealth(): Promise<{ status: string; timestamp: string; uptime: number }> {
  const response = await apiClient.get('/health');
  return response.data;
}
```

---

## 5. Hooks com React Query

### 5.1 Arquivo `src/hooks/useInspections.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInspections,
  getInspectionById,
  createInspection,
  deleteInspection,
  deleteMultipleInspections,
} from '@/services/apiService';
import type { InspectionStates, ReferenceData } from '@/types/inspection';

// ==================== QUERIES ====================

/**
 * Hook para buscar inspeções com paginação e filtros
 */
export function useInspections(params: {
  page?: number;
  limit?: number;
  campo?: string;
  termo?: string;
}) {
  return useQuery({
    queryKey: ['inspecoes', params],
    queryFn: () => getInspections(params),
    staleTime: 30000, // 30 segundos
  });
}

/**
 * Hook para buscar inspeção por ID
 */
export function useInspection(id: string) {
  return useQuery({
    queryKey: ['inspecoes', id],
    queryFn: () => getInspectionById(id),
    enabled: !!id, // Só executa se ID for fornecido
  });
}

// ==================== MUTATIONS ====================

/**
 * Hook para criar nova inspeção
 */
export function useCreateInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      fotoBase64: string;
      referenceData: ReferenceData;
      inspectionStates: InspectionStates;
      observacoes?: string;
      usuario?: string;
    }) => createInspection(data),
    onSuccess: () => {
      // Invalida cache de inspeções para forçar recarregamento
      queryClient.invalidateQueries({ queryKey: ['inspecoes'] });
    },
  });
}

/**
 * Hook para deletar inspeção
 */
export function useDeleteInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteInspection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspecoes'] });
    },
  });
}

/**
 * Hook para deletar múltiplas inspeções
 */
export function useDeleteMultipleInspections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => deleteMultipleInspections(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspecoes'] });
    },
  });
}
```

### 5.2 Arquivo `src/hooks/useProducts.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { getProductByOP, getProductByGTIN, getAllProducts } from '@/services/apiService';

/**
 * Hook para buscar produto por OP
 */
export function useProductByOP(op: string) {
  return useQuery({
    queryKey: ['produtos', 'op', op],
    queryFn: () => getProductByOP(op),
    enabled: !!op && op.length > 0, // Só executa se OP for fornecido
    staleTime: 60000, // 1 minuto
  });
}

/**
 * Hook para buscar produto por GTIN
 */
export function useProductByGTIN(gtin: string) {
  return useQuery({
    queryKey: ['produtos', 'gtin', gtin],
    queryFn: () => getProductByGTIN(gtin),
    enabled: !!gtin && gtin.length > 0,
    staleTime: 60000,
  });
}

/**
 * Hook para listar produtos
 */
export function useProducts(page = 1, limit = 50) {
  return useQuery({
    queryKey: ['produtos', 'list', page, limit],
    queryFn: () => getAllProducts(page, limit),
    staleTime: 300000, // 5 minutos
  });
}
```

---

## 6. Adaptação dos Componentes

### 6.1 HomePage.tsx - ALTERAÇÕES

**Linha 1-26: Imports**

```typescript
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import ReferenceDataCard from '@/components/inspection/ReferenceDataCard'
import PhotoCaptureModal from '@/components/inspection/PhotoCaptureModal'
import {
  ChevronLeft,
  Search,
  XCircle,
  CheckCircle2,
  Camera,
  Save,
  AlertCircle,
  Loader2
} from 'lucide-react'
import type { InspectionItem, ConformityState } from '@/types/inspection'
import { useCreateInspection } from '@/hooks/useInspections'
import { useProductByOP } from '@/hooks/useProducts'
```

**Linha 27-60: Component State**

```typescript
export default function HomePage() {
  const [lastPhoto, setLastPhoto] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [inspectionStates, setInspectionStates] = useState<Record<InspectionItem, ConformityState>>({
    gtin: null,
    datamatrix: null,
    lote: null,
    validade: null
  })

  // Estado para busca de OP
  const [op, setOp] = useState('')
  const [searchOP, setSearchOP] = useState('') // OP que será buscado

  // Hooks de API
  const { data: referenceData, isLoading: loadingProduct, error: productError } = useProductByOP(searchOP)
  const createMutation = useCreateInspection()

  // Buscar produto ao digitar OP
  const handleSearchProduct = () => {
    if (!op.trim()) {
      toast.error('Digite uma OP para buscar')
      return
    }
    setSearchOP(op)
  }

  // ...resto do código
```

**Linhas 92-130: handleConfirmSave - SUBSTITUIR**

```typescript
const handleConfirmSave = async () => {
  if (!referenceData) {
    toast.error('Busque um produto antes de salvar!')
    return
  }

  try {
    await createMutation.mutateAsync({
      fotoBase64: lastPhoto!,
      referenceData,
      inspectionStates,
    })

    toast.success('Registro de inspeção salvo com sucesso!')

    // Limpa o formulário após salvar
    setLastPhoto(null)
    setInspectionStates({
      gtin: null,
      datamatrix: null,
      lote: null,
      validade: null
    })
    setOp('')
    setSearchOP('')

    // Fecha o modal de confirmação
    setIsConfirmModalOpen(false)
  } catch (error) {
    console.error('Erro ao salvar:', error)
    toast.error('Erro ao salvar registro de inspeção')
  }
}
```

**Na renderização, ADICIONAR antes do ReferenceDataCard:**

```typescript
{/* Campo de busca de OP */}
<div className="flex-none bg-card rounded-lg border shadow-sm p-3">
  <div className="flex gap-2">
    <Input
      type="text"
      placeholder="Digite a OP..."
      value={op}
      onChange={(e) => setOp(e.target.value)}
      onKeyPress={(e) => e.key === 'Enter' && handleSearchProduct()}
      className="flex-1"
    />
    <Button
      onClick={handleSearchProduct}
      disabled={loadingProduct}
      className="gap-2"
    >
      {loadingProduct ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Search className="w-4 h-4" />
      )}
      Buscar
    </Button>
  </div>
</div>

{/* Dados de Referência */}
{loadingProduct && (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
)}

{productError && (
  <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
    <p className="text-destructive">Produto não encontrado para a OP informada</p>
  </div>
)}

{referenceData && <ReferenceDataCard data={referenceData} />}
```

### 6.2 ConsultaPage.tsx - ALTERAÇÕES

**Imports - SUBSTITUIR linhas 31-39:**

```typescript
import type { InspectionRecord } from '@/types/inspection'
import { useInspections, useDeleteInspection, useDeleteMultipleInspections } from '@/hooks/useInspections'
import { exportInspectionsAsJSON } from '@/services/apiService'
```

**Component State - SUBSTITUIR linhas 44-52:**

```typescript
export default function ConsultaPage() {
  const navigate = useNavigate()

  // Estados
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchField, setSearchField] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<InspectionRecord | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Hooks de API
  const { data, isLoading, error } = useInspections({
    page: currentPage,
    limit: pageSize,
    campo: searchField !== 'todos' ? searchField : undefined,
    termo: searchTerm || undefined,
  })

  const deleteMutation = useDeleteInspection()
  const deleteMultipleMutation = useDeleteMultipleInspections()

  const paginatedData = data || { data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }
```

**Funções - SUBSTITUIR:**

```typescript
// Exclui um registro
const handleDeleteRecord = async (id: string) => {
  if (confirm('Tem certeza que deseja excluir este registro?')) {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Registro excluído com sucesso!')
      setSelectedRecords(new Set())
    } catch (error) {
      toast.error('Erro ao excluir registro')
    }
  }
}

// Exclui múltiplos registros
const handleDeleteSelected = async () => {
  if (selectedRecords.size === 0) {
    toast.error('Selecione ao menos um registro para excluir')
    return
  }

  if (confirm(`Tem certeza que deseja excluir ${selectedRecords.size} registro(s)?`)) {
    try {
      await deleteMultipleMutation.mutateAsync(Array.from(selectedRecords))
      toast.success(`${selectedRecords.size} registro(s) excluído(s) com sucesso!`)
      setSelectedRecords(new Set())
    } catch (error) {
      toast.error('Erro ao excluir registros')
    }
  }
}

// Exporta registros como JSON
const handleExportJSON = async () => {
  try {
    const data = await exportInspectionsAsJSON()
    const jsonData = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `inspecoes_${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Registros exportados com sucesso!')
  } catch (error) {
    toast.error('Erro ao exportar registros')
  }
}
```

**Na renderização, ADICIONAR loading state:**

```typescript
{/* Conteúdo principal - Tabela */}
<div className="flex-1 overflow-auto p-4">
  {isLoading ? (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  ) : error ? (
    <Card className="p-8 text-center">
      <p className="text-destructive">Erro ao carregar inspeções</p>
    </Card>
  ) : paginatedData.data.length === 0 ? (
    <Card className="p-8 text-center">
      <p className="text-muted-foreground">
        {searchTerm ? 'Nenhum registro encontrado com os critérios de busca.' : 'Nenhum registro de inspeção salvo.'}
      </p>
    </Card>
  ) : (
    {/* Resto da tabela... */}
  )}
</div>
```

---

## 7. Atualização do .env

```env
VITE_APP_TITLE=SysView - Camera
VITE_API_URL=http://localhost:8000/api
```

---

## 8. Checklist de Migração

- [ ] Instalar axios
- [ ] Criar `src/lib/api-client.ts`
- [ ] Criar `src/services/apiService.ts`
- [ ] Criar `src/hooks/useInspections.ts`
- [ ] Criar `src/hooks/useProducts.ts`
- [ ] Atualizar `HomePage.tsx`
- [ ] Atualizar `ConsultaPage.tsx`
- [ ] Atualizar `.env`
- [ ] Testar criação de inspeção
- [ ] Testar listagem de inspeções
- [ ] Testar exclusão de inspeções
- [ ] Testar busca de produtos
- [ ] Testar exportação

---

**Documento criado em:** 04/11/2025
**Versão:** 1.0
