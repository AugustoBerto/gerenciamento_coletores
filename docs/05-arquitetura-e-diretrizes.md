# Arquitetura de Software e Diretrizes de Implementação

Este documento estabelece a arquitetura técnica, diretrizes de integração com o ecossistema corporativo DASS, padrões de código, estratégias de otimização e o procedimento de deploy em produção com **PM2 e Apache** (sem containerização Docker na aplicação).

---

## 1. Topologia de Rede e Integração no Ecossistema

```
                              ┌──────────────────────────────────────────────┐
                              │     Navegador Web / Tablet / Smartphone      │
                              │     Frontend Vue 3 (Pinia + TailwindCSS)     │
                              └──────────────────────┬───────────────────────┘
                                                     │
                                                     │ HTTP (Porta 80 / 443 - Apache)
                                                     │ baseURL: /api/coletores
                                                     ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  Dass API Gateway (Porta 2399 - Container Docker)                                                  │
│  - Registrado em src/config/routes.ts: { prefix: "/api/coletores", service: "COLETORES_SERVICE"}   │
│  - Path Rewriting: Remove '/api/coletores' ao encaminhar para o backend na porta 3050             │
└─────────────────────────────────────┬─────────────────────────────────┬────────────────────────────┘
                                      │                                 │
               (Encaminha /auth/*)    │                                 │ (Encaminha /movimentacoes/*)
                                      ▼                                 ▼
┌──────────────────────────────────────────────┐  ┌──────────────────────────────────────────────────┐
│  Dass Auth Service (Porta 2123)              │  │  Backend Coletores (Porta 3050 - PM2 Nativo)     │
│  - SSO Corporativo DASS                      │  │  - Node.js + Express + TypeScript                │
│  - Validação de credenciais de operadores    │  │  - Pool de Conexões Otimizado (max: 20)          │
│  - Emissão de tokens JWT corporativos        │  │  - Cache em Memória de Parâmetros de SLA (1 min) │
└──────────────────────┬───────────────────────┘  │  - Lock pessimista transacional (QueryRunner)    │
                       │                          │  - RBAC Híbrido: SSO + suporte.ti local          │
                       │                          └─────────────────────┬────────────────────────────┘
                       │             PostgreSQL 15 (dass-postgres:5432) │
                       │             DATABASE_URL                       │
                       └────────────────────────►◄──────────────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 │ Schemas do Banco de Dados:                                  │
                 │ 1. autenticacao     -> Usuários do sistema / Operadores     │
                 │ 2. colaborador      -> Funcionários da fábrica e crachás    │
                 │ 3. gestao_coletores -> Coletores, custódias e histórico     │
                 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Estrutura de Diretórios do Projeto

```
gerenciamento_coletores/
├── docs/                                  # Documentação técnica e arquitetural consolidada
│   ├── 01-requisitos-e-regras.md
│   ├── 02-fluxos-operacionais.md
│   ├── 03-modelagem-banco-dados.md
│   ├── 04-especificacao-api.md
│   └── 05-arquitetura-e-diretrizes.md
│
├── sql/
│   └── init.sql                           # Script DDL canônico do schema gestao_coletores
│
├── backend/                               # API RESTful (Porta 3050 - Gerenciada via PM2)
│   ├── src/
│   │   ├── config/                        # database.ts (Pool & DATABASE_URL)
│   │   ├── database/
│   │   │   └── entities/                  # Coletor, Movimentacao, Operador, etc.
│   │   ├── modules/
│   │   │   ├── auth/                      # SSO corporativo + autenticação local suporte.ti
│   │   │   ├── colaboradores/             # Consulta em tempo real a colaborador.colaboradores
│   │   │   ├── coletores/                 # Inventário e controle de status do coletor
│   │   │   ├── movimentacoes/             # Check-out, check-in e cache de SLA em memória
│   │   │   ├── relatorios/                # Auditoria, históricos e métricas do dashboard
│   │   │   └── configuracoes/             # Whitelist de operadores e parâmetros de SLA
│   │   ├── shared/
│   │   │   ├── errors/                    # AppError customizado com códigos padronizados
│   │   │   └── middlewares/               # authMiddleware, requireTI, requireAdmin, errorHandler
│   │   ├── app.ts                         # Configuração do Express
│   │   └── server.ts                      # Bootstrap e seed do suporte.ti na porta 3050
│   ├── ecosystem.config.cjs               # Configuração do processo no PM2
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/                              # SPA Vue 3 (Vite + Pinia + TailwindCSS)
│   ├── src/
│   │   ├── api/                           # axios.ts com interceptors e refresh
│   │   ├── assets/                        # Estilos e ícones
│   │   ├── layouts/                       # Layout responsivo corporativo DASS
│   │   ├── router/                        # Vue Router com lazy loading / code-splitting
│   │   ├── stores/                        # authStore (permissões isTI, isAdmin, canManageUsers)
│   │   ├── views/                         # Dashboard, Retirada, Devolucao, Inventario, etc.
│   │   ├── App.vue
│   │   └── main.ts
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
└── documentacao_do_projeto.md             # Visão geral unificada
```

---

## 3. Padrões do Backend e Otimizações

### 3.1 Pool de Conexões Otimizado (`database.ts`)
Para garantir estabilidade em trocas de turno onde ocorrem dezenas de bipes por minuto:
```typescript
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  schema: 'gestao_coletores',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  extra: {
    max: 20,                  // Limite saudável de conexões concorrentes
    idleTimeoutMillis: 30000, // Encerra conexões ociosas
    connectionTimeoutMillis: 5000,
  },
  entities: [path.join(__dirname, '../database/entities/**/*.{ts,js}')],
  migrations: [path.join(__dirname, '../database/migrations/**/*.{ts,js}')],
});
```

### 3.2 Cache em Memória de Parâmetros de SLA
Evita que toda requisição de bipe ou listagem consulte a tabela `configuracoes`:
- Os limites são cacheados em memória por 60 segundos (`SLA_CACHE_TTL_MS = 60000`).
- Ao atualizar parâmetros via `PUT /configuracoes`, o método `MovimentacoesService.invalidarCacheSLA()` é acionado imediatamente, garantindo consistência sem overhead no banco.

### 3.3 Transação Atômica com Lock Pessimista
O fluxo de retirada bloqueia concorrentemente o registro do coletor durante a validação para evitar condição de corrida entre operadores em balcões distintos:
```typescript
const queryRunner = AppDataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();

try {
  const coletor = await queryRunner.manager.findOne(Coletor, {
    where: { patrimonio, status: 'DISPONIVEL' },
    lock: { mode: 'pessimistic_write' },
  });

  if (!coletor) {
    throw new AppError('Coletor indisponível para retirada.', 409, 'COLETOR_INDISPONIVEL');
  }

  // Registra movimentação e atualiza status para EM_USO
  ...
  await queryRunner.commitTransaction();
} catch (err) {
  await queryRunner.rollbackTransaction();
  throw err;
} finally {
  await queryRunner.release();
}
```

### 3.4 Autenticação Híbrida e Isolamento de Schema
- Usuários corporativos são validados no SSO corporativo e autorizados pela whitelist local `gestao_coletores.operadores`.
- O perfil de infraestrutura `suporte.ti` (senha `gdti5s11se`) possui autenticação local via bcrypt no próprio schema da aplicação, garantindo funcionamento autônomo sem alterar schemas externos.

---

## 4. Padrões do Frontend e Responsividade

### 4.1 Code-Splitting e Lazy Loading de Rotas
As views são carregadas sob demanda através de dynamic imports, reduzindo o chunk inicial do JavaScript de ~248 kB para ~167 kB:
```typescript
const DashboardView = () => import('../views/DashboardView.vue');
const RetiradaView = () => import('../views/RetiradaView.vue');
const DevolucaoView = () => import('../views/DevolucaoView.vue');
const InventarioView = () => import('../views/InventarioView.vue');
const RelatoriosView = () => import('../views/RelatoriosView.vue');
const ConfiguracoesView = () => import('../views/ConfiguracoesView.vue');
```

### 4.2 Responsividade para Tablets e Dispositivos Móveis
- Layout adaptativo com menu lateral/drawer automático para telas menores que `md` (< 768px).
- Todas as listagens densas (Inventário e Operadores) alternam automaticamente entre visualização de tabela tradicional para desktop e cartões verticais (*Cards Grid*) otimizados para toque em telas móveis.

### 4.3 Feedback Sonoro Sintetizado Nativo
Utilização de `AudioContext` da Web Audio API para gerar tons precisos sem download de arquivos de áudio:
- **Sucesso (Bipe OK):** Senoide 880 Hz por 120ms.
- **Erro / Restrição:** Onda quadrada dupla 220 Hz por 250ms.

---

## 5. Diretrizes de Deploy em Produção (Sem Docker: PM2 + Apache)

A aplicação não utiliza containers Docker em seu runtime de produção, operando de forma nativa e leve na VPS.

### 5.1 Backend com PM2
O processo do Node.js é gerenciado pelo PM2 com reinicialização automática e controle de memória:

1. **Arquivo de Configuração ([`backend/ecosystem.config.cjs`](file:///home/augusto/dev/gerenciamento_coletores/backend/ecosystem.config.cjs)):**
   ```javascript
   module.exports = {
     apps: [
       {
         name: 'gerenciamento-coletores-backend',
         script: './dist/server.js',
         instances: 1,
         autorestart: true,
         watch: false,
         max_memory_restart: '350M',
         env: {
           NODE_ENV: 'production',
           PORT: 3050,
         },
       },
     ],
   };
   ```
2. **Comandos de Build e Inicialização:**
   ```bash
   cd /home/augusto/dev/gerenciamento_coletores/backend
   npm install --production=false
   npm run build
   pm2 start ecosystem.config.cjs
   pm2 save
   ```

### 5.2 Frontend com Apache (Servidor Web & Proxy Reverso)
1. **Compilação dos Assets Estáticos:**
   ```bash
   cd /home/augusto/dev/gerenciamento_coletores/frontend
   npm install
   npm run build
   ```
   *Gera a pasta otimizada `frontend/dist` pronta para servir.*

2. **Configuração do VirtualHost no Apache (`/etc/apache2/sites-available/coletores.conf`):**
   ```apache
   <VirtualHost *:80>
       ServerName coletores.fabrica.dass
       DocumentRoot /home/augusto/dev/gerenciamento_coletores/frontend/dist

       # Suporte a SPA (Vue Router HTML5 History Mode)
       <Directory /home/augusto/dev/gerenciamento_coletores/frontend/dist>
           Options -Indexes +FollowSymLinks
           AllowOverride All
           Require all granted
           FallbackResource /index.html
       </Directory>

       # Encaminhamento de API para o Backend Node.js
       ProxyPreserveHost On
       ProxyPass /api/coletores http://127.0.0.1:3050
       ProxyPassReverse /api/coletores http://127.0.0.1:3050

       ErrorLog ${APACHE_LOG_DIR}/coletores_error.log
       CustomLog ${APACHE_LOG_DIR}/coletores_access.log combined
   </VirtualHost>
   ```

3. **Habilitar Módulos e Site no Apache:**
   ```bash
   sudo a2enmod rewrite proxy proxy_http headers
   sudo a2ensite coletores.conf
   sudo systemctl reload apache2
   ```

---

## 6. Configuração de Variáveis de Ambiente

### 6.1 Backend (`backend/.env`)
```ini
NODE_ENV=production
PORT=3050

# Conexão com o PostgreSQL Corporativo
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres

# Chave compartilhada para assinatura e validação de JWTs
JWT_SECRET=dass-auth-local-development-jwt-secret-2026

# URL do serviço de autenticação central DASS (acessível pelo backend)
DASS_AUTH_URL=http://127.0.0.1:2123

# Origens permitidas para CORS (Gateway e servidores Apache)
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:2399,http://coletores.fabrica.dass
```

### 6.2 Frontend (`frontend/.env`)
```ini
# URL base roteada pelo Gateway ou VirtualHost Apache
VITE_API_URL=http://localhost:2399/api/coletores
```
