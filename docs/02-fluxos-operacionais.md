# Fluxos Operacionais e Ciclos de Vida (Ambiente Integrado DASS)

Este documento detalha os fluxos de trabalho da aplicação no ambiente integrado, considerando o **Dass API Gateway**, o **Dass Auth Service**, as tabelas corporativas de colaboradores e o perfil técnico de manutenção.

---

## 1. Ciclo de Vida do Coletor (State Machine)

```mermaid
stateDiagram-v2
    [*] --> DISPONIVEL : Cadastro Inicial
    
    DISPONIVEL --> EM_USO : Check-out (Retirada via Bipe ou Card Grid)
    EM_USO --> DISPONIVEL : Check-in por Crachá (Sem avaria)
    EM_USO --> MANUTENCAO : Check-in por Crachá (Com avaria apontada)
    
    DISPONIVEL --> MANUTENCAO : Solicitação de Operador / Entrada Técnica TI
    MANUTENCAO --> DISPONIVEL : Conclusão de Reparo / Parecer Técnico (TI/Admin)
    
    DISPONIVEL --> INATIVO : Baixa patrimonial / Descarte (Admin)
    MANUTENCAO --> INATIVO : Laudo de perda total / Sucata (Admin)
    INATIVO --> [*]
```

---

## 2. Fluxo 1: Retirada de Coletor (Check-out Híbrido)

### 2.1 Passos Operacionais
1. O operador está autenticado no sistema e acessa a tela de **Retirada**.
2. **Identificação do Colaborador:**
   - O operador bipa o código de barras no crachá do funcionário (código de 14 dígitos, matrícula de 7 dígitos ou RFID) e pressiona Enter.
   - O backend valida o colaborador no schema `colaborador` e verifica se já possui custódia aberta (`data_retorno IS NULL`).
   - Se possuir pendência: bloqueio imediato com aviso sonoro grave e mensagem visual da custódia aberta.
   - Se apto: projeta os dados corporativos (Nome, Matrícula, Setor, Função) e libera a escolha do coletor.
3. **Seleção do Coletor (Dois Métodos Disponíveis):**
   - **Opção A (Bipe Rápido):** O operador bipa a etiqueta de patrimônio (7 dígitos numéricos).
   - **Opção B (Seleção Visual em Card Grid):** A tela exibe uma grade interativa de cartões com todos os coletores em estoque `DISPONIVEL`, permitindo filtrar por modelo/patrimônio e selecionar com um único toque ou clique.
4. **Efetivação da Custódia:**
   - O backend executa transação ACID com lock pessimista (`pessimistic_write`) no coletor, vincula a custódia ao colaborador e operador de saída, atualizando o status do aparelho para `EM_USO`.
   - Feedback sonoro imediato de sucesso (tom agudo sintetizado).
   - O formulário reseta automaticamente o cursor para o campo de leitura de crachá, pronto para a próxima retirada.

### 2.2 Diagrama de Sequência: Retirada

```mermaid
sequenceDiagram
    autonumber
    actor Op as Almoxarife (Leitor Barcode / Tablet)
    participant UI as Frontend (Vue 3 / Pinia)
    participant GW as Dass API Gateway (:2399)
    participant API as Backend Coletores (:3050)
    participant DB as PostgreSQL (dass-postgres:5432)

    Op->>UI: Bipa Crachá do Colaborador (14 dígitos / Matrícula)
    UI->>GW: POST /api/coletores/colaboradores/validar-cracha { codigo }
    GW->>API: POST /colaboradores/validar-cracha (Path Rewrite)
    
    API->>DB: SELECT c.matricula, c.nome, l.nome_setor, l.funcao FROM colaborador.colaboradores c LEFT JOIN colaborador.lista_funcionario l ...
    DB-->>API: Colaborador localizado
    API->>DB: SELECT id FROM gestao_coletores.movimentacoes WHERE matricula_colaborador = :matricula AND data_retorno IS NULL
    DB-->>API: 0 registros abertos (Apto)
    API-->>GW: 200 OK (Dados Colaborador, Apto = true)
    GW-->>UI: 200 OK
    UI->>UI: Exibe dados corporativos e habilita Card Grid + campo de Bipe do Coletor

    alt Seleção via Bipe de Patrimônio
        Op->>UI: Bipa Patrimônio do Coletor (7 dígitos)
    else Seleção via Card Grid
        Op->>UI: Clica no Card do Coletor Disponível
    end

    UI->>GW: POST /api/coletores/movimentacoes/retirada { matricula, patrimonio }
    GW->>API: POST /movimentacoes/retirada (Path Rewrite)
    
    Note over API,DB: Início da Transação Atômica (QueryRunner)
    API->>DB: SELECT * FROM gestao_coletores.coletores WHERE patrimonio = :patrimonio FOR UPDATE
    DB-->>API: Coletor DISPONIVEL
    API->>DB: INSERT INTO gestao_coletores.movimentacoes (...)
    API->>DB: UPDATE gestao_coletores.coletores SET status = 'EM_USO' WHERE id = :coletorId
    Note over API,DB: Commit da Transação
    DB-->>API: Transação concluída
    
    API-->>GW: 201 Created (Movimentação gerada)
    GW-->>UI: 201 Created
    UI->>UI: Som de sucesso, limpa formulário e foca Crachá
```

---

## 3. Fluxo 2: Devolução por Identificação do Colaborador (Check-in)

### 3.1 Passos Operacionais
1. O operador acessa a tela de **Devolução**.
2. O colaborador apresenta seu **Crachá** no balcão e o operador realiza a leitura do código de barras (14 dígitos, matrícula ou RFID).
3. O frontend consulta `GET /api/coletores/movimentacoes/ativa-por-colaborador/:identificador`.
4. O backend localiza a custódia aberta vinculada à matrícula do colaborador (Regra 1:1) e projeta na tela:
   - Aparelho sob custódia (Patrimônio, Marca, Modelo, Serial);
   - Dados do titular (Nome, Matrícula, Setor e Função);
   - Horário de entrega, tempo total de posse e status de SLA (Normal, Alerta ou Excedido).
5. O operador inspeciona o aparelho físico devolvido e conclui:
   - **Devolução Padrão:** Clica em "Confirmar Devolução" -> o coletor retorna para status `DISPONIVEL`.
   - **Devolução com Avaria:** Marca a caixa de seleção "Avaria Constatada", descreve o defeito físico relatado e confirma -> o coletor transita para status `MANUTENCAO`.
6. Transação atômica encerra a movimentação com `data_retorno = NOW()`, operador do recebimento e tempo de posse calculado em minutos.

### 3.2 Diagrama de Sequência: Devolução pelo Colaborador

```mermaid
sequenceDiagram
    autonumber
    actor Op as Almoxarife (Leitor Barcode / Balcão)
    participant UI as Frontend (Vue 3 / Pinia)
    participant GW as Dass API Gateway (:2399)
    participant API as Backend Coletores (:3050)
    participant DB as PostgreSQL (dass-postgres:5432)

    Op->>UI: Bipa Crachá do Colaborador (Devolução)
    UI->>GW: GET /api/coletores/movimentacoes/ativa-por-colaborador/:identificador
    GW->>API: GET /movimentacoes/ativa-por-colaborador/:identificador (Path Rewrite)
    API->>DB: SELECT m.*, c.* FROM gestao_coletores.movimentacoes m JOIN gestao_coletores.coletores c ... WHERE m.matricula_colaborador = :matricula AND m.data_retorno IS NULL
    DB-->>API: Custódia ativa localizada
    API-->>GW: 200 OK (Dados do Coletor, Titular e SLA)
    GW-->>UI: 200 OK
    UI->>UI: Projeta detalhes do aparelho na tela para inspeção física

    alt Devolução sem Avaria
        Op->>UI: Clica em "Confirmar Devolução"
        UI->>GW: POST /api/coletores/movimentacoes/:id/devolucao { avaria: false }
        GW->>API: POST /movimentacoes/:id/devolucao
        Note over API,DB: Transação Atômica
        API->>DB: UPDATE gestao_coletores.movimentacoes SET data_retorno = NOW(), operador_retorno_id = :operadorId, minutos_uso = ...
        API->>DB: UPDATE gestao_coletores.coletores SET status = 'DISPONIVEL' WHERE id = :coletorId
        DB-->>API: Commit OK
        API-->>GW: 200 OK
        GW-->>UI: 200 OK
    else Devolução com Avaria Constatada
        Op->>UI: Marca "Avaria" + digita o defeito + informa Número da OS do ERP (7 dígitos) + Confirma
        UI->>GW: POST /api/coletores/movimentacoes/:id/devolucao { avaria: true, motivoManutencao: "Vidro trincado", numeroOs: "1049283" }
        GW->>API: POST /movimentacoes/:id/devolucao
        Note over API,DB: Transação Atômica
        API->>DB: UPDATE gestao_coletores.movimentacoes SET data_retorno = NOW(), operador_retorno_id = :operadorId, observacao_devolucao = 'Vidro trincado'
        API->>DB: UPDATE gestao_coletores.coletores SET status = 'MANUTENCAO', motivo_manutencao = 'Vidro trincado', numero_os = '1049283', data_envio_manutencao = NOW()
        API->>DB: INSERT INTO gestao_coletores.historico_manutencoes (coletor_id, operador_id, motivo_entrada, numero_os, data_entrada)
        DB-->>API: Commit OK
        API-->>GW: 200 OK
        GW-->>UI: 200 OK
    end
    UI->>UI: Som de sucesso, limpa dados e foca campo para o próximo crachá
```

---

## 4. Fluxo 3: Ciclo de Manutenção & Reparo Técnico

### 4.1 Papéis no Fluxo de Manutenção
* **Operador Comum e Administrador:** Apenas **solicitam manutenção** de coletores em estoque com defeito (`POST /coletores/:id/solicitar-manutencao`), fornecendo motivo e OS de 7 dígitos, ou apontam avaria no momento da devolução.
* **Técnico de TI (`suporte.ti`):** Detém **exclusividade técnica** sobre a manutenção; dá **entrada técnica direta** (`POST /coletores/:id/enviar-manutencao`) e é o **único autorizado a concluir o reparo** com laudo (`POST /coletores/:id/concluir-manutencao`).

```mermaid
sequenceDiagram
    autonumber
    actor Op as Operador / Administrador
    actor TI as Técnico de TI (suporte.ti)
    participant UI as Frontend
    participant API as Backend Coletores
    participant DB as PostgreSQL

    opt Solicitação pelo Operador ou Administrador
        Op->>UI: Clica em "Solicitar Manutenção" no Inventário
        UI->>UI: Exibe formulário com campos obrigatórios: Número da OS (7 dígitos) e Motivo
        UI->>API: POST /coletores/:id/solicitar-manutencao { motivo: "Touch inoperante", numeroOs: "1049283" }
        API->>DB: UPDATE coletores SET status = 'MANUTENCAO', motivo_manutencao = 'Touch inoperante', numero_os = '1049283'
        API->>DB: INSERT INTO historico_manutencoes (motivo_entrada, numero_os, ...)
        API-->>UI: 200 OK (Coletor em manutenção com vínculo à OS)
    end

    Note over TI,UI: Coletor sob triagem e reparo exclusivo da TI
    TI->>UI: Acessa Inventário e clica em "Concluir Reparo"
    UI->>UI: Abre modal obrigatório de Laudo / Solução Técnica
    TI->>UI: Informa parecer: "Substituição do display touch e calibração"
    UI->>API: POST /coletores/:id/concluir-manutencao { solucao: "..." }
    API->>DB: UPDATE historico_manutencoes SET solucao_saida = '...', data_conclusao = NOW()
    API->>DB: UPDATE coletores SET status = 'DISPONIVEL', motivo_manutencao = NULL, numero_os = NULL
    API-->>UI: 200 OK (Coletor disponível para novas retiradas)
```

---

## 5. Matriz de Tratamento de Exceções

| Cenário de Exceção | Código / HTTP | Reação no Frontend |
| :--- | :--- | :--- |
| **Crachá não localizado no schema `colaborador`** | `404 Not Found` (`COLABORADOR_NAO_ENCONTRADO`) | Tom grave de erro ("beep-error"), flash vermelho na tela, mensagem: "Crachá não localizado na base corporativa da fábrica." |
| **Colaborador com coletor já em posse** | `409 Conflict` (`COLABORADOR_POSSUI_PENDENCIA`) | Alerta em destaque: "Colaborador já possui um coletor em aberto." |
| **Colaborador sem custódia aberta na devolução** | `404 Not Found` (`NENHUMA_CUSTODIA_ABERTA`) | Alerta: "O colaborador não possui nenhum coletor em aberto no momento." |
| **Colaborador com bloqueio preventivo** | `403 Forbidden` (`COLABORADOR_BLOQUEADO`) | Alerta: "Retirada bloqueada para este colaborador: [Motivo registrado pelo almoxarifado]." |
| **Patrimônio fora do padrão de 7 dígitos** | `400 Bad Request` (`FORMATO_PATRIMONIO_INVALIDO`) | Validação instantânea antes de enviar ao backend; campo fica vermelho com foco mantido. |
| **Coletor indisponível / em uso** | `409 Conflict` (`COLETOR_EM_USO`) | Alerta: "Coletor indisponível para retirada." |
| **Operador comum tentando dar baixa técnica** | `403 Forbidden` (`ACESSO_NEGADO_TI`) | Ação desabilitada na interface; bloqueio no backend caso tentada chamada direta. |
| **Tentativa de TI cadastrar outro TI ou Admin** | `403 Forbidden` (`PERMISSAO_NEGADA_TI`) | Modal de cadastro bloqueia a seleção de papéis superiores; backend recusa com erro 403. |
| **Sessão expirada** | `401 Unauthorized` (`AUTH_SESSION_EXPIRED`) | Redirecionamento automático e suave para a tela de autenticação. |
