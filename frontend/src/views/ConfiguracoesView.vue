<template>
  <div class="space-y-6">
    <!-- Cabeçalho -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-200">
      <div>
        <h2 class="text-lg sm:text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          Configurações & Gestão de Acessos
        </h2>
        <p class="text-xs text-gray-500 mt-1">Gerenciamento da whitelist de monitores, setores de localização e parâmetros de SLA</p>
      </div>

      <div class="flex items-center gap-2 w-full sm:w-auto">
        <button
          v-if="abaAtiva === 'usuarios' && authStore.canManageUsers"
          @click="abrirModalNovoUsuario"
          class="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-[#002B49] hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition"
        >
          + Cadastrar Novo Monitor
        </button>
        <button
          v-else-if="abaAtiva === 'setores' && authStore.canManageSetores"
          @click="abrirModalNovoSetor"
          class="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-[#002B49] hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition"
        >
          + Novo Setor
        </button>
      </div>
    </div>

    <!-- Navegação por Abas -->
    <div class="flex space-x-2 border-b border-gray-200">
      <button
        v-if="authStore.canManageUsers"
        @click="abaAtiva = 'usuarios'"
        class="pb-3 px-4 text-xs font-bold transition-colors border-b-2"
        :class="abaAtiva === 'usuarios' ? 'border-[#002B49] text-[#002B49]' : 'border-transparent text-gray-500 hover:text-gray-800'"
      >
        Monitores Autorizados (Whitelist)
      </button>
      <button
        v-if="authStore.canManageSetores"
        @click="trocarParaSetores"
        class="pb-3 px-4 text-xs font-bold transition-colors border-b-2"
        :class="abaAtiva === 'setores' ? 'border-[#002B49] text-[#002B49]' : 'border-transparent text-gray-500 hover:text-gray-800'"
      >
        Setores de Localização
      </button>
      <button
        v-if="authStore.isAdmin"
        @click="abaAtiva = 'sla'"
        class="pb-3 px-4 text-xs font-bold transition-colors border-b-2"
        :class="abaAtiva === 'sla' ? 'border-[#002B49] text-[#002B49]' : 'border-transparent text-gray-500 hover:text-gray-800'"
      >
        Parâmetros de SLA & Alertas
      </button>
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

    <!-- ABA 1: GESTÃO DE USUÁRIOS (WHITELIST) -->
    <div v-if="abaAtiva === 'usuarios' && authStore.canManageUsers" class="space-y-4">
      <!-- Barra de Busca -->
      <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
        <div class="relative">
          <input
            v-model="filtroBusca"
            type="text"
            placeholder="Buscar monitor por nome, usuário ou matrícula..."
            class="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#002B49]"
          />
          <div class="absolute left-3 top-2.5 text-gray-400">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loadingUsuarios" class="bg-white p-12 rounded-2xl shadow-sm border border-gray-200 text-center text-gray-400 text-xs">
        Carregando lista de monitores autorizados...
      </div>

      <!-- Tabela Desktop -->
      <div v-else-if="usuariosFiltrados.length > 0" class="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-gray-600">
            <thead class="bg-gray-100 text-gray-700 uppercase font-black text-[10px] tracking-wider">
              <tr>
                <th class="py-3 px-4">Monitor / Nome</th>
                <th class="py-3 px-4">Usuário</th>
                <th class="py-3 px-4">Matrícula</th>
                <th class="py-3 px-4">Cargo / Função</th>
                <th class="py-3 px-4">Papel</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="u in usuariosFiltrados" :key="u.id" class="hover:bg-gray-50/80 transition">
                <td class="py-3.5 px-4 font-bold text-gray-900">
                  {{ u.nome }}
                  <span v-if="u.id === authStore.user?.id" class="ml-1 text-[10px] text-blue-600 font-semibold">(Você)</span>
                  <span v-else-if="isContaSistemaFixa(u)" class="ml-1 text-[10px] text-slate-400 font-medium">(Padrão)</span>
                </td>
                <td class="py-3.5 px-4 font-mono text-gray-700">{{ u.usuario }}</td>
                <td class="py-3.5 px-4 font-mono text-gray-600">{{ u.matricula }}</td>
                <td class="py-3.5 px-4 text-gray-600">{{ u.cargo || '-' }}</td>
                <td class="py-3.5 px-4 font-semibold text-slate-700">
                  {{ u.papel === 'ADMIN' ? 'Administrador' : (u.papel === 'TI' ? 'TI' : 'Monitor') }}
                </td>
                <td class="py-3.5 px-4">
                  <div class="inline-flex items-center gap-1.5 font-medium text-slate-700">
                    <span class="w-2 h-2 rounded-full" :class="u.ativo ? 'bg-emerald-500' : 'bg-slate-300'"></span>
                    <span>{{ u.ativo ? 'Ativo' : 'Inativo' }}</span>
                  </div>
                </td>
                <td class="py-3.5 px-4 text-right">
                  <div class="inline-flex items-center gap-2 justify-end">
                    <template v-if="!isContaSistemaFixa(u)">
                      <!-- Alternar Papel para ADMIN (Exclusivo Administrador Global) -->
                      <button
                        v-if="authStore.isAdmin && u.id !== authStore.user?.id && u.papel !== 'TI'"
                        @click="alternarPapel(u)"
                        class="px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded transition"
                        :title="u.papel === 'ADMIN' ? 'Rebaixar para Monitor' : 'Promover a Administrador'"
                      >
                        {{ u.papel === 'ADMIN' ? 'Mudar p/ Monitor' : 'Tornar Admin' }}
                      </button>

                      <!-- Alternar Papel para TI (Exclusivo equipe de TI) -->
                      <button
                        v-if="authStore.isTI && u.id !== authStore.user?.id && u.papel !== 'ADMIN'"
                        @click="alternarPapelTI(u)"
                        class="px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded transition"
                        :title="u.papel === 'TI' ? 'Rebaixar para Monitor' : 'Promover a TI'"
                      >
                        {{ u.papel === 'TI' ? 'Mudar p/ Monitor' : 'Tornar TI' }}
                      </button>

                      <!-- Alternar Status Ativo/Inativo -->
                      <button
                        v-if="podeModificarUsuario(u)"
                        @click="alternarStatus(u)"
                        class="px-2.5 py-1 text-xs font-bold rounded transition"
                        :class="u.ativo ? 'text-amber-700 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'"
                      >
                        {{ u.ativo ? 'Inativar' : 'Reativar' }}
                      </button>

                      <!-- Excluir Monitor Definitivamente -->
                      <button
                        v-if="podeModificarUsuario(u)"
                        @click="excluirUsuario(u)"
                        class="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded transition"
                        title="Excluir monitor permanentemente"
                      >
                        Excluir
                      </button>
                    </template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Cards Mobile/Tablet -->
      <div v-else-if="usuariosFiltrados.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:hidden">
        <div
          v-for="u in usuariosFiltrados"
          :key="u.id"
          class="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 space-y-3"
        >
          <div class="flex justify-between items-start">
            <div>
              <div class="font-bold text-gray-900 text-sm">
                {{ u.nome }}
                <span v-if="u.id === authStore.user?.id" class="text-[10px] text-blue-600 font-semibold">(Você)</span>
                <span v-else-if="isContaSistemaFixa(u)" class="text-[10px] text-slate-400 font-medium">(Padrão)</span>
              </div>
              <div class="text-xs text-gray-500 font-mono">@{{ u.usuario }} &bull; Mat: {{ u.matricula }}</div>
            </div>
            <span class="text-xs font-semibold text-slate-700">
              {{ u.papel === 'ADMIN' ? 'Administrador' : (u.papel === 'TI' ? 'TI' : 'Monitor') }}
            </span>
          </div>

          <div class="text-xs text-gray-600 flex justify-between items-center">
            <span>{{ u.cargo || 'Monitor' }}</span>
            <div class="inline-flex items-center gap-1.5 font-medium text-slate-700 text-xs">
              <span class="w-2 h-2 rounded-full" :class="u.ativo ? 'bg-emerald-500' : 'bg-slate-300'"></span>
              <span>{{ u.ativo ? 'Ativo' : 'Inativo' }}</span>
            </div>
          </div>

          <div v-if="u.id !== authStore.user?.id && !isContaSistemaFixa(u) && (authStore.isAdmin || authStore.isTI)" class="pt-2 border-t border-gray-100 flex justify-end gap-2 items-center flex-wrap">
            <button
              v-if="authStore.isAdmin && u.papel !== 'TI'"
              @click="alternarPapel(u)"
              class="px-2.5 py-1 text-xs font-bold border rounded-lg text-gray-700 bg-gray-50"
            >
              {{ u.papel === 'ADMIN' ? 'P/ Monitor' : 'P/ Admin' }}
            </button>
            <button
              v-if="authStore.isTI && u.papel !== 'ADMIN'"
              @click="alternarPapelTI(u)"
              class="px-2.5 py-1 text-xs font-bold border rounded-lg text-gray-700 bg-gray-50"
            >
              {{ u.papel === 'TI' ? 'P/ Monitor' : 'P/ TI' }}
            </button>
            <button
              v-if="podeModificarUsuario(u)"
              @click="alternarStatus(u)"
              class="px-3 py-1 text-xs font-bold rounded-lg"
              :class="u.ativo ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'"
            >
              {{ u.ativo ? 'Inativar' : 'Reativar' }}
            </button>
            <button
              v-if="podeModificarUsuario(u)"
              @click="excluirUsuario(u)"
              class="px-3 py-1 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200"
            >
              Excluir
            </button>
          </div>
        </div>
      </div>

      <div v-else class="bg-white p-12 rounded-2xl shadow-sm border border-gray-200 text-center text-gray-500 text-xs">
        Nenhum monitor encontrado com os termos de busca informados.
      </div>
    </div>

    <!-- ABA 2: GESTÃO DE SETORES DE LOCALIZAÇÃO -->
    <div v-if="abaAtiva === 'setores'" class="space-y-4">
      <!-- Barra de Busca -->
      <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
        <div class="relative">
          <input
            v-model="filtroSetorBusca"
            type="text"
            placeholder="Buscar setor por nome ou descrição..."
            class="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#002B49]"
          />
          <div class="absolute left-3 top-2.5 text-gray-400">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loadingSetores" class="bg-white p-12 rounded-2xl shadow-sm border border-gray-200 text-center text-gray-400 text-xs">
        Carregando setores de localização...
      </div>

      <!-- Tabela Desktop -->
      <div v-else-if="setoresFiltrados.length > 0" class="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-gray-600">
            <thead class="bg-gray-100 text-gray-700 uppercase font-black text-[10px] tracking-wider">
              <tr>
                <th class="py-3 px-4">Nome do Setor</th>
                <th class="py-3 px-4">Descrição / Observações</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="s in setoresFiltrados" :key="s.id" class="hover:bg-gray-50/80 transition">
                <td class="py-3.5 px-4 font-bold text-gray-900">
                  {{ s.nome }}
                </td>
                <td class="py-3.5 px-4 text-gray-600">
                  {{ s.descricao || '-' }}
                </td>
                <td class="py-3.5 px-4">
                  <div class="inline-flex items-center gap-1.5 font-medium text-slate-700">
                    <span class="w-2 h-2 rounded-full" :class="s.ativo ? 'bg-emerald-500' : 'bg-slate-300'"></span>
                    <span>{{ s.ativo ? 'Ativo' : 'Inativo' }}</span>
                  </div>
                </td>
                <td class="py-3.5 px-4 text-right">
                  <div class="inline-flex items-center gap-2 justify-end">
                    <button
                      @click="abrirModalEditarSetor(s)"
                      class="px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded transition"
                    >
                      Editar
                    </button>
                    <button
                      @click="alternarStatusSetor(s)"
                      class="px-2.5 py-1 text-xs font-bold rounded transition"
                      :class="s.ativo ? 'text-slate-600 hover:bg-slate-100' : 'text-emerald-700 hover:bg-emerald-50'"
                    >
                      {{ s.ativo ? 'Inativar' : 'Reativar' }}
                    </button>
                    <button
                      @click="excluirSetor(s)"
                      class="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded transition"
                      title="Excluir setor definitivamente"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Cards Mobile/Tablet -->
      <div v-else-if="setoresFiltrados.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:hidden">
        <div
          v-for="s in setoresFiltrados"
          :key="s.id"
          class="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 space-y-3"
        >
          <div class="flex justify-between items-start">
            <div>
              <div class="font-bold text-gray-900 text-sm">{{ s.nome }}</div>
              <div class="text-xs text-gray-500 mt-0.5">{{ s.descricao || 'Sem descrição' }}</div>
            </div>
            <div class="inline-flex items-center gap-1.5 font-medium text-slate-700 text-xs">
              <span class="w-2 h-2 rounded-full" :class="s.ativo ? 'bg-emerald-500' : 'bg-slate-300'"></span>
              <span>{{ s.ativo ? 'Ativo' : 'Inativo' }}</span>
            </div>
          </div>

          <div class="pt-2 border-t border-gray-100 flex justify-end gap-2 items-center">
            <button
              @click="abrirModalEditarSetor(s)"
              class="px-3 py-1 text-xs font-bold border rounded-lg text-gray-700 bg-gray-50"
            >
              Editar
            </button>
            <button
              @click="alternarStatusSetor(s)"
              class="px-3 py-1 text-xs font-bold rounded-lg"
              :class="s.ativo ? 'text-slate-600 hover:bg-slate-100' : 'text-emerald-700 hover:bg-emerald-50'"
            >
              {{ s.ativo ? 'Inativar' : 'Reativar' }}
            </button>
            <button
              @click="excluirSetor(s)"
              class="px-3 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg"
            >
              Excluir
            </button>
          </div>
        </div>
      </div>

      <div v-else class="bg-white p-12 rounded-2xl shadow-sm border border-gray-200 text-center text-gray-500 text-xs">
        Nenhum setor encontrado com os termos de busca informados.
      </div>
    </div>

    <!-- ABA 3: PARÂMETROS DE SLA -->
    <div v-if="abaAtiva === 'sla'" class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 max-w-xl space-y-5">
      <h3 class="text-sm font-extrabold text-gray-900 border-b pb-2 uppercase tracking-wider">
        Configurações de SLA e Tempos Limites
      </h3>

      <form @submit.prevent="salvarParametrosSla" class="space-y-4">
        <!-- Interruptor Mestre de SLA -->
        <div class="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <div class="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Monitoramento de SLA de Coletores
            </div>
            <div class="text-[11px] text-slate-500 mt-0.5">
              {{ formSla.slaAtivo ? 'Monitoramento ATIVO (tempo de posse e alertas em execução)' : 'Monitoramento DESATIVADO (sem contagem de atraso ou avisos de SLA)' }}
            </div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" v-model="formSla.slaAtivo" class="sr-only peer" />
            <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#002B49]"></div>
          </label>
        </div>

        <div :class="{ 'opacity-50 pointer-events-none': !formSla.slaAtivo }" class="space-y-4 transition-opacity">
          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Tempo Limite Máximo de Empréstimo Contínuo (Minutos)
            </label>
            <input
              v-model.number="formSla.limiteUsoMinutos"
              type="number"
              min="30"
              max="1440"
              :required="formSla.slaAtivo"
              class="w-full p-2.5 text-xs rounded-xl border border-gray-300 font-mono outline-none focus:ring-2 focus:ring-[#002B49]"
            />
            <p class="text-[11px] text-gray-500 mt-1">Ex: 480 minutos correspondem ao turno integral de 8 horas.</p>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Gatilho de Alerta Preventivo (% do tempo limite)
            </label>
            <input
              v-model.number="formSla.alertaAmareloPercentual"
              type="number"
              min="10"
              max="95"
              :required="formSla.slaAtivo"
              class="w-full p-2.5 text-xs rounded-xl border border-gray-300 font-mono outline-none focus:ring-2 focus:ring-[#002B49]"
            />
            <p class="text-[11px] text-gray-500 mt-1">Ex: A 80% de 480min (384min / ~6h24m), o indicador visual torna-se amarelo no painel.</p>
          </div>
        </div>

        <div class="pt-3 border-t flex justify-end">
          <button
            type="submit"
            :disabled="loadingSalvandoSla"
            class="px-5 py-2.5 bg-[#002B49] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            {{ loadingSalvandoSla ? 'Salvando...' : 'Salvar Parâmetros' }}
          </button>
        </div>
      </form>
    </div>

    <!-- MODAL: CADASTRAR NOVO MONITOR -->
    <Teleport to="body">
      <div
        v-if="modalNovoUsuarioAberto"
        class="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
      >
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
          <div class="flex justify-between items-start border-b pb-3">
            <div>
              <h3 class="text-base font-extrabold text-gray-900">Cadastrar Monitor</h3>
              <p class="text-xs text-gray-500">Autoriza o usuário corporativo DASS a fazer login no sistema</p>
            </div>
            <button @click="modalNovoUsuarioAberto = false" class="text-gray-400 hover:text-gray-700 text-lg leading-none">
              &times;
            </button>
          </div>

          <div v-if="erroModal" class="p-3 rounded-lg bg-red-50 border border-red-300 text-red-700 text-xs font-bold">
            {{ erroModal }}
          </div>

          <form @submit.prevent="confirmarCadastroUsuario" class="space-y-4">
            <!-- Campo de Busca Prévia -->
            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Usuário Corporativo ou Matrícula*
              </label>
              <div class="flex gap-2">
                <input
                  v-model="inputBuscaCorporativa"
                  type="text"
                  required
                  placeholder="Ex: jose.falcao ou 3023093"
                  class="flex-1 p-2.5 text-xs rounded-xl border border-gray-300 font-mono outline-none focus:ring-2 focus:ring-[#002B49]"
                  @keydown.enter.prevent="consultarDadosCorporativos"
                />
                <button
                  type="button"
                  :disabled="loadingConsultaCorp || !inputBuscaCorporativa.trim()"
                  @click="consultarDadosCorporativos"
                  class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl disabled:opacity-50 transition"
                >
                  {{ loadingConsultaCorp ? 'Buscando...' : 'Consultar' }}
                </button>
              </div>
            </div>

            <!-- Preview do Usuário Localizado -->
            <div
              v-if="usuarioCorporativoLocalizado"
              class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5"
            >
              <div class="text-xs font-black text-gray-900">{{ usuarioCorporativoLocalizado.nome }}</div>
              <div class="text-[11px] text-gray-600 grid grid-cols-2 gap-2">
                <div><strong>Usuário:</strong> @{{ usuarioCorporativoLocalizado.usuario }}</div>
                <div><strong>Matrícula:</strong> {{ usuarioCorporativoLocalizado.matricula }}</div>
                <div><strong>Cargo:</strong> {{ usuarioCorporativoLocalizado.cargo }}</div>
                <div><strong>Setor:</strong> {{ usuarioCorporativoLocalizado.setor }}</div>
              </div>
            </div>

            <!-- Seleção do Papel -->
            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Papel / Nível de Acesso*
              </label>
              <select
                v-model="novoUsuarioPapel"
                class="w-full p-2.5 text-xs rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#002B49] bg-white font-bold text-gray-800"
              >
                <option value="OPERADOR">MONITOR (Check-out, Check-in, Solicitar Manutenção)</option>
                <option v-if="authStore.isTI" value="TI">TI (Gestão Técnica de Manutenção e TI)</option>
                <option v-if="authStore.isAdmin" value="ADMIN">ADMIN (Controle total de Usuários e Parâmetros)</option>
              </select>
              <p v-if="authStore.isAdmin" class="text-[11px] text-gray-400 mt-1">
                * Apenas usuários do perfil de TI podem cadastrar novos técnicos de TI.
              </p>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                @click="modalNovoUsuarioAberto = false"
                class="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="loadingSalvarUsuario || !usuarioCorporativoLocalizado"
                class="px-5 py-2 bg-[#002B49] hover:bg-slate-800 text-white rounded-xl text-xs font-bold disabled:opacity-40 transition shadow-sm"
              >
                {{ loadingSalvarUsuario ? 'Cadastrando...' : 'Confirmar Cadastro' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- MODAL: CADASTRAR / EDITAR SETOR -->
    <Teleport to="body">
      <div
        v-if="modalSetorAberto"
        class="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
      >
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
          <div class="flex justify-between items-start border-b pb-3">
            <div>
              <h3 class="text-base font-extrabold text-gray-900">
                {{ setorEmEdicao ? 'Editar Setor de Localização' : 'Novo Setor de Localização' }}
              </h3>
              <p class="text-xs text-gray-500">Defina a área fabril para rastreabilidade dos coletores</p>
            </div>
            <button @click="modalSetorAberto = false" class="text-gray-400 hover:text-gray-700 text-lg leading-none">
              &times;
            </button>
          </div>

          <div v-if="erroModalSetor" class="p-3 rounded-lg bg-red-50 border border-red-300 text-red-700 text-xs font-bold">
            {{ erroModalSetor }}
          </div>

          <form @submit.prevent="confirmarSalvarSetor" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Nome do Setor*
              </label>
              <input
                v-model="formSetor.nome"
                type="text"
                required
                maxlength="80"
                placeholder="Ex: Expedição, Linha de Montagem, Almoxarifado"
                class="w-full p-2.5 text-xs rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#002B49]"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Descrição / Finalidade (Opcional)
              </label>
              <textarea
                v-model="formSetor.descricao"
                rows="3"
                maxlength="255"
                placeholder="Ex: Área de conferência, expedição ou carregamento"
                class="w-full p-2.5 text-xs rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#002B49]"
              ></textarea>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                @click="modalSetorAberto = false"
                class="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="loadingSalvarSetor || !formSetor.nome.trim()"
                class="px-5 py-2 bg-[#002B49] hover:bg-slate-800 text-white rounded-xl text-xs font-bold disabled:opacity-40 transition shadow-sm"
              >
                {{ loadingSalvarSetor ? 'Salvando...' : 'Salvar Setor' }}
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

const abaAtiva = ref<'usuarios' | 'setores' | 'sla'>(
  authStore.canManageUsers ? 'usuarios' : 'setores'
);
const usuarios = ref<any[]>([]);
const loadingUsuarios = ref(false);
const filtroBusca = ref('');

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

const isContaSistemaFixa = (u: any) => {
  const usuariosFixos = ['suporte.ti', 'monitor.geral'];
  const matriculasFixas = [9999001, 9999002];
  return (
    usuariosFixos.includes(String(u?.usuario || '').toLowerCase()) ||
    matriculasFixas.includes(Number(u?.matricula))
  );
};

const podeModificarUsuario = (u: any) => {
  if (u.id === authStore.user?.id) return false;
  if (isContaSistemaFixa(u)) return false;
  if (authStore.isTI) {
    return u.papel !== 'ADMIN' && u.papel !== 'TI';
  }
  if (authStore.isAdmin) {
    return u.papel !== 'TI';
  }
  return false;
};

// Modal Cadastro de Operador
const modalNovoUsuarioAberto = ref(false);
const inputBuscaCorporativa = ref('');
const usuarioCorporativoLocalizado = ref<any>(null);
const novoUsuarioPapel = ref<'ADMIN' | 'TI' | 'OPERADOR'>('OPERADOR');
const loadingConsultaCorp = ref(false);
const loadingSalvarUsuario = ref(false);
const erroModal = ref('');

// Configurações de SLA
const formSla = ref({
  slaAtivo: false,
  limiteUsoMinutos: 480,
  alertaAmareloPercentual: 80,
});
const loadingSalvandoSla = ref(false);

// Gestão de Setores
const setores = ref<any[]>([]);
const loadingSetores = ref(false);
const filtroSetorBusca = ref('');
const modalSetorAberto = ref(false);
const setorEmEdicao = ref<any>(null);
const formSetor = ref({ nome: '', descricao: '' });
const loadingSalvarSetor = ref(false);
const erroModalSetor = ref('');

const setoresFiltrados = computed(() => {
  const t = filtroSetorBusca.value.trim().toLowerCase();
  if (!t) return setores.value;
  return setores.value.filter(
    (s) =>
      s.nome.toLowerCase().includes(t) ||
      (s.descricao && s.descricao.toLowerCase().includes(t))
  );
});

const carregarSetores = async () => {
  loadingSetores.value = true;
  try {
    const { data } = await api.get('/configuracoes/setores');
    setores.value = data.dados || [];
  } catch (err: any) {
    exibirAlerta(err.response?.data?.mensagem || 'Erro ao carregar setores.', 'erro');
  } finally {
    loadingSetores.value = false;
  }
};

const trocarParaSetores = () => {
  abaAtiva.value = 'setores';
  if (setores.value.length === 0) {
    carregarSetores();
  }
};

const abrirModalNovoSetor = () => {
  setorEmEdicao.value = null;
  formSetor.value = { nome: '', descricao: '' };
  erroModalSetor.value = '';
  modalSetorAberto.value = true;
};

const abrirModalEditarSetor = (s: any) => {
  setorEmEdicao.value = s;
  formSetor.value = { nome: s.nome, descricao: s.descricao || '' };
  erroModalSetor.value = '';
  modalSetorAberto.value = true;
};

const confirmarSalvarSetor = async () => {
  const nome = formSetor.value.nome.trim();
  if (!nome) return;

  erroModalSetor.value = '';
  loadingSalvarSetor.value = true;

  try {
    if (setorEmEdicao.value) {
      await api.put(`/configuracoes/setores/${setorEmEdicao.value.id}`, {
        nome,
        descricao: formSetor.value.descricao.trim() || null,
      });
      exibirAlerta(`Setor "${nome}" atualizado com sucesso!`, 'sucesso');
    } else {
      await api.post('/configuracoes/setores', {
        nome,
        descricao: formSetor.value.descricao.trim() || null,
      });
      exibirAlerta(`Setor "${nome}" cadastrado com sucesso!`, 'sucesso');
    }
    modalSetorAberto.value = false;
    await carregarSetores();
  } catch (err: any) {
    erroModalSetor.value = err.response?.data?.mensagem || 'Erro ao salvar setor.';
  } finally {
    loadingSalvarSetor.value = false;
  }
};

const alternarStatusSetor = async (s: any) => {
  const novoStatus = !s.ativo;
  const acao = novoStatus ? 'reativar' : 'inativar';
  if (!confirm(`Deseja realmente ${acao} o setor "${s.nome}"?`)) return;

  try {
    await api.patch(`/configuracoes/setores/${s.id}/status`);
    exibirAlerta(`Setor "${s.nome}" ${novoStatus ? 'reativado' : 'inativado'} com sucesso!`, 'sucesso');
    await carregarSetores();
  } catch (err: any) {
    exibirAlerta(err.response?.data?.mensagem || 'Erro ao alterar status do setor.', 'erro');
  }
};

const excluirSetor = async (s: any) => {
  if (!confirm(`Tem certeza que deseja excluir permanentemente o setor "${s.nome}"? Aparelhos vinculados a este setor ficarão sem setor atribuído.`)) return;

  try {
    const { data } = await api.delete(`/configuracoes/setores/${s.id}`);
    exibirAlerta(data.mensagem || `Setor "${s.nome}" excluído com sucesso!`, 'sucesso');
    await carregarSetores();
  } catch (err: any) {
    exibirAlerta(err.response?.data?.mensagem || 'Erro ao excluir setor.', 'erro');
  }
};

const usuariosFiltrados = computed(() => {
  const t = filtroBusca.value.trim().toLowerCase();
  if (!t) return usuarios.value;
  return usuarios.value.filter(
    (u) =>
      u.nome.toLowerCase().includes(t) ||
      u.usuario.toLowerCase().includes(t) ||
      String(u.matricula).includes(t)
  );
});

const carregarUsuarios = async () => {
  loadingUsuarios.value = true;
  try {
    const { data } = await api.get('/configuracoes/usuarios');
    usuarios.value = data.dados || [];
  } catch (err: any) {
    exibirAlerta(err.response?.data?.mensagem || 'Erro ao listar monitores autorizados.', 'erro');
  } finally {
    loadingUsuarios.value = false;
  }
};

const carregarConfiguracoesSla = async () => {
  try {
    const { data } = await api.get('/configuracoes');
    const configs = data.dados || [];
    const limite = configs.find((c: any) => c.chave === 'LIMITE_USO_MINUTOS');
    const alerta = configs.find((c: any) => c.chave === 'ALERTA_AMARELO_PERCENTUAL');
    const ativo = configs.find((c: any) => c.chave === 'SLA_ATIVO');
    if (limite) formSla.value.limiteUsoMinutos = Number(limite.valor);
    if (alerta) formSla.value.alertaAmareloPercentual = Number(alerta.valor);
    formSla.value.slaAtivo = ativo ? ativo.valor.toLowerCase() === 'true' : false;
  } catch (err) {
    console.error('Erro ao carregar SLA:', err);
  }
};

const salvarParametrosSla = async () => {
  loadingSalvandoSla.value = true;
  try {
    await api.put('/configuracoes', formSla.value);
    exibirAlerta('Parâmetros globais de SLA atualizados com sucesso!', 'sucesso');
  } catch (err: any) {
    exibirAlerta(err.response?.data?.mensagem || 'Erro ao salvar parâmetros.', 'erro');
  } finally {
    loadingSalvandoSla.value = false;
  }
};

const abrirModalNovoUsuario = () => {
  inputBuscaCorporativa.value = '';
  usuarioCorporativoLocalizado.value = null;
  novoUsuarioPapel.value = 'OPERADOR';
  erroModal.value = '';
  modalNovoUsuarioAberto.value = true;
};

const consultarDadosCorporativos = async () => {
  const termo = inputBuscaCorporativa.value.trim();
  if (!termo) return;

  erroModal.value = '';
  loadingConsultaCorp.value = true;
  usuarioCorporativoLocalizado.value = null;

  try {
    const { data } = await api.get(`/configuracoes/usuarios/consultar/${encodeURIComponent(termo)}`);
    usuarioCorporativoLocalizado.value = data.dados;
  } catch (err: any) {
    erroModal.value = err.response?.data?.mensagem || 'Usuário ou matrícula não localizada na base da fábrica.';
  } finally {
    loadingConsultaCorp.value = false;
  }
};

const confirmarCadastroUsuario = async () => {
  if (!usuarioCorporativoLocalizado.value) return;

  erroModal.value = '';
  loadingSalvarUsuario.value = true;

  try {
    await api.post('/configuracoes/usuarios', {
      usuario: usuarioCorporativoLocalizado.value.usuario,
      matricula: usuarioCorporativoLocalizado.value.matricula,
      nome: usuarioCorporativoLocalizado.value.nome,
      cargo: usuarioCorporativoLocalizado.value.cargo,
      papel: novoUsuarioPapel.value,
    });
    modalNovoUsuarioAberto.value = false;
    exibirAlerta(`Monitor ${usuarioCorporativoLocalizado.value.usuario} cadastrado com sucesso!`, 'sucesso');
    await carregarUsuarios();
  } catch (err: any) {
    erroModal.value = err.response?.data?.mensagem || 'Erro ao cadastrar monitor.';
  } finally {
    loadingSalvarUsuario.value = false;
  }
};

const alternarPapel = async (u: any) => {
  if (isContaSistemaFixa(u)) {
    exibirAlerta('O papel dos perfis padrão do sistema é fixo e não pode ser alterado.', 'erro');
    return;
  }
  if (u.papel === 'TI') {
    exibirAlerta('Administradores não podem alterar o papel de usuários de TI. Apenas TI pode gerenciar técnicos de TI.', 'erro');
    return;
  }
  const novoPapel = u.papel === 'ADMIN' ? 'OPERADOR' : 'ADMIN';
  const label = novoPapel === 'ADMIN' ? 'promover a Administrador' : 'rebaixar para Monitor';

  if (!confirm(`Deseja realmente ${label} o usuário ${u.nome}?`)) return;

  try {
    await api.patch(`/configuracoes/usuarios/${u.id}`, { papel: novoPapel });
    exibirAlerta(`Papel de ${u.nome} atualizado com sucesso.`, 'sucesso');
    await carregarUsuarios();
  } catch (err: any) {
    exibirAlerta(err.response?.data?.mensagem || 'Erro ao alterar papel do monitor.', 'erro');
  }
};

const alternarPapelTI = async (u: any) => {
  if (isContaSistemaFixa(u)) {
    exibirAlerta('O papel dos perfis padrão do sistema é fixo e não pode ser alterado.', 'erro');
    return;
  }
  if (u.papel === 'ADMIN') {
    exibirAlerta('Técnicos de TI não podem alterar o papel de Administradores.', 'erro');
    return;
  }
  const novoPapel = u.papel === 'TI' ? 'OPERADOR' : 'TI';
  const label = novoPapel === 'TI' ? 'promover a Técnico de TI' : 'rebaixar para Monitor';

  if (!confirm(`Deseja realmente ${label} o usuário ${u.nome}?`)) return;

  try {
    await api.patch(`/configuracoes/usuarios/${u.id}`, { papel: novoPapel });
    exibirAlerta(`Papel de ${u.nome} atualizado com sucesso.`, 'sucesso');
    await carregarUsuarios();
  } catch (err: any) {
    exibirAlerta(err.response?.data?.mensagem || 'Erro ao alterar papel do monitor.', 'erro');
  }
};

const alternarStatus = async (u: any) => {
  if (isContaSistemaFixa(u)) {
    exibirAlerta('Os perfis padrão do sistema não podem ser inativados.', 'erro');
    return;
  }
  const novoStatus = !u.ativo;
  const label = novoStatus ? 'reativar' : 'inativar';

  if (!confirm(`Deseja realmente ${label} o acesso do monitor ${u.nome}?`)) return;

  try {
    await api.patch(`/configuracoes/usuarios/${u.id}`, { ativo: novoStatus });
    exibirAlerta(`Monitor ${u.nome} ${novoStatus ? 'reativado' : 'inativado'} com sucesso.`, 'sucesso');
    await carregarUsuarios();
  } catch (err: any) {
    exibirAlerta(err.response?.data?.mensagem || 'Erro ao atualizar status do monitor.', 'erro');
  }
};

const excluirUsuario = async (u: any) => {
  if (isContaSistemaFixa(u)) {
    exibirAlerta('Os perfis padrão do sistema (Monitor Geral e Suporte TI) não podem ser excluídos.', 'erro');
    return;
  }
  if (
    !confirm(
      `ATENÇÃO: Deseja excluir permanentemente o monitor "${u.nome}" (@${u.usuario})?\n\nEsta ação removerá o cadastro do usuário no sistema.`
    )
  ) {
    return;
  }

  try {
    const { data } = await api.delete(`/configuracoes/usuarios/${u.id}`);
    exibirAlerta(data.mensagem || `Monitor ${u.nome} excluído com sucesso!`, 'sucesso');
    await carregarUsuarios();
  } catch (err: any) {
    exibirAlerta(err.response?.data?.mensagem || 'Erro ao excluir monitor.', 'erro');
  }
};

onMounted(() => {
  if (authStore.canManageUsers) {
    carregarUsuarios();
  }
  if (authStore.canManageSetores) {
    carregarSetores();
  }
  if (authStore.isAdmin) {
    carregarConfiguracoesSla();
  }
});
</script>
