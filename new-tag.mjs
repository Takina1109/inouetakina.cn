#!/usr/bin/env node
/**
 * 标签管理（给已有文章 / 动态加标签、删标签、看统计）
 * ====================================================================
 * 说明：这个项目里「标签」不是单独的文件，而是写在每篇内容开头的
 *       frontmatter 里。所以「添加新标签」= 把标签加到某一篇（或多篇）
 *       内容上；用完这个标签的内容都删掉了，标签页也就自动消失了。
 *
 * 用法一：交互式（推荐）
 *
 *     npm run tag
 *
 *   会先列出所有已有标签，再列出所有可以编辑的内容，让你选。
 *
 * 用法二：只看标签，不改文件
 *
 *     npm run tag -- --list
 *
 * 用法三：一行命令写全
 *
 *     npm run tag -- --post hello-world --tags "前端,笔记"
 *     npm run tag -- --post hello-world,midnight-thoughts --tags "生活"
 *     npm run tag -- --post hello-world --tags "草稿" --remove
 *
 * 参数：
 *   --list          只列出标签和内容，不做任何修改
 *   --post <名称>   要操作的文件名（不带 .md），多个用逗号分隔
 *   --tags <标签>   要添加（或配合 --remove 删除）的标签，逗号分隔
 *   --remove        把 --tags 里的标签从文件上删掉
 *
 * 想改标签的写法（比如换成中文逗号分隔），改下面的 formatTags 函数。
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

/* 用脚本自身的位置定位项目根目录，所以在哪个文件夹里执行都不会出错 */
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'posts');

/* ------------------------------------------------------------------ *
 * frontmatter 读写（不依赖 YAML 库，只动 tags: 那一行）
 * ------------------------------------------------------------------ */

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

/** 取出 frontmatter 文本（不含首尾的 ---） */
function frontmatterOf(content) {
  return content.match(FRONTMATTER)?.[1] ?? '';
}

function fieldOf(frontmatter, name) {
  return frontmatter.match(new RegExp(`^${name}:\\s*(.*)$`, 'm'))?.[1]?.trim() ?? '';
}

/** 读出已有的标签 */
function readTags(content) {
  const raw = fieldOf(frontmatterOf(content), 'tags');
  const inner = raw.match(/^\[(.*)\]$/)?.[1] ?? raw;
  return inner
    .split(/[,，]/)
    .map((t) => t.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

function formatTags(tags) {
  return `tags: [${tags.join(', ')}]`;
}

/**
 * 把 frontmatter 里的 tags 换成新的。
 * 没有 tags: 这一行就插在 frontmatter 末尾。
 * @returns 新的文件内容；如果没有 frontmatter 则返回 null
 */
function writeTags(content, tags) {
  const match = content.match(FRONTMATTER);
  if (!match) return null;

  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const body = match[1];
  const line = formatTags(tags);
  const nextBody = /^tags:\s*.*$/m.test(body)
    ? body.replace(/^tags:\s*.*$/m, line)
    : `${body}${eol}${line}`;

  /* 用函数式替换，避免标签里的 $ 被当成替换模式的特殊符号 */
  return content.replace(match[0], () => `---${eol}${nextBody}${eol}---`);
}

/* ------------------------------------------------------------------ *
 * 小工具
 * ------------------------------------------------------------------ */

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

function splitList(input) {
  return String(input || '')
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const TYPE_LABEL = { tech: '文章', thought: '动态' };

/** 读出 posts 目录下所有内容的基本信息 */
async function loadEntries() {
  const files = (await readdir(POSTS_DIR).catch(() => []))
    .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
    .sort();

  const entries = [];
  for (const file of files) {
    const content = await readFile(path.join(POSTS_DIR, file), 'utf8');
    const fm = frontmatterOf(content);
    const type = fieldOf(fm, 'type') || 'thought';
    entries.push({
      file,
      slug: file.replace(/\.mdx?$/, ''),
      title: fieldOf(fm, 'title') || '(无标题)',
      type,
      typeLabel: TYPE_LABEL[type] ?? type,
      tags: readTags(content),
      content,
    });
  }
  return entries;
}

/** 统计每个标签被用了多少次 */
function tagCounts(entries) {
  const map = new Map();
  for (const entry of entries) {
    for (const tag of entry.tags) map.set(tag, (map.get(tag) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN'));
}

function printOverview(entries) {
  const counts = tagCounts(entries);

  console.log('\n🏷  已有标签');
  if (counts.length === 0) {
    console.log('   （还没有任何标签 —— 给内容加上标签后这里就有东西了）');
  } else {
    console.log(`   共 ${counts.length} 个：`);
    for (const [tag, count] of counts) {
      console.log(`   · ${tag}  (${count})`);
    }
  }

  console.log('\n📄 可编辑的内容（src/content/posts/）');
  if (entries.length === 0) {
    console.log('   （目录是空的。先用 npm run article 或 npm run thought 建一篇）');
  } else {
    entries.forEach((entry, i) => {
      const tags = entry.tags.length ? entry.tags.join(', ') : '无标签';
      console.log(`   ${i + 1}) [${entry.typeLabel}] ${entry.title}   —   ${tags}`);
    });
  }
  console.log('');
}

/* ------------------------------------------------------------------ *
 * 主流程
 * ------------------------------------------------------------------ */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const entries = await loadEntries();

  /* 只列不改 */
  if (args.list) {
    printOverview(entries);
    return;
  }

  if (entries.length === 0) {
    console.log('\n📄 src/content/posts/ 是空的，没有可以打标签的内容。');
    console.log('   先执行 npm run article（新建文章）或 npm run thought（新建动态）。\n');
    return;
  }

  const interactive = !args.post || !args.tags;
  const rl = interactive
    ? readline.createInterface({ input: process.stdin, output: process.stdout })
    : null;
  const ask = async (question) => (rl ? (await rl.question(question)).trim() : '');

  try {
    console.log('\n🏷  标签管理\n');
    printOverview(entries);

    /* ---------- 1. 选中要改的内容 ---------- */
    let targets = entries;
    if (args.post) {
      const wanted = splitList(args.post);
      targets = entries.filter((e) => wanted.includes(e.slug) || wanted.includes(e.file));
      const missing = wanted.filter(
        (w) => !entries.some((e) => e.slug === w || e.file === w)
      );
      if (missing.length) {
        console.error(`✗ 找不到这些内容：${missing.join(', ')}`);
        process.exitCode = 1;
        return;
      }
    } else {
      const answer = await ask('要给哪些内容打标签？（填序号，多个用逗号分隔，直接回车=全部）：');
      if (answer) {
        const picked = splitList(answer)
          .map((n) => Number(n))
          .filter((n) => Number.isInteger(n) && n >= 1 && n <= entries.length);
        if (picked.length === 0) {
          console.error('✗ 序号无效');
          process.exitCode = 1;
          return;
        }
        targets = picked.map((n) => entries[n - 1]);
      }
    }

    /* ---------- 2. 拿到要增删的标签 ---------- */
    const counts = tagCounts(entries);
    let input = args.tags;
    if (!input) {
      if (counts.length) {
        console.log('   （下面这些是已有标签，可以直接填名字；也可以直接写全新的标签）\n');
      }
      input = await ask('要添加的标签（逗号分隔）：');
    }

    const changes = splitList(input);
    if (changes.length === 0) {
      console.error('✗ 没有填标签，什么都没改');
      process.exitCode = 1;
      return;
    }

    const removing = Boolean(args.remove);

    /* ---------- 3. 写回文件 ---------- */
    console.log('');
    let changedCount = 0;

    for (const entry of targets) {
      let next;
      if (removing) {
        next = entry.tags.filter((t) => !changes.includes(t));
      } else {
        /* 去重：保留原有顺序，新标签追加在后面 */
        next = [...entry.tags];
        for (const tag of changes) {
          if (!next.includes(tag)) next.push(tag);
        }
      }

      if (next.join('|') === entry.tags.join('|')) {
        console.log(`· ${entry.slug}：没有变化，跳过`);
        continue;
      }

      const updated = writeTags(entry.content, next);
      if (updated === null) {
        console.error(`✗ ${entry.file} 缺少 frontmatter（开头的 --- 部分），跳过`);
        continue;
      }

      await writeFile(path.join(POSTS_DIR, entry.file), updated, 'utf8');
      changedCount += 1;

      const before = entry.tags.length ? entry.tags.join(', ') : '无';
      const after = next.length ? next.join(', ') : '无';
      console.log(`✓ ${entry.slug}`);
      console.log(`    ${before}  →  ${after}`);
    }

    if (changedCount > 0) {
      console.log(`\n共修改 ${changedCount} 个文件。`);
      console.log('  标签页（/tags/）会自动跟着更新，不需要额外操作。\n');
    } else {
      console.log('\n没有任何文件被修改。\n');
    }
  } finally {
    rl?.close();
  }
}

main().catch((error) => {
  console.error('✗ 出错了：', error);
  process.exitCode = 1;
});
