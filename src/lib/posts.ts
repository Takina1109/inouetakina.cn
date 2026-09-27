import { getCollection, type CollectionEntry } from 'astro:content';
import { postTypes, type PostType } from '@/data/site';

export type Post = CollectionEntry<'posts'>;

/* ------------------------------------------------------------------ *
 * 基础查询
 * ------------------------------------------------------------------ */

/** 获取全部文章：置顶优先，其余按日期倒序；生产构建自动过滤草稿 */
export async function getPosts(): Promise<Post[]> {
  const all = await getCollection('posts', (entry: Post) =>
    import.meta.env.PROD ? !entry.data.draft : true
  );

  return all.sort((a, b) => {
    if (a.data.pinned !== b.data.pinned) return a.data.pinned ? -1 : 1;
    return b.data.date.getTime() - a.data.date.getTime();
  });
}

/** 按标签过滤 */
export function filterByTag(posts: Post[], tag: string): Post[] {
  const target = tag.toLowerCase();
  return posts.filter((p) => p.data.tags.some((t) => t.toLowerCase() === target));
}

/** 按类型过滤 */
export function filterByType(posts: Post[], type: PostType): Post[] {
  return posts.filter((p) => p.data.type === type);
}

/** 标签 -> 文章数，按数量倒序 */
export function getTagCounts(posts: Post[]): { tag: string; count: number }[] {
  const map = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-Hans-CN'));
}

/** 上一条 / 下一条（只在【同类型】之间导航，技术文章不会跳到动态） */
export function getNeighbors(posts: Post[], current: Post) {
  const timeline = posts
    .filter((p) => p.data.type === current.data.type)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  const index = timeline.findIndex((p) => p.id === current.id);
  return {
    newer: index > 0 ? timeline[index - 1] : undefined,
    older: index >= 0 && index < timeline.length - 1 ? timeline[index + 1] : undefined,
  };
}

/* ------------------------------------------------------------------ *
 * 格式化
 * ------------------------------------------------------------------ */

/** YYYY-MM-DD */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 2026-09-27 */
export function formatDate(date: Date): string {
  return toISODate(date);
}

/** 2026 年 9 月 27 日 */
export function formatDateCN(date: Date): string {
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

/**
 * 粗略估算阅读时长（中文按字，英文按词）
 */
export function readingTime(body = ''): string {
  const chars = body.replace(/\s/g, '').length;
  const minutes = Math.max(1, Math.round(chars / 400));
  return `${minutes} 分钟`;
}

/**
 * 统计字数：中文 / 日文 / 韩文按「字」算，英文数字按「词」算。
 * 直接数正文原文，所以代码块里的内容也算（技术文章里这部分不该忽略）；
 * Markdown 符号（#、*、` 等）本身不属于汉字或字母数字，不会计入。
 */
export function countWords(text: string): number {
  const cjk = text.match(/[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g)?.length ?? 0;
  const latin = text.match(/[A-Za-z0-9]+/g)?.length ?? 0;
  return cjk + latin;
}

/** 解析 'YYYY-MM-DD' 为本地时间，避免时区导致差一天 */
export function parseLocalDate(input: string): Date {
  const [y, m, d] = input.split('-').map((n) => Number(n));
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

/** 文章类型对应的 URL 前缀：技术文章走 /posts/，动态走 /thoughts/ */
export function postBase(type: PostType): string {
  return type === 'tech' ? '/posts' : '/thoughts';
}

export function postUrl(post: Post): string {
  return `${postBase(post.data.type)}/${post.id}/`;
}

export function typeLabel(type: PostType): string {
  return postTypes[type].label;
}

/* ------------------------------------------------------------------ *
 * 搜索索引
 * ------------------------------------------------------------------ */

export interface SearchItem {
  title: string;
  url: string;
  description: string;
  type: PostType;
  typeLabel: string;
  tags: string[];
  date: string;
  /** 预计算的小写检索串，命中判断在前端完成 */
  haystack: string;
  /** 正文纯文本（截断），用于关键词匹配与摘要 */
  text: string;
}

/** 去掉 Markdown 语法，留下可搜索的纯文本 */
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/^\s{0,3}\d+\.\s+/gm, '')
    .replace(/[*_~]{1,3}/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildSearchIndex(posts: Post[], textLimit = 3000): SearchItem[] {
  return posts.map((post) => {
    const text = stripMarkdown(post.body ?? '');
    const data = post.data;
    return {
      title: data.title,
      url: postUrl(post),
      description: data.description,
      type: data.type,
      typeLabel: postTypes[data.type].label,
      tags: data.tags,
      date: toISODate(data.date),
      text: text.slice(0, textLimit),
      haystack: [
        data.title,
        data.description,
        data.tags.join(' '),
        postTypes[data.type].label,
        text,
      ]
        .join(' ')
        .toLowerCase(),
    };
  });
}

/* ------------------------------------------------------------------ *
 * 站点统计（侧边栏「站点信息」面板用）
 * ------------------------------------------------------------------ */

export interface SiteStats {
  /** 内容总数 */
  total: number;
  /** 其中文章（type: tech）多少篇 */
  articles: number;
  /** 其中动态（type: thought）多少条 */
  thoughts: number;
  /** 总字数 */
  words: number;
  /** 最后更新时间（取 updated 与 date 里最新的一个） */
  updated: Date | null;
  /** 最早一篇的发布时间 */
  firstPublished: Date | null;
}

/** 根据全部内容算出站点统计 */
export function buildStats(posts: Post[]): SiteStats {
  let words = 0;
  let updated: Date | null = null;
  let firstPublished: Date | null = null;
  let articles = 0;

  for (const post of posts) {
    words += countWords(post.body ?? '');

    const changed = post.data.updated ?? post.data.date;
    if (!updated || changed.getTime() > updated.getTime()) updated = changed;
    if (!firstPublished || post.data.date.getTime() < firstPublished.getTime()) {
      firstPublished = post.data.date;
    }
    if (post.data.type === 'tech') articles += 1;
  }

  return {
    total: posts.length,
    articles,
    thoughts: posts.length - articles,
    words,
    updated,
    firstPublished,
  };
}

/* ------------------------------------------------------------------ *
 * 热力图数据
 * ------------------------------------------------------------------ */

export interface HeatmapDay {
  date: string;
  count: number;
  /**
   * 颜色档位，只有三档：
   *   0 = 没上传过，1 = 上传过一篇，2 = 上传过一篇以上
   */
  level: 0 | 1 | 2;
  /** 当天发布的文章，用于 tooltip 与跳转 */
  items: { title: string; url: string }[];
}

export interface HeatmapData {
  weeks: (HeatmapDay | null)[][];
  /** 与 weeks 等长的月份标签，null 表示该列不显示 */
  monthLabels: (string | null)[];
  total: number;
  activeDays: number;
  maxCount: number;
  /** 网格覆盖的日期范围（含首尾），目前没地方用到，留着备用 */
  rangeStart: string;
  rangeEnd: string;
}

/**
 * 生成 GitHub 风格贡献热力图数据
 * @param posts 文章列表
 * @param weeks 显示多少周（53 周 ≈ 一年）
 */
export function buildHeatmap(posts: Post[], weeks = 53): HeatmapData {
  const byDate = new Map<string, { title: string; url: string }[]>();
  for (const post of posts) {
    const key = toISODate(post.data.date);
    const list = byDate.get(key) ?? [];
    list.push({ title: post.data.title, url: postUrl(post) });
    byDate.set(key, list);
  }

  /*
   * 最后一格取「本周周六」。
   *
   * 但这里必须同时考虑最新一篇的日期。原因是构建机（GitHub Actions）跑在
   * UTC，而文章日期写的是本地日期 —— 构建那一刻可能比文章日期「早一天」。
   * 如果那天又正好是周六，窗口右边界就等于构建当天，刚写好的文章会落在
   * 窗口右边之外被整个漏掉：热力图写着「共 0 篇」，可文章明明在列表里。
   * 取 现在 和 最新一篇 里较晚的那个，就不会漏，
   * 顺便也让「日期写在未来」的文章能正常出现在热力图上。
   *
   * 注意：「今天」那个白框不在这里算（见 Heatmap.tsx）。
   * 构建机上算出来的是构建那天的日期，站点不重新部署就不会变，
   * 而且构建机是 UTC，会比本地日期早 8 小时 —— 结果是白框永远钉错一天。
   */
  const newest = posts.reduce(
    (max, post) => Math.max(max, post.data.date.getTime()),
    0
  );

  const end = new Date(Math.max(Date.now(), newest));
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + (6 - end.getDay()));

  const start = new Date(end);
  start.setDate(start.getDate() - (weeks * 7 - 1));

  const grid: (HeatmapDay | null)[][] = [];
  const monthLabels: (string | null)[] = [];
  let total = 0;
  let activeDays = 0;
  let maxCount = 0;
  let prevMonth = -1;

  const cursor = new Date(start);
  for (let w = 0; w < weeks; w++) {
    const week: (HeatmapDay | null)[] = [];
    let label: string | null = null;

    for (let d = 0; d < 7; d++) {
      const key = toISODate(cursor);
      const items = byDate.get(key) ?? [];
      const count = items.length;
      const future = cursor.getTime() > end.getTime();

      if (count > 0) {
        total += count;
        activeDays += 1;
        maxCount = Math.max(maxCount, count);
      }

      if (d === 0 && cursor.getMonth() !== prevMonth) {
        label = `${cursor.getMonth() + 1}月`;
        prevMonth = cursor.getMonth();
      }

      week.push(
        future
          ? null
          : {
              date: key,
              count,
              /* 三档：0 = 没上传过，1 = 上传过一篇，2 = 上传过一篇以上 */
              level: Math.min(2, count) as HeatmapDay['level'],
              items,
            }
      );

      cursor.setDate(cursor.getDate() + 1);
    }

    grid.push(week);
    monthLabels.push(label);
  }

  return {
    weeks: grid,
    monthLabels,
    total,
    activeDays,
    maxCount,
    rangeStart: toISODate(start),
    rangeEnd: toISODate(end),
  };
}
