#!/usr/bin/env node
/**
 * 新建推荐（书 / 动漫）
 * ====================================================================
 * 用法一：交互式（推荐）
 *
 *     npm run recommend
 *
 *   然后按提示一步步填。
 *
 * 用法二：一行命令写全
 *
 *     npm run recommend -- --title "夏日重现" --category anime-recommend \
 *       --author "田中靖規 / OLM" --note "时间循环题材里最爱的一部" \
 *       --moegirl "https://zh.moegirl.org.cn/夏日重现" \
 *       --baike "https://baike.baidu.com/item/夏日重现"
 *
 * 可选参数：
 *   --title     名称（必填，书名 / 番名）
 *   --category  板块，见下面的 CATEGORIES（不写就问你）
 *   --author    作者 / 原作 / 制作公司
 *   --note      一句话短评（显示在卡片上）
 *   --cover     封面图。图片放进 public/covers/ 之后，
 *               填 xxx.jpg 或 /covers/xxx.jpg 都行（前者会自动补上 /covers/）
 *   --moegirl   萌娘百科链接（会自动加一条 label: 萌娘百科）
 *   --baike     百度百科链接（会自动加一条 label: 百度百科）
 *   --slug      文件名 / 网址最后一段。不写就根据名称自动生成
 *   --draft     存成草稿（不写就是直接发布）
 *
 * 生成的文件放在 src/content/recommend/ 下，网址是 /recommend/文件名/
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

/* 用脚本自身的位置定位项目根目录，所以在哪个文件夹里执行都不会出错 */
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const RECOMMEND_DIR = path.join(ROOT, 'src', 'content', 'recommend');

/** 封面图统一放在这里，脚本会扫描这个文件夹并把里面的图片列出来给你挑 */
const COVERS_DIR = path.join(ROOT, 'public', 'covers');

/**
 * 板块列表 —— 要和 src/data/recommend.ts 里的 RECOMMEND_CATEGORIES 保持一致。
 * 脚本是纯 JS，引用不了那边的 TS 文件，所以这里只能抄一份。
 */
const CATEGORIES = [
  { value: 'book-reading', label: '最近在读的书' },
  { value: 'anime-watching', label: '最近在看的动漫' },
  { value: 'anime-recommend', label: '推荐的动漫' },
  { value: 'book-recommend', label: '推荐的书' },
];

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

/** 书名 / 番名常常是纯中文，所以保留中文，只清掉不能做文件名的字符 */
function slugify(input) {
  const slug = String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || `pick-${todayISO()}`;
}

/** 如果同名文件已经存在，就在后面加 -2、-3 …… */
function uniqueSlug(base) {
  let slug = base;
  let n = 2;
  while (existsSync(path.join(RECOMMEND_DIR, `${slug}.md`))) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

/** 把用户输入（序号或取值名）解析成合法的板块取值 */
function resolveCategory(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;

  const index = Number(raw);
  if (Number.isInteger(index) && index >= 1 && index <= CATEGORIES.length) {
    return CATEGORIES[index - 1].value;
  }

  const hit = CATEGORIES.find((item) => item.value === raw);
  return hit ? hit.value : null;
}

function printCategoryMenu() {
  console.log('  板块：');
  CATEGORIES.forEach((item, i) => {
    console.log(`    ${i + 1}) ${item.value}   ${item.label}`);
  });
}

/** 把命令行传进来的两个百科链接拼成 links 数组 */
function collectLinks(args) {
  const links = [];
  if (args.moegirl) links.push({ label: '萌娘百科', url: String(args.moegirl) });
  if (args.baike) links.push({ label: '百度百科', url: String(args.baike) });
  return links;
}

/** 列出 public/covers/ 里已有的图片文件名 */
function listCovers() {
  if (!existsSync(COVERS_DIR)) return [];
  return readdirSync(COVERS_DIR)
    .filter((name) => /\.(jpe?g|png|webp|gif|avif|svg)$/i.test(name))
    .sort();
}

/**
 * 把用户的输入统一成能直接写进 frontmatter 的封面路径。
 * 填序号（对应列出来的清单）、文件名、带 / 的完整路径都可以：
 *     1                 -> 清单里第 1 个
 *     xxx.jpg           -> /covers/xxx.jpg
 *     covers/xxx.jpg    -> /covers/xxx.jpg
 *     /images/xxx.jpg   -> 原样（已经在 public/ 别的位置）
 * 留空（或填 0）就是不设封面。
 */
function resolveCover(input, covers = []) {
  const raw = String(input || '').trim();
  if (!raw || raw === '0') return '';

  const index = Number(raw);
  if (Number.isInteger(index) && index >= 1 && index <= covers.length) {
    return `/covers/${covers[index - 1]}`;
  }

  if (raw.startsWith('/')) return raw;
  return `/covers/${raw.replace(/^covers\//, '')}`;
}

/* ------------------------------------------------------------------ *
 * 模板
 * ------------------------------------------------------------------ */

function buildTemplate({ title, category, author, note, cover, links, draft }) {
  const lines = [
    '---',
    `title: ${title}`,
    /* 板块：决定它出现在推荐页的哪个分组 */
    `category: ${category}`,
  ];

  /* 没填的字段就不写 —— 不要留个占位文字，那会被当成真实内容显示在网站上 */
  if (author) lines.push(`author: ${author}`);
  if (note) lines.push(`note: ${note}`);
  if (cover) lines.push(`cover: ${cover}`);

  if (links.length > 0) {
    lines.push('links:');
    for (const link of links) {
      lines.push(`  - label: ${link.label}`);
      lines.push(`    url: ${link.url}`);
    }
  }

  lines.push(`date: ${todayISO()}`, `draft: ${draft ? 'true' : 'false'}`, '---', '');

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

  if (!cover) {
    if (notes.length) notes.push('');
    notes.push(
      '想加封面图：把图片放进 public/covers/ 文件夹，然后在 frontmatter 里加一行：',
      '',
      '    cover: /covers/图片文件名',
      '',
      '不写也行，卡片上会显示名称的第一个字。'
    );
  }

  if (links.length === 0) {
    if (notes.length) notes.push('');
    notes.push(
      '想加参考链接（萌娘百科 / 百度百科），在 frontmatter 里加：',
      '',
      '    links:',
      '      - label: 萌娘百科',
      '        url: https://zh.moegirl.org.cn/xxx',
      '      - label: 百度百科',
      '        url: https://baike.baidu.com/item/xxx'
    );
  }

  if (notes.length) {
    notes.push('', '下面这段是注释，不会显示在网站上，忘了删也没关系。');
    lines.push('<!--', ...notes.map((line) => (line ? `  ${line}` : '')), '-->', '');
  }

  /*
   * 正文就留空 —— 模板里不写任何占位文字。
   * 写了的话，你忘了删它就会当成正文显示在网站上。
   * 想写什么直接在这一行下面开始写就行。
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
    console.log('\n✎ 新建推荐（书 / 动漫，网址 /recommend/…）\n');

    const title = args.title || (await ask('名称（书名 / 番名）：'));
    if (!title) {
      console.error('✗ 名称不能为空');
      process.exitCode = 1;
      return;
    }

    let category = resolveCategory(args.category);
    if (!category) {
      if (args.category) {
        console.error(`✗ 不认识的 --category：${args.category}`);
        printCategoryMenu();
        process.exitCode = 1;
        return;
      }
      printCategoryMenu();
      /* 什么都不填就默认「最近在读的书」 */
      const answer = await ask('选哪个板块（填序号，回车用 1）：');
      category = resolveCategory(answer) || CATEGORIES[0].value;
    }

    const author = args.author || (await ask('作者 / 原作 / 制作公司（可留空）：'));
    const note = args.note || (await ask('一句话短评（显示在卡片上，可留空）：'));

    const links = collectLinks(args);
    if (interactive && links.length === 0) {
      const moegirl = await ask('萌娘百科链接（可留空）：');
      const baike = await ask('百度百科链接（可留空）：');
      if (moegirl) links.push({ label: '萌娘百科', url: moegirl });
      if (baike) links.push({ label: '百度百科', url: baike });
    }

    /* 封面图：把 public/covers/ 里已有的图片列出来，填序号或文件名都行 */
    let cover = resolveCover(args.cover);
    if (interactive && !cover) {
      const covers = listCovers();
      if (covers.length > 0) {
        console.log('  封面图（public/covers/ 里已有的图片）：');
        covers.forEach((name, i) => console.log(`    ${i + 1}) ${name}`));
        console.log('    0) 不加封面');
      } else {
        console.log('  封面图：public/covers/ 里还没有图片，留空就行');
      }
      cover = resolveCover(await ask('选序号或填文件名（可留空）：'), covers);
    }

    const fallback = slugify(args.slug || title);
    const answer = await ask(`文件名 / 网址（回车用默认值）[${fallback}]：`);
    const slug = uniqueSlug(slugify(answer || fallback));

    const draft = Boolean(args.draft);
    const filePath = path.join(RECOMMEND_DIR, `${slug}.md`);

    await mkdir(RECOMMEND_DIR, { recursive: true });
    await writeFile(
      filePath,
      buildTemplate({ title, category, author, note, cover, links, draft }),
      'utf8'
    );

    console.log(`\n✓ 已创建 ${path.relative(ROOT, filePath)}`);
    console.log(`  本地预览：http://localhost:4321/recommend/${slug}/`);
    if (!cover) {
      console.log('  还没设封面：图片放进 public/covers/ 后，在 frontmatter 里加一行');
      console.log('      cover: /covers/图片文件名');
    }
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
