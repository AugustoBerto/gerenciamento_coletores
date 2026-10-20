<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-dass-blue to-slate-950 flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
      <div class="text-center mb-8">
        <div class="inline-block bg-dass-blue text-white px-4 py-2 rounded-xl text-2xl font-black tracking-widest shadow-md mb-3">
          DASS
        </div>
        <h2 class="text-2xl font-extrabold text-gray-900 tracking-tight">Gerenciamento de Coletores</h2>
        <p class="text-sm text-gray-500 mt-1">Autenticação com suas credenciais corporativas</p>
      </div>

      <!-- Alerta de Erro -->
      <div v-if="authStore.error" class="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
        <p class="text-xs text-red-700 font-medium">{{ authStore.error }}</p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-5">
        <div>
          <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Usuário Corporativo
          </label>
          <input
            v-model="usuario"
            type="text"
            required
            autocomplete="username"
            placeholder="Ex: jose.falcao"
            class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-dass-blue focus:border-transparent outline-none transition text-sm text-gray-800"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Senha
          </label>
          <input
            v-model="senha"
            type="password"
            required
            autocomplete="current-password"
            placeholder="••••••••"
            class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-dass-blue focus:border-transparent outline-none transition text-sm text-gray-800"
          />
        </div>

        <button
          type="submit"
          :disabled="authStore.loading"
          class="w-full py-3 px-4 bg-dass-blue hover:bg-slate-800 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 text-sm tracking-wide flex justify-center items-center"
        >
          <span v-if="authStore.loading" class="inline-block animate-spin mr-2 border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
          <span>{{ authStore.loading ? 'Autenticando no SSO...' : 'Entrar no Sistema' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const usuario = ref('');
const senha = ref('');

const handleSubmit = async () => {
  try {
    await authStore.login(usuario.value, senha.value);
    router.push('/');
  } catch {
    // Erro já setado na store
  }
};
</script>
