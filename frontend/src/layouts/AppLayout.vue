<template>
  <div class="min-h-screen bg-slate-100 flex flex-col text-slate-800">
    <!-- Header Corporativo DASS -->
    <header class="bg-[#002B49] text-white shadow-md border-b-2 border-[#C5A059] sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo DASS & Título -->
          <RouterLink to="/" class="flex items-center space-x-3 group shrink-0">
            <div class="bg-white text-[#002B49] px-2.5 py-1 rounded font-black tracking-widest text-base shadow-sm group-hover:scale-105 transition-transform shrink-0">
              DASS
            </div>
            <div class="min-w-0">
              <div class="text-sm sm:text-base font-bold tracking-tight text-white leading-tight whitespace-nowrap">
                Gerenciamento de Coletores
              </div>
              <div class="text-[11px] text-slate-300 hidden xl:block leading-tight">Controle e Rastreabilidade Operacional</div>
            </div>
          </RouterLink>

          <!-- Links Desktop (md e acima) -->
          <nav class="hidden md:flex items-center space-x-0.5 lg:space-x-1 shrink">
            <RouterLink
              to="/"
              class="px-2 lg:px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap"
              :class="isActive('/') ? 'bg-white/15 text-white shadow-inner' : 'text-slate-200 hover:text-white hover:bg-white/10'"
            >
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              <span>Dashboard</span>
            </RouterLink>

            <RouterLink
              to="/retirada"
              class="px-2 lg:px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap"
              :class="isActive('/retirada') ? 'bg-white/15 text-white shadow-inner' : 'text-slate-200 hover:text-white hover:bg-white/10'"
            >
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              <span>Retirada</span>
            </RouterLink>

            <RouterLink
              to="/devolucao"
              class="px-2 lg:px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap"
              :class="isActive('/devolucao') ? 'bg-white/15 text-white shadow-inner' : 'text-slate-200 hover:text-white hover:bg-white/10'"
            >
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              <span>Devolução</span>
            </RouterLink>

            <RouterLink
              to="/inventario"
              class="px-2 lg:px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap"
              :class="isActive('/inventario') ? 'bg-white/15 text-white shadow-inner' : 'text-slate-200 hover:text-white hover:bg-white/10'"
            >
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              <span>Inventário</span>
            </RouterLink>

            <RouterLink
              to="/relatorios"
              class="px-2 lg:px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap"
              :class="isActive('/relatorios') ? 'bg-white/15 text-white shadow-inner' : 'text-slate-200 hover:text-white hover:bg-white/10'"
            >
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              <span>Relatórios</span>
            </RouterLink>

            <RouterLink
              v-if="authStore.canManageUsers"
              to="/configuracoes"
              class="px-2 lg:px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap"
              :class="isActive('/configuracoes') ? 'bg-white/15 text-white shadow-inner' : 'text-slate-200 hover:text-white hover:bg-white/10'"
            >
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <span>Configurações</span>
            </RouterLink>
          </nav>

          <!-- Bloco do Usuário e Menu Hambúrguer -->
          <div class="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <div class="hidden lg:block text-right">
              <div class="text-xs font-bold text-white truncate max-w-[130px] xl:max-w-[190px]">
                {{ authStore.user?.nome || 'Operador' }}
              </div>
              <div class="text-[10px] text-[#C5A059] font-semibold whitespace-nowrap">
                {{ authStore.user?.papel }} &bull; Mat: {{ authStore.user?.matricula }}
              </div>
            </div>

            <button
              @click="handleLogout"
              class="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg bg-white/10 hover:bg-red-600 text-white text-xs font-bold transition whitespace-nowrap"
            >
              Sair
            </button>

            <!-- Botão Hambúrguer para Mobile/Tablet -->
            <button
              @click="menuAberto = !menuAberto"
              type="button"
              class="md:hidden p-2 rounded-lg text-white hover:bg-white/10 focus:outline-none"
              aria-label="Abrir menu"
            >
              <svg v-if="!menuAberto" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
              <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <!-- Menu Mobile / Tablet Retrátil -->
        <div v-show="menuAberto" class="md:hidden pb-4 pt-2 border-t border-white/10 space-y-1">
          <RouterLink
            to="/"
            @click="menuAberto = false"
            class="block px-3 py-2.5 rounded-lg text-sm font-bold transition"
            :class="isActive('/') ? 'bg-white/20 text-white' : 'text-slate-200 hover:bg-white/10'"
          >
            Dashboard
          </RouterLink>
          <RouterLink
            to="/retirada"
            @click="menuAberto = false"
            class="block px-3 py-2.5 rounded-lg text-sm font-bold transition"
            :class="isActive('/retirada') ? 'bg-white/20 text-white' : 'text-slate-200 hover:bg-white/10'"
          >
            Retirada (Check-out)
          </RouterLink>
          <RouterLink
            to="/devolucao"
            @click="menuAberto = false"
            class="block px-3 py-2.5 rounded-lg text-sm font-bold transition"
            :class="isActive('/devolucao') ? 'bg-white/20 text-white' : 'text-slate-200 hover:bg-white/10'"
          >
            Devolução (Check-in)
          </RouterLink>
          <RouterLink
            to="/inventario"
            @click="menuAberto = false"
            class="block px-3 py-2.5 rounded-lg text-sm font-bold transition"
            :class="isActive('/inventario') ? 'bg-white/20 text-white' : 'text-slate-200 hover:bg-white/10'"
          >
            Inventário
          </RouterLink>
          <RouterLink
            to="/relatorios"
            @click="menuAberto = false"
            class="block px-3 py-2.5 rounded-lg text-sm font-bold transition"
            :class="isActive('/relatorios') ? 'bg-white/20 text-white' : 'text-slate-200 hover:bg-white/10'"
          >
            Relatórios
          </RouterLink>
          <RouterLink
            v-if="authStore.canManageUsers"
            to="/configuracoes"
            @click="menuAberto = false"
            class="block px-3 py-2.5 rounded-lg text-sm font-bold transition"
            :class="isActive('/configuracoes') ? 'bg-white/20 text-white' : 'text-slate-200 hover:bg-white/10'"
          >
            Configurações
          </RouterLink>

          <!-- Dados do usuário no mobile -->
          <div class="pt-3 border-t border-white/10 flex justify-between items-center px-3">
            <div>
              <div class="text-xs font-bold text-white">{{ authStore.user?.nome }}</div>
              <div class="text-[10px] text-[#C5A059]">Mat: {{ authStore.user?.matricula }} &bull; {{ authStore.user?.papel }}</div>
            </div>
            <button
              @click="handleLogout"
              class="px-3 py-1.5 rounded bg-red-600 text-white text-xs font-bold"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Conteúdo Principal Responsivo -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5">
      <RouterView />
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
      Grupo DASS &bull; Sistema de Gerenciamento de Coletores
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const menuAberto = ref(false);

const isActive = (path: string) => route.path === path;

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};
</script>
