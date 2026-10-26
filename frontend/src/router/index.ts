import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '../layouts/AppLayout.vue';
import { useAuthStore } from '../stores/auth';

const LoginView = () => import('../views/LoginView.vue');
const DashboardView = () => import('../views/DashboardView.vue');
const RetiradaView = () => import('../views/RetiradaView.vue');
const DevolucaoView = () => import('../views/DevolucaoView.vue');
const InventarioView = () => import('../views/InventarioView.vue');
const RelatoriosView = () => import('../views/RelatoriosView.vue');
const ConfiguracoesView = () => import('../views/ConfiguracoesView.vue');

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { public: true },
    },
    {
      path: '/',
      component: AppLayout,
      children: [
        {
          path: '',
          name: 'dashboard',
          component: DashboardView,
        },
        {
          path: 'retirada',
          name: 'retirada',
          component: RetiradaView,
        },
        {
          path: 'devolucao',
          name: 'devolucao',
          component: DevolucaoView,
        },
        {
          path: 'inventario',
          name: 'inventario',
          component: InventarioView,
        },
        {
          path: 'relatorios',
          name: 'relatorios',
          component: RelatoriosView,
        },
        {
          path: 'configuracoes',
          name: 'configuracoes',
          component: ConfiguracoesView,
          meta: { canAccessConfiguracoes: true },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();
  const token = localStorage.getItem('coletores_token');

  if (to.meta.public) {
    if (token) {
      next('/');
      return;
    }
    next();
    return;
  }

  if (!token) {
    next('/login');
    return;
  }

  if (!authStore.user) {
    const ok = await authStore.checkAuth();
    if (!ok) {
      next('/login');
      return;
    }
  }

  if (to.meta.adminOnly && !authStore.isAdmin) {
    next('/');
    return;
  }

  if (to.meta.canManageUsers && !authStore.canManageUsers) {
    next('/');
    return;
  }

  if (to.meta.canAccessConfiguracoes && !authStore.canAccessConfiguracoes) {
    next('/');
    return;
  }

  next();
});

export default router;
