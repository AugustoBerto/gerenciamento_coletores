<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <div class="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-200">
      <div class="flex items-center justify-between pb-4 border-b border-gray-100">
        <div>
          <h2 class="text-lg sm:text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            Devolução de Coletor (Check-in)
          </h2>
          <p class="text-xs text-gray-500 mt-1">
            Bipe o crachá do colaborador (código de barras, matrícula ou RFID) para identificar o aparelho e concluir a devolução.
          </p>
        </div>
        <div class="hidden sm:block text-right">
          <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Check-in por Colaborador
          </span>
        </div>
      </div>

      <!-- Alertas -->
      <div
        v-if="mensagemErro"
        class="mt-4 p-4 rounded-xl bg-red-50 border-2 border-red-500 text-red-800 text-xs sm:text-sm font-bold flex items-center justify-between shadow-sm animate-bounce"
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
        class="mt-4 p-4 rounded-xl bg-emerald-50 border-2 border-emerald-500 text-emerald-800 text-xs sm:text-sm font-bold flex items-center justify-between shadow-sm"
      >
        <div class="flex items-center gap-2">
          <span class="text-lg leading-none">&check;</span>
          <span>{{ mensagemSucesso }}</span>
        </div>
        <button @click="mensagemSucesso = ''" class="text-emerald-600 hover:text-emerald-900 text-xs font-black px-2 py-1">
          OK
        </button>
      </div>

      <div class="mt-6 space-y-6">
        <!-- CAMPO DE IDENTIFICAÇÃO DO COLABORADOR -->
        <div class="space-y-2">
          <label class="block text-xs font-extrabold text-gray-700 uppercase tracking-wider">
            Bipar Crachá do Colaborador (Código de Barras, Matrícula ou RFID)
          </label>
          <div class="flex gap-2">
            <div class="relative flex-1">
              <input
                ref="inputRef"
                v-model="identificador"
                type="text"
                autocomplete="off"
                :disabled="loadingBusca || Boolean(custodiaLocalizada)"
                placeholder="Aguardando bipe do crachá do colaborador..."
                class="w-full px-4 py-3 rounded-xl border-2 font-mono text-sm sm:text-base tracking-wide transition outline-none"
                :class="[
                  custodiaLocalizada
                    ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold'
                    : 'bg-white border-gray-300 focus:border-[#002B49] focus:ring-4 focus:ring-blue-100',
                ]"
                @keydown.enter.prevent="buscarCustodia"
              />
              <div class="absolute right-3 top-3.5 text-xs text-gray-400 font-mono hidden sm:block">
                [ENTER]
              </div>
            </div>
            <button
              type="button"
              :disabled="loadingBusca || Boolean(custodiaLocalizada) || !identificador.trim()"
              @click="buscarCustodia"
              class="px-5 py-3 bg-[#002B49] hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-40"
            >
              {{ loadingBusca ? 'Buscando...' : 'Localizar' }}
            </button>
          </div>
        </div>

        <!-- RESUMO DA CUSTÓDIA LOCALIZADA -->
        <div
          v-if="custodiaLocalizada"
          class="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-5 shadow-sm"
        >
          <!-- Cabeçalho do Colaborador -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-200 pb-3">
            <div>
              <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Colaborador Identificado</div>
              <div class="text-base font-black text-gray-900">{{ custodiaLocalizada.colaborador.nome }}</div>
              <div class="text-xs text-gray-600">
                Matrícula: {{ custodiaLocalizada.colaborador.matricula }} &bull; Setor: {{ custodiaLocalizada.colaborador.setor }}
              </div>
            </div>
            <div class="text-left sm:text-right">
              <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tempo sob Custódia</div>
              <div
                class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold mt-0.5"
                :class="custodiaLocalizada.statusSLA === 'EXCEDIDO' ? 'bg-red-100 text-red-800 border border-red-300 animate-pulse' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'"
              >
                {{ custodiaLocalizada.tempoFormatado }}
              </div>
            </div>
          </div>

          <!-- Destaque do Coletor Vinculado -->
          <div class="bg-white p-4 rounded-xl border-2 border-blue-200 space-y-2">
            <div class="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">
              Equipamento em Devolução:
            </div>
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <span class="text-xs text-gray-500 font-semibold mr-1">Patrimônio:</span>
                <span class="text-2xl font-black font-mono text-[#002B49] tracking-tight">
                  {{ custodiaLocalizada.patrimonio }}
                </span>
              </div>
              <div class="text-xs text-gray-700 font-medium">
                {{ custodiaLocalizada.marca }} {{ custodiaLocalizada.modelo }}
                <span v-if="custodiaLocalizada.numeroSerie" class="text-gray-400 font-mono ml-1">
                  (S/N: {{ custodiaLocalizada.numeroSerie }})
                </span>
              </div>
            </div>
            <div class="text-[11px] text-gray-500 pt-1 border-t border-gray-100 flex flex-wrap gap-x-4">
              <span><strong>Entregue por:</strong> {{ custodiaLocalizada.operadorSaida.nome }}</span>
              <span><strong>Horário de Saída:</strong> {{ formatarData(custodiaLocalizada.dataSaida) }}</span>
            </div>
          </div>

          <!-- OPÇÕES DE ESTADO / AVARIA -->
          <div class="border-t border-gray-200 pt-4 space-y-3">
            <div class="flex items-center gap-2">
              <input
                id="checkAvaria"
                type="checkbox"
                v-model="comAvaria"
                class="h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
              />
              <label for="checkAvaria" class="text-xs font-extrabold text-red-700 uppercase tracking-wider cursor-pointer">
                Coletor danificado / Encaminhar para Manutenção
              </label>
            </div>

            <!-- Campo de Motivo da Manutenção e Ordem de Serviço -->
            <div v-if="comAvaria" class="space-y-3 bg-red-50/60 p-3.5 rounded-xl border border-red-200">
              <div>
                <label class="block text-xs font-bold text-red-900">Número da OS (7 Dígitos Numéricos)*</label>
                <input
                  v-model="numeroOs"
                  type="text"
                  maxlength="7"
                  required
                  @input="numeroOs = numeroOs.replace(/\D/g, '').slice(0, 7)"
                  placeholder="Ex: 1049283"
                  class="w-full mt-1 p-2.5 text-xs rounded-xl border border-red-300 font-mono outline-none focus:ring-2 focus:ring-red-500 bg-white"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-red-900">Motivo da Avaria / Defeito Técnico*</label>
                <textarea
                  v-model="motivoManutencao"
                  rows="2"
                  placeholder="Ex: Gatilho quebrado, display trincado, falha na leitura óptica..."
                  class="w-full mt-1 p-2.5 text-xs rounded-xl border border-red-300 focus:ring-2 focus:ring-red-500 outline-none bg-white"
                ></textarea>
              </div>
            </div>

            <div v-else class="space-y-1">
              <label class="block text-xs font-medium text-gray-500">Observação opcional:</label>
              <input
                v-model="observacao"
                type="text"
                placeholder="Ex: Devolução no final do turno com aparelho higienizado"
                class="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#002B49] outline-none"
              />
            </div>
          </div>

          <!-- BOTÕES DE CONFIRMAÇÃO -->
          <div class="flex justify-end gap-3 pt-2">
            <button
              type="button"
              @click="cancelarDevolucao"
              class="px-4 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-100 font-bold rounded-xl text-xs transition"
            >
              Cancelar [ESC]
            </button>
            <button
              type="button"
              :disabled="loadingDevolucao || (comAvaria && (!motivoManutencao.trim() || !numeroOs.trim()))"
              @click="confirmarDevolucao"
              class="px-5 py-2.5 font-bold rounded-xl text-xs shadow-md disabled:opacity-40 transition text-white"
              :class="comAvaria ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'"
            >
              {{ loadingDevolucao ? 'Processando...' : comAvaria ? 'Devolver e Enviar para Manutenção' : 'Confirmar Devolução [ENTER]' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useMovimentacoesStore } from '../stores/movimentacoes';
import { useAudioFeedback } from '../composables/useAudioFeedback';

const route = useRoute();
const store = useMovimentacoesStore();
const { playSuccess, playError } = useAudioFeedback();

const inputRef = ref<HTMLInputElement | null>(null);
const identificador = ref('');
const custodiaLocalizada = ref<any>(null);

const comAvaria = ref(false);
const numeroOs = ref('');
const motivoManutencao = ref('');
const observacao = ref('');

const loadingBusca = ref(false);
const loadingDevolucao = ref(false);

const mensagemErro = ref('');
const mensagemSucesso = ref('');

const formatarData = (isoDate: string) => {
  if (!isoDate) return '-';
  const d = new Date(isoDate);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const focarInput = () => {
  nextTick(() => {
    inputRef.value?.focus();
  });
};

const buscarCustodia = async () => {
  const id = identificador.value.trim();
  if (!id) return;

  mensagemErro.value = '';
  mensagemSucesso.value = '';
  loadingBusca.value = true;

  try {
    // Se vier do dashboard por patrimônio de 7 dígitos ou matrícula
    let dados: any;
    if (/^[0-9]{7}$/.test(id) && route.query.patrimonio === id) {
      dados = await store.buscarPorPatrimonio(id);
    } else {
      dados = await store.buscarPorColaborador(id);
    }

    custodiaLocalizada.value = dados;
    playSuccess();
  } catch (err: any) {
    playError();
    mensagemErro.value =
      err.response?.data?.mensagem ||
      'Não foi possível localizar custódia aberta para este colaborador.';
    identificador.value = '';
    focarInput();
  } finally {
    loadingBusca.value = false;
  }
};

const confirmarDevolucao = async () => {
  if (!custodiaLocalizada.value) return;

  if (comAvaria.value && !/^[0-9]{7}$/.test(numeroOs.value.trim())) {
    playError();
    mensagemErro.value = 'O número da OS deve conter exatamente 7 dígitos numéricos.';
    return;
  }

  if (comAvaria.value && !motivoManutencao.value.trim()) {
    playError();
    mensagemErro.value = 'Informe o motivo da avaria para encaminhar o coletor para manutenção.';
    return;
  }

  mensagemErro.value = '';
  loadingDevolucao.value = true;

  try {
    const res = await store.realizarDevolucao(custodiaLocalizada.value.movimentacaoId, {
      avaria: comAvaria.value,
      motivoManutencao: comAvaria.value ? motivoManutencao.value.trim() : null,
      numeroOs: comAvaria.value ? numeroOs.value.trim() : null,
      observacao: observacao.value.trim() || null,
    });

    playSuccess();
    mensagemSucesso.value = `Devolução do coletor ${custodiaLocalizada.value.patrimonio} (${custodiaLocalizada.value.colaborador.nome}) confirmada com sucesso! (${res.dados.minutosUso} min de uso)`;

    // Reseta estado para o próximo bipe
    custodiaLocalizada.value = null;
    identificador.value = '';
    comAvaria.value = false;
    numeroOs.value = '';
    motivoManutencao.value = '';
    observacao.value = '';
    focarInput();
  } catch (err: any) {
    playError();
    mensagemErro.value = err.response?.data?.mensagem || 'Falha ao concluir a devolução.';
  } finally {
    loadingDevolucao.value = false;
  }
};

const cancelarDevolucao = () => {
  custodiaLocalizada.value = null;
  identificador.value = '';
  comAvaria.value = false;
  numeroOs.value = '';
  motivoManutencao.value = '';
  observacao.value = '';
  mensagemErro.value = '';
  focarInput();
};

onMounted(() => {
  focarInput();
  // Se veio pré-preenchido por query param
  if (route.query.matricula) {
    identificador.value = String(route.query.matricula);
    buscarCustodia();
  } else if (route.query.patrimonio) {
    identificador.value = String(route.query.patrimonio);
    buscarCustodia();
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      cancelarDevolucao();
    }
  });
});
</script>
