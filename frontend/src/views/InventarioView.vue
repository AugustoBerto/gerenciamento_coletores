<template>
  <div class="space-y-6">
    <!-- Cabeçalho -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-200">
      <div>
        <h2 class="text-lg sm:text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          Inventário de Coletores
        </h2>
        <p class="text-xs text-gray-500 mt-1">Gestão patrimonial de ativos móveis, manutenções técnicas e disponibilidade operacional</p>
      </div>
      <div class="flex items-center gap-2 w-full sm:w-auto">
        <button
          v-if="authStore.canManageUsers"
          @click="abrirModalNovoColetor"
          class="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-[#002B49] hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition"
        >
          + Cadastrar Novo Coletor
        </button>
      </div>
    </div>

    <!-- Alertas Globais -->
    <div
      v-if="mensagemAlerta"
      class="p-4 rounded-xl border-2 text-xs sm:text-sm font-bold flex items-center justify-between shadow-sm animate-bounce-once"
      :class="tipoAlerta === 'sucesso' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-red-50 border-red-500 text-red-800'"
    >
      <div class="flex items-center gap-2">
        <span class="text-base font-black">{{ tipoAlerta === 'sucesso' ? '✓' : '⚠' }}</span>
        <span>{{ mensagemAlerta }}</span>
      </div>
      <button @click="mensagemAlerta = ''" class="text-xs font-black px-2 py-1 hover:underline">
        Dispensar
      </button>
    </div>

    <!-- Barra de Filtros e Busca -->
    <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-3">
      <div class="flex-1">
        <div class="relative">
          <input
            v-model="filtroBusca"
            type="text"
            placeholder="Buscar por patrimônio (7 dígitos), serial, marca ou modelo..."
            class="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#002B49]"
            @input="carregarColetores"
          />
          <div class="absolute left-3 top-2.5 text-gray-400">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>
      </div>
      <div class="w-full sm:w-48">
        <select
          v-model="filtroSetor"
          class="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#002B49] bg-white text-gray-700 font-semibold"
          @change="carregarColetores"
        >
          <option value="">Todos os Setores</option>
          <option v-for="s in setores" :key="s.id" :value="s.id">{{ s.nome }}</option>
        </select>
      </div>
      <div class="w-full sm:w-48">
        <select
          v-model="filtroStatus"
          class="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#002B49] bg-white text-gray-700 font-semibold"
          @change="carregarColetores"
        >
          <option value="">Todos os Status</option>
          <option value="DISPONIVEL">Disponível</option>
          <option value="EM_USO">Em Uso</option>
          <option value="MANUTENCAO">Em Manutenção</option>
          <option value="INATIVO">Inativo</option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="bg-white p-12 rounded-2xl shadow-sm border border-gray-200 text-center text-gray-400 text-xs">
      Carregando dados do inventário...
    </div>

    <!-- Empty State -->
    <div v-else-if="coletores.length === 0" class="bg-white p-12 rounded-2xl shadow-sm border border-gray-200 text-center">
      <p class="text-sm font-bold text-gray-700">Nenhum coletor localizado.</p>
      <p class="text-xs text-gray-400 mt-1">Tente ajustar os filtros de busca ou cadastrar novos equipamentos.</p>
    </div>

    <div v-else class="space-y-4">
      <!-- VISÃO DESKTOP (Tabela Completa em telas md e acima) -->
      <div class="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-gray-600">
            <thead class="bg-gray-100 text-gray-700 uppercase font-black text-[10px] tracking-wider">
              <tr>
                <th class="py-3 px-4">Patrimônio</th>
                <th class="py-3 px-4">Marca</th>
                <th class="py-3 px-4">Modelo</th>
                <th class="py-3 px-4">Setor</th>
                <th class="py-3 px-4">Nº de Série</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4">Observação / Defeito</th>
                <th class="py-3 px-4 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="c in coletores"
                :key="c.id"
                @click="abrirModalDetalhes(c)"
                class="hover:bg-slate-50 cursor-pointer transition select-none group"
              >
                <td class="py-3.5 px-4 font-mono font-bold text-gray-900 text-sm">
                  {{ c.patrimonio }}
                </td>
                <td class="py-3.5 px-4 font-semibold text-gray-800">{{ c.marca }}</td>
                <td class="py-3.5 px-4 font-medium text-gray-800">{{ c.modelo }}</td>
                <td class="py-3.5 px-4 text-slate-700 font-medium">
                  {{ c.setor?.nome || 'Geral' }}
                </td>
                <td class="py-3.5 px-4 font-mono text-gray-500 text-[11px]">{{ c.numeroSerie || '-' }}</td>
                <td class="py-3.5 px-4">
                  <div class="inline-flex items-center gap-1.5 font-medium text-slate-700">
                    <span class="w-2 h-2 rounded-full" :class="getStatusDotClass(c.status)"></span>
                    <span>{{ formatarStatus(c.status) }}</span>
                  </div>
                </td>
                <td class="py-3.5 px-4 text-gray-500 text-xs">
                  <div v-if="c.status === 'MANUTENCAO'" class="space-y-1">
                    <span v-if="c.numeroOs" class="inline-flex items-center gap-1 font-mono text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded border border-amber-300">
                      OS: {{ c.numeroOs }}
                    </span>
                    <div class="text-amber-800 font-medium text-xs">
                      {{ c.motivoManutencao || 'Defeito técnico' }}
                    </div>
                  </div>
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td class="py-3.5 px-4 text-center w-12">
                  <div class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 group-hover:text-[#002B49] group-hover:bg-slate-200/60 transition">
                    <svg class="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- VISÃO MOBILE / TABLET (Cards Responsivos em telas < md) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:hidden">
        <div
          v-for="c in coletores"
          :key="c.id"
          @click="abrirModalDetalhes(c)"
          class="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between space-y-3 cursor-pointer hover:border-slate-400 hover:shadow-md transition"
        >
          <div class="flex justify-between items-start">
            <div>
              <div class="font-mono text-base font-black text-gray-900">{{ c.patrimonio }}</div>
              <div class="text-xs font-bold text-gray-800 mt-0.5">{{ c.marca }} {{ c.modelo }}</div>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs text-slate-600 font-medium">{{ c.setor?.nome || 'Geral' }}</span>
                <span class="text-[10px] text-gray-400 font-mono">&bull; S/N: {{ c.numeroSerie || '-' }}</span>
              </div>
            </div>
            <div class="inline-flex items-center gap-1.5 font-medium text-slate-700 text-xs">
              <span class="w-2 h-2 rounded-full" :class="getStatusDotClass(c.status)"></span>
              <span>{{ formatarStatus(c.status) }}</span>
            </div>
          </div>

          <div v-if="c.status === 'MANUTENCAO'" class="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-[11px] text-amber-800 space-y-1">
            <div v-if="c.numeroOs" class="inline-flex items-center gap-1 font-mono font-bold text-[10px] bg-amber-200/70 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300">
              <span>OS:</span> {{ c.numeroOs }}
            </div>
            <div><strong>Defeito:</strong> {{ c.motivoManutencao || 'Manutenção técnica' }}</div>
          </div>

          <div class="pt-2 border-t border-gray-100 flex justify-between items-center text-xs">
            <span class="text-[11px] text-slate-400">Toque para ações</span>
            <div class="text-[#002B49] flex items-center gap-1 font-semibold text-xs">
              <svg class="w-4 h-4 text-slate-400 group-hover:text-[#002B49]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL: DETALHES E AÇÕES OPERACIONAIS DO COLETOR -->
    <Teleport to="body">
      <div
        v-if="modalDetalhesAberto && coletorDetalhes"
        class="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
        @click.self="modalDetalhesAberto = false"
      >
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto my-auto">
          <!-- Topo: Patrimônio, Marca/Modelo e Status -->
          <div class="flex justify-between items-start border-b pb-4">
            <div>
              <div class="flex items-center gap-2.5">
                <span class="text-2xl font-black font-mono text-slate-900 tracking-tight">
                  {{ coletorDetalhes.patrimonio }}
                </span>
                <div class="inline-flex items-center gap-1.5 font-semibold text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  <span class="w-2 h-2 rounded-full" :class="getStatusDotClass(coletorDetalhes.status)"></span>
                  <span>{{ formatarStatus(coletorDetalhes.status) }}</span>
                </div>
              </div>
              <p class="text-xs text-slate-500 mt-1 font-medium">
                {{ coletorDetalhes.marca }} {{ coletorDetalhes.modelo }}
              </p>
            </div>
            <button @click="modalDetalhesAberto = false" class="text-slate-400 hover:text-slate-700 text-xl leading-none p-1">
              &times;
            </button>
          </div>

          <!-- Dados / Informações Detalhadas -->
          <div class="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div>
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Setor Alocado</span>
              <span class="font-bold text-slate-800 text-xs">{{ coletorDetalhes.setor?.nome || 'Geral (Sem setor)' }}</span>
            </div>
            <div>
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Número de Série</span>
              <span class="font-mono text-slate-700 text-xs">{{ coletorDetalhes.numeroSerie || 'Não informado' }}</span>
            </div>
            <div>
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cadastrado em</span>
              <span class="text-slate-700 text-xs">{{ formatarDataSimples(coletorDetalhes.criadoEm) }}</span>
            </div>
            <div>
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Última Atualização</span>
              <span class="text-slate-700 text-xs">{{ formatarDataSimples(coletorDetalhes.atualizadoEm) }}</span>
            </div>
          </div>

          <!-- Bloco condicional se em Manutenção -->
          <div v-if="coletorDetalhes.status === 'MANUTENCAO'" class="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 text-xs text-amber-900 space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-bold uppercase tracking-wider text-[10px] text-amber-700">Equipamento em Reparo</span>
              <span v-if="coletorDetalhes.numeroOs" class="font-mono font-bold text-[10px] bg-amber-200/80 px-2 py-0.5 rounded">
                OS: {{ coletorDetalhes.numeroOs }}
              </span>
            </div>
            <div><strong>Motivo:</strong> {{ coletorDetalhes.motivoManutencao || 'Defeito técnico relatado' }}</div>
            <div v-if="coletorDetalhes.dataEnvioManutencao" class="text-[11px] text-amber-700">
              Enviado em: {{ formatarDataSimples(coletorDetalhes.dataEnvioManutencao) }}
            </div>
          </div>

          <!-- Ações Operacionais -->
          <div class="space-y-2 pt-2 border-t border-slate-100">
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ações Disponíveis</div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <!-- Checkout Manual -->
              <button
                v-if="authStore.isAdmin && coletorDetalhes.status === 'DISPONIVEL'"
                @click="executarAcaoModal(() => abrirModalCheckoutManual(coletorDetalhes))"
                class="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
              >
                <span>+ Checkout Manual</span>
              </button>

              <!-- Checkin Manual -->
              <button
                v-if="authStore.isAdmin && coletorDetalhes.status === 'EM_USO'"
                @click="executarAcaoModal(() => abrirModalCheckinManual(coletorDetalhes))"
                class="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
              >
                <span>&check; Checkin Manual</span>
              </button>

              <!-- Manutenção / Entrada Técnica -->
              <button
                v-if="coletorDetalhes.status === 'DISPONIVEL' && authStore.canManageMaintenance"
                @click="executarAcaoModal(() => abrirModalManutencao(coletorDetalhes))"
                class="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
              >
                <span>Entrada Técnica (Manutenção)</span>
              </button>
              <button
                v-else-if="coletorDetalhes.status === 'DISPONIVEL'"
                @click="executarAcaoModal(() => abrirModalManutencao(coletorDetalhes))"
                class="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
              >
                <span>Solicitar Manutenção</span>
              </button>

              <!-- Concluir Reparo -->
              <button
                v-if="coletorDetalhes.status === 'MANUTENCAO' && authStore.canManageMaintenance"
                @click="executarAcaoModal(() => abrirModalConcluirManutencao(coletorDetalhes))"
                class="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <span>&check; Concluir Reparo Técnico</span>
              </button>

              <!-- Editar Coletor -->
              <button
                v-if="authStore.canManageUsers"
                @click="executarAcaoModal(() => abrirModalEditarColetor(coletorDetalhes))"
                class="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
              >
                <span>Editar Cadastro</span>
              </button>

              <!-- Reativar Coletor -->
              <button
                v-if="authStore.canManageUsers && coletorDetalhes.status === 'INATIVO'"
                @click="executarAcaoModal(() => reativarColetor(coletorDetalhes))"
                class="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
              >
                <span>Reativar Coletor</span>
              </button>

              <!-- Inativar Coletor -->
              <button
                v-if="authStore.canManageUsers && coletorDetalhes.status !== 'EM_USO' && coletorDetalhes.status !== 'INATIVO'"
                @click="executarAcaoModal(() => inativarColetor(coletorDetalhes))"
                class="p-2.5 text-rose-700 hover:bg-rose-50 border border-rose-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
              >
                <span>Inativar Coletor</span>
              </button>
            </div>
          </div>

          <!-- Fechar -->
          <div class="pt-3 border-t flex justify-end">
            <button
              type="button"
              @click="modalDetalhesAberto = false"
              class="px-5 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL ADMIN: CHECKOUT MANUAL -->
    <Teleport to="body">
      <div
        v-if="modalCheckoutManualAberto && coletorSelecionado"
        class="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
      >
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
          <div class="flex justify-between items-start border-b pb-3">
            <div>
              <span class="text-[10px] font-black uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                Controle Administrativo
              </span>
              <h3 class="text-base font-extrabold text-gray-900 mt-1">
                Checkout Manual - Coletor {{ coletorSelecionado.patrimonio }}
              </h3>
              <p class="text-xs text-gray-500">
                {{ coletorSelecionado.marca }} {{ coletorSelecionado.modelo }} (S/N: {{ coletorSelecionado.numeroSerie || '-' }})
              </p>
            </div>
            <button @click="fecharModalCheckoutManual" class="text-gray-400 hover:text-gray-700 text-lg leading-none">
              &times;
            </button>
          </div>

          <div v-if="erroModalCheckout" class="p-3 rounded-lg bg-red-50 border border-red-300 text-red-700 text-xs font-bold">
            {{ erroModalCheckout }}
          </div>

          <form @submit.prevent="confirmarCheckoutManual" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Código de Barras ou RFID do Colaborador*
              </label>
              <div class="flex gap-2">
                <input
                  v-model="inputColaborador"
                  type="text"
                  required
                  placeholder="Bipe o código de barras ou aproxime o RFID..."
                  class="flex-1 p-2.5 text-xs rounded-xl border border-gray-300 font-mono outline-none focus:ring-2 focus:ring-[#002B49]"
                  @keydown.enter.prevent="validarColaboradorCheckout"
                />
                <button
                  type="button"
                  :disabled="loadingValidaColab || !inputColaborador.trim()"
                  @click="validarColaboradorCheckout"
                  class="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl disabled:opacity-50 transition"
                >
                  {{ loadingValidaColab ? 'Validando...' : 'Verificar' }}
                </button>
              </div>
            </div>

            <!-- Dados do Colaborador Confirmado -->
            <div
              v-if="colaboradorCheckoutValido"
              class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1"
            >
              <div class="text-xs font-black text-emerald-900">{{ colaboradorCheckoutValido.nome }}</div>
              <div class="text-[11px] text-emerald-800 flex flex-wrap gap-x-3">
                <span><strong>Matrícula:</strong> {{ colaboradorCheckoutValido.matricula }}</span>
                <span><strong>Setor:</strong> {{ colaboradorCheckoutValido.setor }}</span>
                <span><strong>Função:</strong> {{ colaboradorCheckoutValido.funcao }}</span>
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                @click="fecharModalCheckoutManual"
                class="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="loadingCheckoutSubmit || !colaboradorCheckoutValido"
                class="px-5 py-2 bg-[#002B49] hover:bg-slate-800 text-white rounded-xl text-xs font-bold disabled:opacity-40 transition shadow-sm"
              >
                {{ loadingCheckoutSubmit ? 'Registrando...' : 'Confirmar Saída Manual' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- MODAL ADMIN: CHECKIN MANUAL -->
    <Teleport to="body">
      <div
        v-if="modalCheckinManualAberto && coletorSelecionado"
        class="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
      >
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
          <div class="flex justify-between items-start border-b pb-3">
            <div>
              <span class="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Controle Administrativo
              </span>
              <h3 class="text-base font-extrabold text-gray-900 mt-1">
                Checkin Manual - Coletor {{ coletorSelecionado.patrimonio }}
              </h3>
              <p class="text-xs text-gray-500">
                {{ coletorSelecionado.marca }} {{ coletorSelecionado.modelo }} (S/N: {{ coletorSelecionado.numeroSerie || '-' }})
              </p>
            </div>
            <button @click="fecharModalCheckinManual" class="text-gray-400 hover:text-gray-700 text-lg leading-none">
              &times;
            </button>
          </div>

          <div v-if="erroModalCheckin" class="p-3 rounded-lg bg-red-50 border border-red-300 text-red-700 text-xs font-bold">
            {{ erroModalCheckin }}
          </div>

          <!-- Dados da Custódia Atual -->
          <div v-if="custodiaAtivaColetor" class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
            <div class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Custódia Aberta</div>
            <div class="text-xs font-black text-gray-900">{{ custodiaAtivaColetor.colaborador.nome }}</div>
            <div class="text-[11px] text-gray-600 flex flex-wrap gap-x-3">
              <span><strong>Matrícula:</strong> {{ custodiaAtivaColetor.colaborador.matricula }}</span>
              <span><strong>Setor:</strong> {{ custodiaAtivaColetor.colaborador.setor }}</span>
              <span><strong>Tempo de Uso:</strong> {{ custodiaAtivaColetor.tempoFormatado }}</span>
            </div>
          </div>

          <form @submit.prevent="confirmarCheckinManual" class="space-y-4">
            <!-- Opção de Avaria -->
            <div class="space-y-2 pt-1">
              <div class="flex items-center gap-2">
                <input
                  id="checkinAvaria"
                  type="checkbox"
                  v-model="checkinComAvaria"
                  class="h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                />
                <label for="checkinAvaria" class="text-xs font-extrabold text-red-700 uppercase tracking-wider cursor-pointer">
                  Coletor com Avaria / Enviar para Manutenção
                </label>
              </div>

              <div v-if="checkinComAvaria" class="space-y-3 bg-red-50/50 p-3 rounded-xl border border-red-200">
                <div>
                  <label class="block text-xs font-bold text-red-900">Número da OS (7 Dígitos Numéricos)*</label>
                  <input
                    v-model="checkinNumeroOs"
                    type="text"
                    maxlength="7"
                    required
                    @input="checkinNumeroOs = checkinNumeroOs.replace(/\D/g, '').slice(0, 7)"
                    placeholder="Ex: 1049283"
                    class="w-full mt-1 p-2 text-xs rounded-xl border border-red-300 font-mono outline-none focus:ring-2 focus:ring-red-500 bg-white"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-red-900">Descrição do Defeito*</label>
                  <textarea
                    v-model="checkinMotivoManutencao"
                    required
                    rows="2"
                    placeholder="Ex: Gatilho solto, display quebrado, bateria inchada..."
                    class="w-full mt-1 p-2.5 text-xs rounded-xl border border-red-300 focus:ring-2 focus:ring-red-500 outline-none bg-white"
                  ></textarea>
                </div>
              </div>

              <div v-else class="space-y-1">
                <label class="block text-xs font-medium text-gray-500">Observação opcional:</label>
                <input
                  v-model="checkinObservacao"
                  type="text"
                  placeholder="Ex: Devolução autorizada pela supervisão do turno"
                  class="w-full p-2 text-xs rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                @click="fecharModalCheckinManual"
                class="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="loadingCheckinSubmit || (checkinComAvaria && (!checkinMotivoManutencao.trim() || !checkinNumeroOs.trim()))"
                class="px-5 py-2 text-white rounded-xl text-xs font-bold disabled:opacity-40 transition shadow-sm"
                :class="checkinComAvaria ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'"
              >
                {{ loadingCheckinSubmit ? 'Processando...' : checkinComAvaria ? 'Devolver com Defeito' : 'Confirmar Check-in Manual' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- MODAL: NOVO COLETOR (ADMIN) -->
    <Teleport to="body">
      <div
        v-if="modalNovoColetorAberto"
        class="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
      >
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
          <h3 class="text-base font-extrabold text-gray-900 border-b pb-2">Cadastrar Novo Coletor</h3>
          <form @submit.prevent="salvarNovoColetor" class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-gray-700">Patrimônio (7 Dígitos Numéricos)*</label>
              <input
                v-model="novoColetor.patrimonio"
                type="text"
                maxlength="7"
                required
                placeholder="Ex: 1002345"
                class="w-full p-2.5 text-xs rounded-xl border border-gray-300 font-mono outline-none focus:ring-2 focus:ring-[#002B49]"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-700">Marca*</label>
              <input
                v-model="novoColetor.marca"
                type="text"
                required
                placeholder="Ex: Zebra, Honeywell"
                class="w-full p-2.5 text-xs rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#002B49]"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-700">Modelo*</label>
              <input
                v-model="novoColetor.modelo"
                type="text"
                required
                placeholder="Ex: TC21, MC3300"
                class="w-full p-2.5 text-xs rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#002B49]"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-700">Número de Série (Opcional)</label>
              <input
                v-model="novoColetor.numeroSerie"
                type="text"
                placeholder="Ex: 212505230D0090"
                class="w-full p-2.5 text-xs rounded-xl border border-gray-300 font-mono outline-none focus:ring-2 focus:ring-[#002B49]"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-700">Setor de Localização (Opcional)</label>
              <select
                v-model="novoColetor.setorId"
                class="w-full p-2.5 text-xs rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#002B49] bg-white text-gray-800 font-semibold"
              >
                <option :value="null">Nenhum Setor (Geral)</option>
                <option v-for="s in setoresAtivos" :key="s.id" :value="s.id">
                  {{ s.nome }}
                </option>
              </select>
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                @click="modalNovoColetorAberto = false"
                class="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-[#002B49] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Salvar Coletor
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- MODAL: EDITAR COLETOR (ADMIN / TI) -->
    <Teleport to="body">
      <div
        v-if="modalEditarColetorAberto && formEditarColetor"
        class="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
      >
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
          <div class="flex justify-between items-start border-b pb-2">
            <div>
              <h3 class="text-base font-extrabold text-gray-900">Editar Coletor</h3>
              <p class="text-xs text-gray-500 font-mono">Patrimônio: {{ formEditarColetor.patrimonio }}</p>
            </div>
            <button @click="modalEditarColetorAberto = false" class="text-gray-400 hover:text-gray-700 text-lg leading-none">
              &times;
            </button>
          </div>

          <form @submit.prevent="salvarEdicaoColetor" class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-gray-700">Marca*</label>
              <input
                v-model="formEditarColetor.marca"
                type="text"
                required
                class="w-full p-2.5 text-xs rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#002B49]"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-700">Modelo*</label>
              <input
                v-model="formEditarColetor.modelo"
                type="text"
                required
                class="w-full p-2.5 text-xs rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#002B49]"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-700">Número de Série</label>
              <input
                v-model="formEditarColetor.numeroSerie"
                type="text"
                class="w-full p-2.5 text-xs rounded-xl border border-gray-300 font-mono outline-none focus:ring-2 focus:ring-[#002B49]"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-700">Setor de Localização</label>
              <select
                v-model="formEditarColetor.setorId"
                class="w-full p-2.5 text-xs rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#002B49] bg-white text-gray-800 font-semibold"
              >
                <option :value="null">Nenhum Setor (Geral)</option>
                <option v-for="s in setoresAtivos" :key="s.id" :value="s.id">
                  {{ s.nome }}
                </option>
              </select>
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                @click="modalEditarColetorAberto = false"
                class="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="loadingSalvarEdicao"
                class="px-4 py-2 bg-[#002B49] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                {{ loadingSalvarEdicao ? 'Salvando...' : 'Salvar Alterações' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- MODAL: ENVIAR MANUTENÇÃO -->
    <Teleport to="body">
      <div
        v-if="modalManutencaoAberto && coletorSelecionado"
        class="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
      >
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
          <div class="border-b pb-2">
            <h3 class="text-base font-extrabold text-gray-900">
              {{ authStore.canManageMaintenance ? 'Entrada Técnica em Manutenção' : 'Solicitar Manutenção' }} - Coletor {{ coletorSelecionado.patrimonio }}
            </h3>
            <p class="text-xs text-gray-500 mt-0.5">
              {{ authStore.canManageMaintenance ? 'Registrar ordem técnica com causa raiz e diagnóstico' : 'Descreva a falha ou avaria constatada para a equipe técnica de TI' }}
            </p>
          </div>
          <form @submit.prevent="confirmarEnvioManutencao" class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-gray-700">Número da OS (7 Dígitos Numéricos)*</label>
              <input
                v-model="numeroOsInput"
                type="text"
                maxlength="7"
                required
                @input="numeroOsInput = numeroOsInput.replace(/\D/g, '').slice(0, 7)"
                placeholder="Ex: 1049283"
                class="w-full mt-1 p-2.5 text-xs rounded-xl border border-gray-300 font-mono outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-700">Motivo / Descrição do Defeito*</label>
              <textarea
                v-model="motivoManutencaoInput"
                required
                rows="3"
                placeholder="Descreva o problema constatado..."
                class="w-full mt-1 p-2.5 text-xs rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-amber-500"
              ></textarea>
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                @click="modalManutencaoAberto = false"
                class="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                {{ authStore.canManageMaintenance ? 'Confirmar Entrada Técnica' : 'Enviar Solicitação à TI' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- MODAL: CONCLUIR MANUTENÇÃO -->
    <Teleport to="body">
      <div
        v-if="modalConcluirAberto && coletorSelecionado"
        class="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
      >
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
          <h3 class="text-base font-extrabold text-gray-900 border-b pb-2">
            Concluir Reparo do Coletor {{ coletorSelecionado.patrimonio }}
          </h3>
          <form @submit.prevent="confirmarConclusaoManutencao" class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-gray-700">Laudo / Solução Realizada*</label>
              <textarea
                v-model="solucaoManutencaoInput"
                required
                rows="3"
                placeholder="Ex: Troca do display, restauração de firmware, substituição de bateria..."
                class="w-full p-2.5 text-xs rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-emerald-500"
              ></textarea>
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                @click="modalConcluirAberto = false"
                class="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Liberar Coletor
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import api from '../api/axios';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const coletores = ref<any[]>([]);
const loading = ref(false);
const filtroBusca = ref('');
const filtroStatus = ref('');
const filtroSetor = ref('');

const setores = ref<any[]>([]);
const setoresAtivos = computed(() => setores.value.filter((s) => s.ativo));

const mensagemAlerta = ref('');
const tipoAlerta = ref<'sucesso' | 'erro'>('sucesso');

const exibirAlerta = (msg: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
  mensagemAlerta.value = msg;
  tipoAlerta.value = tipo;
  setTimeout(() => {
    if (mensagemAlerta.value === msg) {
      mensagemAlerta.value = '';
    }
  }, 6000);
};

// Modal Cadastro Coletor
const modalNovoColetorAberto = ref(false);
const novoColetor = ref({
  patrimonio: '',
  marca: '',
  modelo: '',
  numeroSerie: '',
  setorId: null as string | null,
});

// Modal Editar Coletor
const modalEditarColetorAberto = ref(false);
const formEditarColetor = ref<any>(null);
const loadingSalvarEdicao = ref(false);

const carregarSetores = async () => {
  try {
    const { data } = await api.get('/configuracoes/setores');
    setores.value = data.dados || [];
  } catch (err) {
    console.error('Erro ao carregar setores:', err);
  }
};

const abrirModalNovoColetor = () => {
  novoColetor.value = { patrimonio: '', marca: '', modelo: '', numeroSerie: '', setorId: null };
  if (setores.value.length === 0) carregarSetores();
  modalNovoColetorAberto.value = true;
};

const salvarNovoColetor = async () => {
  try {
    await api.post('/coletores', novoColetor.value);
    modalNovoColetorAberto.value = false;
    exibirAlerta(`Coletor ${novoColetor.value.patrimonio} cadastrado com sucesso!`, 'sucesso');
    await carregarColetores();
  } catch (err: any) {
    exibirAlerta(err.response?.data?.mensagem || 'Erro ao cadastrar coletor.', 'erro');
  }
};

const abrirModalEditarColetor = (coletor: any) => {
  formEditarColetor.value = {
    id: coletor.id,
    patrimonio: coletor.patrimonio,
    marca: coletor.marca,
    modelo: coletor.modelo,
    numeroSerie: coletor.numeroSerie || '',
    setorId: coletor.setorId || null,
  };
  if (setores.value.length === 0) carregarSetores();
  modalEditarColetorAberto.value = true;
};

const salvarEdicaoColetor = async () => {
  if (!formEditarColetor.value) return;
  loadingSalvarEdicao.value = true;
  try {
    await api.put(`/coletores/${formEditarColetor.value.id}`, {
      marca: formEditarColetor.value.marca,
      modelo: formEditarColetor.value.modelo,
      numeroSerie: formEditarColetor.value.numeroSerie || null,
      setorId: formEditarColetor.value.setorId || null,
    });
    modalEditarColetorAberto.value = false;
    exibirAlerta(`Coletor ${formEditarColetor.value.patrimonio} atualizado com sucesso!`, 'sucesso');
    await carregarColetores();
  } catch (err: any) {
    exibirAlerta(err.response?.data?.mensagem || 'Erro ao atualizar coletor.', 'erro');
  } finally {
    loadingSalvarEdicao.value = false;
  }
};

// Modais Manutenção
const modalManutencaoAberto = ref(false);
const modalConcluirAberto = ref(false);
const coletorSelecionado = ref<any>(null);
const numeroOsInput = ref('');
const motivoManutencaoInput = ref('');
const solucaoManutencaoInput = ref('');

// Modal Admin: Checkout Manual
const modalCheckoutManualAberto = ref(false);
const inputColaborador = ref('');
const colaboradorCheckoutValido = ref<any>(null);
const loadingValidaColab = ref(false);
const loadingCheckoutSubmit = ref(false);
const erroModalCheckout = ref('');

// Modal Admin: Checkin Manual
const modalCheckinManualAberto = ref(false);
const custodiaAtivaColetor = ref<any>(null);
const checkinComAvaria = ref(false);
const checkinNumeroOs = ref('');
const checkinMotivoManutencao = ref('');
const checkinObservacao = ref('');
const loadingCheckinSubmit = ref(false);
const erroModalCheckin = ref('');

// Modal Detalhes e Ações do Coletor
const modalDetalhesAberto = ref(false);
const coletorDetalhes = ref<any>(null);

const abrirModalDetalhes = (c: any) => {
  coletorDetalhes.value = c;
  modalDetalhesAberto.value = true;
};

const executarAcaoModal = (acao: () => void) => {
  modalDetalhesAberto.value = false;
  acao();
};

const getStatusDotClass = (status: string) => {
  switch (status) {
    case 'DISPONIVEL':
      return 'bg-emerald-500';
    case 'EM_USO':
      return 'bg-blue-500';
    case 'MANUTENCAO':
      return 'bg-amber-500';
    default:
      return 'bg-slate-400';
  }
};

const formatarStatus = (status: string) => {
  switch (status) {
    case 'DISPONIVEL':
      return 'Disponível';
    case 'EM_USO':
      return 'Em uso';
    case 'MANUTENCAO':
      return 'Manutenção';
    case 'INATIVO':
      return 'Inativo';
    default:
      return status;
  }
};

const formatarDataSimples = (data?: string | Date) => {
  if (!data) return '-';
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const carregarColetores = async () => {
  loading.value = true;
  try {
    const params: any = {};
    if (filtroBusca.value.trim()) params.busca = filtroBusca.value.trim();
    if (filtroStatus.value) params.status = filtroStatus.value;
    if (filtroSetor.value) params.setorId = filtroSetor.value;
    const { data } = await api.get('/coletores', { params });
    coletores.value = data.dados || [];
  } catch (err) {
    console.error('Erro ao listar coletores:', err);
  } finally {
    loading.value = false;
  }
};

// Checkout Manual (Admin)
const abrirModalCheckoutManual = (coletor: any) => {
  coletorSelecionado.value = coletor;
  inputColaborador.value = '';
  colaboradorCheckoutValido.value = null;
  erroModalCheckout.value = '';
  modalCheckoutManualAberto.value = true;
};

const fecharModalCheckoutManual = () => {
  modalCheckoutManualAberto.value = false;
  coletorSelecionado.value = null;
  colaboradorCheckoutValido.value = null;
  inputColaborador.value = '';
  erroModalCheckout.value = '';
};

const validarColaboradorCheckout = async () => {
  const codigo = inputColaborador.value.trim();
  if (!codigo) return;

  erroModalCheckout.value = '';
  loadingValidaColab.value = true;
  colaboradorCheckoutValido.value = null;

  try {
    const { data } = await api.post('/colaboradores/validar-cracha', { codigo });
    colaboradorCheckoutValido.value = data.dados;
  } catch (err: any) {
    erroModalCheckout.value = err.response?.data?.mensagem || 'Colaborador não encontrado ou não apto.';
  } finally {
    loadingValidaColab.value = false;
  }
};

const confirmarCheckoutManual = async () => {
  if (!coletorSelecionado.value || !colaboradorCheckoutValido.value) return;

  erroModalCheckout.value = '';
  loadingCheckoutSubmit.value = true;

  try {
    await api.post('/movimentacoes/retirada', {
      matricula: colaboradorCheckoutValido.value.matricula,
      patrimonio: coletorSelecionado.value.patrimonio,
    });
    const pat = coletorSelecionado.value.patrimonio;
    const nome = colaboradorCheckoutValido.value.nome;
    fecharModalCheckoutManual();
    exibirAlerta(`Checkout manual realizado com sucesso! Coletor ${pat} entregue a ${nome}.`, 'sucesso');
    await carregarColetores();
  } catch (err: any) {
    erroModalCheckout.value = err.response?.data?.mensagem || 'Erro ao realizar checkout manual.';
  } finally {
    loadingCheckoutSubmit.value = false;
  }
};

// Checkin Manual (Admin)
const abrirModalCheckinManual = async (coletor: any) => {
  coletorSelecionado.value = coletor;
  custodiaAtivaColetor.value = null;
  checkinComAvaria.value = false;
  checkinNumeroOs.value = '';
  checkinMotivoManutencao.value = '';
  checkinObservacao.value = '';
  erroModalCheckin.value = '';
  modalCheckinManualAberto.value = true;

  try {
    const { data } = await api.get(`/movimentacoes/ativa-por-patrimonio/${coletor.patrimonio}`);
    custodiaAtivaColetor.value = data.dados;
  } catch (err) {
    console.warn('Não foi possível obter detalhes prévios da custódia:', err);
  }
};

const fecharModalCheckinManual = () => {
  modalCheckinManualAberto.value = false;
  coletorSelecionado.value = null;
  custodiaAtivaColetor.value = null;
  checkinNumeroOs.value = '';
  erroModalCheckin.value = '';
};

const confirmarCheckinManual = async () => {
  if (!coletorSelecionado.value) return;

  if (checkinComAvaria.value && !/^[0-9]{7}$/.test(checkinNumeroOs.value.trim())) {
    erroModalCheckin.value = 'O número da OS deve conter exatamente 7 dígitos numéricos.';
    return;
  }

  if (checkinComAvaria.value && !checkinMotivoManutencao.value.trim()) {
    erroModalCheckin.value = 'Informe o motivo da avaria para encaminhar o coletor para manutenção.';
    return;
  }

  erroModalCheckin.value = '';
  loadingCheckinSubmit.value = true;

  try {
    await api.post(`/movimentacoes/coletor/${coletorSelecionado.value.id}/devolucao`, {
      avaria: checkinComAvaria.value,
      numeroOs: checkinComAvaria.value ? checkinNumeroOs.value.trim() : null,
      motivoManutencao: checkinComAvaria.value ? checkinMotivoManutencao.value.trim() : null,
      observacao: checkinObservacao.value.trim() || null,
    });
    const pat = coletorSelecionado.value.patrimonio;
    fecharModalCheckinManual();
    exibirAlerta(`Check-in manual do coletor ${pat} confirmado com sucesso!`, 'sucesso');
    await carregarColetores();
  } catch (err: any) {
    erroModalCheckin.value = err.response?.data?.mensagem || 'Erro ao realizar checkin manual.';
  } finally {
    loadingCheckinSubmit.value = false;
  }
};

// Manutenção Normal
const abrirModalManutencao = (coletor: any) => {
  coletorSelecionado.value = coletor;
  numeroOsInput.value = '';
  motivoManutencaoInput.value = '';
  modalManutencaoAberto.value = true;
};

const confirmarEnvioManutencao = async () => {
  if (!coletorSelecionado.value) return;

  const os = numeroOsInput.value.trim();
  if (!/^[0-9]{7}$/.test(os)) {
    exibirAlerta('O número da OS deve conter exatamente 7 dígitos numéricos.', 'erro');
    return;
  }

  try {
    const rota = authStore.canManageMaintenance ? 'enviar-manutencao' : 'solicitar-manutencao';
    await api.post(`/coletores/${coletorSelecionado.value.id}/${rota}`, {
      motivo: motivoManutencaoInput.value.trim(),
      numeroOs: numeroOsInput.value.trim(),
    });
    modalManutencaoAberto.value = false;
    const msg = authStore.canManageMaintenance
      ? `Coletor ${coletorSelecionado.value.patrimonio} colocado em manutenção técnica (OS: ${numeroOsInput.value.trim()}).`
      : `Solicitação de manutenção do coletor ${coletorSelecionado.value.patrimonio} (OS: ${numeroOsInput.value.trim()}) encaminhada à TI.`;
    exibirAlerta(msg, 'sucesso');
    await carregarColetores();
  } catch (err: any) {
    exibirAlerta(err.response?.data?.mensagem || 'Erro ao enviar para manutenção.', 'erro');
  }
};

const abrirModalConcluirManutencao = (coletor: any) => {
  coletorSelecionado.value = coletor;
  solucaoManutencaoInput.value = '';
  modalConcluirAberto.value = true;
};

const confirmarConclusaoManutencao = async () => {
  if (!coletorSelecionado.value) return;
  try {
    await api.post(`/coletores/${coletorSelecionado.value.id}/concluir-manutencao`, {
      solucao: solucaoManutencaoInput.value,
    });
    modalConcluirAberto.value = false;
    exibirAlerta(`Reparo do coletor ${coletorSelecionado.value.patrimonio} concluído com sucesso!`, 'sucesso');
    await carregarColetores();
  } catch (err: any) {
    exibirAlerta(err.response?.data?.mensagem || 'Erro ao concluir manutenção.', 'erro');
  }
};

const inativarColetor = async (coletor: any) => {
  if (!confirm(`Deseja realmente inativar o coletor patrimônio ${coletor.patrimonio}?`)) return;
  try {
    await api.delete(`/coletores/${coletor.id}`);
    exibirAlerta(`Coletor ${coletor.patrimonio} inativado.`, 'sucesso');
    await carregarColetores();
  } catch (err: any) {
    exibirAlerta(err.response?.data?.mensagem || 'Erro ao inativar coletor.', 'erro');
  }
};

const reativarColetor = async (coletor: any) => {
  if (!confirm(`Deseja realmente reativar o coletor patrimônio ${coletor.patrimonio}? Ele voltará ao status DISPONÍVEL.`)) return;
  try {
    await api.post(`/coletores/${coletor.id}/reativar`);
    exibirAlerta(`Coletor ${coletor.patrimonio} reativado e disponível para uso!`, 'sucesso');
    await carregarColetores();
  } catch (err: any) {
    exibirAlerta(err.response?.data?.mensagem || 'Erro ao reativar coletor.', 'erro');
  }
};

onMounted(() => {
  carregarColetores();
  carregarSetores();
});
</script>
