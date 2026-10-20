# Especificação de Requisitos e Regras de Negócio

## 1. Visão Geral do Sistema

O **Sistema de Gerenciamento de Coletores Móveis** é integrado ao ecossistema industrial DASS para gerenciar com estrita confiabilidade, agilidade e rastreabilidade o ciclo de empréstimo e devolução de coletores de dados móveis utilizados na operação interna e logística.

A aplicação opera através do **Dass API Gateway** (porta `2399`), autentica operadores corporativos pelo **Dass Auth Service** (SSO corporativo), oferece autenticação local RBAC para perfil técnico de suporte, e consome a base de colaboradores preexistente no schema corporativo `colaborador`.

---

## 2. Atores do Sistema

| Ator | Descrição | Permissões / Autenticação |
| :--- | :--- | :--- |
| **Operador / Almoxarife (`OPERADOR`)** | Usuário responsável pelas entregas e recebimentos físicos de turno. | Autentica-se com credenciais corporativas DASS (usuário/senha); executa check-out e check-in; solicita manutenção de aparelhos avariados com OS; consulta inventário e dashboard em tempo real. |
| **Técnico de Suporte TI (`TI`)** | Equipe de suporte/infraestrutura responsável pela bancada técnica e triagem de equipamentos. | Autentica-se localmente (`suporte.ti` / `gdti5s11se`) ou via SSO com papel `TI`; atua como administrador técnico; detém **exclusividade absoluta sobre a manutenção** (único que executa entrada técnica e baixa com laudo); pode cadastrar e gerenciar operadores comuns (`OPERADOR`). |
| **Administrador Geral (`ADMIN`)** | Gestor responsável pelo controle global de inventário e parâmetros do sistema. | Acesso administrativo amplo; gerencia operadores, catálogo de coletores, parâmetros de SLA; executa check-in e check-out manuais; **solicita manutenção de aparelhos com OS (idêntico ao operador), mas não dá entrada técnica nem conclui reparo**, delegando a governança técnica à TI. |
| **Colaborador Operacional** | Funcionário que retira o coletor para o turno de trabalho. | Não acessa o software diretamente; é identificado pelo código de barras físico do seu crachá (14 dígitos corporativos, matrícula de 7 dígitos ou RFID) cadastrado no schema `colaborador`. |

---

## 3. Requisitos Funcionais (RF)

### 3.1 Módulo Operacional (Check-out & Check-in)
* **RF01 - Captura por Bipe Contínuo:** A interface deve manter foco automático nos campos de leitura de código de barras (crachá e patrimônio), permitindo fluxo ininterrupto acionado pela tecla `Enter` enviada pelo leitor.
* **RF02 - Retirada de Coletor (Check-out Híbrido):** O sistema deve registrar a custódia permitindo tanto a leitura direta do patrimônio via código de barras quanto a seleção visual em grade interativa (*Card Grid*) com busca instantânea dos aparelhos disponíveis em estoque.
* **RF03 - Validação de Crachá via Base Corporativa:** Ao bipar o crachá (código de barras 14 dígitos, matrícula ou RFID), o sistema consulta a base corporativa (`colaborador.colaboradores` e `colaborador.lista_funcionario`), identificando matrícula, nome completo, setor e função, além de verificar se o funcionário possui custódia pendente.
* **RF04 - Validação de Coletor:** O sistema deve validar se o patrimônio do coletor possui exatamente 7 dígitos numéricos e se seu status é `DISPONIVEL`.
* **RF05 - Devolução Rápida por Identificação do Colaborador (Check-in):** Ao bipar o crachá do colaborador (mesmo processo da retirada), o sistema localiza imediatamente a custódia aberta vinculada (Trava 1:1), projeta na tela os dados do coletor em posse e permite encerrar a movimentação com um único clique ou toque.
* **RF06 - Registro de Avaria no Check-in:** Permitir que, durante a devolução, o operador aponte defeito/avaria física constatada, direcionando o aparelho imediatamente para o status `MANUTENCAO`.
* **RF07 - Painel de Custódias em Tempo Real:** Exibir listagem dinâmica de coletores atualmente em uso, com dados de quem retirou (nome e setor corporativo), horário de saída, tempo decorrido e indicação visual de SLA.

### 3.2 Módulo de Inventário & Manutenção
* **RF08 - Cadastro e Edição de Coletores:** Permitir criar, editar, listar e inativar coletores com campos: patrimônio (7 dígitos), número de série, marca, modelo e status.
* **RF09 - Gestão de Status de Coletores:** Controlar estados `DISPONIVEL`, `EM_USO`, `MANUTENCAO` e `INATIVO`.
* **RF10 - Solicitação de Manutenção pelo Operador:** Permitir que operadores de almoxarifado solicitem manutenção de aparelhos em estoque (`DISPONIVEL`), descrevendo o defeito encontrado.
* **RF11 - Gestão Técnica de Manutenção (Exclusivo TI/ADMIN):** Somente usuários com perfil `TI` ou `ADMIN` têm permissão para dar entrada técnica direta com diagnóstico e baixa/conclusão de reparo preenchendo obrigatoriamente a solução técnica realizada.
* **RF12 - Check-out e Check-in Manual Administrativo:** Disponibilizar na tela de Inventário botões para que administradores realizem empréstimos e devoluções manuais de emergência sem passar pelo leitor de código de barras.

### 3.3 Módulo de Colaboradores e Bloqueios
* **RF13 - Consulta Integrada de Colaboradores:** Consulta em tempo real à base `colaborador` da fábrica sem necessidade de recadastramento manual.
* **RF14 - Bloqueio Local Preventivo:** Permitir que a gestão do almoxarifado registre restrições temporárias para matrículas específicas em caso de pendências administrativas ou extravios recorrentes.

### 3.4 Módulo de Relatórios e Auditoria
* **RF15 - Histórico de Movimentações:** Consulta filtrável por período, colaborador, coletor, operador e status (em aberto ou devolvido).
* **RF16 - Relatório de Violação de SLA:** Listagem e métricas de turnos/colaboradores com ocorrências de tempo de uso excedido.
* **RF17 - Rastreabilidade de Operadores:** Identificação clara de qual operador realizou a entrega (`operador_saida_id`) e qual recebeu a devolução (`operador_retorno_id`).

### 3.5 Módulo de Configurações & Gestão de Usuários
* **RF18 - Parametrização de SLA Global (Exclusivo ADMIN):** Configurar o limite padrão de permanência contínua de um coletor em minutos (ex: 480 minutos) e gatilho do alerta amarelo preventivo (ex: 80%).
* **RF19 - Gestão de Operadores Autorizados (Whitelist):** Permitir que usuários com perfil `TI` e `ADMIN` listem, cadastrem, ativem e inativem operadores autorizados no sistema.
* **RF20 - Consulta Prévia de Dados Corporativos:** Permitir consultar a base corporativa por usuário ou matrícula para facilitar o pré-preenchimento ao cadastrar um novo operador.

---

## 4. Requisitos Não-Funcionais (RNF)

* **RNF01 - Roteamento Único via Gateway:** Toda a comunicação externa passa pelo **Dass API Gateway** (prefixo `/api/coletores`). O backend recebe requisições tratadas via path rewrite.
* **RNF02 - Autenticação Dupla (SSO Corporativo + Local RBAC):** Autenticação corporativa integrada ao SSO DASS combinada com verificação local estrita na whitelist `gestao_coletores.operadores`. Suporte nativo a credenciais locais para o perfil técnico de suporte.
* **RNF03 - Conexão por `DATABASE_URL`:** O backend conecta-se ao PostgreSQL corporativo utilizando exclusivamente a variável de ambiente padronizada `DATABASE_URL` com pool de conexões otimizado (`max: 20`, timeouts de ociosidade).
* **RNF04 - Isolamento em Schema Dedicado:** Todas as tabelas, migrações e índices do sistema residem no schema isolado **`gestao_coletores`**, sem modificação em tabelas de schemas externos.
* **RNF05 - Atomicidade Transacional:** As operações de empréstimo e devolução são executadas em transação ACID única com lock pessimista (`pessimistic_write`) no coletor.
* **RNF06 - Tempo de Resposta (< 300ms):** A validação de bipe e efetivação da retirada/devolução ocorre com baixíssima latência graças ao cache de configurações de SLA em memória.
* **RNF07 - Usabilidade Total sem Mouse:** Os fluxos operacionais de check-out e check-in são 100% operáveis por leitor de código de barras e teclado (Enter).
* **RNF08 - Execução e Deploy em Produção (Sem Docker na Aplicação):** A aplicação é estruturada para rodar em produção via **PM2** (backend Node.js em modo gerenciado) e **Apache** (servidor web e proxy reverso para os assets do frontend compilados com `npm run build`).
* **RNF09 - Responsividade para Tablets e Dispositivos Móveis:** A interface web ajusta-se perfeitamente a telas de desktops, tablets industriais e smartphones, convertendo tabelas complexas em cartões verticais dinâmicos em resoluções `< md`.

---

## 5. Regras de Negócio (RN)

### RN01 - Formato Estrito do Patrimônio
* O patrimônio físico do coletor deve conter **exatamente 7 dígitos numéricos** (`^[0-9]{7}$`).
* Não são aceitos caracteres alfanuméricos, traços ou espaços.
* Zeros à esquerda são preservados como string fixa de 7 caracteres.

### RN02 - Trava de Custódia Única por Colaborador (1:1)
* Um colaborador **não pode** retirar um novo coletor se já possuir uma movimentação aberta (`data_retorno IS NULL`).
* **Garantia no BD:** Índice único parcial por matrícula do funcionário:
  ```sql
  CREATE UNIQUE INDEX idx_unico_coletor_por_matricula_aberto 
  ON gestao_coletores.movimentacoes (matricula_colaborador) 
  WHERE data_retorno IS NULL;
  ```

### RN03 - Trava de Custódia Única por Coletor (1:1)
* Um coletor **não pode** ser retirado se já estiver associado a uma movimentação aberta ou se seu status for diferente de `DISPONIVEL`.
* **Garantia no BD:** Índice único parcial:
  ```sql
  CREATE UNIQUE INDEX idx_unico_emprestimo_aberto_por_coletor 
  ON gestao_coletores.movimentacoes (coletor_id) 
  WHERE data_retorno IS NULL;
  ```

### RN04 - Máquina de Estados do Coletor
* **`DISPONIVEL`**: Apto para retirada imediata ou solicitação de manutenção.
* **`EM_USO`**: Atribuído a um colaborador em movimentação aberta.
* **`MANUTENCAO`**: Com avaria ou defeito técnico. Bloqueado para retirada até conclusão por usuário de `TI` ou `ADMIN`.
* **`INATIVO`**: Desativado do inventário permanente (descarte, perda ou sucata).

### RN05 - Validação de Elegibilidade do Crachá
* O bipe de crachá aceita código de barras corporativo (`codbarras`, 14 dígitos), matrícula numérica ou RFID.
* O colaborador deve existir na base `colaborador.colaboradores` e não possuir bloqueio administrativo em `gestao_coletores.bloqueios_colaboradores`.

### RN06 - Cálculo e Controle de SLA de Retenção
* `tempo_decorrido = NOW() - data_saida`.
* Se `tempo_decorrido > LIMITE_USO_MINUTOS`: indicador visual 🔴 **Excedido** e cálculo de atraso registrado no check-in.
* Se `tempo_decorrido >= (LIMITE_USO_MINUTOS * ALERTA_AMARELO_PERCENTUAL / 100)`: indicador visual 🟡 **Alerta**.

### RN07 - Transição Direta para Manutenção na Devolução
* Caso seja constatada avaria na devolução, a movimentação é encerrada normalmente e o coletor transita de `EM_USO` para `MANUTENCAO`, exigindo obrigatoriamente o preenchimento do motivo técnico e do número da OS do ERP em `gestao_coletores.historico_manutencoes`.

### RN08 - Primeiro Acesso e Bootstrap do Administrador Geral
* Quando não houver nenhum Administrador ativo no sistema (`papel = 'ADMIN'`), o **primeiro usuário** corporativo que se autenticar com sucesso via SSO DASS é automaticamente promovido a **Admin Geral** (`papel = 'ADMIN'`).
* O perfil padrão pré-semeado de infraestrutura (`suporte.ti`, papel `TI`) não bloqueia esse bootstrap, pois possui papel técnico intermediário.

### RN09 - Whitelist Estrita de Operadores para Login
* Usuários corporativos só conseguem autenticar e acessar o módulo se estiverem previamente cadastrados na tabela `gestao_coletores.operadores` e com status `ativo = true`.
* Usuários não cadastrados têm o acesso rejeitado com código `403 Forbidden` (`USUARIO_NAO_AUTORIZADO`).

### RN10 - Proteção de Integridade do Administrador
* Um administrador não pode desativar nem revogar seu próprio papel de `ADMIN`.
* O sistema bloqueia a inativação ou rebaixamento caso reste apenas um único administrador ativo no sistema.

### RN11 - Perfil Técnico Local (`suporte.ti`) e Imutabilidade
* O sistema inicializa no bootstrap a conta padrão `suporte.ti` com senha `gdti5s11se` e papel `TI`.
* As credenciais deste perfil residem estritamente no schema `gestao_coletores.operadores` com hash bcrypt, não interagindo com a tabela externa `autenticacao.usuarios`.
* **Imutabilidade do Perfil:** O papel do `suporte.ti` é fixo como `TI`. O sistema impede estritamente que qualquer usuário (inclusive o Administrador Geral) altere seu papel para `ADMIN` ou `OPERADOR`, ou execute sua inativação (`ativo = false`).

### RN12 - Regras de Subordinação do Papel `TI`
* Usuários com papel `TI` podem gerenciar operadores, mas **somente podem cadastrar o papel `OPERADOR`**.
* Usuários com papel `TI` não possuem autorização para inativar ou modificar registros de administradores (`ADMIN`) nem de outros técnicos (`TI`).
* Usuários com papel `TI` não têm permissão para alterar os parâmetros globais de SLA do sistema.

### RN13 - Obrigatoriedade e Formato da Ordem de Serviço (OS) do ERP
* No fluxo operacional, qualquer entrada de equipamento em manutenção deve estar vinculada a uma Ordem de Serviço aberta no ERP corporativo.
* Ao solicitar manutenção (via operador comum ou administrador) ou registrar avaria durante a devolução do coletor, o preenchimento do campo **Número da OS** (`numero_os`) é estritamente **obrigatório**.
* **Formato Estrito:** A OS deve ser composta de **exatamente 7 dígitos numéricos** (`^[0-9]{7}$`).
* O número da OS é persistido na tabela `gestao_coletores.coletores` (para identificação imediata na lista de inventário) e no log de auditoria permanente `gestao_coletores.historico_manutencoes`.
* Quando o reparo é concluído pela TI (`concluir-manutencao`), o campo `numero_os` no coletor é limpo, mantendo-se preservado no histórico de manutenções.
