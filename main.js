import App from './App'
import { createSSRApp } from 'vue'
import { pinia } from './stores/pinia'
import { initNavigationGuard } from './services/navigationGuard'
export function createApp() {
  initNavigationGuard()
  const app = createSSRApp(App)
  app.use(pinia)
  return { app, pinia }
}
