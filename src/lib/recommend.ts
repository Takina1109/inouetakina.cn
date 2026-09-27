import { getCollection, type CollectionEntry } from 'astro:content';
import {
  RECOMMEND_CATEGORIES,
  recommendCategories,
  type RecommendCategory,
} from '@/data/recommend';

export type Pick = CollectionEntry<'recommend'>;

/**
 * 取全部推荐：生产构建自动过滤草稿。
 * 排序规则：写了日期的按日期倒序排前面，没写日期的排最后（同组内按名称排）。
 */
export async function getPicks(): Promise<Pick[]> {
  const all = await getCollection('recommend', (entry: Pick) =>
    import.meta.env.PROD ? !entry.data.draft : true
  );

  return all.sort((a, b) => {
    const at = a.data.date?.getTime() ?? -Infinity;
    const bt = b.data.date?.getTime() ?? -Infinity;
    if (at !== bt) return bt - at;
    return a.data.title.localeCompare(b.data.title, 'zh-Hans-CN');
  });
}

/** 推荐详情页的地址：/recommend/文件名/ */
export function pickUrl(pick: Pick): string {
  return `/recommend/${pick.id}/`;
}

export interface PickGroup {
  key: RecommendCategory;
  label: string;
  eyebrow: string;
  /** 板块说明，可选（在 src/data/recommend.ts 里给某个板块加上就会显示） */
  desc?: string;
  items: Pick[];
}

/**
 * 按板块分组，顺序固定为 recommendCategories 里的书写顺序。
 * 空板块会被丢掉 —— 一个还没填内容的板块没必要在页面上留个空框。
 */
export function groupPicks(picks: Pick[]): PickGroup[] {
  return RECOMMEND_CATEGORIES.map((key) => ({
    key,
    ...recommendCategories[key],
    items: picks.filter((pick) => pick.data.category === key),
  })).filter((group) => group.items.length > 0);
}
