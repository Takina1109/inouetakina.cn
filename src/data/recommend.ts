/**
 * 「推荐」板块的分类定义
 *
 * 想加一个新板块（比如「推荐的漫画」），只要：
 *   1. 在下面 RECOMMEND_CATEGORIES 里加一个取值
 *   2. 在 recommendCategories 里补上它的标题
 * src/content.config.ts 会直接引用这个列表，不用再改那边。
 */

export const RECOMMEND_CATEGORIES = [
  'book-reading',
  'anime-watching',
  'anime-recommend',
  'book-recommend',
] as const;

export type RecommendCategory = (typeof RECOMMEND_CATEGORIES)[number];

export interface RecommendCategoryInfo {
  /** 板块标题（推荐页上的中文小标题） */
  label: string;
  /** 英文小字，显示在详情页标题上方 */
  eyebrow: string;
  /** 板块说明，显示在标题下面。可选，不写就不显示（也不用写空字符串） */
  desc?: string;
}

/** 排列顺序 = 下面这个对象里的书写顺序 */
export const recommendCategories: Record<RecommendCategory, RecommendCategoryInfo> = {
  'book-reading': {
    label: '最近在读的书',
    eyebrow: 'Reading',
  },
  'anime-watching': {
    label: '最近在看的动漫',
    eyebrow: 'Watching',
  },
  'anime-recommend': {
    label: '推荐的动漫',
    eyebrow: 'Anime picks',
  },
  'book-recommend': {
    label: '推荐的书',
    eyebrow: 'Book picks',
  },
};
