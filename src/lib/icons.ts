/**
 * 品牌图标（GitHub / 哔哩哔哩 / 网易云音乐 …）
 * 来自 simple-icons，仅在构建期使用，不进入客户端包。
 */
import {
  siBilibili,
  siDiscord,
  siGitee,
  siGithub,
  siNeteasecloudmusic,
  siQq,
  siRss,
  siSteam,
  siWechat,
  siX,
  siXiaohongshu,
  siZhihu,
} from 'simple-icons';
import type { SocialIcon } from '@/data/site';

export interface BrandIcon {
  path: string;
  hex: string;
  title: string;
}

export const brandIcons: Record<SocialIcon, BrandIcon> = {
  github: siGithub,
  bilibili: siBilibili,
  neteasecloudmusic: siNeteasecloudmusic,
  x: siX,
  steam: siSteam,
  zhihu: siZhihu,
  gitee: siGitee,
  qq: siQq,
  wechat: siWechat,
  xiaohongshu: siXiaohongshu,
  discord: siDiscord,
  rss: siRss,
};

export function getBrandIcon(name: SocialIcon): BrandIcon {
  return brandIcons[name] ?? siRss;
}
