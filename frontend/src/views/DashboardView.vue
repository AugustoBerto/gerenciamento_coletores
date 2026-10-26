<template>
  <div class="space-y-6">
    <!-- Cabeçalho do Dashboard e Ações Rápidas -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div>
        <h2 class="text-xl font-black text-gray-900 tracking-tight">Painel Operacional de Custódia</h2>
        <p class="text-xs text-gray-500 mt-1">Visão em tempo real de aparelhos em trânsito e SLAs fabris</p>
      </div>
      <div class="flex space-x-3 w-full sm:w-auto">
        <RouterLink
          to="/retirada"
          class="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 bg-dass-blue hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition"
        >
          + Retirada (Check-out)
        </RouterLink>
        <RouterLink
          to="/devolucao"
          class="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
        >
          &check; Devolução (Check-in)
        </RouterLink>
      </div>
    </div>

    <!-- Cards de Métricas -->
    <div
      class="grid grid-cols-2 gap-3.5"
      :class="store.metricas?.slaAtivo ? 'sm:grid-cols-3 lg:grid-cols-5' : 'sm:grid-cols-2 lg:grid-cols-4'"
    >
      <div class="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-200">
        <div class="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Parque Total</div>
        <div class="text-2xl font-black text-gray-900 mt-1">{{ store.metricas?.total ?? '-' }}</div>
        <div class="text-[10px] text-gray-400 mt-1">Aparelhos patrimoniados</div>
      </div>

      <div class="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-200">
        <div class="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Disponíveis</div>
        <div class="text-2xl font-black text-emerald-600 mt-1">{{ store.metricas?.disponiveis ?? '-' }}</div>
        <div class="text-[10px] text-gray-400 mt-1">Prontos para empréstimo</div>
      </div>

      <div class="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-200">
        <div class="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Em Uso Ativo</div>
        <div class="text-2xl font-black text-blue-600 mt-1">{{ store.metricas?.emUso ?? '-' }}</div>
        <div class="text-[10px] text-gray-400 mt-1">Sob posse de colaboradores</div>
      </div>

      <div class="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-200">
        <div class="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Manutenção</div>
        <div class="text-2xl font-black text-amber-600 mt-1">{{ store.metricas?.manutencao ?? '-' }}</div>
        <div class="text-[10px] text-gray-400 mt-1">Em reparo técnico</div>
      </div>

      <!-- Card SLA Excedido: Exibido exclusivamente quando o SLA estiver ativo -->
      <div
        v-if="store.metricas?.slaAtivo"
        class="col-span-2 sm:col-span-1 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border"
        :class="(store.metricas?.atrasados ?? 0) > 0 ? 'border-red-400 bg-red-50/50' : 'border-gray-200'"
      >
        <div class="text-[11px] font-bold uppercase tracking-wider" :class="(store.metricas?.atrasados ?? 0) > 0 ? 'text-red-700' : 'text-gray-500'">
          SLA Excedido
        </div>
        <div class="text-2xl font-black mt-1" :class="(store.metricas?.atrasados ?? 0) > 0 ? 'text-red-600 animate-pulse' : 'text-gray-900'">
          {{ store.metricas?.atrasados ?? 0 }}
        </div>
        <div class="text-[10px] mt-1" :class="(store.metricas?.atrasados ?? 0) > 0 ? 'text-red-600 font-medium' : 'text-gray-400'">
          Tempo limite > 8h
        </div>
      </div>
    </div>

    <!-- Tabela e Lista de Custódias em Tempo Real -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div>
          <h3 class="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Custódias Ativas ({{ store.ativas.length }})
          </h3>
          <p class="text-xs text-gray-500">Atualizado automaticamente a cada 30 segundos</p>
        </div>
        <button
          @click="atualizarDados"
          class="text-xs text-[#002B49] hover:underline font-bold flex items-center gap-1"
        >
          <span>Atualizar Agora</span>
        </button>
      </div>

      <div v-if="store.loadingAtivas && store.ativas.length === 0" class="p-8 text-center text-gray-400 text-sm">
        Carregando custódias...
      </div>

      <div v-else-if="store.ativas.length === 0" class="p-12 text-center">
        <p class="text-sm font-bold text-gray-700">Nenhum coletor em uso no momento.</p>
        <p class="text-xs text-gray-400 mt-1">Todos os equipamentos estão disponíveis no armário/almoxarifado.</p>
      </div>

      <div v-else>
        <!-- Visão Desktop (Tabela) -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left text-xs text-gray-600">
            <thead class="bg-gray-100 text-gray-700 uppercase font-black text-[10px] tracking-wider">
              <tr>
                <th class="py-3.5 px-4">Patrimônio</th>
                <th class="py-3.5 px-4">Modelo / Marca</th>
                <th class="py-3.5 px-4">Colaborador em Posse</th>
                <th class="py-3.5 px-4">Setor</th>
                <th class="py-3.5 px-4">Entregue por</th>
                <th class="py-3.5 px-4">Horário de Saída</th>
                <th class="py-3.5 px-4 text-center">Tempo em Posse</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="item in store.ativas"
                :key="item.id"
                class="hover:bg-gray-50/80 transition-colors"
                :class="item.statusSLA === 'EXCEDIDO' ? 'bg-red-50/30' : ''"
              >
                <td class="py-3.5 px-4 font-mono font-bold text-gray-900 text-sm">
                  {{ item.coletor.patrimonio }}
                </td>
                <td class="py-3.5 px-4 font-medium text-gray-800">
                  {{ item.coletor.marca }} {{ item.coletor.modelo }}
                </td>
                <td class="py-3.5 px-4">
                  <div class="font-bold text-gray-900">{{ item.colaborador.nome }}</div>
                  <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span class="text-[10px] text-gray-400">Mat: {{ item.colaborador.matricula }}</span>
                    <span
                      v-if="item.tipoPreferencia === 'FORA_PREFERENCIA'"
                      class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200"
                    >
                      Fora de preferência
                    </span>
                    <span
                      v-else-if="item.tipoPreferencia === 'TITULAR'"
                      class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200"
                    >
                      Titular
                    </span>
                  </div>
                </td>
                <td class="py-3.5 px-4 font-medium text-gray-700">
                  {{ item.colaborador.setor || '-' }}
                </td>
                <td class="py-3.5 px-4 text-gray-600">
                  {{ item.operadorSaida.nome }}
                </td>
                <td class="py-3.5 px-4 font-mono text-gray-700">
                  {{ formatarData(item.dataSaida) }}
                </td>
                <td class="py-3.5 px-4 text-center">
                  <span
                    class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                    :class="getSlaBadgeClass(item.statusSLA)"
                  >
                    {{ item.tempoFormatado }}
                    <span v-if="item.statusSLA === 'EXCEDIDO'" class="ml-1 text-[10px]">
                      (+{{ item.minutosExcedidos }}m)
                    </span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Visão Mobile/Tablet (Cards) -->
        <div class="md:hidden divide-y divide-gray-100 p-3 space-y-3">
          <div
            v-for="item in store.ativas"
            :key="item.id"
            class="p-4 rounded-xl border border-gray-200 bg-white space-y-3"
            :class="item.statusSLA === 'EXCEDIDO' ? 'border-red-300 bg-red-50/20' : ''"
          >
            <div class="flex justify-between items-start">
              <div>
                <span class="font-mono font-black text-base text-gray-900">{{ item.coletor.patrimonio }}</span>
                <span class="text-xs text-gray-500 ml-2">({{ item.coletor.marca }} {{ item.coletor.modelo }})</span>
              </div>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
                :class="getSlaBadgeClass(item.statusSLA)"
              >
                {{ item.tempoFormatado }}
              </span>
            </div>

            <div class="text-xs text-gray-700 space-y-0.5">
              <div class="font-bold text-gray-900">{{ item.colaborador.nome }}</div>
              <div class="flex items-center gap-1.5 flex-wrap text-gray-500 text-[11px]">
                <span>Mat: {{ item.colaborador.matricula }}</span>
                <span
                  v-if="item.tipoPreferencia === 'FORA_PREFERENCIA'"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200"
                >
                  Fora de preferência
                </span>
                <span
                  v-else-if="item.tipoPreferencia === 'TITULAR'"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200"
                >
                  Titular
                </span>
                <span>&bull; Setor: {{ item.colaborador.setor || '-' }}</span>
              </div>
              <div class="text-gray-400 text-[10px]">
                Saída: {{ formatarData(item.dataSaida) }} (por {{ item.operadorSaida.nome }})
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useMovimentacoesStore } from '../stores/movimentacoes';

const store = useMovimentacoesStore();
let timer: any = null;

const formatarData = (isoDate: string) => {
  if (!isoDate) return '-';
  const d = new Date(isoDate);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const getSlaBadgeClass = (status: string) => {
  if (!store.metricas?.slaAtivo) {
    return 'bg-slate-100 text-slate-700 font-mono';
  }
  switch (status) {
    case 'EXCEDIDO':
      return 'bg-red-100 text-red-800 border border-red-300 animate-pulse';
    case 'ALERTA':
      return 'bg-amber-100 text-amber-800 border border-amber-300';
    default:
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  }
};

const atualizarDados = async () => {
  await Promise.all([store.carregarAtivas(), store.carregarMetricas()]);
};

onMounted(() => {
  atualizarDados();
  timer = setInterval(atualizarDados, 30000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>
