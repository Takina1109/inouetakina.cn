import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { RECOMMEND_CATEGORIES } from './data/recommend';

/**
 * 文章集合
 * 一篇新文章的 frontmatter 长这样：
 * ---
 * title: 标题
 * description: 摘要
 * date: 2026-09-27
 * type: tech          # tech = 技术文章 / thought = 随想
 * tags: [Astro, 前端]
 * ---
 */
const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  /*
   * 【改 frontmatter 前先看这里】
   *
   * 1) YAML 里「键名: 后面什么都不写」会被解析成 null，而不是「没写」。
   *    而 .default() / .optional() 只对付「整个键不写」，对付不了 null。
   *    不处理的话，光是 description: 后面忘了填，这一条就会加载失败、
   *    从网站上直接消失（报错：Expected type "string", received "object"）。
   *    所以这里的做法统一是：用 preprocess / nullish 先归一化成正确的类型，
   *    再交给后面的校验 —— 这样报出的才是中文提示，而不是难懂的英文类型错误。
   *
   * 2) 只有 title / date 是真正必填的：一个决定显示什么，
   *    一个决定排在哪一天。其它字段留空都能跑。
   */
  schema: z.object({
    title: z.preprocess(
      (value) => String(value ?? '').trim(),
      z.string().min(1, '标题不能为空：title: 后面要写上标题')
    ),
    description: z.preprocess((value) => String(value ?? '').trim(), z.string()),
    /*
     * 这里必须包一层 preprocess，因为 z.coerce.date() 内部就是 new Date(值)，
     * 而 new Date(null) 是合法的 —— 等于 1970-01-01。
     * 也就是说「date: 后面留空」不但不报错，还会悄悄把这条内容排到最底下、
     * 显示成 1970 年，非常难查。挡成 undefined 后它会明确报「日期必填」。
     */
    date: z.preprocess(
      (value) =>
        value === null || (typeof value === 'string' && value.trim() === '')
          ? undefined
          : value,
      z.coerce.date({ error: '日期必填：date: 要写成 2026-09-27 这样' })
    ),
    updated: z.coerce.date().nullish(),
    /** 文章类型：动态 / 文章 */
    type: z
      .enum(['thought', 'tech'])
      .nullish()
      .transform((value) => value ?? 'thought'),
    /*
     * 标签：正常写法是数组 tags: [日常, 前端]。
     * 但为了不让人「少写两个方括号就把整条内容弄没」，
     * 这里也接受写成逗号分隔的普通文本：
     *     tags: 日常, 前端     -> ['日常', '前端']
     *     tags: 日常          -> ['日常']
     * 分隔符支持英文逗号、中文逗号、顿号。
     */
    tags: z.preprocess((value) => {
      if (value === null || value === undefined) return [];
      if (Array.isArray(value)) {
        return value.map((tag) => String(tag).trim()).filter(Boolean);
      }
      return String(value)
        .split(/[,，、]/)
        .map((tag) => tag.trim())
        .filter(Boolean);
    }, z.array(z.string())),
    /** 草稿：npm run build 时不会输出 */
    draft: z
      .boolean()
      .nullish()
      .transform((value) => value ?? false),
    /** 置顶 */
    pinned: z
      .boolean()
      .nullish()
      .transform((value) => value ?? false),
    /** 封面图（可选） */
    cover: z.string().nullish(),
  }),
});

/** 自我介绍集合：编辑 src/content/about/index.md 即可 */
const about = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/about' }),
  schema: z.object({
    title: z
      .string()
      .nullish()
      .transform((value) => (value ?? '').trim() || '自我介绍'),
    updated: z.coerce.date().nullish(),
  }),
});

/**
 * 把 links 归一化成 [{ label, url }]。
 *
 * 预期写法：
 *   links:
 *     - label: 萌娘百科
 *       url: https://zh.moegirl.org.cn/xxx
 *     - label: 百度百科
 *       url: https://baike.baidu.com/item/xxx
 *
 * 只写了 url 忘了 label、或整段写成了字符串，出问题的条目会被直接丢掉 ——
 * 宁可少一个链接，也不让整条推荐加载失败从页面上消失。
 */
function normalizeLinks(value: unknown): { label: string; url: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const label = String(record.label ?? '').trim();
    const url = String(record.url ?? '').trim();
    return label && url ? [{ label, url }] : [];
  });
}

/**
 * 推荐集合：书 / 动漫
 *
 * 文件放在 src/content/recommend/ 里，文件名就是网址最后一段
 * （比如 夏日重现.md → /recommend/夏日重现/）。
 * category 决定它出现在推荐页的哪个板块，四个合法取值定义在
 * src/data/recommend.ts —— 那份列表是单一事实来源，这里直接引用。
 */
const recommend = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/recommend' }),
  schema: z.object({
    title: z.preprocess(
      (value) => String(value ?? '').trim(),
      z.string().min(1, '名称不能为空：title: 后面要写上书名 / 番名')
    ),
    /*
     * 板块。这里故意用严格枚举：写错会明确报错并列出所有合法取值。
     * 报错总比「悄悄跑到别的板块去」好排查。
     */
    category: z.preprocess(
      (value) => String(value ?? '').trim(),
      z.enum([...RECOMMEND_CATEGORIES], {
        error: `category 只能是这几个之一：${RECOMMEND_CATEGORIES.join(' / ')}`,
      })
    ),
    /** 作者 / 原作 / 制作公司，随便写一句副标题 */
    author: z.preprocess((value) => String(value ?? '').trim(), z.string()),
    /** 一句话短评，显示在卡片上 */
    note: z.preprocess((value) => String(value ?? '').trim(), z.string()),
    /** 封面图：图片放进 public/ 后写成 /图片名.jpg */
    cover: z.string().nullish(),
    /** 参考链接（萌娘百科 / 百度百科 等），写法见下面的 normalizeLinks */
    links: z.preprocess(
      normalizeLinks,
      z.array(z.object({ label: z.string(), url: z.string() }))
    ),
    /** 收录日期，用于排序；不写就排在最后 */
    date: z.coerce.date().nullish(),
    /** 草稿：npm run build 时不会输出 */
    draft: z
      .boolean()
      .nullish()
      .transform((value) => value ?? false),
  }),
});

export const collections = { posts, about, recommend };
