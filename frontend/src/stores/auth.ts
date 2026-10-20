import { defineStore } from 'pinia';
import api from '../api/axios';

export interface OperadorInfo {
  id: string;
  matricula: number;
  usuario: string;
  nome: string;
  papel: 'ADMIN' | 'TI' | 'OPERADOR';
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('coletores_user') || 'null') as OperadorInfo | null,
    token: localStorage.getItem('coletores_token') || '',
    loading: false,
    error: '',
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.token && state.user),
    isAdmin: (state) => state.user?.papel === 'ADMIN',
    isTI: (state) => state.user?.papel === 'TI',
    isPureTI: (state) => state.user?.papel === 'TI',
    canManageUsers: (state) => state.user?.papel === 'ADMIN' || state.user?.papel === 'TI',
    canManageMaintenance: (state) => state.user?.papel === 'TI',
  },

  actions: {
    async login(usuario: string, senha: string) {
      this.loading = true;
      this.error = '';
      try {
        const { data } = await api.post('/auth/login', { usuario, senha });
        this.token = data.dados.token;
        this.user = data.dados.usuario;

        localStorage.setItem('coletores_token', this.token);
        localStorage.setItem('coletores_user', JSON.stringify(this.user));
        return true;
      } catch (err: any) {
        this.error = err.response?.data?.mensagem || 'Falha ao autenticar com o serviço corporativo DASS.';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async checkAuth() {
      if (!this.token) return false;
      try {
        const { data } = await api.get('/auth/me');
        this.user = data.dados;
        localStorage.setItem('coletores_user', JSON.stringify(this.user));
        return true;
      } catch {
        this.logout();
        return false;
      }
    },

    async logout() {
      try {
        await api.post('/auth/logout');
      } catch {
        // Ignora erro de rede no logout
      } finally {
        this.token = '';
        this.user = null;
        localStorage.removeItem('coletores_token');
        localStorage.removeItem('coletores_user');
      }
    },
  },
});
