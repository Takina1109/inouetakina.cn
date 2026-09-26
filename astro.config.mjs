import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { fileURLToPath } from 'node:url';
import { monoDark } from './shiki-mono.mjs';

// 部署域名：astro 用它生成 RSS / 绝对链接 / canonical
// ⚠️ 改这里的话，src/data/site.ts 里的 url 也要一起改
// ⚠️ 用了自定义域名就不要设 base —— 自定义域名是挂在根路径上的
export default defineConfig({
  site: 'https://inouetakina.cn',
  integrations: [react()],
  markdown: {
    shikiConfig: {
      // 只保留暗色，所以用单主题；灰阶配色定义在 shiki-mono.mjs
      theme: monoDark,
      wrap: true,
    },
  },
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
  /**
   * 关掉 Astro 的开发工具条。
   *
   * 那条东西只在本地 `npm run dev` 时出现（鼠标划到窗口底部会浮出来），
   * `npm run build` 出来的正式网站里完全没有它，访客看不到。
   * 它是 Astro 提供的调试面板，跟你的网站内容无关。
   *
   * 想在本地临时再打开：把下面这行注释掉，重启 npm run dev 即可。
   */
  devToolbar: { enabled: false },
});
