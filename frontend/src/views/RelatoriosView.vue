<template>
  <div class="space-y-6">
    <!-- Cabeçalho -->
    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 class="text-xl font-black text-gray-900 tracking-tight">Histórico de Custódias e Auditoria</h2>
      <p class="text-xs text-gray-500 mt-1">Consulta retroativa completa de empréstimos e devoluções</p>
    </div>

    <!-- Filtros de Pesquisa -->
    <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <div>
        <label class="block text-xs font-bold text-gray-700 mb-1">Data Início</label>
        <input
          v-model="filtroDataInicio"
          type="date"
          class="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-dass-blue"
        />
      </div>
      <div>
        <label class="block text-xs font-bold text-gray-700 mb-1">Data Fim</label>
        <input
          v-model="filtroDataFim"
          type="date"
          class="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-dass-blue"
        />
      </div>
      <div>
        <label class="block text-xs font-bold text-gray-700 mb-1">Patrimônio</label>
        <input
          v-model="filtroPatrimonio"
          type="text"
          placeholder="Ex: 1002345"
          class="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-dass-blue"
        />
      </div>
      <div>
        <label class="block text-xs font-bold text-gray-700 mb-1">Preferência / Titularidade</label>
        <select
          v-model="filtroTipoPreferencia"
          class="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-dass-blue bg-white text-gray-700 font-semibold"
          @change="buscarHistorico"
        >
          <option value="">Todas as Retiradas</option>
          <option value="FORA_PREFERENCIA">Fora da Preferência</option>
          <option value="TITULAR">Titular do Coletor</option>
          <option value="LIVRE">Livre (Sem Vínculo)</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-bold text-gray-700 mb-1">Matrícula</label>
        <div class="flex gap-2">
          <input
            v-model="filtroMatricula"
            type="number"
            placeholder="Ex: 3023859"
            class="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-dass-blue"
          />
          <button
            @click="buscarHistorico"
            class="px-4 py-2 bg-dass-blue hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition"
          >
            Filtrar
          </button>
        </div>
      </div>
    </div>

    <!-- Tabela Histórica -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-gray-400 text-xs">
        Buscando movimentações...
      </div>

      <div v-else-if="movimentacoes.length === 0" class="p-10 text-center text-gray-500 text-xs">
        Nenhuma movimentação localizada para o período e filtros informados.
      </div>

      <div v-else>
        <!-- Visão Desktop (Tabela) -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left text-xs text-gray-600">
            <thead class="bg-gray-100 text-gray-700 uppercase font-black text-[10px] tracking-wider">
              <tr>
                <th class="py-3 px-4">Patrimônio</th>
                <th class="py-3 px-4">Colaborador</th>
                <th class="py-3 px-4">Preferência / Turno</th>
                <th class="py-3 px-4">Setor</th>
                <th class="py-3 px-4">Saída</th>
                <th class="py-3 px-4">Entregue Por</th>
                <th class="py-3 px-4">Retorno</th>
                <th class="py-3 px-4">Recebido Por</th>
                <th class="py-3 px-4 text-center">Duração</th>
                <th class="py-3 px-4">Observações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="m in movimentacoes" :key="m.id" class="hover:bg-gray-50 transition">
                <td class="py-3 px-4 font-mono font-bold text-gray-900">
                  {{ m.coletor?.patrimonio }}
                </td>
                <td class="py-3 px-4">
                  <div class="font-bold text-gray-900">{{ m.nomeColaborador }}</div>
                  <div class="text-[10px] text-gray-400">Mat: {{ m.matriculaColaborador }}</div>
                </td>
                <td class="py-3 px-4">
                  <div v-if="m.tipoPreferencia === 'FORA_PREFERENCIA'" class="space-y-0.5">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      ⇄ Fora da Preferência
                    </span>
                    <div v-if="m.detalhePreferencia" class="text-[10px] text-gray-500 max-w-xs leading-snug">
                      {{ m.detalhePreferencia }}
                    </div>
                  </div>
                  <div v-else-if="m.tipoPreferencia === 'TITULAR'" class="space-y-0.5">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      ★ Titular
                    </span>
                    <div v-if="m.detalhePreferencia" class="text-[10px] text-gray-400">
                      {{ m.detalhePreferencia }}
                    </div>
                  </div>
                  <span v-else class="text-[11px] text-gray-400">Livre</span>
                </td>
                <td class="py-3 px-4 text-gray-700">{{ m.setorColaborador || '-' }}</td>
                <td class="py-3 px-4 font-mono text-gray-700">{{ formatarDataCompleta(m.dataSaida) }}</td>
                <td class="py-3 px-4 text-gray-600">{{ m.operadorSaida?.nome }}</td>
                <td class="py-3 px-4 font-mono text-gray-700">
                  <div class="inline-flex items-center gap-1.5 font-medium text-slate-700">
                    <span class="w-2 h-2 rounded-full" :class="m.dataRetorno ? 'bg-slate-300' : 'bg-blue-500'"></span>
                    <span>{{ m.dataRetorno ? formatarDataCompleta(m.dataRetorno) : 'Em aberto' }}</span>
                  </div>
                </td>
                <td class="py-3 px-4 text-gray-600">{{ m.operadorRetorno?.nome || '-' }}</td>
                <td class="py-3 px-4 text-center font-mono font-semibold">
                  {{ m.minutosUso !== null ? `${m.minutosUso} min` : '-' }}
                </td>
                <td class="py-3 px-4 text-gray-500 text-xs">
                  {{ m.observacaoDevolucao || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Visão Mobile/Tablet (Cards) -->
        <div class="md:hidden divide-y divide-gray-100 p-3 space-y-3">
          <div
            v-for="m in movimentacoes"
            :key="m.id"
            class="p-4 rounded-xl border border-gray-200 bg-white space-y-2.5"
          >
            <div class="flex justify-between items-start">
              <div>
                <span class="font-mono font-black text-sm text-gray-900">{{ m.coletor?.patrimonio }}</span>
                <span class="text-xs text-gray-500 ml-1.5">{{ m.coletor?.marca }} {{ m.coletor?.modelo }}</span>
              </div>
              <div class="inline-flex items-center gap-1.5 font-medium text-slate-700 text-xs">
                <span class="w-2 h-2 rounded-full" :class="m.dataRetorno ? 'bg-slate-300' : 'bg-blue-500'"></span>
                <span>{{ m.dataRetorno ? 'Devolvido' : 'Em aberto' }}</span>
              </div>
            </div>

            <div class="text-xs text-gray-700 space-y-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-gray-900">{{ m.nomeColaborador }}</span>
                <span
                  v-if="m.tipoPreferencia === 'FORA_PREFERENCIA'"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                >
                  ⇄ Fora Pref.
                </span>
                <span
                  v-else-if="m.tipoPreferencia === 'TITULAR'"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                >
                  ★ Titular
                </span>
              </div>
              <div class="text-gray-500 text-[11px]">Mat: {{ m.matriculaColaborador }} &bull; {{ m.setorColaborador || 'Setor Operacional' }}</div>
              <div v-if="m.tipoPreferencia === 'FORA_PREFERENCIA' && m.detalhePreferencia" class="text-[10px] text-amber-800 bg-amber-50/70 p-1.5 rounded border border-amber-200/70">
                {{ m.detalhePreferencia }}
              </div>
            </div>

            <div class="text-[11px] text-gray-600 grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
              <div>
                <span class="text-gray-400 block text-[10px]">Saída:</span>
                {{ formatarDataCompleta(m.dataSaida) }}
              </div>
              <div>
                <span class="text-gray-400 block text-[10px]">Retorno:</span>
                {{ m.dataRetorno ? formatarDataCompleta(m.dataRetorno) : 'Em trânsito' }}
              </div>
            </div>

            <div v-if="m.observacaoDevolucao" class="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg">
              <strong>Obs:</strong> {{ m.observacaoDevolucao }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../api/axios';

const movimentacoes = ref<any[]>([]);
const loading = ref(false);

const filtroDataInicio = ref('');
const filtroDataFim = ref('');
const filtroPatrimonio = ref('');
const filtroMatricula = ref('');
const filtroTipoPreferencia = ref('');

const formatarDataCompleta = (iso: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

const buscarHistorico = async () => {
  loading.value = true;
  try {
    const params: any = {};
    if (filtroDataInicio.value) params.dataInicio = filtroDataInicio.value;
    if (filtroDataFim.value) params.dataFim = filtroDataFim.value;
    if (filtroPatrimonio.value.trim()) params.patrimonio = filtroPatrimonio.value.trim();
    if (filtroMatricula.value) params.matricula = Number(filtroMatricula.value);
    if (filtroTipoPreferencia.value) params.tipoPreferencia = filtroTipoPreferencia.value;

    const { data } = await api.get('/relatorios/historico', { params });
    movimentacoes.value = data.dados || [];
  } catch (err) {
    console.error('Erro ao buscar histórico:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  buscarHistorico();
});
</script>
