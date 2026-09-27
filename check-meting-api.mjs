#!/usr/bin/env node
/**
 * 检查音乐播放器用的 Meting API 现在到底能不能用
 * ====================================================================
 *
 *     npm run check-api
 *
 * 它做三件事：
 *   1. 从 src/data/site.ts 里读出 meting 的 server / type / id / api
 *   2. 把 api 里的 :server / :type / :id 替换成真实值，请求一次
 *   3. 告诉你结果：拿到了几首歌，还是实例挂了，还是被限流了
 *
 * 播放器显示「歌单加载失败」的时候先跑这个，比瞎猜快。
 * 自部署完新 API，也先用这个验证，再改 site.ts。
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SITE_TS = path.join(ROOT, 'src', 'data', 'site.ts');

/** 从 site.ts 的 meting 对象里抠出一个字符串字段 */
function readField(block, key) {
  const match = block.match(new RegExp(`\\b${key}\\s*:\\s*'([^']*)'`));
  return match ? match[1] : '';
}

async function main() {
  /* ---------- 1. 读配置 ---------- */
  let source;
  try {
    source = await readFile(SITE_TS, 'utf8');
  } catch {
    console.error(`✗ 读不到 ${path.relative(ROOT, SITE_TS)}`);
    process.exitCode = 1;
    return;
  }

  const blockMatch = source.match(/export const meting = \{([\s\S]*?)\n\} as const;/);
  if (!blockMatch) {
    console.error('✗ 没在 site.ts 里找到 export const meting = { ... }');
    process.exitCode = 1;
    return;
  }

  const block = blockMatch[1];
  const server = readField(block, 'server') || 'netease';
  const type = readField(block, 'type') || 'playlist';
  const id = readField(block, 'id');
  const api = readField(block, 'api');

  if (!api || !id) {
    console.error('✗ site.ts 里的 meting.api 或 meting.id 是空的');
    process.exitCode = 1;
    return;
  }

  const url = api
    .replace(':server', server)
    .replace(':type', type)
    .replace(':id', id)
    .replace(':auth', '')
    .replace(':r', '');

  console.log('\n♪ 检查 Meting API\n');
  console.log(`  实例：${new URL(url).origin}`);
  console.log(`  歌单：${server} / ${type} / ${id}`);
  console.log('');

  /* ---------- 2. 请求 ---------- */
  let response;
  const started = Date.now();
  try {
    response = await fetch(url, {
      headers: { 'User-Agent': 'sakura-blog-check-api' },
      signal: AbortSignal.timeout(25000),
    });
  } catch (error) {
    const reason = error && error.name === 'TimeoutError' ? '请求超时（25 秒）' : String(error && error.message);
    console.log(`  ✗ 连不上：${reason}`);
    console.log('');
    console.log('  可能的原因：');
    console.log('    - 这个实例已经挂了 / 被墙 / 域名解析不了');
    console.log('    - 你自己电脑的网络问题（先确认能打开别的网站）');
    console.log('    - 地址写错了（注意 :server / :type / :id 要原样保留）');
    console.log('');
    process.exitCode = 1;
    return;
  }
  const cost = Date.now() - started;

  const text = await response.text();

  /* ---------- 3. 判断结果 ---------- */
  console.log(`  HTTP ${response.status}，返回 ${text.length} 字节，耗时 ${cost} ms`);

  const cors = response.headers.get('access-control-allow-origin');
  if (cors) {
    console.log(`  跨域头：Access-Control-Allow-Origin: ${cors}`);
  } else {
    console.log('  ⚠️ 没有 Access-Control-Allow-Origin —— 浏览器会拦掉这个接口！');
  }
  console.log('');

  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    /* 不是 JSON，下面单独处理 */
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      console.log('  ⚠️ 接口是通的，但歌单里一首歌都没有');
      console.log('     检查一下：歌单 ID 对不对、歌单是不是设成了「公开」');
      process.exitCode = 1;
      return;
    }
    console.log(`  ✅ 正常，拿到 ${data.length} 首：`);
    data.slice(0, 3).forEach((song, i) => {
      console.log(`     ${i + 1}. ${song.name || '（没有名字）'}  ——  ${song.artist || ''}`);
    });
    if (data.length > 3) console.log(`     …… 还有 ${data.length - 3} 首`);
    console.log('');
    return;
  }

  /* 不是数组：多半是错误信息 */
  const message = data && typeof data.message === 'string' ? data.message : '';
  console.log('  ✗ 接口能通，但返回的不是歌单。');
  console.log('');
  if (message) {
    /* data.message 已经被 JSON.parse 解码过了，比原始转义串好读得多 */
    console.log(`     服务端说：${message}`);
  } else {
    console.log(`     返回内容：${text.slice(0, 200)}`);
  }
  console.log('');

  if (message.includes('上限') || message.includes('次数')) {
    console.log('  → 这是公共实例的「每日请求次数上限」，不是你的配置问题。');
    console.log('    过一天会自己好，但会反复发生。');
    console.log('    想彻底解决：自己部署一个，见 使用说明.txt 的 4.3 节。');
  } else {
    console.log('  → 这个实例现在不可用（挂了 / 被限流 / 关停了）。');
    console.log('    去 src/data/site.ts 把 meting.api 换一个实例，');
    console.log('    或者自己部署一个（使用说明.txt 4.3 节）。');
  }
  console.log('');
  process.exitCode = 1;
}

main().catch((error) => {
  console.error('✗ 出错了：', error);
  process.exitCode = 1;
});
