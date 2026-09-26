import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Track } from '@/data/site';

/* ------------------------------------------------------------------ *
 * 内联图标
 * ------------------------------------------------------------------ */
const Icon = {
  play: <path d="M8 5.14v13.72L19 12z" />,
  pause: <path d="M6 5h4v14H6zM14 5h4v14h-4z" />,
  prev: <path d="M6 6h2v12H6zm12 .5L9.5 12 18 17.5z" />,
  next: <path d="M16 6h2v12h-2zM6 6.5L14.5 12 6 17.5z" />,
  shuffle: (
    <path d="M17 3h4v4h-2V6.41l-4.29 4.3-1.42-1.42L17.59 5H17zM3 5h4.17l3.54 3.54-1.42 1.42L6.17 7H3zm14 10.59V15h2v4h-4v-2h1.59l-3.3-3.29 1.42-1.42zM3 17h3.17l11-11H17V4h-4v2h-.17l-11 11H3z" />
  ),
  note: (
    <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z" />
  ),
  volume: (
    <path d="M3 10v4h3l4 4V6L6 10zm13.5 2a4.5 4.5 0 0 0-2.5-4.03v8.06A4.5 4.5 0 0 0 16.5 12M14 3.23v2.06a7 7 0 0 1 0 13.42v2.06a9 9 0 0 0 0-17.54" />
  ),
  alert: (
    <path d="M12 2 1 21h22zm0 6 6.5 11h-13zM11 10h2v5h-2zm0 6h2v2h-2z" />
  ),
};

/* ------------------------------------------------------------------ *
 * 工具
 * ------------------------------------------------------------------ */
function shuffleArray<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ *
 * 组件
 * ------------------------------------------------------------------ */
interface Props {
  tracks: Track[];
  autoplay?: boolean;
  shuffle?: boolean;
  volume?: number;
  loop?: boolean;
}

type Status = 'idle' | 'blocked' | 'error';

export default function MusicPlayer({
  tracks,
  autoplay = true,
  shuffle = true,
  volume = 0.7,
  loop = true,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const bootRef = useRef(false);

  // 初始顺序必须是「原顺序」，否则 SSR 与客户端首次渲染不一致会报 hydration 错误
  const [order, setOrder] = useState<number[]>(() => tracks.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [vol, setVol] = useState(volume);
  const [status, setStatus] = useState<Status>('idle');
  const [shuffleOn, setShuffleOn] = useState(shuffle);
  const [showList, setShowList] = useState(false);

  const current: Track | undefined = tracks[order[pos]];

  /* ---------- 首次挂载：随机打乱 + 尝试自动播放 ---------- */
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;

    if (shuffle && tracks.length > 1) {
      setOrder(shuffleArray(tracks.map((_, i) => i)));
    }
    if (autoplay && tracks.length > 0) {
      setPlaying(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- 播放控制 ---------- */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;

    if (audio.dataset.src !== current.src) {
      audio.dataset.src = current.src;
      audio.src = current.src;
      audio.load();
      setTime(0);
      setDuration(0);
    }

    if (!playing) {
      audio.pause();
      return;
    }

    const tryPlay = () => {
      audio
        .play()
        .then(() => setStatus((s) => (s === 'error' ? s : 'idle')))
        .catch((err: unknown) => {
          // 切换音源时浏览器会抛 AbortError，忽略即可
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setStatus('blocked');
          setPlaying(false);
        });
    };

    if (audio.readyState >= 2) {
      tryPlay();
    } else {
      audio.addEventListener('canplay', tryPlay, { once: true });
      return () => audio.removeEventListener('canplay', tryPlay);
    }
  }, [playing, current?.src, current]);

  /* ---------- 音量 ---------- */
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = vol;
  }, [vol]);

  /* ---------- 被浏览器拦截时，等待第一次用户交互 ---------- */
  useEffect(() => {
    if (status !== 'blocked') return;

    const unlock = () => {
      setStatus('idle');
      setPlaying(true);
    };

    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, [status]);

  /* ---------- 操作 ---------- */
  const next = useCallback(() => {
    setPos((p) => (order.length ? (p + 1) % order.length : 0));
  }, [order.length]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    // 播放超过 3 秒时，「上一首」先回到开头（和主流播放器一致）
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setTime(0);
      return;
    }
    setPos((p) => (order.length ? (p - 1 + order.length) % order.length : 0));
  }, [order.length]);

  const toggleShuffle = useCallback(() => {
    setShuffleOn((on) => {
      const enable = !on;
      if (enable) {
        setOrder(shuffleArray(order));
        setPos(0);
      }
      return enable;
    });
  }, [order]);

  const seekToRatio = useCallback((ratio: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = Math.min(1, Math.max(0, ratio)) * audio.duration;
    setTime(audio.currentTime);
  }, []);

  const handleBarPointer = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const bar = barRef.current;
      if (!bar) return;
      const move = (clientX: number) => {
        const rect = bar.getBoundingClientRect();
        seekToRatio((clientX - rect.left) / rect.width);
      };
      bar.setPointerCapture(event.pointerId);
      move(event.clientX);

      const onMove = (e: PointerEvent) => move(e.clientX);
      const onUp = () => {
        bar.removeEventListener('pointermove', onMove);
        bar.removeEventListener('pointerup', onUp);
      };
      bar.addEventListener('pointermove', onMove);
      bar.addEventListener('pointerup', onUp);
    },
    [seekToRatio]
  );

  const progress = duration > 0 ? (time / duration) * 100 : 0;
  const hasTracks = tracks.length > 0;

  return (
    <div className={`card player${playing ? ' player--playing' : ''}`}>
      <audio
        ref={audioRef}
        preload="metadata"
        loop={false}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => (loop ? next() : setPlaying(false))}
        onError={() => {
          if (!current) return;
          setStatus('error');
          setPlaying(false);
        }}
      />

      {/* 曲目信息 */}
      <div className="player__top">
        {/* 封面用 CSS 背景图：图片缺失时会自然露出底下的渐变，不会出现「裂图」图标 */}
        <div
          className={`player__cover${playing ? ' player__cover--spinning' : ''}`}
          aria-hidden="true"
        >
          {current?.cover && (
            <span
              className="player__cover-img"
              style={{ backgroundImage: `url("${current.cover}")` }}
            />
          )}
        </div>

        <div className="player__meta">
          <p className="player__title" title={current?.title}>
            {current?.title ?? '歌单还是空的'}
          </p>
          <p className="player__artist">{current?.artist ?? '去 src/data/site.ts 添加曲目'}</p>
        </div>

        {playing && (
          <div className="player__eq" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}

        <button
          type="button"
          className="player__icon-btn"
          onClick={toggleShuffle}
          aria-pressed={shuffleOn}
          title={shuffleOn ? '关闭随机播放' : '开启随机播放'}
          disabled={!hasTracks}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">{Icon.shuffle}</svg>
          <span className="visually-hidden">{shuffleOn ? '关闭随机播放' : '开启随机播放'}</span>
        </button>
      </div>

      {/* 进度条 */}
      <div
        className="player__bar"
        ref={barRef}
        role="slider"
        aria-label="播放进度"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration) || 0}
        aria-valuenow={Math.round(time)}
        tabIndex={0}
        onPointerDown={handleBarPointer}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') seekToRatio((time + 5) / (duration || 1));
          if (e.key === 'ArrowLeft') seekToRatio((time - 5) / (duration || 1));
        }}
      >
        <div className="player__bar-fill" style={{ width: `${progress}%` }} />
        <div className="player__bar-thumb" style={{ left: `${progress}%` }} />
      </div>

      <div className="player__time">
        <span>{formatTime(time)}</span>
        <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
      </div>

      {/* 控制按钮：只留三个，播放/暂停键刚好落在正中间 */}
      <div className="player__controls">
        <button
          type="button"
          className="player__btn"
          onClick={prev}
          title="上一首"
          disabled={!hasTracks}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">{Icon.prev}</svg>
          <span className="visually-hidden">上一首</span>
        </button>

        <button
          type="button"
          className="player__btn player__btn--main"
          onClick={() => setPlaying((p) => !p)}
          title={playing ? '暂停' : '播放'}
          disabled={!hasTracks}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">{playing ? Icon.pause : Icon.play}</svg>
          <span className="visually-hidden">{playing ? '暂停' : '播放'}</span>
        </button>

        <button
          type="button"
          className="player__btn"
          onClick={next}
          title="下一首"
          disabled={!hasTracks}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">{Icon.next}</svg>
          <span className="visually-hidden">下一首</span>
        </button>
      </div>

      {/* 音量 + 歌单开关 */}
      <div className="player__foot">
        <label className="player__volume">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
            {Icon.volume}
          </svg>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={vol}
            onChange={(e) => setVol(Number(e.target.value))}
            aria-label="音量"
          />
          <span>{Math.round(vol * 100)}</span>
        </label>

        {order.length > 1 && (
          <button
            type="button"
            className="player__list-toggle"
            aria-expanded={showList}
            onClick={() => setShowList((v) => !v)}
            title="展开 / 收起歌单"
          >
            歌单 {order.length}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 16 4 8h16z" />
            </svg>
          </button>
        )}
      </div>

      {/* 歌单（随机后的顺序） */}
      {showList && order.length > 1 && (
        <ul className="player__list">
          {order.map((trackIndex, i) => {
            const track = tracks[trackIndex];
            if (!track) return null;
            const active = i === pos;
            return (
              <li key={`${track.src}-${i}`}>
                <button
                  type="button"
                  aria-current={active}
                  onClick={() => {
                    setPos(i);
                    setPlaying(true);
                  }}
                >
                  <span className="player__list-idx">
                    {active && playing ? (
                      <span className="player__eq" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                    ) : (
                      String(i + 1).padStart(2, '0')
                    )}
                  </span>
                  <span className="player__list-title">{track.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* 状态提示 */}
      {status === 'error' && (
        <p className="player__hint player__hint--warn">
          <svg viewBox="0 0 24 24" aria-hidden="true">{Icon.alert}</svg>
          <span>
            音频加载失败 —— 把音频放进 <code>public/music/</code> 后更新{' '}
            <code>src/data/site.ts</code> 里的 <code>playlist</code> 即可。
          </span>
        </p>
      )}

      {status === 'blocked' && (
        <p className="player__hint">
          <svg viewBox="0 0 24 24" aria-hidden="true">{Icon.note}</svg>
          浏览器拦截了自动播放 —— 点击页面任意处开始听歌 ♪
        </p>
      )}

      {!hasTracks && (
        <p className="player__hint">
          <svg viewBox="0 0 24 24" aria-hidden="true">{Icon.note}</svg>
          歌单为空，去 <code>src/data/site.ts</code> 添加曲目吧。
        </p>
      )}
    </div>
  );
}
