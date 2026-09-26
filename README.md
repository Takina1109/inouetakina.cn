# 星屑ノート · 黑白配色个人博客

一个用 Markdown 写内容的个人博客，内容分成两个互相独立的分区：**文章**（技术写作）和**动态**（随手记的想法）。全站暗色 + 黑白灰阶配色，带标签、站内搜索、在线歌单播放器和写作热力图。

> 只想改东西、不关心架构？直接看 **[使用说明.txt](./使用说明.txt)**，
> 那里逐项写了「想改什么 → 打开哪个文件 → 改哪一句」。本文件讲的是整体设计。

---

## 一、技术选型：为什么是 Astro

需求里有两个关键点决定了选型：

1. **内容形态是 Markdown**（随手记录的想法 + 技术文章），需要给每篇打标签；
2. **页面上有一堆交互**（随机播放的播放器、实时搜索、热力图）。

| 方案 | 适不适合 | 原因 |
| --- | --- | --- |
| **Astro（本项目采用）** | ✅ 最合适 | 内容优先：原生 Markdown + Content Collections 做类型安全的 frontmatter 校验；默认零 JS，只在需要的地方「注水」（岛屿架构）—— 播放器 / 搜索 / 热力图用 React 岛，其余全是静态 HTML；布局完全自由，不像文档框架那样被模板绑死 |
| Next.js | ⚠️ 可以但偏重 | React 全量水合，博客这种以静态内容为主的场景有点浪费；App Router 的缓存 / 渲染心智负担也更重 |
| VitePress | ⚠️ 偏文档 | 它的定位是「文档站」，想做成头像侧边栏 + 播放器这种高度定制的个人主页，得跟默认主题较劲 |
| Hexo / Hugo | ⚠️ 生态割裂 | Go / Node 模板语言写组件不顺手，加播放器、热力图这类交互要写原生 JS，没法像 React 组件那样复用 |

**如果你更熟悉 Vue**，可以把 `@astrojs/react` 换成 `@astrojs/vue`，代码结构完全一样，只是 `.tsx` → `.vue`。

---

## 二、需求 → 实现对照

| README 里的需求 | 实现位置 |
| --- | --- |
| 黑白单色视觉 | 暗色 + 纯灰阶配色（零彩色）+ 玻璃拟态卡片 + 淡灰落樱动画，见 `src/styles/global.css` |
| 记录随时的想法 + 技术写作 | `type: thought` / `type: tech`，首页与标签页都能筛 |
| 标签功能 | `tags: [..]` 写在前言里 → `/tags/` 标签云、`/tags/标签名/` 分类页 |
| 圆形头像 | `src/components/Avatar.astro`；侧边栏整列通过 `--avatar-offset` 下移 |
| 头像正下方跳转 GitHub / B 站 / 网易云（用图标） | `src/components/SocialLinks.astro` + `src/data/site.ts` 的 `socials` |
| 搜索 tag 与文章关键词 | 顶栏搜索框 / `Ctrl`+`K`，`src/components/SearchDialog.tsx`，支持按类型和标签筛选、键盘上下选择 |
| 打开网站随机播放歌单，有上一首 / 暂停 / 下一首 | `src/components/MetingPlayer.astro`：APlayer + MetingJS（CDN 引入）直接解析网易云歌单，默认 `order="random"`。浏览器禁止无交互自动播放，所以改成「访客第一次点击 / 按键 / 触摸时才开始播」；歌单未就绪时监听器会保留，就绪后自动补上。 |
| 从任意页面跳到主页 / 文章 / 动态 / 标签 | 顶栏四个导航按钮（`BaseLayout.astro` 的 `navItems`），当前所在分区会自动高亮；侧边栏站名也可点 |
| 文章与动态分开 | 两个独立分区与路由：`/posts/`（`type: tech`）和 `/thoughts/`（`type: thought`），列表样式也不同（卡片 vs 时间轴） |
| 热力图看清上传文章的日期 | `src/components/Heatmap.tsx`，53 周 × 7 天，悬停显示当天日期和文章标题，点击跳到文章 |
| 侧边栏与主内容是一个整体、一起滚动 | 整页只有一个滚动容器，`.sidebar` 没有独立滚动条；顶栏和大标题区横跨整页（`grid-column: 1 / -1`），侧边栏被它们推到下面 |
| 只保留暗色主题 | `ThemeToggle` 组件已删除，颜色全部收在 `:root` 里，不再有 `data-theme` 切换 |
| 侧边栏「站点信息」面板 | `src/components/SiteStats.astro`：建站时间（含已运行天数）/ 文章总数（拆分文章·动态）/ 总字数 / 最后更新时间，数据由 `buildStats()` 在构建时算好 |
| 保存自我介绍的地方 | `src/content/about/index.md`（Markdown），点侧边栏圆形头像进入 `/about/`；侧边栏原来的卡片已换成上面的「站点信息」 |

---

## 三、快速开始

```bash
npm install     # 安装依赖
npm run dev     # 本地开发 → http://localhost:4321
npm run build   # 构建到 dist/
npm run preview # 本地预览构建结果
```

> **内容为空是正常的**：演示用的示例内容已经清空（`src/content/posts/` 里只剩一个 `.gitkeep`），
> 所以首页、`/posts/`、`/thoughts/`、`/tags/` 都会显示空状态提示。
> 用 `npm run article` 或 `npm run thought` 写第一篇就都有内容了。
> 构建时出现 `[WARN] [glob-loader] No files found matching ...` 也是这个原因，写下第一篇后就会消失。
>
> **底部浮出来的黑色工具条**：那是 Astro 的开发工具条（调试面板，含无障碍检查、日志设置等），
> 只在 `npm run dev` 时出现，`npm run build` 的产物里完全没有它。
> 本项目已在 `astro.config.mjs` 里用 `devToolbar: { enabled: false }` 关掉；
> 想临时打开就把那一行注释掉。

---

## 四、目录结构

```
.
├── astro.config.mjs          # Astro 配置（集成、代码高亮主题、路径别名 @/）
├── shiki-mono.mjs            # 纯灰阶的代码高亮主题（暗色单主题）
├── tsconfig.json
├── package.json
├── 使用说明.txt              # ★ 逐项说明「想改什么 / 去哪个文件 / 改哪一句」
├── new-article.mjs           # ★ npm run article：新建文章（type: tech）
├── new-thought.mjs           # ★ npm run thought：新建动态（type: thought）
├── new-tag.mjs               # ★ npm run tag：给已有内容加 / 删标签、看统计
├── public/                   # 静态资源，按原样输出到站点根目录
│   ├── avatar.svg            # 头像（换成自己的图片即可）
│   ├── favicon.svg
│   └── music/                # 把 mp3 放这里
└── src/
    ├── content.config.ts     # 内容集合的 schema（frontmatter 校验规则）
    ├── content/
    │   ├── posts/            # 所有内容，一个 .md 一条（文章 + 动态）
    │   │                     # 目前已清空，只留了 .gitkeep 占位
    │   └── about/index.md    # 自我介绍
    ├── data/site.ts          # ★ 站点信息 / 社交链接 / 歌单 / 播放器选项
    ├── lib/
    │   ├── posts.ts          # 取内容、标签统计、搜索索引、热力图数据
    │   └── icons.ts          # 品牌图标（simple-icons）
    ├── styles/global.css     # ★ 设计令牌与全部样式
    ├── layouts/
    │   ├── BaseLayout.astro  # 页面骨架（顶栏 + 大标题区 + 侧边栏 + 页脚）
    │   └── PostLayout.astro  # 文章 / 动态详情页（两者共用）
    ├── components/
    │   ├── Avatar.astro      # 圆形头像（旋转光环 + 在线小圆点）
    │   ├── SocialLinks.astro # 社交图标
    │   ├── MusicPlayer.tsx   # 本地音频播放器（React 岛，musicMode = 'local' 时启用）
    │   ├── MetingPlayer.astro # ★ APlayer + MetingJS 在线歌单（默认）
    │   ├── Heatmap.tsx       # 写作热力图（React 岛）
    │   ├── SearchDialog.tsx  # 站内搜索（React 岛）
    │   ├── Sidebar.astro     # 侧边栏组装
    │   ├── SiteStats.astro   # 站点信息面板（建站时间 / 总数 / 字数 / 最后更新）
    │   ├── IntroCard.astro   # 自我介绍卡片（侧边栏已不用，组件保留可随时放回）
    │   ├── PostCard.astro    # 文章卡片（「文章」分区用）
    │   ├── ThoughtItem.astro # 时间轴条目（「动态」分区用）
    │   ├── TagList.astro     # 标签列表
    │   └── TypeBadge.astro   # 「文章 / 动态」徽章
    └── pages/
        ├── index.astro              # 首页：最新文章 + 最新动态 + 常用标签
        ├── posts/index.astro        # 文章分区（只列 type: tech）
        ├── posts/[...slug].astro    # 文章详情 → /posts/<文件名>/
        ├── thoughts/index.astro     # 动态分区（只列 type: thought）
        ├── thoughts/[...slug].astro # 动态详情 → /thoughts/<文件名>/
        ├── about.astro              # 自我介绍完整版
        ├── tags/index.astro         # 全部标签
        ├── tags/[tag].astro         # 某个标签下的内容
        ├── rss.xml.ts               # RSS 订阅
        └── 404.astro
```

> 「文章」和「动态」的详情页渲染逻辑完全一样，都写在
> `src/layouts/PostLayout.astro` 里，两个路由文件只是把参数转发过去。

---

## 五、日常使用

### 写新内容：两个脚本

根目录下有两个专门的新建脚本，分别对应两个分区：

```bash
npm run article     # 新建文章（type: tech），文件：new-article.mjs
npm run thought     # 新建动态（type: thought），文件：new-thought.mjs
```

跑起来后按提示输入标题、标签、摘要即可，脚本会在 `src/content/posts/`
生成文件并打印出本地预览网址。也可以一行命令写全：

```bash
npm run article -- --title "用 Astro 搭博客" --slug astro-blog --tags "Astro,前端"
npm run thought -- --title "买了个新键盘" --tags "日常,外设"
```

两个脚本参数一致：`--title` / `--slug` / `--tags` / `--description` / `--publish`。
**默认生成的是草稿**（`draft: true`），写完把它改成 `draft: false` 才发布
（`draft:` 这个键名要保留，不能只写一个 `false`，否则 frontmatter 会变成
非法 YAML，整个构建都会失败）；想建完就直接生效，加 `--publish`。

脚本是自包含的，想改新文件的初始内容，直接编辑对应 `.mjs` 里的
`buildTemplate()` 函数即可。

### 管理标签：`npm run tag`

标签在本项目里不是独立的文件，而是写在每篇内容 frontmatter 的 `tags` 里，
所以「添加一个新标签」就是把标签加到某一篇（或多篇）内容上；
用不到那个标签的内容都没了，标签页也会自动消失。

```bash
npm run tag -- --list                    # 列出所有标签及各篇内容的当前标签
npm run tag                               # 交互式：选内容 → 填标签
npm run tag -- --post hello-world --tags "前端,笔记"
npm run tag -- --post a,b --tags "草稿" --remove
```

`new-tag.mjs` 只改写 frontmatter 的 `tags:` 那一行，正文和其它字段不受影响；
重复的标签会去重，没填 `--tags` 时不会动任何文件。

也可以完全手动建文件：

```markdown
---
title: 文章标题
description: 一句话摘要，会显示在卡片和搜索结果里
date: 2026-09-27
type: tech                 # tech = 技术文章，thought = 随想
tags: [Astro, 前端]
draft: false               # true 时只在 npm run dev 可见，构建时会被跳过
pinned: false              # true 会置顶到首页最前面
---

正文用 Markdown 写，代码块会自动高亮（明暗主题各一套配色）。
```

> **schema 是有意写得宽容的。** 在 `src/content.config.ts` 里，只有 `title` 和
> `date` 是必填；`description` / `tags` / `type` / `draft` / `pinned` / `cover`
> 全部用 `preprocess` / `nullish` 归一化过，**不写或「键名: 后面留空」都能跑**。
>
> 这样设计的理由：YAML 里 `description:` 后面留空会被解析成 `null`，而
> `.default()` 只对付「整个键不写」、管不住 `null` —— 不处理的话，光是忘了
> 填一行摘要，那条内容就会**从网站上静默消失**（报错：`Expected type
> "string", received "object"`）。`date` 则是另一个坑：`z.coerce.date()`
> 内部是 `new Date(值)`，而 `new Date(null)` 等于 `1970-01-01`，留空不报错、
> 而是悄悄排到最后去，所以它外面包了一层 `preprocess` 把空值挡成 `undefined`。
>
> 真正会报错的只有：`title` / `date` 留空，以及把键名丢掉只写一个值
> （`draft: false` 写成 `false`）。这几条都配了中文错误信息，dev 终端和
> `npm run build` 都会直接打出「文件名 + 中文原因」。

### 搜索是怎么工作的

`src/lib/posts.ts` 里的 `buildSearchIndex()` 会在构建时把每篇文章的标题、摘要、标签、类型和正文纯文本拼成一个检索串交给前端。搜索时按空格分词，**所有词都命中才算匹配**，再按「标题精确命中 > 标签命中 > 摘要 > 正文」加权排序。

### 换头像

1. 把你的图片放进 `public/`（比如 `public/avatar.png`）
2. 改 `src/data/site.ts` 里的 `avatar: '/avatar.png'`

建议用正方形图片，代码里会按圆形裁切。

### 换上你的歌单

1. 把音频文件放进 `public/music/`
2. 在 `src/data/site.ts` 里登记：

```ts
export const playlist: Track[] = [
  { title: '歌名', artist: '歌手', src: '/music/song.mp3', cover: '/music/cover.jpg' },
];
```

播放器的行为在同一个文件的 `playerConfig` 里：

```ts
export const playerConfig = {
  autoplay: true,  // 进页面就尝试播放
  shuffle: true,   // 随机打乱歌单
  volume: 0.7,
  loop: true,      // 播完自动下一首
};
```

> 浏览器禁止「用户没交互过就有声自动播放」，这是策略而非 bug。
> 播放器已经处理好了：被拦截时会显示「点击页面任意处开始听歌」，点一下就继续。

### 改社交链接

```ts
export const socials: SocialLink[] = [
  { label: 'GitHub', url: 'https://github.com/你的用户名', icon: 'github' },
  { label: '哔哩哔哩', url: 'https://space.bilibili.com/你的UID', icon: 'bilibili' },
  { label: '网易云音乐', url: 'https://music.163.com/#/user/home?id=你的UID', icon: 'neteasecloudmusic' },
];
```

`icon` 用的是 [simple-icons](https://simpleicons.org/) 的名字，还支持 `x` / `steam` / `zhihu` / `gitee` / `qq` / `wechat` / `xiaohongshu` / `discord` / `rss`。

默认不设颜色，悬停时用主题的黑/白强调色（保持黑白配色统一）。想给某个图标恢复品牌色，加一个 `color` 字段就行：

```ts
{ label: '哔哩哔哩', url: '...', icon: 'bilibili', color: '#00aeec' },
```

### 写自我介绍

直接编辑 `src/content/about/index.md`，支持完整 Markdown。侧边栏最下面那一栏现在是「站点信息」面板，点侧边栏的圆形头像即可进入 `/about/` 看完整自我介绍。

> `IntroCard.astro` 组件还在，如果想让自我介绍卡片重新回到侧边栏，在 `Sidebar.astro` 里引入它替换 `<SiteStats />` 即可。

---

## 六、调整外观

### 只保留暗色 + 纯灰阶

全站只有一套暗色主题，所有颜色都收在 `src/styles/global.css` 的 `:root` 里（不再有 `data-theme` 切换，`ThemeToggle` 组件已删除）。信息层级靠**明度**和**填充方式**区分，而不是颜色：

- `技术` 徽章 = 实心块，`随想` = 描边块
- 播放键、选中状态的导航按钮 = `background: var(--accent)` + `color: var(--on-accent)`

`--accent` / `--on-accent` 这一对是关键：强调色本身是浅色时，叠在它上面的文字必须是深色，否则会白底白字看不见。

```css
:root {
  --bg: #0a0a0a;          /* 页面背景 */
  --text: #f2f2f2;        /* 正文 */
  --accent: #f2f2f2;      /* 强调色 = 白 */
  --on-accent: #0a0a0a;   /* 叠在强调色上的文字 = 黑 */

  --sidebar-w: 340px;     /* 侧边栏宽度 */
  --avatar-offset: 5rem;  /* 侧边栏整列下移的距离 */
  --radius: 16px;
}
```

> 想加回亮色主题：把 `:root` 里的颜色复制一份改成 `html[data-theme='light'] { ... }` 并换成浅色值，再补一个切换按钮即可。

### 布局：顶栏和大标题横跨整页

`.app` 是一个两列网格（侧边栏 + 正文），而顶栏和「大标题区」用了 `grid-column: 1 / -1` 横跨两列：

```css
.topbar { grid-column: 1 / -1; position: sticky; top: 0; }
.page-hero { grid-column: 1 / -1; }
```

所以：

- 大标题会从页面最左边开始，比右边正文更靠左（即「向左延伸」）
- 侧边栏被它们推到下面，整列自然下移；再叠上 `--avatar-offset` 就还能继续往下调
- 页面仍然只有一个滚动容器，滚轮一滚左右两栏一起动

页面通过 `<Fragment slot="hero">` 把标题交给 `BaseLayout`，例如：

```astro
<BaseLayout title="文章">
  <Fragment slot="hero">
    <header class="page-head">
      <p class="page-head__eyebrow">Articles</p>
      <h1 class="page-head__title">文章</h1>
      <p class="page-head__desc">…</p>
    </header>
  </Fragment>

  <!-- 这里是正文，落在右列 -->
</BaseLayout>
```

### 文章 / 动态是怎么分开的

`src/content/posts/` 里并没有分成两套目录，两类的 Markdown 都放在一起，靠 frontmatter 的 `type` 分流：

| type | 分区 | 路由 | 列表样式 |
| --- | --- | --- | --- |
| `tech` | 文章 | `/posts/<文件名>/` | 卡片（`PostCard.astro`） |
| `thought` | 动态 | `/thoughts/<文件名>/` | 时间轴（`ThoughtItem.astro`） |

`src/lib/posts.ts` 里的 `postUrl()` 会根据 `type` 自动选择 `/posts/` 或 `/thoughts/` 前缀，`getNeighbors()` 也只在**同类型**之间取上一条 / 下一条，所以文章的下一条不会跳到动态。

详情页两边共用 `src/layouts/PostLayout.astro`：

```astro
// src/pages/posts/[...slug].astro
export async function getStaticPaths() {
  const posts = await getPosts();
  return posts
    .filter((post) => post.data.type === 'tech')   // thoughts 那边改成 'thought'
    .map((post) => ({ params: { slug: post.id }, props: { post } }));
}
```

### 音乐播放器：APlayer + MetingJS

音频不放进仓库，改成运行时从网易云解析，所以不存在把音乐文件再分发出去的问题。整个播放器在 `src/components/MetingPlayer.astro` 里，由三部分组成：

```
<link>           APlayer 样式（CDN）
<script is:inline> APlayer 本体（CDN）
<script is:inline> MetingJS（CDN）—— 去 Meting API 拉歌单，喂给 APlayer
<meting-js>      播放器本体，属性会直接变成 APlayer 的配置
<script is:inline> 首次交互后才播放的逻辑
```

`is:inline` 是必须的：这几个脚本要原样输出、按顺序执行，不能被 Astro 打包或延迟。

**歌单 ID 在 `src/data/site.ts` 的 `meting.id`**，不在组件里 —— 所有站点配置都集中在那个文件。

几个关键点：

- **随机播放**：`order="random"`。APlayer 只把音量存进 localStorage，不会记住 `order`，所以刷新后依然是随机。
- **自动播放**：`autoplay="false"` 交给浏览器，由脚本在**访客第一次交互**时触发。而且不是直接调 `ap.play()`，而是点 APlayer 自己的播放按钮 —— 直接调 API 有可能和 APlayer 内部的加载过程抢时序，被它自己的 `catch(() => this.pause())` 暂停掉；走按钮的路径就没这个问题，UI 状态也会同步。
- **歌单是异步拉的**：如果交互发生在歌单就绪之前，监听器不会被消耗掉，等就绪后会补播一次；播放没起来会重试最多 5 次。
- **API 挂了怎么办**：10 秒还拿不到歌单就显示一句提示，而不是留一个空框。MetingJS 本身没有 `.catch()`，接口失败时它连播放器都不会创建。
- **换回本地音频**：把 `site.ts` 的 `musicMode` 改成 `'local'`，就会用回 `MusicPlayer.tsx` + `playlist`。

> **一个容易踩的布局坑**：`.meting-wrap` 用的是 `grid-template-columns: minmax(0, 1fr)`，
> 不能只写 `display: grid`。grid 默认轨道是 `auto`，会被「最小内容宽度」撑开，
> 而 APlayer 的曲名是 `white-space: nowrap`，遇到长歌名时最小内容宽度等于整行文字宽度，
> 于是轨道被撑到几百像素、播放器顶出侧边栏。`min` 设成 `0` 才能把宽度锁住，
> 让 APlayer 自带的 `overflow: hidden` + `text-overflow: ellipsis` 正常出省略号。
> 同理，播放列表里的长歌名 / 长歌手名也在 `global.css` 里补了截断。

> MetingJS 需要一个 **Meting API** 服务把歌单 ID 换成音频地址。默认配的是一个第三方公共实例，公共实例很不稳定（MetingJS 官方的 `api.i-meto.com` 现在已经 403）。长期使用建议自己部署一个，配置项在 `site.ts` 的 `meting.api`，说明见 `使用说明.txt` 第 4.2 节。

### 换代码高亮配色

高亮主题定义在根目录的 `shiki-mono.mjs` 里。因为现在只有暗色，`astro.config.mjs` 用的是**单主题**写法：

```js
markdown: {
  shikiConfig: {
    theme: monoDark,   // 单主题：Astro 会把颜色直接写进内联样式
    wrap: true,
  },
},
```

内置主题里最接近黑白的是 `min-dark`，但它的关键字和字符串仍带紫蓝色，放在纯黑白站点里会跳色，所以这里自己写了一套只靠深浅 + 字重 + 斜体区分 token 的灰阶主题。

想微调某个 token，改 `shiki-mono.mjs` 里 `monoDark` 的 `palette` 字段即可：

```js
export const monoDark = createMonoTheme({
  name: 'mono-dark',
  type: 'dark',
  palette: {
    bg: '#0d0d0d',
    fg: '#e6e6e6',
    comment: '#6b6b6b',   // 注释（斜体）
    keyword: '#ffffff',   // 关键字（加粗）
    string: '#b5b5b5',    // 字符串
    // ...
  },
});
```

> 改完 `markdown.shikiConfig`（或换成内置主题名，见 <https://shiki.style/themes>）后需要**重启 `npm run dev`**，dev 服务器不会热重载 markdown 配置。

---

## 七、部署

1. 把 `astro.config.mjs` 里的 `site` 改成你的域名（RSS 与绝对链接会用到）：

```js
export default defineConfig({
  site: 'https://你的域名',
  // ...
});
```

2. `npm run build`，然后把 `dist/` 交给任意静态托管：

| 平台 | 设置 |
| --- | --- |
| Vercel / Netlify | 构建命令 `npm run build`，输出目录 `dist` |
| Cloudflare Pages | 同上 |
| GitHub Pages | 构建后把 `dist/` 推到 `gh-pages` 分支（若部署在子路径，需要同时设置 `site` 和 `base`） |

---

## 八、常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发服务器（草稿文章也会显示） |
| `npm run build` | 静态构建到 `dist/`（草稿会被跳过） |
| `npm run preview` | 预览构建产物 |
| `npm run article` | 新建文章（交互式，默认草稿） |
| `npm run thought` | 新建动态（交互式，默认草稿） |
| `npm run tag` | 标签管理：`--list` 看统计，或给指定内容加 / 删标签 |
| `npm run check` | Astro + TypeScript 类型检查（需先装 `@astrojs/check` 与 `typescript`） |

> **内容改了但 `npm run dev` 预览没变？** Astro dev 的内容层是内存快照，在
> 「内容文件被删除过」「新建文件之后服务器一直没重启」「中途有过 frontmatter
> 报错」这几种情况下会卡住不更新（`glob-loader` 不会重新扫描）。停掉重跑
> `npm run dev` 即可；仍不行则**先停掉服务器**、再删根目录的 `.astro` 缓存目录，
> 然后重新启动。删除与启动之间必须没有运行中的 dev 进程 —— 跑着的时候删，
> 当前进程会永久坏掉，日志里会一直刷 `The collection "posts" does not exist`。
> 判断方法：`npm run build` 后的 `dist/` 里有对应 HTML，就说明内容本身没问题。
> 另外改 `content.config.ts`（schema）不需要重启，dev 会自己 re-sync。

---

## 九、还可以往下做的

- **文章目录（TOC）**：`render()` 会返回 `headings`，可以直接拿来生成右侧目录
- **文章封面图**：schema 里已经预留了 `cover` 字段
- **说说 / 短想法流**：把 `type: thought` 的文章换成时间轴样式渲染
- **评论**：接 Giscus（基于 GitHub Discussions，静态站友好）
- **RSS 全文**：目前只输出摘要，可在 `src/pages/rss.xml.ts` 里改成输出 `post.body`
