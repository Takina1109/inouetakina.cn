/**
 * 站点全局配置
 * —— 想改名字、头像、社交链接、歌单，基本只需要动这个文件。
 */

export type SocialIcon =
  | 'github'
  | 'bilibili'
  | 'neteasecloudmusic'
  | 'x'
  | 'steam'
  | 'zhihu'
  | 'gitee'
  | 'qq'
  | 'wechat'
  | 'xiaohongshu'
  | 'discord'
  | 'rss';

export interface SocialLink {
  /** 提示文字 / 无障碍标签 */
  label: string;
  /** 跳转地址 */
  url: string;
  /** simple-icons 图标名 */
  icon: SocialIcon;
  /** 悬停时的高亮色（缺省用主题强调色） */
  color?: string;
}

export interface Track {
  title: string;
  artist: string;
  /** 音频地址：把 mp3 放进 public/music/ 后写成 /music/xxx.mp3 */
  src: string;
  /** 封面地址（可选），同样放在 public/music/ */
  cover?: string;
}

export const site = {
  /** 站点标题：只用在浏览器标签页 / RSS / 分享卡片上，不显示在侧边栏 */
  title: '风の道標',
  /** 站点副标题 / 一句话简介 */
  description: '学习和生活记录',
  /** 你的名字：侧边栏头像下方那个名字 + 页脚版权 */
  author: 'TAKINA',
  /** 头像：替换 public/ 下的文件即可 */
  avatar: '/touxiang.jpg',
  /** 侧边栏头像下方的签名档 */
  tagline: '学艺不精的CS学生',
  /** 部署域名，用于 RSS 与绝对链接。要和 astro.config.mjs 里的 site 保持一致 */
  url: 'https://inouetakina.cn',
  /** 建站日期：侧边栏「站点信息」里的建站时间 + 已运行天数。格式固定为 年-月-日 */
  launched: '2026-09-27',
  /** 页脚版权起始年份 */
  since: 2026,
  /** 首页每页显示的文章数（0 表示不限制） */
  pageSize: 0,
} as const;

/**
 * 社交链接 —— 位置：头像正下方，点击图标跳转
 * 现在是黑白主题，所以不指定 color（悬停时用主题的黑/白强调色）。
 * 想恢复品牌色，给某一项加上 color: '#00aeec' 这样的字段即可。
 */
export const socials: SocialLink[] = [
  {
    label: 'GitHub',
    url: 'https://github.com/Takina1109',
    icon: 'github',
  },
  {
    label: '哔哩哔哩',
    url: 'https://space.bilibili.com/1982630444',
    icon: 'bilibili',
  },
  {
    label: '网易云音乐',
    url: 'https://music.163.com/#/user/home?id=12256808595',
    icon: 'neteasecloudmusic',
  },
  {
    label: 'steam',
    url: 'https://steamcommunity.com/profiles/76561199403803577/',
    icon: 'steam',
  },
];

/**
 * 歌单 —— 打开网站会随机打乱后播放
 * 1. 把 mp3 放到 public/music/ 目录
 * 2. 在下面按 { title, artist, src, cover? } 添加条目
 * 3. src 写 /music/文件名.mp3
 */
export const playlist: Track[] = [
  {
    title: 'Summer Ghost',
    artist: '小瀬村晶',
    src: '/music/Summer Ghost.mp3',
    cover: '/music/Summer_Ghost_poster.jpg',
  },
];

/** 播放器行为（musicMode = 'local' 时才用到） */
export const playerConfig = {
  /** 打开网站后自动尝试随机播放（浏览器可能拦截，会给出「点击播放」提示） */
  autoplay: true,
  /** 随机打乱歌单 */
  shuffle: true,
  /** 初始音量 0~1 */
  volume: 0.7,
  /** 循环整个歌单 */
  loop: true,
};

/* ================================================================== *
 * 音乐播放器方案
 * ================================================================== */

/**
 * 用哪一套播放器：
 *
 *   'meting' —— APlayer + MetingJS，直接解析在线歌单（网易云等）。
 *               不需要把音频文件放进仓库，也就没有把音乐文件再分发出去的
 *               版权问题。默认用这个，配置看下面的 meting。
 *
 *   'local'  —— 播放 public/music/ 里的本地音频文件。
 *               用的是上面那个 playlist + playerConfig。
 *               适合有明确授权、或自己创作的音乐。
 *
 * 两套的界面都长在侧边栏「Now Playing」那一栏里，改这一个值就能切。
 */
export type MusicMode = 'meting' | 'local';
export const musicMode: MusicMode = 'meting';

/**
 * ★★★ APlayer + MetingJS 配置 ★★★
 *
 * 你最需要改的只有一处：下面的 id —— 填你的网易云歌单 ID。
 *
 * 怎么拿到歌单 ID：
 *   1. 浏览器打开 https://music.163.com ，登录后进入「我的音乐 → 我创建的歌单」
 *   2. 点开你要用的那个歌单
 *   3. 看地址栏，形如：
 *        https://music.163.com/#/playlist?id=1234567890
 *                                        ^^^^^^^^^^ 这串数字就是 ID
 *   4. 把数字填到下面 id: '...' 的引号里，保存即可
 *
 * 注意：歌单要设置成「公开」，否则接口拉不到。
 *       想换成别人的歌单也行，只要那个歌单是公开的。
 */
export const meting = {
  /** 音乐源：netease = 网易云，tencent = QQ 音乐，kugou = 酷狗，baidu = 百度 */
  server: 'netease',

  /** 解析类型：playlist = 歌单，album = 专辑，artist = 歌手，song = 单曲 */
  type: 'playlist',

  /** ★★★ 你的网易云歌单 ID（一串数字）—— 换成你自己的 ★★★ */
  id: '18018895832',

  /**
   * Meting API 地址。
   *
   * MetingJS 自己不会解析歌单，它需要一个 API 服务把「歌单 ID」换成
   * 「可播放的音频地址 + 封面 + 歌词」。
   *
   * 【现在用的是自己部署的那台】
   *   https://api.inouetakina.cn/api
   * 做法：fork https://github.com/xizeyoupan/Meting-API 到 Vercel，然后在
   * Vercel 里把这个子域名绑给那个项目（DNS 加一条 CNAME 就行）。
   * 免费额度完全够用；闲置一阵子后第一次请求要一两秒冷启动，之后很快。
   * 完整步骤见 使用说明.txt 的 4.3。
   *
   * 【为什么不再用公共实例】都不靠谱，下面是实测结果（留作备查）：
   *     api.injahow.cn   有每日请求次数上限。用超了会返回 200 +
   *                      {"message":"请求次数已达上限，请明天再试"}，
   *                      一整天都拉不到歌单；换出口 IP 也一样，是服务端限制
   *     api.i-meto.com   403（MetingJS 官方文档里写的默认地址，早就废了）
   *     meting.qjqq.cn   522
   *     api.kuleu.com    超时
   *     api.qijieya.cn   实测可用，支持跨域 ← 自己那台万一挂了可以临时改回它
   *
   * 【为什么一失败播放器就整个不见了】MetingJS 只有在拿到合法歌单时才会
   * 创建 APlayer。API 返回一个错误对象（而不是歌单数组）时它什么都不做，
   * 页面上就是空的一块，所以 MetingPlayer.astro 里加了轮询提示。
   *
   * 【想再部署一台备用】可选的现成方案：
   *   - https://github.com/xizeyoupan/Meting-API 支持 Vercel / Cloudflare（就是现在用的）
   *   - https://github.com/injahow/meting-api    Node 版，可一键部署到 Vercel
   *   - https://github.com/metowolf/Meting       PHP 版，丢到任意 PHP 空间
   *
   * 自部署后的地址形如：
   *   https://你的域名/api?server=:server&type=:type&id=:id
   * 注意 :server / :type / :id 这三个占位符要原样保留，MetingJS 会自己替换。
   *
   * 【换实例的方法】只改下面这行的域名，后面 ?server=... 原样保留。
   * 最省事的验证方式：直接跑 npm run check-api —— 它会读出下面这行的地址
   * 请求一次，然后告诉你成功还是失败、失败原因是什么、返回了多少首歌。
   * 手动验证也行（把 歌单ID 换成你的，在浏览器里打开）：
   *   https://新域名/api?server=netease&type=playlist&id=歌单ID
   *   → 正常会返回一大串 JSON（几十 KB）；只有一两百字节的错误信息就是不行。
   * 另外响应头必须带 Access-Control-Allow-Origin（跨域），否则浏览器会拦掉。
   */
  api: 'https://api.inouetakina.cn/api?server=:server&type=:type&id=:id',

  /** 播放顺序：random = 随机播放（默认，符合需求），list = 按歌单顺序 */
  order: 'random',

  /** 循环方式：all = 列表循环，one = 单曲循环，none = 播完就停 */
  loop: 'all',

  /** 歌词类型：3 = 歌词是一个 lrc 文件地址（Meting 接口返回的就是这种），不要改 */
  lrcType: 3,

  /** 播放列表默认折叠，点播放器右下角的列表图标才展开 */
  listFolded: true,

  /** 播放列表展开后的最大高度 */
  listMaxHeight: '180px',

  /** 播放器强调色。本站是黑白配色，所以用接近白的浅灰 */
  theme: '#f2f2f2',
} as const;

/** 文章类型：tech = 文章，thought = 动态 */
export const postTypes = {
  tech: { label: '文章', emoji: '⌘' },
  thought: { label: '动态', emoji: '✿' },
} as const;

export type PostType = keyof typeof postTypes;
