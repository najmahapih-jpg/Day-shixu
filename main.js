import App from './App'
import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import { initNavigationGuard } from './services/navigationGuard'
export function createApp() {
  initNavigationGuard()
  const app = createSSRApp(App)
  app.use(createPinia())
  return { app }
}
