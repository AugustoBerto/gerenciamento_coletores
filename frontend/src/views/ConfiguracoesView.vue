<template>
  <div class="space-y-6">
    <!-- Cabeçalho -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-200">
      <div>
        <h2 class="text-lg sm:text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          Configurações & Gestão de Acessos
        </h2>
        <p class="text-xs text-gray-500 mt-1">Gerenciamento da whitelist de operadores, papéis e parâmetros globais de SLA</p>
      </div>

      <div class="flex items-center gap-2 w-full sm:w-auto">
        <button
          v-if="abaAtiva === 'usuarios'"
          @click="abrirModalNovoUsuario"
          class="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-[#002B49] hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition"
        >
          + Cadastrar Novo Operador
        </button>
      </div>
    </div>

    <!-- Navegação por Abas -->
    <div class="flex space-x-2 border-b border-gray-200">
      <button
        @click="abaAtiva = 'usuarios'"
        class="pb-3 px-4 text-xs font-bold transition-colors border-b-2"
        :class="abaAtiva === 'usuarios' ? 'border-[#002B49] text-[#002B49]' : 'border-transparent text-gray-500 hover:text-gray-800'"
      >
        Operadores Autorizados (Whitelist)
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
      class="p-4 rounded-xl border-2 text-xs sm:text-sm font-bold flex items-center justify-between shadow-sm"
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
    <div v-if="abaAtiva === 'usuarios'" class="space-y-4">
      <!-- Barra de Busca -->
      <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
        <div class="relative">
          <input
            v-model="filtroBusca"
            type="text"
            placeholder="Buscar operador por nome, usuário ou matrícula..."
            class="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#002B49]"
          />
          <div class="absolute left-3 top-2.5 text-gray-400">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loadingUsuarios" class="bg-white p-12 rounded-2xl shadow-sm border border-gray-200 text-center text-gray-400 text-xs">
        Carregando lista de operadores autorizados...
      </div>

      <!-- Tabela Desktop -->
      <div v-else-if="usuariosFiltrados.length > 0" class="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-gray-600">
            <thead class="bg-gray-100 text-gray-700 uppercase font-black text-[10px] tracking-wider">
              <tr>
                <th class="py-3 px-4">Operador / Nome</th>
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
                </td>
                <td class="py-3.5 px-4 font-mono text-gray-700">{{ u.usuario }}</td>
                <td class="py-3.5 px-4 font-mono text-gray-600">{{ u.matricula }}</td>
                <td class="py-3.5 px-4 text-gray-600">{{ u.cargo || '-' }}</td>
                <td class="py-3.5 px-4">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase"
                    :class="corPapelBadge(u.papel)"
                  >
                    {{ u.papel }}
                  </span>
                </td>
                <td class="py-3.5 px-4">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase"
                    :class="u.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'"
                  >
                    {{ u.ativo ? 'Ativo' : 'Inativo' }}
                  </span>
                </td>
                <td class="py-3.5 px-4 text-right">
                  <div class="inline-flex items-center gap-2 justify-end">
                    <!-- Perfil Fixo suporte.ti -->
                    <span v-if="u.usuario === 'suporte.ti'" class="px-2 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 rounded border border-amber-200">
                      Perfil Técnico Fixo
                    </span>

                    <template v-else>
                      <!-- Alternar Papel (Exclusivo Administrador Global) -->
                      <button
                        v-if="authStore.isAdmin && u.id !== authStore.user?.id"
                        @click="alternarPapel(u)"
                        class="px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded transition"
                        :title="u.papel === 'ADMIN' ? 'Rebaixar para Operador' : 'Promover a Administrador'"
                      >
                        {{ u.papel === 'ADMIN' ? 'Mudar p/ Operador' : 'Tornar Admin' }}
                      </button>

                      <!-- Alternar Status Ativo/Inativo -->
                      <button
                        v-if="podeModificarUsuario(u)"
                        @click="alternarStatus(u)"
                        class="px-2.5 py-1 text-xs font-bold rounded transition"
                        :class="u.ativo ? 'text-red-600 hover:bg-red-50' : 'text-emerald-700 hover:bg-emerald-50'"
                      >
                        {{ u.ativo ? 'Inativar' : 'Reativar' }}
                      </button>
                      <span v-else-if="u.id !== authStore.user?.id" class="text-[10px] text-gray-400 italic">
                        Restrito
                      </span>
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
              </div>
              <div class="text-xs text-gray-500 font-mono">@{{ u.usuario }} &bull; Mat: {{ u.matricula }}</div>
            </div>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase"
              :class="corPapelBadge(u.papel)"
            >
              {{ u.papel }}
            </span>
          </div>

          <div class="text-xs text-gray-600 flex justify-between items-center">
            <span>{{ u.cargo || 'Operador' }}</span>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase"
              :class="u.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'"
            >
              {{ u.ativo ? 'Ativo' : 'Inativo' }}
            </span>
          </div>

          <div v-if="u.id !== authStore.user?.id" class="pt-2 border-t border-gray-100 flex justify-end gap-2 items-center">
            <span v-if="u.usuario === 'suporte.ti'" class="px-2.5 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
              Perfil Técnico Fixo
            </span>
            <template v-else>
              <button
                v-if="authStore.isAdmin"
                @click="alternarPapel(u)"
                class="px-2.5 py-1 text-xs font-bold border rounded-lg text-gray-700 bg-gray-50"
              >
                {{ u.papel === 'ADMIN' ? 'P/ Operador' : 'P/ Admin' }}
              </button>
              <button
                v-if="podeModificarUsuario(u)"
                @click="alternarStatus(u)"
                class="px-3 py-1 text-xs font-bold rounded-lg"
                :class="u.ativo ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'"
              >
                {{ u.ativo ? 'Inativar' : 'Reativar' }}
              </button>
              <span v-else class="text-[10px] text-gray-400 italic">
                Restrito
              </span>
            </template>
          </div>
        </div>
      </div>

      <div v-else class="bg-white p-12 rounded-2xl shadow-sm border border-gray-200 text-center text-gray-500 text-xs">
        Nenhum operador encontrado com os termos de busca informados.
      </div>
    </div>

    <!-- ABA 2: PARÂMETROS DE SLA -->
    <div v-if="abaAtiva === 'sla'" class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 max-w-xl space-y-5">
      <h3 class="text-sm font-extrabold text-gray-900 border-b pb-2 uppercase tracking-wider">
        Configurações de SLA e Tempos Limites
      </h3>

      <form @submit.prevent="salvarParametrosSla" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Tempo Limite Máximo de Empréstimo Contínuo (Minutos)
          </label>
          <input
            v-model.number="formSla.limiteUsoMinutos"
            type="number"
            min="30"
            max="1440"
            required
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
            required
            class="w-full p-2.5 text-xs rounded-xl border border-gray-300 font-mono outline-none focus:ring-2 focus:ring-[#002B49]"
          />
          <p class="text-[11px] text-gray-500 mt-1">Ex: A 80% de 480min (384min / ~6h24m), o indicador visual torna-se amarelo no painel.</p>
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

    <!-- MODAL: CADASTRAR NOVO OPERADOR -->
    <div
      v-if="modalNovoUsuarioAberto"
      class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div class="flex justify-between items-start border-b pb-3">
          <div>
            <h3 class="text-base font-extrabold text-gray-900">Cadastrar Operador na Whitelist</h3>
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
                placeholder="Ex: carlos.almoxarife ou 2000393"
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
          <div v-if="authStore.isAdmin">
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Papel / Nível de Acesso*
            </label>
            <select
              v-model="novoUsuarioPapel"
              class="w-full p-2.5 text-xs rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#002B49] bg-white font-bold text-gray-800"
            >
              <option value="OPERADOR">OPERADOR (Check-out, Check-in, Solicitar Manutenção)</option>
              <option value="TI">TI (Gestão de Manutenção e Cadastro de Operadores)</option>
              <option value="ADMIN">ADMIN (Controle total, Gestão de Operadores, Parâmetros SLA)</option>
            </select>
          </div>
          <div v-else class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-600">
            <div class="font-bold text-gray-800">Papel Atribuído: OPERADOR</div>
            <p class="text-[11px] text-gray-500 mt-0.5">Operadores cadastrados pela equipe de TI são habilitados com nível Operador de turno.</p>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import api from '../api/axios';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const abaAtiva = ref<'usuarios' | 'sla'>('usuarios');
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

// Cores e Permissões de Papel
const corPapelBadge = (papel: string) => {
  if (papel === 'ADMIN') return 'bg-purple-100 text-purple-800 border border-purple-200';
  if (papel === 'TI') return 'bg-amber-100 text-amber-800 border border-amber-200';
  return 'bg-blue-100 text-blue-800 border border-blue-200';
};

const podeModificarUsuario = (u: any) => {
  if (u.id === authStore.user?.id) return false;
  if (u.usuario === 'suporte.ti') return false;
  if (authStore.isPureTI) {
    return u.papel === 'OPERADOR';
  }
  return authStore.isAdmin;
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
  limiteUsoMinutos: 480,
  alertaAmareloPercentual: 80,
});
const loadingSalvandoSla = ref(false);

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
    exibirAlerta(err.response?.data?.mensagem || 'Erro ao listar operadores autorizados.', 'erro');
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
    if (limite) formSla.value.limiteUsoMinutos = Number(limite.valor);
    if (alerta) formSla.value.alertaAmareloPercentual = Number(alerta.valor);
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
    exibirAlerta(`Operador ${usuarioCorporativoLocalizado.value.usuario} cadastrado com sucesso!`, 'sucesso');
    await carregarUsuarios();
  } catch (err: any) {
    erroModal.value = err.response?.data?.mensagem || 'Erro ao cadastrar operador.';
  } finally {
    loadingSalvarUsuario.value = false;
  }
};

const alternarPapel = async (u: any) => {
  if (u.usuario === 'suporte.ti') {
    exibirAlerta('O papel do perfil padrão suporte.ti é fixo como TI e não pode ser alterado.', 'erro');
    return;
  }
  const novoPapel = u.papel === 'ADMIN' ? 'OPERADOR' : 'ADMIN';
  const label = novoPapel === 'ADMIN' ? 'promover a Administrador' : 'rebaixar para Operador';

  if (!confirm(`Deseja realmente ${label} o usuário ${u.nome}?`)) return;

  try {
    await api.patch(`/configuracoes/usuarios/${u.id}`, { papel: novoPapel });
    exibirAlerta(`Papel de ${u.nome} atualizado para ${novoPapel}.`, 'sucesso');
    await carregarUsuarios();
  } catch (err: any) {
    exibirAlerta(err.response?.data?.mensagem || 'Erro ao alterar papel do operador.', 'erro');
  }
};

const alternarStatus = async (u: any) => {
  if (u.usuario === 'suporte.ti') {
    exibirAlerta('O perfil padrão suporte.ti não pode ser inativado.', 'erro');
    return;
  }
  const novoStatus = !u.ativo;
  const label = novoStatus ? 'reativar' : 'inativar';

  if (!confirm(`Deseja realmente ${label} o acesso do operador ${u.nome}?`)) return;

  try {
    await api.patch(`/configuracoes/usuarios/${u.id}`, { ativo: novoStatus });
    exibirAlerta(`Operador ${u.nome} ${novoStatus ? 'reativado' : 'inativado'} com sucesso.`, 'sucesso');
    await carregarUsuarios();
  } catch (err: any) {
    exibirAlerta(err.response?.data?.mensagem || 'Erro ao atualizar status do operador.', 'erro');
  }
};

onMounted(() => {
  carregarUsuarios();
  if (authStore.isAdmin) {
    carregarConfiguracoesSla();
  }
});
</script>
