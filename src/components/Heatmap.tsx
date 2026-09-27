import { useCallback, useEffect, useRef, useState } from 'react';
import type { HeatmapData, HeatmapDay } from '@/lib/posts';

interface Props {
  data: HeatmapData;
}

interface Tip {
  day: HeatmapDay;
  x: number;
  y: number;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** 三档颜色对应的说明，图例的提示文字用 */
const LEVEL_LABELS = ['没上传过', '上传过一篇', '上传过一篇以上'];

function formatCN(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`;
}

/** 用访客自己的本地时间算出 YYYY-MM-DD */
function todayISO(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

export default function Heatmap({ data }: Props) {
  const [tip, setTip] = useState<Tip | null>(null);
  /*
   * 「今天」的白框必须在浏览器里算，不能构建时烘进 HTML。
   *
   * 原来是在构建时用 new Date() 算好写死在页面里的，有两个毛病：
   *   1. 构建机（GitHub Actions）跑在 UTC，比本地早 8 小时，
   *      所以本地明明是 27 号，线上的白框却永远框在 26 号；
   *   2. 静态页面里的日期是死的，站点不重新部署就一直停在旧日期。
   *
   * 初始值必须是 null：服务端没有「当前时间」这个概念，
   * 先渲染成没有白框、加载完再由浏览器补上，就不会 hydration mismatch。
   */
  const [today, setToday] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setToday(todayISO());
  }, []);

  /* 一年的格子比侧边栏宽，默认滚到最右边（最近的日期），并隐藏提示 */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const show = useCallback((day: HeatmapDay, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    setTip({ day, x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  const hide = useCallback(() => setTip(null), []);

  const { weeks, monthLabels, total, activeDays } = data;

  return (
    <div className="card heatmap">
      <div className="heatmap__scroll" ref={scrollRef}>
        {/* 月份标签：与网格列一一对齐 */}
        <div
          className="heatmap__months"
          style={{ gridTemplateColumns: `repeat(${weeks.length}, 11px)` }}
          aria-hidden="true"
        >
          {monthLabels.map((label, i) => (
            <span key={i}>{label ?? ''}</span>
          ))}
        </div>

        <div className="heatmap__grid">
          {weeks.map((week, wi) =>
            week.map((day, di) => {
              if (!day) {
                return (
                  <span
                    key={`${wi}-${di}`}
                    className="heatmap__cell"
                    style={{ background: 'transparent' }}
                    aria-hidden="true"
                  />
                );
              }

              const className = ['heatmap__cell', day.date === today ? 'heatmap__cell--today' : '']
                .filter(Boolean)
                .join(' ');

              const label = `${formatCN(day.date)}，${week ? WEEKDAYS[di] : ''}曜日，${day.count} 篇文章`;

              if (day.count === 0) {
                return (
                  <span
                    key={`${wi}-${di}`}
                    className={className}
                    data-level={0}
                    aria-label={label}
                    onMouseEnter={(e) => show(day, e.currentTarget)}
                    onMouseLeave={hide}
                  />
                );
              }

              return (
                <a
                  key={`${wi}-${di}`}
                  className={className}
                  data-level={day.level}
                  href={day.items[0]?.url ?? '#'}
                  aria-label={label}
                  onMouseEnter={(e) => show(day, e.currentTarget)}
                  onMouseLeave={hide}
                  onFocus={(e) => show(day, e.currentTarget)}
                  onBlur={hide}
                />
              );
            })
          )}
        </div>
      </div>

      <div className="heatmap__foot">
        <span>
          共 <b>{total}</b> 篇 · 活跃 <b>{activeDays}</b> 天
        </span>
        <span className="heatmap__legend">
          少
          {LEVEL_LABELS.map((label, level) => (
            <i
              key={level}
              title={label}
              style={{
                background: `var(--heat-${level})`,
                border: '1px solid var(--border)',
              }}
            />
          ))}
          多
        </span>
      </div>

      <div
        className="heatmap__tip"
        role="tooltip"
        data-show={tip ? 'true' : 'false'}
        style={{
          left: tip?.x ?? 0,
          top: tip?.y ?? 0,
          transform: 'translate(-50%, calc(-100% - 8px))',
        }}
      >
        {tip && (
          <>
            <b>{formatCN(tip.day.date)}</b>
            {tip.day.count === 0 ? (
              <div>这天没有更新</div>
            ) : (
              <>
                <div>更新了 {tip.day.count} 篇：</div>
                <ul>
                  {tip.day.items.slice(0, 5).map((item) => (
                    <li key={item.url}>{item.title}</li>
                  ))}
                  {tip.day.items.length > 5 && <li>…还有 {tip.day.items.length - 5} 篇</li>}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
