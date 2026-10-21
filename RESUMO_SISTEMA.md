# Resumo Executivo e Operacional - Gerenciamento de Coletores DASS

Este documento consolida a visão funcional, os fluxos operacionais, os papéis de acesso e as regras de negócio do **Sistema de Gerenciamento de Coletores Móveis**.

---

## 1. Visão Geral e Propósito

O sistema foi desenvolvido para substituir controles manuais (cadernos e planilhas) por uma plataforma web centralizada, de alta velocidade e à prova de falhas operacionais, assegurando:
* **Rastreabilidade em tempo real:** controle instantâneo de qual colaborador está de posse de cada coletor móvel na fábrica.
* **Custódia estrita (Trava 1:1):** garantia de que cada colaborador só pode retirar um único aparelho por vez.
* **Operação ágil e híbrida:** suporte a leitores de código de barras USB/Bluetooth com foco automático contínuo para check-out e check-in rápidos no balcão, somado a uma grade visual interativa (*Card Grid*) para consulta rápida e operação em tablets.
* **Monitoramento dinâmico de SLA:** controle visual por cores (verde, amarelo e vermelho) indicando o tempo de permanência contínua do coletor com o colaborador no turno (limite configurável, padrão de 8 horas / 480 minutos).
* **Ciclo de Manutenção com Ordem de Serviço (OS) do ERP:** obrigatoriedade de vincular a OS corporativa de exatamente 7 dígitos numéricos a qualquer coletor avariado, com **governança técnica exclusiva da equipe de TI** para entrada e conclusão de reparo com laudo.
* **Gestão de Setores de Localização Fabril:** organização e rastreamento dos equipamentos por áreas físicas da fábrica (ex: *Almoxarifado Central*, *Expedição*, *Recebimento*, *Linha de Montagem*, *Logística Interna*).
* **Deploy Leve e Nativo:** arquitetura concebida para operar sem Docker na aplicação, rodando diretamente sob **PM2** (backend Node.js) e **Apache** (servidor web e proxy reverso).

---

## 2. Atores e Níveis de Permissão (RBAC)

O sistema conta com quatro perfis de participantes:

| Papel / Ator | Descrição | Permissões Principais |
| :--- | :--- | :--- |
| **Operador (`OPERADOR`)** | Almoxarife ou líder de turno responsável pela entrega e recebimento dos coletores. | • Realiza retiradas (check-out) e devoluções (check-in);<br>• Aponta avarias no recebimento;<br>• Solicita manutenção para coletores em estoque informando defeito e OS do ERP;<br>• Consulta o painel de custódias e o inventário em tempo real. |
| **Técnico de Suporte TI (`TI`)** | Equipe de tecnologia/infraestrutura responsável pela triagem física e bancada de reparo. | • **Exclusividade na bancada técnica:** único com autorização para dar entrada técnica e concluir reparos com laudo e parecer;<br>• Cadastra e edita coletores;<br>• Inativa e reativa coletores no sistema;<br>• Cadastra e gerencia setores de localização fabril;<br>• Cadastra e gerencia operadores comuns (`OPERADOR`) na whitelist. |
| **Administrador Geral (`ADMIN`)** | Gestor global do sistema e supervisão de ativos. | • Gestão ampla da whitelist de operadores (promover/rebaixar papéis e ativar/inativar contas);<br>• Configuração global dos parâmetros de tempo de SLA e percentual de alerta preventivo;<br>• Cadastra, edita, inativa e reativa coletores;<br>• Cadastra e gerencia setores de localização fabril;<br>• Realiza check-out e check-in manuais de emergência;<br>• **Solicita manutenção com OS (idêntico ao operador), sem acesso à conclusão técnica de reparo**, delegando a liberação do equipamento exclusivamente à TI. |
| **Colaborador Fabril** | Funcionário operacional que retira o coletor para realizar as atividades do turno. | • Não acessa a interface do sistema;<br>• É identificado pelo crachá corporativo (código de barras de 14 dígitos, matrícula de 7 dígitos ou RFID);<br>• Sujeito à regra de custódia única (1 coletor por pessoa). |

---

## 3. Funcionalidades do Sistema por Módulo

### 3.1 Painel Operacional em Tempo Real (Dashboard)
* **Contadores de Parque:** visualização imediata do total de coletores cadastrados, coletores disponíveis no almoxarifado, coletores em uso ativo e coletores retidos em manutenção.
* **Alerta de SLA Excedido:** contador e destaque visual para custódias que ultrapassaram o tempo limite estipulado.
* **Listagem Dinâmica de Custódias Ativas:**
  * Nome do colaborador, matrícula, setor corporativo e função;
  * Patrimônio, marca e modelo do coletor em posse;
  * Horário da retirada e tempo decorrido;
  * Badge de status de tempo:
    * 🟢 **Normal:** dentro da faixa de tempo aceitável;
    * 🟡 **Alerta:** atingiu o percentual de aviso prévio (ex: 80% do turno);
    * 🔴 **Excedido:** ultrapassou o limite estabelecido de uso contínuo;
  * Operador responsável pela liberação física.

### 3.2 Retirada de Coletor (Check-out Híbrido)
* **Validação Instantânea de Crachá:** bipe do código de barras corporativo com verificação imediata na base da fábrica (`colaborador.colaboradores` e `colaborador.lista_funcionario`):
  * Confirma se o colaborador está ativo e sem bloqueios;
  * Valida a Trava 1:1 (rejeita se o colaborador já possuir coletor em aberto);
  * Exibe cartão de confirmação com dados do funcionário.
* **Atribuição Flexível do Coletor:**
  * **Opção 1 (Bipe Rápido):** bipe direto do código de barras de patrimônio (7 dígitos);
  * **Opção 2 (Grade Visual - Card Grid):** clique no cartão do coletor desejado entre os aparelhos disponíveis, com indicação do setor de localização fabril e filtro por modelo/setor.
* **Confirmação e Foco Automático:** registro atômico com som de sucesso e retorno do foco do cursor para o campo de crachá para o próximo atendimento sem tocar no mouse.

### 3.3 Devolução de Coletor (Check-in por Colaborador)
* **Busca pelo Titular da Custódia:** o operador apenas bipa o crachá do colaborador (mesmo processo da retirada). O sistema localiza de forma instantânea a custódia em aberto vinculada àquela matrícula.
* **Projeção dos Dados do Aparelho:** exibe na tela o coletor que deve ser entregue fisicamente (patrimônio, modelo e número de série para conferência).
* **Dois Modos de Devolução:**
  1. **Devolução Normal:** o coletor é conferido íntegro e retorna instantaneamente ao status `DISPONIVEL`;
  2. **Devolução com Avaria Constatada:** o operador marca a opção de avaria, descreve o defeito encontrado e informa **obrigatoriamente a Ordem de Serviço (OS)** de 7 dígitos numéricos aberta no ERP corporativo. O aparelho transita diretamente para `MANUTENCAO` e grava a ocorrência no histórico.

### 3.4 Inventário de Coletores & Gestão de Ativos
* **Tabela Completa (Desktop) e Cartões Responsivos (Mobile/Tablet):**
  * Dados exibidos: Patrimônio (7 dígitos), Marca, Modelo, Setor de Localização, Número de Série, Status e Ocorrências/OS;
* **Filtros Combinados:** busca textual livre (por patrimônio, serial, marca ou setor), filtro por status (`DISPONIVEL`, `EM_USO`, `MANUTENCAO`, `INATIVO`) e filtro seletor por **Setor de Localização**;
* **Cadastro de Novos Coletores:** patrimônio (7 dígitos numéricos obrigatórios com zeros à esquerda preservados), marca, modelo, número de série e seleção de setor fabril;
* **Edição de Coletores Existentes:** permite atualizar marca, modelo, número de série e vincular/alterar o setor de localização do equipamento;
* **Inativação e Reativação:**
  * **Inativar:** bloqueia o coletor de ser emprestado (status `INATIVO`); disponível para `ADMIN` e `TI`; não permite inativar coletores em uso ativo;
  * **Reativar:** restaura coletores inativos diretamente para o status `DISPONIVEL`, liberando-os novamente para retirada imediata; disponível para `ADMIN` e `TI`;
* **Check-out e Check-in Manuais Administrativos:** ferramentas de contingência para que administradores realizem empréstimos ou devoluções manuais caso haja falha temporária em leitores físicos de código de barras.

### 3.5 Ciclo de Manutenção Técnica & Vínculo a Ordem de Serviço (OS)
* **Obrigatoriedade da OS do ERP:** toda entrada em manutenção exige o preenchimento de uma Ordem de Serviço com **exatamente 7 dígitos numéricos** (`^[0-9]{7}$`).
* **Solicitação pelo Operador:** qualquer operador ou administrador pode apontar falhas em aparelhos que estejam em estoque (`DISPONIVEL`), descrevendo o defeito e a OS aberta;
* **Bancada Técnica Exclusiva da TI:** apenas técnicos de TI (`suporte.ti`) têm acesso aos botões de **Entrada Técnica** e **Concluir Reparo**;
* **Conclusão com Laudo:** na finalização do conserto, o técnico preenche a descrição do laudo/solução técnica realizada (ex: *troca de display touch*, *recalibração de scanner*, *troca de bateria*). O coletor tem a OS liberada e retorna a `DISPONIVEL`.

### 3.6 Gestão de Setores de Localização Fabril
* **Aba de Setores em Configurações:** gerenciamento das áreas da fábrica onde os coletores são alocados;
* **Operações Disponíveis (ADMIN e TI):**
  * Cadastro de novos setores com nome (até 80 caracteres) e descrição/finalidade (até 255 caracteres);
  * Edição de nomes e descrições de setores cadastrados;
  * Ativação e inativação de setores;
* **Integração Visual:** o setor selecionado reflete imediatamente na listagem de inventário, nos filtros de busca e nas badges informativas dos cartões de retirada.

### 3.7 Gestão de Acessos & Whitelist de Operadores
* **Acesso Restrito por Whitelist:** apenas usuários cadastrados previamente na tabela `gestao_coletores.operadores` e com status ativo conseguem efetuar login;
* **Consulta Prévia Corporativa:** formulário de cadastro permite pesquisar matrículas ou nomes de usuário corporativos na base da fábrica (`autenticacao.usuarios` e `colaborador`), preenchendo automaticamente nome e cargo;
* **Regras de Subordinação:**
  * O perfil técnico padrão `suporte.ti` possui papel imutável como `TI` e não pode ser inativado nem rebaixado;
  * Técnicos de TI só podem cadastrar novos operadores comuns (`OPERADOR`) e não podem alterar administradores;
  * Administradores gerenciam livremente operadores e outros admins, mas são impedidos de desativar a própria conta ou inativar o último administrador do sistema.

### 3.8 Configuração de SLA Global
* **Tempo Limite de Uso Contínuo:** parametrização do limite de minutos aceitáveis por empréstimo contínuo (ex: 480 minutos para turnos de 8h);
* **Gatilho de Alerta Preventivo:** percentual do tempo total em que a interface exibe o alerta amarelo (ex: 80% do tempo total);
* **Invalidação Dinâmica de Cache:** alterações nos parâmetros de SLA entram em vigor imediatamente em memória sem necessidade de reiniciar o servidor.

### 3.9 Relatórios e Auditoria Histórica
* **Histórico Abrangente de Movimentações:** registro de todas as retiradas e devoluções realizadas;
* **Filtros Analíticos:** busca por período de datas, patrimônio do coletor, matrícula do colaborador e identificação de devoluções com avaria ou extrapolação de SLA;
* **Rastreabilidade de Turno:** identifica claramente qual operador realizou a entrega do aparelho (`operador_saida_id`) e qual operador recebeu a devolução física (`operador_retorno_id`).

---

## 4. Mapeamento dos Fluxos Operacionais

### Fluxo 1: Retirada de Coletor (Check-out)
```
[Início do Atendimento]
   │
   ▼
[Bipar Crachá do Colaborador (14 dígitos / Matrícula / RFID)]
   │
   ├── Valida na base da fábrica (ativo e função)
   ├── Verifica restrições ou bloqueios locais
   └── Valida Trava 1:1: Possui coletor em aberto?
          ├── SIM ──> Emite alerta visual/sonoro: "Colaborador já possui coletor em uso" (Interrompe)
          └── NÃO ──> Emite bipe de sucesso e projeta dados do colaborador na tela
   │
   ▼
[Identificação do Coletor]
   ├── Opção A: Bipar código de barras do patrimônio (7 dígitos)
   └── Opção B: Clicar no cartão do aparelho livre na grade visual (Card Grid)
   │
   ▼
[Transação Atômica ACID no Banco]
   ├── Bloqueia o coletor com lock pessimista
   ├── Insere registro em gestao_coletores.movimentacoes (data_saida, operador, colaborador)
   └── Atualiza status do coletor para 'EM_USO'
   │
   ▼
[Confirmação Sonora/Visual e Foco Restaurado no Crachá para o Próximo]
```

---

### Fluxo 2: Devolução Normal de Coletor (Check-in)
```
[Colaborador chega ao balcão para devolver o aparelho]
   │
   ▼
[Bipar Crachá do Colaborador]
   │
   ├── Localiza a custódia aberta correspondente à matrícula (Trava 1:1)
   ├── Projeta os dados do aparelho na tela (Patrimônio, Marca, Modelo, S/N)
   └── Calcula o tempo total de posse e avalia o cumprimento de SLA
   │
   ▼
[Operador inspeciona visualmente o aparelho: Sem avarias]
   │
   ▼
[Clica em "Confirmar Devolução"]
   │
   ▼
[Transação Atômica ACID]
   ├── Preenche data_retorno, minutos_uso e operador_retorno_id na movimentação
   └── Restaura status do coletor para 'DISPONIVEL'
   │
   ▼
[Coletor liberado imediatamente na grade para uma nova retirada]
```

---

### Fluxo 3: Devolução com Avaria / Defeito Constatado
```
[Bipar Crachá do Colaborador no balcão de devolução]
   │
   ├── Projeta os dados do aparelho em posse
   ▼
[Operador identifica dano físico ou mau funcionamento]
   │
   ▼
[Marca a opção "Devolver com Avaria Constatada"]
   │
   ├── Preenchimento obrigatório da descrição do defeito
   └── Preenchimento OBRIGATÓRIO do Número da OS do ERP (7 dígitos numéricos)
   │
   ▼
[Confirma Devolução com Avaria]
   │
   ├── Encerra a movimentação daquele colaborador (libera a matrícula do titular)
   ├── Grava o histórico de manutenção com a OS vinculada
   └── Atualiza o status do coletor para 'MANUTENCAO' (bloqueado para novos empréstimos)
```

---

### Fluxo 4: Ciclo Técnico de Manutenção (Exclusivo TI)
```
[Coletor com status 'MANUTENCAO' na bancada técnica]
   │
   ├── Administradores e Operadores: Apenas visualizam badge de "Em Reparo com TI"
   └── Técnico de TI autenticado: Acessa os controles técnicos
   │
   ▼
[Técnico de TI realiza o conserto físico / substituição de peças]
   │
   ▼
[Clica em "Concluir Reparo"]
   │
   ├── Preenche obrigatoriamente a solução realizada (laudo técnico)
   │
   ▼
[Sistema finaliza o ciclo de manutenção]
   ├── Registra data de conclusão e solução técnica no histórico de manutenções
   ├── Limpa a OS ativa no cadastro do coletor
   └── Restaura o status do coletor para 'DISPONIVEL' (pronto para novo turno)
```

---

### Fluxo 5: Inativação e Reativação de Coletores (ADMIN e TI)
```
                  [Inventário de Coletores]
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [Coletor Fora de Uso]             [Coletor Desativado]
   (Status != 'EM_USO')              (Status == 'INATIVO')
            │                                 │
            ▼                                 ▼
   [Clica em "Inativar"]             [Clica em "Reativar"]
            │                                 │
            ▼                                 ▼
   [Confirma inativação]             [Confirma reativação]
            │                                 │
            ▼                                 ▼
  Status passa para 'INATIVO'       Status passa para 'DISPONIVEL'
  (Aparelho sai das grades de       (Aparelho volta a ficar livre
   retirada de balcão)               para empréstimos imediatos)
```

---

### Fluxo 6: Gestão de Setores e Associação aos Coletores
```
[Aba "Setores de Localização" em Configurações]
   │
   ├── Admin ou TI clica em "+ Novo Setor"
   ├── Informa Nome da Área (ex: "Expedição") e Descrição
   └── Setor gravado na tabela gestao_coletores.setores
   │
   ▼
[Vinculação no Inventário de Coletores]
   │
   ├── No cadastro de novo coletor ou edição de coletor existente
   ├── Seleciona o Setor correspondente no menu dropdown
   └── Coletor associado via chave estrangeira (setor_id)
   │
   ▼
[Reflexo no Sistema]
   ├── Inventário: Coluna "Setor" e filtro dedicado por setor no cabeçalho
   └── Retirada: Badge de setor no cartão do coletor e busca filtrável por setor
```

---

## 5. Regras de Negócio e Travas de Integridade

1. **Formato do Patrimônio (RN01):** composto estritamente por 7 dígitos numéricos (`^[0-9]{7}$`). Zeros à esquerda são mantidos e validados pelo banco e pela API.
2. **Trava de Custódia Única por Colaborador (RN02):** garantida no banco de dados por índice único condicional:
   ```sql
   CREATE UNIQUE INDEX idx_unico_coletor_por_matricula_aberto 
   ON gestao_coletores.movimentacoes (matricula_colaborador) 
   WHERE data_retorno IS NULL;
   ```
3. **Trava de Empréstimo Único por Coletor (RN03):** impede a retirada simultânea de um mesmo coletor físico:
   ```sql
   CREATE UNIQUE INDEX idx_unico_emprestimo_aberto_por_coletor 
   ON gestao_coletores.movimentacoes (coletor_id) 
   WHERE data_retorno IS NULL;
   ```
4. **Formato e Obrigatoriedade da Ordem de Serviço (RN13):** a abertura de solicitação de manutenção ou devolução com avaria exige obrigatoriamente uma OS de exatamente 7 dígitos numéricos (`^[0-9]{7}$`), vinculando o processo ao ERP da fábrica.
5. **Exclusividade da Manutenção para TI:** somente usuários com perfil `TI` têm autorização para executar a entrada técnica e a baixa/conclusão de reparos. Administradores e Operadores podem apenas solicitar a manutenção vinculando a OS.
6. **Imutabilidade do Perfil Técnico Fixo `suporte.ti` (RN11):** o usuário padrão `suporte.ti` possui perfil fixo e imutável. Nenhuma operação de interface ou chamada de API pode inativá-lo ou alterar seu papel.
7. **Proteção do Administrador (RN10):** um administrador é impedido de desativar a própria conta e o sistema bloqueia qualquer operação que deixe o sistema sem nenhum administrador ativo.
8. **Reativação Segura de Equipamentos (RN15):** apenas coletores inativos podem ser reativados, e o processo limpa eventuais dados residuais de manutenção antes de devolvê-los ao status `DISPONIVEL`.

---

## 6. Arquitetura Tecnológica e Integração DASS

* **Roteamento Unificado via Gateway:** todas as chamadas de frontend passam pelo **Dass API Gateway** na porta `2399` através da rota `/api/coletores/*`. O gateway realiza *path rewriting* e entrega as requisições ao backend Node.js na porta `3131`.
* **Banco de Dados PostgreSQL:**
  * Schema isolado `gestao_coletores`;
  * Conexão padronizada por variável de ambiente `DATABASE_URL`;
  * Integração de leitura aos schemas corporativos `colaborador` (crachás) e `autenticacao` (usuários).
* **Frontend Responsivo (Vue 3 + Vite + TailwindCSS):**
  * Detecção contínua de leitor de código de barras (`useBarcodeScanner`);
  * Efeitos sonoros de bipe e erro via Web Audio API (`useAudioFeedback`);
  * Animações de alerta em disparo único (`animate-bounce-once`), mantendo a sobriedade da tela operacional após o pop inicial.
* **Deploy em Produção (Sem Docker):**
  * Backend gerenciado por processo contínuo com **PM2**;
  * Frontend compilado em assets estáticos via `npm run build` e servido sob **Apache**.
