import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './index.css';
import { initLiff } from './lib/liff';

(async () => {
  const app = createApp(App);
  
  // Global Frontend Error Handler
  app.config.errorHandler = (err, instance, info) => {
    console.error('[Vue Global Error]', err, info);
  };

  // Global Image Fallback Handler (Captures <img> error events on capture phase)
  window.addEventListener('error', function(e) {
    const target = e.target as HTMLElement;
    if (target && target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      const fallbackUrl = 'https://placehold.co/600x400/f8fafc/94a3b8?text=No+Image';
      if (!img.src.includes('placehold.co')) {
        img.src = fallbackUrl;
      }
    }
  }, true);

  app.use(router).mount('#root');
  
  // เรียก LIFF แบบ Asynchronous เพื่อให้ Vue ใช้อะนิเมชั่น Loading ได้ทันที
  initLiff();
})();
