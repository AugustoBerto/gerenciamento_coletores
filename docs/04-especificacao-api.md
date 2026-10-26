# Especificação da API RESTful (Roteada pelo API Gateway)

O backend do **Sistema de Gerenciamento de Coletores** é construído em **Node.js + Express + TypeScript**.

No ecossistema corporativo:
- **Externamente (Frontend -> Gateway):** As chamadas utilizam o prefixo do gateway: `http://localhost:2399/api/coletores/*`.
- **Internamente (Gateway -> Backend):** O Dass API Gateway realiza o *path rewriting*, eliminando o prefixo `/api/coletores`. Portanto, o servidor Express registra seus roteadores a partir da raiz (`/*`).

---

## 1. Padrão de Respostas e Tratamento de Erros

### 1.1 Resposta de Sucesso
```json
{
  "sucesso": true,
  "dados": { ... },
  "mensagem": "Operação realizada com sucesso"
}
```

### 1.2 Resposta de Erro Padronizada
```json
{
  "sucesso": false,
  "codigo": "COLETOR_EM_USO",
  "mensagem": "O coletor informado já está sob posse de outro colaborador.",
  "detalhes": {
    "patrimonio": "1002345",
    "colaboradorNome": "João da Silva",
    "dataSaida": "2026-10-19T06:30:00.000Z"
  }
}
```

---

## 2. Autenticação e Sessão (`/auth`)

O módulo suporta autenticação híbrida:
1. **SSO Corporativo DASS (`Dass Auth Service`):** Para operadores e administradores com credenciais de rede fabril.
2. **RBAC Local do Schema `gestao_coletores`:** Para o perfil padrão de suporte de TI (`suporte.ti`), sem tocar em schemas externos.

### 2.1 `POST /auth/login`
- **Gateway:** `POST /api/coletores/auth/login`
- **Request Body (Corporativo ou Local):**
  ```json
  {
    "usuario": "suporte.ti",
    "senha": "********"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "sucesso": true,
    "mensagem": "Login efetuado com sucesso.",
    "dados": {
      "token": "eyJhbGciOi...",
      "usuario": {
        "id": "5176863c-...",
        "matricula": 9999001,
        "usuario": "suporte.ti",
        "nome": "Suporte TI",
        "papel": "TI"
      }
    }
  }
  ```

### 2.2 `GET /auth/me`
- **Gateway:** `GET /api/coletores/auth/me`
- **Headers:** `Authorization: Bearer <token>`
- Retorna os dados do operador autenticado na sessão atual.

### 2.3 `POST /auth/refresh`
- **Gateway:** `POST /api/coletores/auth/refresh`
- Renova a sessão do usuário com base no header Authorization ou cookies HttpOnly.

### 2.4 `POST /auth/logout`
- **Gateway:** `POST /api/coletores/auth/logout`
- Encerra a sessão ativa.

---

## 3. Validação de Crachá e Colaboradores (`/colaboradores`)

### 3.1 `POST /colaboradores/validar-cracha`
- **Gateway:** `POST /api/coletores/colaboradores/validar-cracha`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "codigo": "48192895434240"
  }
  ```
  *(Aceita código de barras do crachá corporativo de 14 dígitos, matrícula de 7 dígitos ou RFID).*
- **Response 200 OK (Apto para retirada):**
  ```json
  {
    "sucesso": true,
    "dados": {
      "matricula": 3023859,
      "nome": "ITAUAN DOS SANTOS MAIA",
      "setor": "Fuse Fabrica 2 Grupo 2 A",
      "funcao": "AUXILIAR DE LIDER",
      "apto": true
    }
  }
  ```

### 3.2 `GET /colaboradores/bloqueios`
- Lista colaboradores que possuem restrições ativas cadastradas.

### 3.3 `POST /colaboradores/bloqueios`
- Cadastra um bloqueio preventivo para determinada matrícula com justificativa.

### 3.4 `DELETE /colaboradores/bloqueios/:id`
- Remove ou desativa um bloqueio preventivo.

---

## 4. Módulo de Movimentações (`/movimentacoes`)

### 4.1 `GET /movimentacoes/ativas`
- **Gateway:** `GET /api/coletores/movimentacoes/ativas`
- Retorna todas as custódias em aberto com status dinâmico de SLA (`NORMAL`, `ALERTA` ou `EXCEDIDO`).

### 4.2 `POST /movimentacoes/retirada`
- **Gateway:** `POST /api/coletores/movimentacoes/retirada`
- Efetua a retirada em **transação atômica** no PostgreSQL com lock pessimista no coletor.
- **Request Body:**
  ```json
  {
    "matricula": 3023859,
    "patrimonio": "1000001"
  }
  ```
- **Response 201 Created:**
  ```json
  {
    "sucesso": true,
    "mensagem": "Retirada registrada com sucesso.",
    "dados": {
      "movimentacaoId": "8009d8be-...",
      "patrimonio": "1000001",
      "colaboradorNome": "ITAUAN DOS SANTOS MAIA",
      "dataSaida": "2026-10-20T10:00:00.000Z"
    }
  }
  ```

### 4.3 `GET /movimentacoes/ativa-por-colaborador/:identificador`
- **Gateway:** `GET /api/coletores/movimentacoes/ativa-por-colaborador/:identificador`
- **Objetivo Principal de Devolução:** Busca a custódia aberta a partir da leitura do crachá do colaborador (código de barras 14 dígitos, matrícula ou RFID).
- **Response 200 OK:**
  ```json
  {
    "sucesso": true,
    "dados": {
      "movimentacaoId": "8009d8be-...",
      "coletorId": "f53b398e-...",
      "patrimonio": "1000001",
      "marca": "Zebra",
      "modelo": "TC21",
      "numeroSerie": "212505230D0090",
      "colaborador": {
        "matricula": 3023859,
        "nome": "ITAUAN DOS SANTOS MAIA",
        "setor": "Fuse Fabrica 2 Grupo 2 A",
        "funcao": "AUXILIAR DE LIDER"
      },
      "operadorSaida": {
        "nome": "Wilker Camargo De Souza"
      },
      "dataSaida": "2026-10-20T06:00:00.000Z",
      "minutosEmUso": 240,
      "tempoFormatado": "4h 00m",
      "statusSLA": "NORMAL",
      "limiteMinutos": 480
    }
  }
  ```

### 4.4 `GET /movimentacoes/ativa-por-patrimonio/:patrimonio`
- **Gateway:** `GET /api/coletores/movimentacoes/ativa-por-patrimonio/:patrimonio`
- Busca os dados da custódia aberta a partir do patrimônio físico do coletor (para conferência manual do Admin).

### 4.5 `POST /movimentacoes/:id/devolucao`
- **Gateway:** `POST /api/coletores/movimentacoes/:id/devolucao`
- Encerra a custódia em transação ACID.
- **Request Body (Devolução normal):**
  ```json
  {
    "avaria": false,
    "observacao": "Devolução normal no balcão"
  }
  ```
- **Request Body (Devolução com avaria constatada):**
  *(Se `avaria: true`, o preenchimento de `numeroOs` (exatamente 7 dígitos numéricos) e `motivoManutencao` é estritamente obrigatório. O coletor transita para status `MANUTENCAO` e grava ocorrência vinculada à OS no histórico).*
  ```json
  {
    "avaria": true,
    "numeroOs": "1049283",
    "motivoManutencao": "Vidro trincado após queda",
    "observacao": "Encaminhado para bancada técnica"
  }
  ```

---

## 5. Coletores e Inventário (`/coletores`)

* `GET /coletores`: Lista coletores com filtros (`status`, `setorId`, busca por texto, paginação).
* `GET /coletores/:id`: Detalhes de um coletor, seu setor vinculado e histórico de manutenções.
* `POST /coletores`: Cadastro de novo coletor (`patrimonio`, `marca`, `modelo`, `numeroSerie`, `setorId`) (Requer perfil `TI` ou `ADMIN`).
* `PUT /coletores/:id`: Edição de informações do coletor (`marca`, `modelo`, `numeroSerie`, `setorId`) (Requer perfil `TI` ou `ADMIN`).
* `POST /coletores/:id/solicitar-manutencao`:
  - **Permissão:** Todos os usuários autenticados (`OPERADOR`, `ADMIN`, `TI`).
  - **Body:** `{ "motivo": "Touch screen falhando", "numeroOs": "1049283" }` *(Campos obrigatórios, OS de exatamente 7 dígitos numéricos)*
  - Transita o aparelho para `MANUTENCAO` e registra chamado para a TI vinculado à OS do ERP.
* `POST /coletores/:id/enviar-manutencao`:
  - **Permissão:** Exclusivo perfil técnico `TI` (`requireStrictTI`). Administradores e Operadores não têm acesso.
  - **Body:** `{ "motivo": "Ordem técnica preventiva de bateria", "numeroOs": "1049283" }` *(Campos obrigatórios, OS de exatamente 7 dígitos numéricos)*
* `POST /coletores/:id/concluir-manutencao`:
  - **Permissão:** Exclusivo perfil técnico `TI` (`requireStrictTI`). Administradores e Operadores não têm acesso.
  - **Body:** `{ "solucao": "Substituição do display touch e recalibração" }`
  - Fecha a manutenção, registra data de conclusão e libera o coletor para `DISPONIVEL` (limpando o `numero_os` ativo no coletor).
* `POST /coletores/:id/reativar`:
  - **Permissão:** Perfil `TI` ou `ADMIN` (`requireTI`).
  - Reativa coletor inativo (`status = 'INATIVO'`), restaurando seu estado para `DISPONIVEL`.
* `DELETE /coletores/:id`: Inativação lógica do coletor (Requer `TI` ou `ADMIN`).

---

## 6. Relatórios e Métricas (`/relatorios`)

* `GET /relatorios/historico`: Listagem analítica com filtros por período, coletor, matrícula e violações de SLA.
* `GET /relatorios/metricas-dashboard`:
  - Total de coletores no parque;
  - Coletores em uso;
  - Coletores disponíveis em estoque;
  - Coletores em manutenção;
  - Quantidade de custódias com SLA excedido no momento.

---

## 7. Configurações Globais, Usuários & Setores (`/configuracoes`)

* `GET /configuracoes`: Retorna os limites configurados de SLA (`LIMITE_USO_MINUTOS`, etc.).
* `PUT /configuracoes`: Atualiza os parâmetros globais de SLA (Exclusivo `ADMIN`).
* `GET /configuracoes/usuarios`: Lista todos os operadores autorizados cadastrados na whitelist (Requer `TI` ou `ADMIN`).
* `GET /configuracoes/usuarios/consultar/:identificador`: Pré-consulta dados corporativos por usuário ou matrícula na base da fábrica para agilizar o pré-preenchimento do formulário (Requer `TI` ou `ADMIN`).
* `POST /configuracoes/usuarios`:
  - Cadastra um novo operador autorizado na whitelist (`usuario`, `matricula`, `papel`, `nome`, `cargo`).
  - **Restrição de Papel:** Usuários com perfil `TI` só podem cadastrar o papel `OPERADOR`. Tentativas de cadastrar `TI` ou `ADMIN` retornam `403 Forbidden` (`PERMISSAO_NEGADA_TI`).
* `PATCH /configuracoes/usuarios/:id`:
  - Altera status (`ativo`) ou papel de um operador.
  - **Restrição de Papel:** Usuários com perfil `TI` não podem alterar contas de `ADMIN` nem de outros usuários `TI`. Administradores não podem desativar a si mesmos nem remover o último admin ativo.
* `GET /configuracoes/setores`:
  - Lista todos os setores de localização da fábrica (suporta `?somenteAtivos=true`).
  - Disponível para todos os usuários autenticados (usado em filtros e formulários de coletores).
* `POST /configuracoes/setores`:
  - Cadastra novo setor (`nome`, `descricao`) (Requer `TI` ou `ADMIN`).
* `PUT /configuracoes/setores/:id`:
  - Atualiza nome, descrição ou status de um setor (Requer `TI` ou `ADMIN`).
* `PATCH /configuracoes/setores/:id/status`:
  - Alterna o status ativo/inativo de um setor (Requer `TI` ou `ADMIN`).
