# Gerenciamento de Coletores Móveis DASS

Sistema corporativo para gestão, custódia, rastreabilidade e ciclo de manutenção técnica de coletores de dados móveis em ambiente operacional.

---

## 📌 Principais Recursos

- **Check-out Híbrido:** Retirada rápida por leitor de código de barras ou seleção visual interativa (*Card Grid*).
- **Check-in por Colaborador:** Devolução simplificada bipando a identificação do titular (Trava 1:1 de custódia única).
- **Governança Técnica de Manutenção:** 
  - Operadores e administradores solicitam manutenção vinculando obrigatoriamente a Ordem de Serviço (OS) de **7 dígitos numéricos** aberta no ERP.
  - O perfil técnico de TI (`suporte.ti`) detém **exclusividade absoluta** para dar entrada técnica e concluir reparos com laudo e parecer.
  - Imutabilidade do perfil `suporte.ti` contra alterações de privilégios ou inativação acidental.
- **Controle de SLA Dinâmico:** Monitoramento visual em tempo real por faixas de retenção com alertas de prazo excedido.
- **Deploy Leve e Nativo:** Operação corporativa sem Docker na camada de aplicação, sob **PM2** e **Apache**.

---

## 📂 Estrutura do Repositório

```
gerenciamento_coletores/
├── backend/          # API RESTful (Node.js, Express, TypeScript, TypeORM)
├── frontend/         # SPA responsiva (Vue 3, Pinia, TailwindCSS, Vite)
├── sql/              # Scripts canônicos DDL e migrações PostgreSQL
├── docs/             # Documentação técnica detalhada de engenharia
└── documentacao_do_projeto.md # Visão consolidada do sistema
```

---

## 🚀 Como Executar Localmente

### 1. Pré-requisitos
- Node.js >= 18
- PostgreSQL com schema `gestao_coletores` inicializado via [`sql/init.sql`](./sql/init.sql)

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
# Ajuste as credenciais no .env
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 📚 Documentação Técnica Completa

Para aprofundamento nas regras de negócio e arquitetura, consulte a pasta [`docs/`](./docs):
1. [Requisitos e Regras de Negócio](./docs/01-requisitos-e-regras.md)
2. [Fluxos Operacionais e Diagramas](./docs/02-fluxos-operacionais.md)
3. [Modelagem Relacional e Banco de Dados](./docs/03-modelagem-banco-dados.md)
4. [Especificação de Contratos de API](./docs/04-especificacao-api.md)
5. [Arquitetura de Software e Diretrizes de Implantação](./docs/05-arquitetura-e-diretrizes.md)
