# Especificação Funcional - Sistema de Reconhecimento Facial (Face ID)

**Versão:** 1.0  
**Data:** 22/11/2025  
**Projeto:** Camera Web - Sistema de Autenticação Biométrica  
**Público-alvo:** Stakeholders, Gerentes de Projeto, Analistas de Negócio, Equipe de Desenvolvimento

---

## 📋 Índice

1. [Visão Geral](#1-visão-geral)
2. [Objetivos e Benefícios](#2-objetivos-e-benefícios)
3. [Requisitos Funcionais](#3-requisitos-funcionais)
4. [Fluxos de Uso Principais](#4-fluxos-de-uso-principais)
5. [Modelo de Dados](#5-modelo-de-dados)
6. [Segurança e Conformidade LGPD](#6-segurança-e-conformidade-lgpd)
7. [Critérios de Aceitação](#7-critérios-de-aceitação)
8. [Limitações e Restrições](#8-limitações-e-restrições)

---

## 1. Visão Geral

### 1.1. Descrição do Sistema

O **Sistema de Reconhecimento Facial (Face ID)** é uma solução de autenticação biométrica que permite aos usuários acessarem o sistema utilizando reconhecimento facial através da câmera do computador, eliminando a necessidade de senhas tradicionais.

### 1.2. Contexto de Negócio

O sistema será integrado ao sistema legado existente (Firebird 2.5) como uma **camada adicional de autenticação**, oferecendo aos usuários uma alternativa moderna e segura ao login tradicional por usuário e senha.

### 1.3. Escopo

**Incluído no escopo:**
- ✅ Cadastro de reconhecimento facial para usuários existentes
- ✅ Autenticação por reconhecimento facial
- ✅ Gerenciamento de dados biométricos (atualização, exclusão)
- ✅ Auditoria completa de acessos e tentativas
- ✅ Controle de segurança contra fraudes
- ✅ Conformidade com LGPD

**Fora do escopo:**
- ❌ Substituição completa do sistema de login tradicional
- ❌ Reconhecimento facial em dispositivos móveis (fase inicial)
- ❌ Autenticação multifator (MFA) combinada

---

## 2. Objetivos e Benefícios

### 2.1. Objetivos do Sistema

| # | Objetivo | Descrição |
|---|----------|-----------|
| 1 | **Modernização** | Oferecer método de autenticação moderno e intuitivo |
| 2 | **Segurança** | Aumentar segurança através de biometria facial |
| 3 | **Experiência do Usuário** | Simplificar processo de login (sem digitação de senha) |
| 4 | **Auditoria** | Registrar todos os acessos para conformidade e segurança |
| 5 | **Integração** | Integrar perfeitamente com sistema legado existente |

### 2.2. Benefícios Esperados

**Para Usuários:**
- ⚡ Login rápido (2-3 segundos)
- 🔒 Não precisa lembrar senhas
- 📱 Experiência moderna e intuitiva
- 🎯 Acesso personalizado e seguro

**Para a Organização:**
- 🛡️ Maior segurança (biometria não pode ser compartilhada)
- 📊 Auditoria completa de acessos
- ⚖️ Conformidade com LGPD
- 💰 Redução de chamados de "esqueci minha senha"

**Para TI:**
- 🔧 Fácil gerenciamento de usuários
- 📈 Relatórios detalhados de uso
- 🔄 Integração com sistema existente
- 🗄️ Dados centralizados no banco de dados

---

## 3. Requisitos Funcionais

### 3.1. RF-001: Cadastro de Face ID

**Descrição:** O sistema deve permitir que usuários cadastrem seu reconhecimento facial.

**Regras de Negócio:**
- RN-001: Apenas usuários já cadastrados no sistema podem registrar Face ID
- RN-002: Cada usuário pode ter apenas um cadastro de Face ID ativo
- RN-003: O sistema deve capturar uma foto do rosto do usuário
- RN-004: O sistema deve detectar automaticamente o rosto na imagem
- RN-005: O cadastro só é concluído se um rosto for detectado com sucesso
- RN-006: O usuário pode informar matrícula (opcional) durante o cadastro
- RN-007: A foto do rosto é armazenada no banco de dados para referência

**Dados Capturados:**
- Características faciais únicas (descriptor biométrico)
- Foto do rosto do usuário
- Matrícula (opcional)
- Data e hora do cadastro
- Usuário que realizou o cadastro

---

### 3.2. RF-002: Autenticação por Face ID

**Descrição:** O sistema deve permitir que usuários façam login utilizando reconhecimento facial.

**Regras de Negócio:**
- RN-008: O sistema deve comparar o rosto capturado com todos os cadastros ativos
- RN-009: A autenticação é bem-sucedida se a similaridade for >= 60% (threshold padrão)
- RN-010: Apenas um rosto deve ser detectado na imagem para autenticação
- RN-011: O sistema deve registrar todas as tentativas de autenticação (sucesso e falha)
- RN-012: Após 10 tentativas falhas consecutivas, o usuário deve ser bloqueado
- RN-013: Tentativas bem-sucedidas resetam o contador de falhas
- RN-014: O sistema deve exibir o nome do usuário autenticado
- RN-015: O tempo máximo de autenticação deve ser de 5 segundos

**Fluxo de Autenticação:**
```
1. Usuário acessa tela de login
2. Usuário clica em "Entrar com Face ID"
3. Sistema solicita permissão para usar câmera
4. Usuário autoriza uso da câmera
5. Sistema captura imagem do rosto
6. Sistema detecta rosto na imagem
7. Sistema compara com cadastros existentes
8. Sistema autentica usuário (se match encontrado)
9. Sistema redireciona para página inicial
```

**Resultado da Autenticação:**
- ✅ **Sucesso**: Usuário autenticado e redirecionado
- ❌ **Falha**: Mensagem de erro e nova tentativa permitida
- 🔒 **Bloqueio**: Após 10 falhas, usuário bloqueado temporariamente

---

### 3.3. RF-003: Atualização de Face ID

**Descrição:** O sistema deve permitir que usuários atualizem seu cadastro de Face ID.

**Regras de Negócio:**
- RN-016: Apenas o próprio usuário ou administradores podem atualizar Face ID
- RN-017: A atualização substitui completamente o cadastro anterior
- RN-018: O sistema deve registrar quem realizou a atualização
- RN-019: A foto anterior é substituída pela nova foto
- RN-020: O contador de tentativas falhas é resetado após atualização

**Casos de Uso:**
- Usuário mudou aparência (barba, óculos, corte de cabelo)
- Qualidade da foto anterior estava ruim
- Usuário deseja melhorar precisão do reconhecimento

---

### 3.4. RF-004: Exclusão de Face ID

**Descrição:** O sistema deve permitir que usuários excluam seu cadastro de Face ID.

**Regras de Negócio:**
- RN-021: Apenas o próprio usuário ou administradores podem excluir Face ID
- RN-022: A exclusão é lógica (campo ATIVO = 'N'), não física
- RN-023: O sistema deve registrar quem realizou a exclusão
- RN-024: Dados biométricos e foto são mantidos para auditoria
- RN-025: Usuário pode reativar Face ID posteriormente (novo cadastro)

**Motivos para Exclusão:**
- Usuário não deseja mais usar Face ID
- Problemas de reconhecimento persistentes
- Solicitação por questões de privacidade

---

### 3.5. RF-005: Consulta de Histórico de Acessos

**Descrição:** O sistema deve permitir consultar histórico de tentativas de autenticação.

**Regras de Negócio:**
- RN-026: Usuários podem ver apenas seu próprio histórico
- RN-027: Administradores podem ver histórico de todos os usuários
- RN-028: O histórico deve incluir data/hora, resultado (sucesso/falha), IP e dispositivo
- RN-029: O histórico deve ser mantido por no mínimo 90 dias
- RN-030: Filtros disponíveis: período, tipo (sucesso/falha), usuário

**Informações Exibidas:**
- Data e hora da tentativa
- Resultado (sucesso ou falha)
- Endereço IP de origem
- Dispositivo/navegador utilizado
- Nível de confiança do match (%)

---

### 3.6. RF-006: Listagem de Usuários com Face ID

**Descrição:** O sistema deve permitir listar todos os usuários cadastrados com Face ID.

**Regras de Negócio:**
- RN-031: Apenas administradores podem acessar a listagem completa
- RN-032: A listagem deve ser paginada (50 registros por página)
- RN-033: Deve permitir busca por nome ou matrícula
- RN-034: Deve exibir status (ativo/inativo)
- RN-035: Deve exibir data do último acesso bem-sucedido
- RN-036: Deve exibir quantidade de acessos nos últimos 7 dias

**Informações Exibidas:**
- Nome do usuário
- Matrícula
- E-mail
- Status (ativo/inativo)
- Data de cadastro
- Último acesso
- Acessos recentes (7 dias)

---

## 4. Fluxos de Uso Principais

### 4.1. Fluxo 1: Primeiro Cadastro de Face ID

```
┌─────────────────────────────────────────────────────────────┐
│ ATOR: Usuário Final                                         │
└─────────────────────────────────────────────────────────────┘

1. Usuário faz login no sistema (método tradicional)
2. Usuário acessa menu "Meu Perfil" ou "Configurações"
3. Usuário clica em "Cadastrar Face ID"
4. Sistema solicita permissão para usar câmera
5. Usuário autoriza uso da câmera
6. Sistema exibe preview da câmera
7. Sistema detecta rosto automaticamente
8. Sistema exibe indicador visual (moldura verde ao redor do rosto)
9. Usuário clica em "Capturar Foto"
10. Sistema processa imagem e extrai características faciais
11. Sistema exibe mensagem de sucesso
12. Sistema salva dados biométricos e foto no banco de dados
13. Usuário pode agora usar Face ID para login

┌─────────────────────────────────────────────────────────────┐
│ RESULTADO: Face ID cadastrado com sucesso                   │
└─────────────────────────────────────────────────────────────┘
```

**Cenários Alternativos:**

**A1. Rosto não detectado:**
- Sistema exibe mensagem: "Nenhum rosto detectado. Posicione seu rosto na frente da câmera."
- Usuário ajusta posição
- Sistema tenta detectar novamente

**A2. Múltiplos rostos detectados:**
- Sistema exibe mensagem: "Múltiplos rostos detectados. Certifique-se de estar sozinho na frente da câmera."
- Usuário ajusta ambiente
- Sistema tenta detectar novamente

**A3. Usuário já possui Face ID:**
- Sistema exibe mensagem: "Você já possui Face ID cadastrado. Deseja atualizar?"
- Usuário confirma atualização
- Sistema prossegue com novo cadastro

---

### 4.2. Fluxo 2: Login com Face ID

```
┌─────────────────────────────────────────────────────────────┐
│ ATOR: Usuário Final                                         │
└─────────────────────────────────────────────────────────────┘

1. Usuário acessa página de login do sistema
2. Usuário visualiza opções: "Login Tradicional" e "Face ID"
3. Usuário clica em "Entrar com Face ID"
4. Sistema solicita permissão para usar câmera
5. Usuário autoriza uso da câmera
6. Sistema exibe preview da câmera
7. Sistema detecta rosto automaticamente
8. Sistema captura imagem automaticamente (ou usuário clica em "Autenticar")
9. Sistema processa imagem (2-3 segundos)
10. Sistema compara com cadastros existentes
11. Sistema encontra match (similaridade >= 60%)
12. Sistema exibe: "Bem-vindo, [Nome do Usuário]!"
13. Sistema registra acesso na auditoria
14. Sistema reseta contador de tentativas falhas
15. Sistema redireciona para página inicial

┌─────────────────────────────────────────────────────────────┐
│ RESULTADO: Usuário autenticado com sucesso                  │
└─────────────────────────────────────────────────────────────┘
```

**Cenários Alternativos:**

**B1. Rosto não reconhecido:**
- Sistema exibe mensagem: "Rosto não reconhecido. Tente novamente."
- Sistema incrementa contador de tentativas falhas
- Sistema registra tentativa falha na auditoria
- Usuário pode tentar novamente ou usar login tradicional

**B2. Usuário bloqueado (10 tentativas falhas):**
- Sistema exibe mensagem: "Conta bloqueada por segurança. Entre em contato com o administrador."
- Sistema não permite novas tentativas de Face ID
- Usuário deve usar login tradicional ou contatar suporte

**B3. Câmera não disponível:**
- Sistema exibe mensagem: "Câmera não disponível. Verifique as permissões ou use login tradicional."
- Usuário pode tentar novamente ou usar login tradicional

---

### 4.3. Fluxo 3: Atualização de Face ID

```
┌─────────────────────────────────────────────────────────────┐
│ ATOR: Usuário Final ou Administrador                        │
└─────────────────────────────────────────────────────────────┘

1. Usuário acessa "Meu Perfil" > "Face ID"
2. Sistema exibe informações do Face ID atual:
   - Data de cadastro
   - Último acesso
   - Foto de referência
3. Usuário clica em "Atualizar Face ID"
4. Sistema solicita confirmação: "Deseja atualizar seu Face ID? O cadastro anterior será substituído."
5. Usuário confirma
6. Sistema inicia processo de captura (igual ao cadastro)
7. Sistema captura nova foto
8. Sistema processa e salva novos dados
9. Sistema exibe mensagem: "Face ID atualizado com sucesso!"
10. Sistema registra atualização na auditoria

┌─────────────────────────────────────────────────────────────┐
│ RESULTADO: Face ID atualizado com sucesso                   │
└─────────────────────────────────────────────────────────────┘
```

---

### 4.4. Fluxo 4: Exclusão de Face ID

```
┌─────────────────────────────────────────────────────────────┐
│ ATOR: Usuário Final ou Administrador                        │
└─────────────────────────────────────────────────────────────┘

1. Usuário acessa "Meu Perfil" > "Face ID"
2. Sistema exibe informações do Face ID atual
3. Usuário clica em "Excluir Face ID"
4. Sistema exibe confirmação: "Tem certeza que deseja excluir seu Face ID? Você precisará usar login tradicional."
5. Usuário confirma exclusão
6. Sistema desativa Face ID (ATIVO = 'N')
7. Sistema registra exclusão na auditoria
8. Sistema exibe mensagem: "Face ID excluído com sucesso."
9. Usuário volta a usar apenas login tradicional

┌─────────────────────────────────────────────────────────────┐
│ RESULTADO: Face ID desativado                               │
└─────────────────────────────────────────────────────────────┘
```

---

### 4.5. Fluxo 5: Consulta de Histórico (Administrador)

```
┌─────────────────────────────────────────────────────────────┐
│ ATOR: Administrador                                         │
└─────────────────────────────────────────────────────────────┘

1. Administrador acessa menu "Administração" > "Face ID"
2. Administrador clica em "Histórico de Acessos"
3. Sistema exibe filtros:
   - Período (data inicial e final)
   - Usuário (busca por nome)
   - Tipo (sucesso, falha, todos)
4. Administrador define filtros desejados
5. Administrador clica em "Buscar"
6. Sistema exibe lista paginada de acessos:
   - Data/Hora
   - Usuário
   - Resultado (sucesso/falha)
   - IP de origem
   - Dispositivo
   - Confiança (%)
7. Administrador pode exportar relatório (CSV/PDF)

┌─────────────────────────────────────────────────────────────┐
│ RESULTADO: Relatório de acessos gerado                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Modelo de Dados

### 5.1. Visão Geral do Modelo

O sistema utiliza **3 tabelas principais** para gerenciar Face ID:

```
┌─────────────────┐         ┌──────────────────────┐
│   TBUSUARIO     │◄────────│ TBUSUARIO_FACEID     │
│                 │ 1     * │                      │
│ - USUARIO_ID    │         │ - FACEID_ID (PK)     │
│ - NOME          │         │ - USUARIO_ID (FK)    │
│ - EMAIL         │         │ - DESCRIPTOR_FACIAL  │
│ - FAILED_ATTEMPTS│        │ - FOTO_URL           │
└─────────────────┘         │ - MATRICULA          │
                            │ - ATIVO              │
                            └──────────────────────┘
                                      │
                                      │ registra
                                      ▼
                            ┌──────────────────────┐
                            │     TBACESSO         │
                            │                      │
                            │ - ACESSO_ID (PK)     │
                            │ - CHAVE_ID (Face ID) │
                            │ - TIPO               │
                            │ - DATA               │
                            │ - IP                 │
                            │ - COMPUTADOR         │
                            └──────────────────────┘
```

---

### 5.2. Tabela: TBUSUARIO_FACEID

**Descrição:** Armazena os dados biométricos e foto dos usuários cadastrados com Face ID.

| Campo | Tipo | Descrição | Obrigatório |
|-------|------|-----------|-------------|
| FACEID_ID | INTEGER | Identificador único do Face ID | ✅ Sim |
| USUARIO_ID | INTEGER | Referência ao usuário (FK) | ❌ Não |
| DESCRIPTOR_FACIAL | BLOB | Características faciais únicas (512 bytes) | ✅ Sim |
| FOTO_URL | BLOB | Foto do rosto do usuário (50-200 KB) | ✅ Sim |
| MATRICULA | VARCHAR(30) | Matrícula do usuário | ❌ Não |
| ATIVO | CHAR(1) | Status: 'S' (ativo) ou 'N' (inativo) | ✅ Sim |
| DATA_INC | TIMESTAMP | Data/hora do cadastro | ✅ Sim |
| USUARIO_I | INTEGER | Usuário que cadastrou | ❌ Não |
| USUARIONOME_I | VARCHAR(30) | Nome do usuário que cadastrou | ❌ Não |
| DATA_ALT | TIMESTAMP | Data/hora da última atualização | ❌ Não |
| USUARIO_A | INTEGER | Usuário que atualizou | ❌ Não |
| USUARIONOME_A | VARCHAR(30) | Nome do usuário que atualizou | ❌ Não |
| DATA_DEL | TIMESTAMP | Data/hora da exclusão | ❌ Não |
| USUARIO_D | INTEGER | Usuário que excluiu | ❌ Não |
| USUARIONOME_D | VARCHAR(30) | Nome do usuário que excluiu | ❌ Não |

**Regras:**
- Um usuário pode ter apenas um Face ID ativo (ATIVO = 'S')
- Exclusão é lógica (ATIVO = 'N'), dados são mantidos para auditoria
- Foto e descriptor são armazenados diretamente no banco de dados

---

### 5.3. Tabela: TBUSUARIO (Campos Relacionados)

**Descrição:** Tabela existente de usuários, com campo adicional para controle de tentativas falhas.

| Campo | Tipo | Descrição | Uso no Face ID |
|-------|------|-----------|----------------|
| USUARIO_ID | INTEGER | Identificador único do usuário | Relacionamento com Face ID |
| NOME | VARCHAR | Nome do usuário | Exibido após autenticação |
| EMAIL | VARCHAR | E-mail do usuário | Identificação alternativa |
| FAILED_ATTEMPTS | INTEGER | Contador de tentativas falhas | Controle de bloqueio (max: 10) |

**Regras:**
- FAILED_ATTEMPTS é incrementado a cada falha de autenticação Face ID
- FAILED_ATTEMPTS é zerado após autenticação bem-sucedida
- Usuário é bloqueado quando FAILED_ATTEMPTS >= 10

---

### 5.4. Tabela: TBACESSO (Auditoria)

**Descrição:** Tabela existente de auditoria, utilizada para registrar todas as tentativas de autenticação Face ID.

| Campo | Tipo | Descrição | Uso no Face ID |
|-------|------|-----------|----------------|
| ACESSO_ID | INTEGER | Identificador único do acesso | Chave primária |
| CHAVE_ID | INTEGER | ID do Face ID (FACEID_ID) | Rastreabilidade |
| TIPO | VARCHAR | Tipo do evento | 'FACE_ID_AUTH_SUCCESS' ou 'FACE_ID_AUTH_FAILURE' |
| DATA | TIMESTAMP | Data/hora do acesso | Quando ocorreu |
| IP | VARCHAR | Endereço IP de origem | De onde veio |
| COMPUTADOR | VARCHAR | User-Agent do navegador | Qual dispositivo |
| LOCAL | VARCHAR | Origem do acesso | 'WEB_FACE_ID' |
| DETALHES | VARCHAR | Informações adicionais | JSON com dados extras |

**Tipos de Eventos:**
- `FACE_ID_AUTH_SUCCESS`: Autenticação bem-sucedida
- `FACE_ID_AUTH_FAILURE`: Autenticação falhou (rosto não reconhecido)

**Exemplo de DETALHES (JSON):**
```json
{
  "usuarioId": 123,
  "usuarioNome": "João Silva",
  "matricula": "12345",
  "distancia": 0.45,
  "confianca": 75.5,
  "threshold": 0.6
}
```

---

### 5.5. Estimativas de Armazenamento

| Cenário | Usuários | Tamanho Estimado |
|---------|----------|------------------|
| Pequeno | 100 usuários | ~10 MB |
| Médio | 1.000 usuários | ~100 MB |
| Grande | 10.000 usuários | ~1 GB |
| Muito Grande | 50.000 usuários | ~5 GB |

**Cálculo:**
- Descriptor facial: 512 bytes
- Foto: ~100 KB (média)
- Metadados: ~500 bytes
- **Total por usuário: ~100 KB**

---

## 6. Segurança e Conformidade LGPD

### 6.1. Princípios de Segurança

| Princípio | Implementação |
|-----------|---------------|
| **Confidencialidade** | Dados biométricos armazenados de forma segura no banco de dados |
| **Integridade** | Auditoria completa de todas as operações (cadastro, atualização, exclusão) |
| **Disponibilidade** | Sistema de backup regular do banco de dados |
| **Não-repúdio** | Registro de quem realizou cada operação (USUARIO_I, USUARIO_A, USUARIO_D) |

---

### 6.2. Conformidade com LGPD

#### 6.2.1. Base Legal

**Artigo 11, II, alínea 'a' da LGPD:**
> "O tratamento de dados pessoais sensíveis somente poderá ocorrer quando o titular ou seu responsável legal consentir, de forma específica e destacada, para finalidades específicas."

**Implementação:**
- ✅ Consentimento explícito do usuário antes do cadastro
- ✅ Finalidade específica: autenticação no sistema
- ✅ Usuário pode revogar consentimento (excluir Face ID) a qualquer momento

---

#### 6.2.2. Direitos do Titular (Usuário)

| Direito LGPD | Implementação no Sistema |
|--------------|--------------------------|
| **Acesso** | Usuário pode visualizar seus dados de Face ID (data cadastro, último acesso) |
| **Correção** | Usuário pode atualizar seu Face ID a qualquer momento |
| **Exclusão** | Usuário pode excluir seu Face ID (exclusão lógica) |
| **Portabilidade** | Usuário pode solicitar exportação de seus dados |
| **Informação** | Sistema informa claramente como os dados são usados |
| **Revogação** | Usuário pode revogar consentimento excluindo Face ID |

---

#### 6.2.3. Medidas de Segurança

**Proteção de Dados Biométricos:**
- 🔒 Dados armazenados no banco de dados com controle de acesso
- 🔒 Descriptor facial não pode ser revertido para foto original
- 🔒 Acesso aos dados apenas por usuários autorizados
- 🔒 Auditoria completa de todos os acessos
- 🔒 Backup criptografado do banco de dados

**Controle de Acesso:**
- 👤 Usuário comum: Acessa apenas seus próprios dados
- 👨‍💼 Administrador: Acessa dados de todos os usuários (com auditoria)
- 🔐 Logs de acesso registrados na TBACESSO

**Retenção de Dados:**
- 📅 Dados ativos: Mantidos enquanto Face ID estiver ativo
- 📅 Dados inativos: Mantidos por 90 dias após exclusão (auditoria)
- 📅 Histórico de acessos: Mantido por no mínimo 90 dias

---

### 6.3. Controle de Fraudes

**Mecanismos de Proteção:**

| Mecanismo | Descrição | Ação |
|-----------|-----------|------|
| **Limite de Tentativas** | Máximo 10 tentativas falhas consecutivas | Bloqueio automático |
| **Detecção de Rosto** | Apenas rostos reais são aceitos | Rejeita fotos de fotos |
| **Threshold de Confiança** | Similaridade mínima de 60% | Evita falsos positivos |
| **Auditoria Completa** | Todos os acessos registrados | Rastreabilidade total |
| **IP e Dispositivo** | Registro de origem do acesso | Detecção de anomalias |

---

## 7. Critérios de Aceitação

### 7.1. Critérios Funcionais

| ID | Critério | Métrica de Sucesso |
|----|----------|-------------------|
| CA-001 | Cadastro de Face ID | 95% de sucesso na detecção de rosto |
| CA-002 | Autenticação Face ID | Taxa de sucesso >= 90% para usuários cadastrados |
| CA-003 | Tempo de Autenticação | Máximo 5 segundos do início ao fim |
| CA-004 | Taxa de Falsos Positivos | Menor que 1% (não autenticar pessoa errada) |
| CA-005 | Taxa de Falsos Negativos | Menor que 10% (não reconhecer usuário correto) |
| CA-006 | Disponibilidade | Sistema disponível 99% do tempo |
| CA-007 | Auditoria | 100% das tentativas registradas na TBACESSO |

---

### 7.2. Critérios de Usabilidade

| ID | Critério | Métrica de Sucesso |
|----|----------|-------------------|
| CU-001 | Facilidade de Cadastro | Usuário consegue cadastrar em menos de 2 minutos |
| CU-002 | Facilidade de Login | Usuário consegue fazer login em menos de 10 segundos |
| CU-003 | Mensagens de Erro | Mensagens claras e orientativas em 100% dos casos |
| CU-004 | Compatibilidade | Funciona em Chrome, Firefox, Edge (últimas 2 versões) |
| CU-005 | Responsividade | Interface adaptada para telas >= 1024px |

---

### 7.3. Critérios de Segurança

| ID | Critério | Métrica de Sucesso |
|----|----------|-------------------|
| CS-001 | Bloqueio por Tentativas | Bloqueio após 10 tentativas falhas |
| CS-002 | Auditoria Completa | 100% das operações auditadas |
| CS-003 | Proteção de Dados | Dados biométricos não expostos em logs |
| CS-004 | Conformidade LGPD | Todos os direitos do titular implementados |
| CS-005 | Backup | Backup diário do banco de dados |

---

## 8. Limitações e Restrições

### 8.1. Limitações Técnicas

| Limitação | Descrição | Impacto |
|-----------|-----------|---------|
| **Navegadores** | Requer navegadores modernos com suporte a WebRTC | Navegadores antigos não suportados |
| **Câmera** | Requer câmera funcional no dispositivo | Não funciona sem câmera |
| **Iluminação** | Requer iluminação adequada para detecção | Ambientes muito escuros podem falhar |
| **Resolução** | Câmera com resolução mínima de 640x480 | Câmeras de baixa qualidade podem ter problemas |
| **Firebird 2.5** | Limitações do banco de dados legado | Algumas otimizações não disponíveis |

---

### 8.2. Restrições de Uso

| Restrição | Descrição | Justificativa |
|-----------|-----------|---------------|
| **Um Face ID por Usuário** | Cada usuário pode ter apenas um cadastro ativo | Simplificação e segurança |
| **Apenas Desktop** | Fase inicial apenas para desktop (não mobile) | Foco na implementação web |
| **Threshold Fixo** | Similaridade mínima de 60% (não configurável pelo usuário) | Balanceamento segurança/usabilidade |
| **Foto Obrigatória** | Foto é armazenada obrigatoriamente | Auditoria e referência visual |
| **Exclusão Lógica** | Dados não são deletados fisicamente | Conformidade e auditoria |

---

### 8.3. Cenários Não Suportados

❌ **Não suportado na versão atual:**
- Reconhecimento facial em dispositivos móveis (smartphones/tablets)
- Autenticação multifator (MFA) combinando Face ID + senha
- Reconhecimento de múltiplos rostos simultaneamente
- Detecção de vivacidade avançada (anti-spoofing com vídeo)
- Configuração de threshold por usuário
- Múltiplos cadastros de Face ID por usuário
- Reconhecimento facial offline (sem conexão com banco de dados)

---

### 8.4. Condições Ambientais Ideais

✅ **Para melhor experiência:**
- 💡 Iluminação frontal adequada (evitar contraluz)
- 📏 Distância de 30-60 cm da câmera
- 👤 Apenas uma pessoa na frente da câmera
- 🎭 Rosto descoberto (sem máscaras, óculos escuros)
- 📐 Rosto de frente para a câmera (não de perfil)
- 🖥️ Câmera com resolução mínima de 640x480
- 🌐 Conexão estável com a internet

---

## 9. Glossário

| Termo | Definição |
|-------|-----------|
| **Descriptor Facial** | Vetor matemático de 128 números que representa características únicas do rosto |
| **Threshold** | Limite mínimo de similaridade (60%) para considerar autenticação bem-sucedida |
| **Match** | Correspondência entre rosto capturado e cadastro no banco de dados |
| **BLOB** | Binary Large Object - tipo de dado para armazenar dados binários (foto, descriptor) |
| **Exclusão Lógica** | Marcar registro como inativo (ATIVO='N') sem deletar fisicamente |
| **Auditoria** | Registro completo de todas as operações para rastreabilidade |
| **LGPD** | Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018) |
| **Falso Positivo** | Sistema autentica pessoa errada (grave) |
| **Falso Negativo** | Sistema não reconhece pessoa correta (tolerável) |
| **Confiança** | Percentual de certeza do match (0-100%) |

---

## 10. Aprovações

| Papel | Nome | Data | Assinatura |
|-------|------|------|------------|
| **Gerente de Projeto** | | | |
| **Analista de Negócio** | | | |
| **Arquiteto de Software** | | | |
| **Responsável pela Segurança** | | | |
| **Encarregado de Dados (DPO)** | | | |

---

## 11. Histórico de Versões

| Versão | Data | Autor | Descrição |
|--------|------|-------|-----------|
| 1.0 | 22/11/2025 | Equipe de Desenvolvimento | Versão inicial da especificação funcional |

---

**Documento gerado automaticamente pelo sistema de documentação do projeto Camera Web.**


