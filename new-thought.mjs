#!/usr/bin/env node
/**
 * 新建动态（type: thought）
 * ====================================================================
 * 用法一：交互式（推荐）
 *
 *     npm run thought
 *
 *   然后按提示输入标题、标签、摘要。
 *
 * 用法二：一行命令写全
 *
 *     npm run thought -- --title "买了个新键盘" --tags "日常,外设"
 *
 * 可选参数：
 *   --title       标题（必填，不加 --title 就会问你）
 *   --slug        文件名 / 网址最后一段。不写就根据标题自动生成
 *   --tags        标签，逗号分隔
 *   --description 摘要
 *   --draft       存成草稿（不写就是直接发布）
 *
 * 生成的文件会放在 src/content/posts/ 下，网址是 /thoughts/文件名/
 * 文章请用另一个脚本：npm run article
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

/* 用脚本自身的位置定位项目根目录，所以在哪个文件夹里执行都不会出错 */
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'posts');

/* ------------------------------------------------------------------ *
 * 小工具
 * ------------------------------------------------------------------ */

/** 把 --key value 形式的参数解析成对象 */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function todayISO() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** 动态的标题常常很短或是纯中文，所以默认文件名用 note-日期 */
function defaultSlug(title) {
  if (!title) return `note-${todayISO()}`;
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || `note-${todayISO()}`;
}

/** 如果同名文件已经存在，就在后面加 -2、-3 …… */
function uniqueSlug(base) {
  let slug = base;
  let n = 2;
  while (existsSync(path.join(POSTS_DIR, `${slug}.md`))) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

function slugify(input) {
  return defaultSlug(input);
}

function normalizeTags(input) {
  return String(input || '')
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** 动态的 Markdown 模板：比文章模板更轻，通常几句话就够 */
function buildTemplate({ title, description, tags, draft }) {
  const lines = [
    '---',
    `title: ${title}`,
    /* 摘要可以不写。不要塞占位文字，否则它会真的显示在网站上 */
    `description:${description ? ` ${description}` : ''}`,
    `date: ${todayISO()}`,
    'type: thought',
    `tags: [${tags.join(', ')}]`,
    `draft: ${draft ? 'true' : 'false'}`,
    '---',
    '',
  ];

  /* 提示一律用 HTML 注释写：万一忘了删，它也不会显示在网站上 */
  const notes = [];

  if (draft) {
    notes.push(
      '这是一条草稿：只有本地 npm run dev 能看到，npm run build 时会跳过它。',
      '',
      '写完发布时，把上面 frontmatter 里的这一行：',
      '',
      '    draft: true',
      '',
      '改成这样（draft: 这几个字要保留，不要只写一个 false）：',
      '',
      '    draft: false'
    );
  }

  if (!description) {
    if (notes.length) notes.push('');
    notes.push(
      'description 现在是空的，所以网站上不会显示摘要那一行（不影响发布）。',
      '想加就补成这样：',
      '',
      '    description: 一句话摘要，会显示在时间轴上'
    );
  }

  if (notes.length) {
    notes.push('', '下面这段是注释，不会显示在网站上，忘了删也没关系。');
    lines.push('<!--', ...notes.map((line) => (line ? `  ${line}` : '')), '-->', '');
  }

  /*
   * 正文留空 —— 不写占位文字，免得忘了删时它显示在网站上。
   * 想写什么直接接在 frontmatter 下面写。
   */
  return lines.join('\n');
}

/* ------------------------------------------------------------------ *
 * 主流程
 * ------------------------------------------------------------------ */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  /* 带了参数就当非交互模式，没填的字段一律用默认值 */
  const interactive = Object.keys(args).length === 0;

  const rl = interactive
    ? readline.createInterface({ input: process.stdin, output: process.stdout })
    : null;
  const ask = async (question) => (rl ? (await rl.question(question)).trim() : '');

  try {
    console.log('\n✎ 新建动态（会出现在「动态」分区，网址 /thoughts/…）\n');

    const title = args.title || (await ask('标题：'));
    if (!title) {
      console.error('✗ 标题不能为空');
      process.exitCode = 1;
      return;
    }

    const tags = normalizeTags(args.tags ?? (await ask('标签（逗号分隔，可留空）：')));
    const description = args.description || (await ask('摘要（会显示在时间轴上，可留空）：'));

    const fallback = defaultSlug(args.slug || title);
    const answer = await ask(`文件名 / 网址（回车用默认值）[${fallback}]：`);
    const slug = uniqueSlug(slugify(answer || fallback));

    const draft = Boolean(args.draft);
    const filePath = path.join(POSTS_DIR, `${slug}.md`);

    await mkdir(POSTS_DIR, { recursive: true });
    await writeFile(
      filePath,
      buildTemplate({ title, description, tags, draft }),
      'utf8'
    );

    console.log(`\n✓ 已创建 ${path.relative(ROOT, filePath)}`);
    console.log(`  本地预览：http://localhost:4321/thoughts/${slug}/`);
    if (draft) {
      console.log('  当前是草稿：只有本地 npm run dev 能看到，构建时会跳过。');
      console.log('  写完把 frontmatter 里的 draft: true 改成 draft: false 才会发布，');
      console.log('  注意 draft: 这几个字要保留，不要只写一个 false。');
      console.log('  发布：npm run build，然后把 dist/ 部署上去，或 push 触发自动部署。\n');
    } else {
      console.log('  已经是发布状态（draft: false），commit + push 之后就会出现在网站上。\n');
    }
  } finally {
    rl?.close();
  }
}

main().catch((error) => {
  console.error('✗ 出错了：', error);
  process.exitCode = 1;
});
