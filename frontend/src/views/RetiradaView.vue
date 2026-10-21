<template>
  <div class="space-y-6">
    <!-- Cabeçalho -->
    <div class="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 class="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          Retirada de Coletor (Check-out)
        </h2>
        <p class="text-xs text-slate-500 mt-0.5">
          Identifique o colaborador e escolha o coletor bipando o patrimônio ou selecionando no grid de disponíveis.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <span
          class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
          :class="colaboradorApto ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600'"
        >
          {{ colaboradorApto ? 'Colaborador Apto' : 'Aguardando Crachá' }}
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

    <!-- ETAPA 1: IDENTIFICAÇÃO DO COLABORADOR -->
    <div class="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
      <div class="flex justify-between items-center">
        <label class="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
          1. Bipar Crachá do Colaborador (Código de Barras ou Matrícula)
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
          :disabled="loadingCracha || Boolean(colaboradorApto)"
          placeholder="Aguardando bipe do crachá do colaborador..."
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

    <!-- ETAPA 2: SELEÇÃO DO COLETOR (BIPE OU CARD GRID) -->
    <div
      class="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5 transition-opacity"
      :class="{ 'opacity-50 pointer-events-none': !colaboradorApto }"
    >
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <label class="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
          2. Selecionar Coletor (Bipe ou Escolha no Grid)
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
          :disabled="!colaboradorApto || loadingRetirada"
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
          Grade de Coletores Disponíveis:
        </div>
        <div class="w-48 sm:w-64">
          <input
            v-model="filtroGrid"
            type="text"
            placeholder="Filtrar modelo, marca..."
            class="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <!-- CARD GRID DE COLETORES DISPONÍVEIS -->
      <div v-if="loadingColetores" class="p-8 text-center text-xs text-slate-400">
        Carregando lista de aparelhos disponíveis...
      </div>

      <div
        v-else-if="coletoresFiltrados.length === 0"
        class="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200"
      >
        <p class="text-xs font-bold text-slate-600">Nenhum coletor disponível localizado.</p>
        <p class="text-[11px] text-slate-400 mt-1">Verifique se todos os aparelhos estão em uso ou em manutenção.</p>
      </div>

      <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-96 overflow-y-auto p-1">
        <div
          v-for="c in coletoresFiltrados"
          :key="c.id"
          @click="selecionarColetorGrid(c)"
          class="p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-150 flex flex-col justify-between"
          :class="[
            coletorSelecionado?.id === c.id
              ? 'border-[#002B49] bg-blue-50/70 shadow-md ring-2 ring-blue-500/20 scale-[1.02]'
              : 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm',
          ]"
        >
          <div>
            <div class="flex justify-between items-start">
              <span class="text-sm font-black font-mono text-slate-900 tracking-tight">
                {{ c.patrimonio }}
              </span>
              <span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                LIVRE
              </span>
            </div>
            <div class="text-xs font-semibold text-slate-700 mt-1.5 leading-tight">
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
            :disabled="!colaboradorApto || !coletorSelecionado || loadingRetirada"
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

const crachaInputRef = ref<HTMLInputElement | null>(null);
const coletorInputRef = ref<HTMLInputElement | null>(null);

const cracha = ref('');
const patrimonioBipe = ref('');
const colaboradorApto = ref<any>(null);

const coletoresDisponiveis = ref<any[]>([]);
const coletorSelecionado = ref<any>(null);
const filtroGrid = ref('');

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

const processarCracha = async () => {
  const codigo = cracha.value.replace(/[\r\n\t]/g, '').trim();
  if (!codigo) return;
  cracha.value = codigo;

  mensagemErro.value = '';
  mensagemSucesso.value = '';
  loadingCracha.value = true;

  try {
    const dados = await store.validarCracha(codigo);
    colaboradorApto.value = dados;
    playSuccess();
    focarColetor();
  } catch (err: any) {
    playError();
    mensagemErro.value = err.response?.data?.mensagem || 'Falha ao validar crachá do colaborador.';
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
  if (!colaboradorApto.value || !coletorSelecionado.value) return;

  const pat = coletorSelecionado.value.patrimonio.trim();
  if (!/^[0-9]{7}$/.test(pat)) {
    playError();
    mensagemErro.value = 'O patrimônio deve conter exatamente 7 dígitos numéricos.';
    return;
  }

  mensagemErro.value = '';
  loadingRetirada.value = true;

  try {
    await store.realizarRetirada(colaboradorApto.value.matricula, pat);
    playSuccess();
    mensagemSucesso.value = `Retirada concluída! Coletor ${pat} entregue a ${colaboradorApto.value.nome}.`;

    // Reseta estado para a próxima retirada
    cracha.value = '';
    patrimonioBipe.value = '';
    colaboradorApto.value = null;
    coletorSelecionado.value = null;
    await carregarColetoresDisponiveis();
    focarCracha();
  } catch (err: any) {
    playError();
    mensagemErro.value = err.response?.data?.mensagem || 'Falha ao efetuar a retirada.';
  } finally {
    loadingRetirada.value = false;
  }
};

const cancelarColaborador = () => {
  colaboradorApto.value = null;
  patrimonioBipe.value = '';
  coletorSelecionado.value = null;
  cracha.value = '';
  focarCracha();
};

const resetarFluxo = () => {
  cancelarColaborador();
  mensagemErro.value = '';
  mensagemSucesso.value = '';
};

onMounted(() => {
  focarCracha();
  carregarColetoresDisponiveis();

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      resetarFluxo();
    }
  });
});
</script>
