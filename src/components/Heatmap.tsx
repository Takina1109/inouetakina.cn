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

function formatCN(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`;
}

export default function Heatmap({ data }: Props) {
  const [tip, setTip] = useState<Tip | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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

              const className = ['heatmap__cell', day.isToday ? 'heatmap__cell--today' : '']
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
          {[0, 1, 2, 3, 4].map((level) => (
            <i
              key={level}
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
