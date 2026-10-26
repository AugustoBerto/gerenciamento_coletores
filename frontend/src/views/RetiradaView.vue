<template>
  <div class="space-y-6">
    <!-- Cabeçalho -->
    <div class="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 class="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          Retirada de Coletor (Check-out)
        </h2>
        <p class="text-xs text-slate-500 mt-0.5">
          Duplo bipe de crachá: identifique o monitor que libera e o colaborador que recebe o equipamento.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <span
          class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
          :class="[
            !operadorIdentificado
              ? 'bg-slate-100 text-slate-600'
              : !colaboradorApto
              ? 'bg-blue-100 text-blue-800 border border-blue-200'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
          ]"
        >
          <span v-if="!operadorIdentificado">1/3: Aguardando Monitor</span>
          <span v-else-if="!colaboradorApto">2/3: Aguardando Colaborador</span>
          <span v-else>3/3: Pronto para Coletor</span>
        </span>
      </div>
    </div>

    <!-- Alertas -->
    <div
      v-if="mensagemErro"
      class="p-4 rounded-xl bg-red-50 border-2 border-red-500 text-red-800 text-xs sm:text-sm font-bold flex items-center justify-between shadow-sm animate-bounce-once"
    >
      <div class="flex items-center gap-2">
        <span class="text-lg leading-none">&times;</span>
        <span>{{ mensagemErro }}</span>
      </div>
      <button @click="mensagemErro = ''" class="text-red-600 hover:text-red-900 text-xs font-black px-2 py-1">
        OK
      </button>
    </div>

    <div
      v-if="mensagemSucesso"
      class="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-500 text-emerald-800 text-xs sm:text-sm font-bold flex items-center justify-between shadow-sm animate-bounce-once"
    >
      <div class="flex items-center gap-2">
        <span class="text-lg leading-none">&check;</span>
        <span>{{ mensagemSucesso }}</span>
      </div>
      <button @click="mensagemSucesso = ''" class="text-emerald-600 hover:text-emerald-900 text-xs font-black px-2 py-1">
        OK
      </button>
    </div>

    <!-- ETAPA 1: MONITOR RESPONSÁVEL (QUEM ESTÁ LIBERANDO) -->
    <div class="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
      <div class="flex justify-between items-center">
        <label class="block text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <span class="w-5 h-5 rounded-full bg-[#002B49] text-white inline-flex items-center justify-center text-[11px]">1</span>
          <span>Bipar Crachá do Monitor (Quem está liberando)</span>
        </label>
        <button
          v-if="operadorIdentificado"
          @click="cancelarOperador"
          class="text-xs text-red-600 hover:text-red-800 hover:underline font-bold"
        >
          Trocar Monitor
        </button>
      </div>

      <div class="relative">
        <input
          ref="operadorInputRef"
          v-model="crachaOperador"
          type="text"
          autocomplete="off"
          :disabled="loadingOperador || Boolean(operadorIdentificado)"
          placeholder="Aguardando bipe do código de barras ou aproximação RFID do monitor..."
          class="w-full px-4 py-3 rounded-xl border-2 font-mono text-sm sm:text-base tracking-wide transition outline-none"
          :class="[
            operadorIdentificado
              ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold'
              : 'bg-white border-slate-300 focus:border-[#002B49] focus:ring-4 focus:ring-blue-100',
          ]"
          @keydown.enter.prevent="processarOperador"
        />
        <div class="absolute right-3 top-3 text-xs text-slate-400 font-mono hidden sm:block">
          [ENTER]
        </div>
      </div>

      <!-- Card do Monitor Confirmado -->
      <div
        v-if="operadorIdentificado"
        class="bg-blue-50 border border-blue-200 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
      >
        <div>
          <div class="text-xs font-bold uppercase text-blue-600 tracking-wider">Monitor Liberador</div>
          <div class="text-sm sm:text-base font-black text-slate-900">{{ operadorIdentificado.nome }}</div>
          <div class="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1 mt-0.5">
            <span><strong>Matrícula:</strong> {{ operadorIdentificado.matricula }}</span>
            <span v-if="operadorIdentificado.cargo"><strong>Cargo:</strong> {{ operadorIdentificado.cargo }}</span>
          </div>
        </div>
        <div class="text-xs font-bold text-blue-700 bg-white border border-blue-300 px-3 py-1 rounded-full">
          ✓ Monitor Confirmado
        </div>
      </div>
    </div>

    <!-- ETAPA 2: IDENTIFICAÇÃO DO COLABORADOR (QUEM ESTÁ RECEBENDO) -->
    <div
      class="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 transition-opacity"
      :class="{ 'opacity-50 pointer-events-none': !operadorIdentificado }"
    >
      <div class="flex justify-between items-center">
        <label class="block text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <span class="w-5 h-5 rounded-full bg-[#002B49] text-white inline-flex items-center justify-center text-[11px]">2</span>
          <span>Bipar Crachá do Colaborador (Quem está recebendo)</span>
        </label>
        <button
          v-if="colaboradorApto"
          @click="cancelarColaborador"
          class="text-xs text-red-600 hover:text-red-800 hover:underline font-bold"
        >
          Trocar Colaborador
        </button>
      </div>

      <div class="relative">
        <input
          ref="crachaInputRef"
          v-model="cracha"
          type="text"
          autocomplete="off"
          :disabled="!operadorIdentificado || loadingCracha || Boolean(colaboradorApto)"
          placeholder="Aguardando bipe do código de barras ou aproximação RFID do colaborador..."
          class="w-full px-4 py-3 rounded-xl border-2 font-mono text-sm sm:text-base tracking-wide transition outline-none"
          :class="[
            colaboradorApto
              ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
              : 'bg-white border-slate-300 focus:border-[#002B49] focus:ring-4 focus:ring-blue-100',
          ]"
          @keydown.enter.prevent="processarCracha"
        />
        <div class="absolute right-3 top-3 text-xs text-slate-400 font-mono hidden sm:block">
          [ENTER]
        </div>
      </div>

      <!-- Card do Colaborador Identificado -->
      <div
        v-if="colaboradorApto"
        class="bg-gradient-to-r from-slate-50 to-emerald-50/40 border border-emerald-200 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
      >
        <div>
          <div class="text-xs font-bold uppercase text-emerald-700 tracking-wider">Colaborador Titular</div>
          <div class="text-sm sm:text-base font-black text-slate-900">{{ colaboradorApto.nome }}</div>
          <div class="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1 mt-0.5">
            <span><strong>Matrícula:</strong> {{ colaboradorApto.matricula }}</span>
            <span><strong>Setor:</strong> {{ colaboradorApto.setor }}</span>
            <span><strong>Função:</strong> {{ colaboradorApto.funcao }}</span>
          </div>
        </div>
        <div class="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
          Pronto para retirada
        </div>
      </div>
    </div>

    <!-- ETAPA 3: SELEÇÃO DO COLETOR (BIPE OU CARD GRID) -->
    <div
      class="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5 transition-opacity"
      :class="{ 'opacity-50 pointer-events-none': !operadorIdentificado || !colaboradorApto }"
    >
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <label class="block text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <span class="w-5 h-5 rounded-full bg-[#002B49] text-white inline-flex items-center justify-center text-[11px]">3</span>
          <span>Selecionar Coletor (Bipe ou Escolha no Grid)</span>
        </label>
        <span class="text-xs text-slate-500 font-medium">
          {{ coletoresDisponiveis.length }} aparelho(s) disponível(is)
        </span>
      </div>

      <!-- Campo de Bipe Rápido -->
      <div class="relative">
        <input
          ref="coletorInputRef"
          v-model="patrimonioBipe"
          type="text"
          maxlength="7"
          autocomplete="off"
          :disabled="!operadorIdentificado || !colaboradorApto || loadingRetirada"
          placeholder="Bipar patrimônio de 7 dígitos ou buscar abaixo..."
          class="w-full px-4 py-3 rounded-xl border-2 font-mono text-sm sm:text-base tracking-wide transition outline-none bg-white border-slate-300 focus:border-[#002B49] focus:ring-4 focus:ring-blue-100"
          @keydown.enter.prevent="processarRetiradaPorBipe"
        />
        <div class="absolute right-3 top-3 text-xs text-slate-400 font-mono hidden sm:block">
          [ENTER]
        </div>
      </div>

      <!-- Barra de Filtro Rápido no Grid -->
      <div class="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
        <div class="text-xs font-bold text-slate-600">
          Aparelhos Disponíveis
        </div>
        <div class="w-full sm:w-64">
          <input
            v-model="filtroGrid"
            type="text"
            placeholder="Filtrar modelo, marca..."
            class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#002B49]"
          />
        </div>
      </div>

      <!-- Grid Visual de Coletores Disponíveis -->
      <div v-if="loadingColetores" class="p-8 text-center text-xs text-slate-400">
        Carregando aparelhos disponíveis...
      </div>
      <div v-else-if="coletoresFiltrados.length === 0" class="p-8 text-center text-xs text-slate-400">
        Nenhum coletor disponível localizado.
      </div>
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-72 overflow-y-auto p-1">
        <div
          v-for="c in coletoresFiltrados"
          :key="c.id"
          @click="selecionarColetorGrid(c)"
          class="p-3 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between group"
          :class="[
            coletorSelecionado?.id === c.id
              ? 'border-blue-700 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20'
              : 'border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50',
          ]"
        >
          <div>
            <div class="flex justify-between items-start">
              <span class="font-mono text-sm font-black text-slate-900 group-hover:text-blue-900">
                {{ c.patrimonio }}
              </span>
              <span class="w-2 h-2 rounded-full bg-emerald-500 mt-1"></span>
            </div>
            <div class="text-xs font-semibold text-slate-700 mt-1 leading-tight">
              {{ c.marca }} {{ c.modelo }}
            </div>
            <div class="flex items-center gap-1.5 mt-1.5">
              <span
                v-if="c.setor?.nome"
                class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 truncate max-w-full"
              >
                {{ c.setor.nome }}
              </span>
              <span v-else class="text-[9px] text-slate-400">Geral</span>
              <span class="text-[9px] text-slate-400 font-mono truncate">
                {{ c.numeroSerie || 'S/N' }}
              </span>
            </div>
          </div>

          <div class="mt-3 pt-2 border-t border-slate-100 text-right">
            <span
              class="text-[10px] font-bold"
              :class="coletorSelecionado?.id === c.id ? 'text-blue-800' : 'text-slate-400 group-hover:text-slate-700'"
            >
              {{ coletorSelecionado?.id === c.id ? '✓ Selecionado' : 'Clique para escolher' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Barra de Ação Inferior -->
      <div class="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-100">
        <div class="text-xs text-slate-500">
          <span v-if="coletorSelecionado" class="font-bold text-slate-800">
            Selecionado: Coletor {{ coletorSelecionado.patrimonio }} ({{ coletorSelecionado.marca }} {{ coletorSelecionado.modelo }})
          </span>
          <span v-else>Selecione um aparelho acima ou bipe o patrimônio.</span>
        </div>

        <div class="flex gap-2 w-full sm:w-auto">
          <button
            type="button"
            @click="resetarFluxo"
            class="flex-1 sm:flex-none px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-lg text-xs transition"
          >
            Limpar [ESC]
          </button>
          <button
            type="button"
            :disabled="!operadorIdentificado || !colaboradorApto || !coletorSelecionado || loadingRetirada"
            @click="processarRetiradaFinal"
            class="flex-1 sm:flex-none px-5 py-2.5 bg-[#002B49] hover:bg-slate-800 text-white font-bold rounded-lg text-xs shadow-md disabled:opacity-40 transition"
          >
            {{ loadingRetirada ? 'Confirmando...' : 'Confirmar Retirada' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useMovimentacoesStore } from '../stores/movimentacoes';
import { useAudioFeedback } from '../composables/useAudioFeedback';
import api from '../api/axios';

const store = useMovimentacoesStore();
const { playSuccess, playError } = useAudioFeedback();

const operadorInputRef = ref<HTMLInputElement | null>(null);
const crachaInputRef = ref<HTMLInputElement | null>(null);
const coletorInputRef = ref<HTMLInputElement | null>(null);

const crachaOperador = ref('');
const operadorIdentificado = ref<any>(null);

const cracha = ref('');
const colaboradorApto = ref<any>(null);
const patrimonioBipe = ref('');

const coletoresDisponiveis = ref<any[]>([]);
const coletorSelecionado = ref<any>(null);
const filtroGrid = ref('');

const loadingOperador = ref(false);
const loadingCracha = ref(false);
const loadingRetirada = ref(false);
const loadingColetores = ref(false);

const mensagemErro = ref('');
const mensagemSucesso = ref('');

const coletoresFiltrados = computed(() => {
  const termo = filtroGrid.value.trim().toLowerCase();
  if (!termo) return coletoresDisponiveis.value;
  return coletoresDisponiveis.value.filter(
    (c) =>
      c.patrimonio.toLowerCase().includes(termo) ||
      c.marca.toLowerCase().includes(termo) ||
      c.modelo.toLowerCase().includes(termo) ||
      (c.numeroSerie && c.numeroSerie.toLowerCase().includes(termo)) ||
      (c.setor?.nome && c.setor.nome.toLowerCase().includes(termo))
  );
});

const carregarColetoresDisponiveis = async () => {
  loadingColetores.value = true;
  try {
    const { data } = await api.get('/coletores', {
      params: { status: 'DISPONIVEL', limit: 100 },
    });
    coletoresDisponiveis.value = data.dados || [];
  } catch (err) {
    console.error('Erro ao carregar coletores disponíveis:', err);
  } finally {
    loadingColetores.value = false;
  }
};

const focarOperador = () => {
  nextTick(() => {
    operadorInputRef.value?.focus();
  });
};

const focarCracha = () => {
  nextTick(() => {
    crachaInputRef.value?.focus();
  });
};

const focarColetor = () => {
  nextTick(() => {
    coletorInputRef.value?.focus();
  });
};

// 1. Processa o bipe do Monitor Liberador
const processarOperador = async () => {
  const codigo = crachaOperador.value.replace(/[\r\n\t]/g, '').trim();
  if (!codigo) return;
  crachaOperador.value = codigo;

  mensagemErro.value = '';
  mensagemSucesso.value = '';
  loadingOperador.value = true;

  try {
    const op = await store.validarOperador(codigo);
    operadorIdentificado.value = op;
    playSuccess();
    focarCracha();
  } catch (err: any) {
    playError();
    mensagemErro.value = err.response?.data?.mensagem || 'Falha ao validar crachá do monitor.';
    crachaOperador.value = '';
    focarOperador();
  } finally {
    loadingOperador.value = false;
  }
};

// 2. Processa o bipe do Colaborador Recebedor
const processarCracha = async () => {
  const codigo = cracha.value.replace(/[\r\n\t]/g, '').trim();
  if (!codigo) return;
  cracha.value = codigo;

  mensagemErro.value = '';
  mensagemSucesso.value = '';
  loadingCracha.value = true;

  try {
    const dados = await store.validarCracha(codigo);

    // Validação cruzada: o colaborador não pode ser o mesmo monitor
    if (operadorIdentificado.value && operadorIdentificado.value.matricula === dados.matricula) {
      throw new Error('O monitor responsável pela liberação não pode ser o mesmo colaborador que retira o coletor.');
    }

    colaboradorApto.value = dados;
    playSuccess();
    focarColetor();
  } catch (err: any) {
    playError();
    mensagemErro.value = err.response?.data?.mensagem || err.message || 'Falha ao validar crachá do colaborador.';
    cracha.value = '';
    focarCracha();
  } finally {
    loadingCracha.value = false;
  }
};

const selecionarColetorGrid = (coletor: any) => {
  coletorSelecionado.value = coletor;
  patrimonioBipe.value = coletor.patrimonio;
};

const processarRetiradaPorBipe = async () => {
  const pat = patrimonioBipe.value.replace(/[\r\n\t]/g, '').trim();
  if (!pat) return;
  patrimonioBipe.value = pat;

  const encontrado = coletoresDisponiveis.value.find((c) => c.patrimonio === pat);
  if (encontrado) {
    coletorSelecionado.value = encontrado;
  } else {
    coletorSelecionado.value = { patrimonio: pat, marca: '', modelo: '' };
  }

  await processarRetiradaFinal();
};

const processarRetiradaFinal = async () => {
  if (!operadorIdentificado.value || !colaboradorApto.value || !coletorSelecionado.value) return;

  const pat = coletorSelecionado.value.patrimonio.trim();
  if (!/^[0-9]{7}$/.test(pat)) {
    playError();
    mensagemErro.value = 'O patrimônio deve conter exatamente 7 dígitos numéricos.';
    return;
  }

  mensagemErro.value = '';
  loadingRetirada.value = true;

  try {
    await store.realizarRetirada(
      colaboradorApto.value.matricula,
      pat,
      crachaOperador.value
    );
    playSuccess();
    mensagemSucesso.value = `Retirada concluída! Coletor ${pat} entregue a ${colaboradorApto.value.nome} por ${operadorIdentificado.value.nome}.`;

    // Reseta todo o fluxo para o próximo atendimento (sem fixar operador)
    crachaOperador.value = '';
    operadorIdentificado.value = null;
    cracha.value = '';
    colaboradorApto.value = null;
    patrimonioBipe.value = '';
    coletorSelecionado.value = null;
    await carregarColetoresDisponiveis();
    focarOperador();
  } catch (err: any) {
    playError();
    mensagemErro.value = err.response?.data?.mensagem || 'Falha ao efetuar a retirada.';
  } finally {
    loadingRetirada.value = false;
  }
};

const cancelarOperador = () => {
  operadorIdentificado.value = null;
  crachaOperador.value = '';
  colaboradorApto.value = null;
  cracha.value = '';
  patrimonioBipe.value = '';
  coletorSelecionado.value = null;
  focarOperador();
};

const cancelarColaborador = () => {
  colaboradorApto.value = null;
  patrimonioBipe.value = '';
  coletorSelecionado.value = null;
  cracha.value = '';
  focarCracha();
};

const resetarFluxo = () => {
  cancelarOperador();
  mensagemErro.value = '';
  mensagemSucesso.value = '';
};

onMounted(() => {
  focarOperador();
  carregarColetoresDisponiveis();

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      resetarFluxo();
    }
  });
});
</script>