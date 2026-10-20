# Sistema de Gerenciamento de Coletores Móveis

Documento de introdução, arquitetura de software e especificação técnica para a plataforma interna de rastreamento e controle de coletores de dados móveis.

---

## 1. Visão Geral do Projeto

### 1.1 Objetivo
Substituir controles manuais (planilhas e cadernos físicos) por uma solução web centralizada, ágil e à prova de falhas para o empréstimo e devolução de coletores de dados móveis em ambiente operacional, garantindo:
- **Rastreabilidade total:** saber em tempo real com qual colaborador está cada aparelho.
- **Custódia estrita:** garantia de que um colaborador retire no máximo um coletor por vez (Trava 1:1).
- **Operação veloz e híbrida:** fluxo otimizado para leitores de código de barras USB/Bluetooth com avanço automático de campos, e suporte visual a cartões interativos (*Card Grid*) para tablets e estações de balcão.
- **Controle de SLA de uso:** monitoramento visual dinâmico com alertas para aparelhos com tempo de retenção excedido.
- **Ciclo de manutenção com governança técnica exclusiva da TI e vínculo a OS do ERP:** operadores e administradores solicitam manutenção informando obrigatoriamente o número da Ordem de Serviço (7 dígitos numéricos) aberta no ERP; a equipe técnica de TI (`suporte.ti`) é a única autorizada a dar entrada técnica e baixa/conclusão de reparo com diagnóstico e laudo.
- **Deploy leve e nativo:** execução corporativa sem Docker na aplicação, operando diretamente sob **PM2** (backend Node.js) e **Apache** (servidor web e proxy reverso).

---

## 2. Escopo e Regras de Negócio Fundamentais

### 2.1 Identificação dos Ativos e Pessoas
- **Coletores de Dados:** Cada coletor possui um patrimônio físico obrigatório de **exatamente 7 dígitos numéricos** (`patrimonio ~ '^[0-9]{7}$'`).
- **Colaboradores:** Identificados por meio da leitura do código de barras presente no crachá funcional (14 dígitos corporativos, matrícula de 7 dígitos ou RFID).
- **Operadores do Sistema:** 
  - **Operador (`OPERADOR`):** Usuário autenticado na whitelist corporativa; realiza retiradas e devoluções; solicita manutenção de aparelhos com defeito e OS.
  - **Técnico de Suporte TI (`TI`):** Perfil técnico fixo de infraestrutura (`suporte.ti` / `gdti5s11se`), detém **exclusividade total** sobre a bancada técnica de manutenção e pode cadastrar operadores comuns.
  - **Administrador Geral (`ADMIN`):** Gestão global de usuários, inventário, parâmetros de SLA e execuções de checkout/checkin manual; solicita manutenção de aparelhos avariados (sem acesso a entrada técnica ou conclusão de reparo).

### 2.2 Regras de Negócio Fundamentais
1. **Regra de Custódia Única (Trava 1:1):**
   - O sistema impede a retirada caso o colaborador já possua um coletor em aberto (`data_retorno IS NULL`).
2. **Tempo Limite Parametrizável e Alertas de SLA:**
   - O tempo máximo de uso contínuo é configurado globalmente pelo Administrador (ex: 480 minutos / 8 horas).
   - O monitoramento em tempo real exibe status por cores:
     - 🟢 **Normal:** Tempo de uso dentro do limite estipulado.
     - 🟡 **Alerta:** Atingiu o percentual preventivo configurado (ex: 80% do tempo limite).
     - 🔴 **Excedido:** Tempo de turno estourado com indicação visual em destaque.
3. **Escopo Físico Focado:**
   - O sistema rastreia exclusivamente o coletor móvel (sem controle de baterias avulsas, coldres ou pistolas de empunhadura).
4. **Ciclo de Manutenção com Restrição Técnica Exclusiva da TI e Vínculo a OS do ERP:**
   - Coletores com status `MANUTENÇÃO` são travados pelo backend e não podem ser associados a colaboradores.
   - A abertura de solicitação de manutenção e o check-in com avaria exigem **obrigatoriamente o número da Ordem de Serviço (OS) com exatamente 7 dígitos numéricos** aberta no ERP.
   - Apenas usuários com perfil `TI` têm permissão para dar entrada técnica e liberar o coletor de volta para `DISPONÍVEL` preenchendo obrigatoriamente a solução técnica realizada.

---

## 3. Fluxos Operacionais

### 3.1 Fluxo de Retirada (Check-out Híbrido)
```
[Início] 
   │
   ▼
[Bipar Crachá / Matrícula / RFID] ──> Colaborador existe, ativo e sem pendências? 
   │                                     ├── NÃO ──> [Emite alerta sonoro/visual de bloqueio]
   │                                     └── SIM
   ▼
[Escolha do Coletor]
   ├── Opção 1: Bipar Patrimônio (7 dígitos)
   └── Opção 2: Clicar no Card do Coletor no Grid Visual de Disponíveis
   │
   ▼
[Transação Atômica no Banco (Lock Pessimista)]
   ├── Registra movimentação com data/hora de saída, operador, colaborador e coletor
   └── Atualiza o status do coletor para EM_USO
```

### 3.2 Fluxo de Devolução (Check-in por Colaborador)
```
[Início]
   │
   ▼
[Bipar Crachá do Colaborador (14 dígitos / Matrícula / RFID)]
   │
   ├── Localiza a custódia aberta vinculada ao titular (Trava 1:1)
   ├── Projeta os dados do aparelho na tela para inspeção física
   ├── Calcula o tempo decorrido de posse e valida o SLA
   │
   ├── Opção Normal: Confirma devolução ──> Coletor retorna para DISPONIVEL
   └── Opção Avaria: Informa defeito e Número da OS do ERP ──> Coletor transita para MANUTENCAO
   │
   └── Encerra movimentação com data_retorno, minutos_uso e operador de recebimento
```

---

## 4. Arquitetura Tecnológica e Integração DASS

A aplicação adota separação estrita de camadas e está integrada ao ecossistema corporativo da fábrica:

| Camada | Tecnologia | Papel no Projeto |
| :--- | :--- | :--- |
| **API Gateway** | Dass API Gateway (Porta `2399`) | Ponto de entrada corporativo, roteando `/api/coletores/*` com *path rewriting* para o backend. |
| **Autenticação** | Dass Auth Service + RBAC Local | SSO corporativo para operadores + autenticação local com bcrypt para `suporte.ti` no schema `gestao_coletores`. |
| **Frontend** | Vue 3 + Pinia + TailwindCSS + Vite | Interface SPA responsiva para tablets e desktops, code-splitting de rotas, Web Audio API para feedbacks sonoros e foco contínuo no teclado. |
| **Backend** | Node.js + Express + TypeScript | API RESTful com rotas seguras, transações atômicas com lock pessimista via `QueryRunner` e cache de SLA em memória. |
| **ORM & Conexão** | TypeORM via `DATABASE_URL` | Conexão padronizada com pool de conexões otimizado (`max: 20`, timeouts de ociosidade). |
| **Banco de Dados** | PostgreSQL (`dass-postgres:5432`) | Schema isolado `gestao_coletores`, integrado às tabelas corporativas `colaborador` (crachás) e `autenticacao` (usuários). |
| **Deploy em Produção** | **PM2 + Apache** (Nativo sem Docker) | Backend gerenciado pelo PM2 na porta `3050`; Apache servindo o frontend estático e proxy reverso. |

---

## 5. Modelagem de Dados (`gestao_coletores`)

```
┌─────────────────────────────────┐       1:N       ┌─────────────────────────────────┐
│ colaborador.colaboradores (DASS)│ ───────────────<│   gestao_coletores.movimentacoes │
└─────────────────────────────────┘                 └─────────────────────────────────┘
                                                                     │
┌─────────────────────────────────┐       1:N                        │
│   gestao_coletores.coletores    │ ─────────────────────────────────┤
└─────────────────────────────────┘                                  │
                                                                     │
┌─────────────────────────────────┐       1:N                        │
│   gestao_coletores.operadores   │ ─────────────────────────────────┘
│   (Whitelist SSO + suporte.ti)  │
└─────────────────────────────────┘
```

---

## 6. Documentação Técnica Completa

Para especificações detalhadas de engenharia, consulte os documentos na pasta [`docs/`](./docs):
- [**01. Requisitos e Regras de Negócio**](./docs/01-requisitos-e-regras.md)
- [**02. Fluxos Operacionais e Diagramas**](./docs/02-fluxos-operacionais.md)
- [**03. Modelagem Relacional e Script DDL**](./docs/03-modelagem-banco-dados.md)
- [**04. Especificação de Contratos de API**](./docs/04-especificacao-api.md)
- [**05. Arquitetura de Software e Diretrizes de Implementação**](./docs/05-arquitetura-e-diretrizes.md)
