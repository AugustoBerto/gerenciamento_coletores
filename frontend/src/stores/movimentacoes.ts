import { defineStore } from 'pinia';
import api from '../api/axios';

export interface CustodiaAtiva {
  id: string;
  coletor: {
    id: string;
    patrimonio: string;
    marca: string;
    modelo: string;
  };
  colaborador: {
    matricula: number;
    nome: string;
    setor: string;
  };
  operadorSaida: {
    id: string;
    nome: string;
  };
  dataSaida: string;
  minutosEmUso: number;
  tempoFormatado: string;
  statusSLA: 'NORMAL' | 'ALERTA' | 'EXCEDIDO';
  minutosExcedidos: number;
  tipoPreferencia?: 'TITULAR' | 'LIVRE' | 'FORA_PREFERENCIA';
  detalhePreferencia?: string | null;
}

export interface MetricasDashboard {
  total: number;
  disponiveis: number;
  emUso: number;
  manutencao: number;
  inativos: number;
  atrasados: number;
  limiteMinutosSLA: number;
  slaAtivo?: boolean;
}

export const useMovimentacoesStore = defineStore('movimentacoes', {
  state: () => ({
    ativas: [] as CustodiaAtiva[],
    metricas: null as MetricasDashboard | null,
    loadingAtivas: false,
    loadingMetricas: false,
  }),

  actions: {
    async carregarAtivas() {
      this.loadingAtivas = true;
      try {
        const { data } = await api.get('/movimentacoes/ativas');
        this.ativas = data.dados || [];
      } catch (err) {
        console.error('Erro ao carregar custódias ativas:', err);
      } finally {
        this.loadingAtivas = false;
      }
    },

    async carregarMetricas() {
      this.loadingMetricas = true;
      try {
        const { data } = await api.get('/relatorios/metricas-dashboard');
        this.metricas = data.dados;
      } catch (err) {
        console.error('Erro ao carregar métricas:', err);
      } finally {
        this.loadingMetricas = false;
      }
    },

    async validarCracha(codigo: string) {
      const { data } = await api.post('/colaboradores/validar-cracha', { codigo });
      return data.dados;
    },

    async validarOperador(codigo: string) {
      const { data } = await api.post('/colaboradores/validar-operador', { codigo });
      return data.dados;
    },

    async realizarRetirada(matricula: number, patrimonio: string, crachaOperador?: string | null) {
      const { data } = await api.post('/movimentacoes/retirada', {
        matricula,
        patrimonio,
        crachaOperador,
      });
      await this.carregarAtivas();
      await this.carregarMetricas();
      return data;
    },

    async buscarPorColaborador(identificador: string) {
      const { data } = await api.get(`/movimentacoes/ativa-por-colaborador/${encodeURIComponent(identificador)}`);
      return data.dados;
    },

    async buscarPorPatrimonio(patrimonio: string) {
      const { data } = await api.get(`/movimentacoes/ativa-por-patrimonio/${patrimonio}`);
      return data.dados;
    },

    async realizarDevolucao(
      id: string,
      dados: {
        avaria: boolean;
        motivoManutencao?: string | null;
        numeroOs?: string | null;
        observacao?: string | null;
        crachaOperador?: string | null;
      }
    ) {
      const { data } = await api.post(`/movimentacoes/${id}/devolucao`, dados);
      await this.carregarAtivas();
      await this.carregarMetricas();
      return data;
    },
  },
});
