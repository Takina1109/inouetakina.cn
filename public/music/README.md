# 音乐目录

这个目录**只在用本地音频文件时才需要**。

播放器有两套方案，开关在 `src/data/site.ts`：

```ts
export const musicMode: MusicMode = 'meting';   // 默认：APlayer + MetingJS 在线歌单
//                                 'local'     // 本地文件：读这个目录
```

## 如果你在用默认的在线歌单（musicMode = 'meting'）

这个目录里的文件不会被使用，放着也不影响构建。

## 如果你想换成播放本地文件（musicMode = 'local'）

1. 把音频文件（mp3 / m4a）放在这个文件夹里
2. 把 `src/data/site.ts` 的 `musicMode` 改成 `'local'`
3. 在同一个文件的 `playlist` 里登记：

```ts
export const playlist: Track[] = [
  {
    title: '歌名',
    artist: '歌手',
    src: '/music/歌名.mp3',      // 对应 public/music/歌名.mp3
    cover: '/music/封面.jpg',    // 可选，对应 public/music/封面.jpg
  },
];
```

- `src` 必须以 `/music/` 开头；文件名里有空格也可以（写成 `'/music/Summer Ghost.mp3'` 这样即可）
- 建议使用 **mp3** 或 **m4a**（浏览器兼容性最好）
- 单个文件建议压在 5MB 以内，否则打开网站会变慢
- 播放行为（自动播放 / 随机 / 音量）在 `src/data/site.ts` 的 `playerConfig` 里

> 提醒：把有版权的音乐文件提交到公开仓库再分发，本身是有版权风险的。
> 如果是别人的作品，用在线歌单方案（`musicMode = 'meting'`）更稳妥 ——
> 音频不经过你的站点，你也没有在分发文件。

