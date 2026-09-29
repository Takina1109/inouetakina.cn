import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import type { SearchItem } from '@/lib/posts';

interface Props {
  items: SearchItem[];
  /** 无关键词时最多展示多少条 */
  recentLimit?: number;
}

type TypeFilter = 'all' | 'tech' | 'thought';

/* ------------------------------------------------------------------ *
 * 检索
 * ------------------------------------------------------------------ */
function tokenize(query: string): string[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];
  // 空格分词；中文没有空格，所以整串也作为一个词参与匹配
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.length > 1 ? words : [trimmed];
}

interface Scored {
  item: SearchItem;
  score: number;
}

function search(items: SearchItem[], query: string, type: TypeFilter): Scored[] {
  const pool = type === 'all' ? items : items.filter((i) => i.type === type);
  const tokens = tokenize(query);

  if (tokens.length === 0) {
    return pool.map((item, index) => ({ item, score: -index }));
  }

  const results: Scored[] = [];

  for (const item of pool) {
    const title = item.title.toLowerCase();
    const tags = item.tags.map((t) => t.toLowerCase());
    const desc = item.description.toLowerCase();

    let score = 0;
    let matchedAll = true;

    for (const token of tokens) {
      if (!item.haystack.includes(token)) {
        matchedAll = false;
        break;
      }
      if (title === token) score += 120;
      if (title.startsWith(token)) score += 40;
      if (title.includes(token)) score += 24;
      if (tags.includes(token)) score += 60;
      if (tags.some((t) => t.includes(token))) score += 18;
      if (desc.includes(token)) score += 10;
      if (item.date.includes(token)) score += 30;
    }

    if (!matchedAll) continue;

    // 标题整体命中额外加权
    if (title.includes(query.trim().toLowerCase())) score += 30;
    // 新文章轻微优先
    score += Number(item.date.replace(/-/g, '').slice(0, 8)) / 1e7;

    results.push({ item, score });
  }

  return results.sort((a, b) => b.score - a.score);
}

/** 把命中片段包进 <mark> */
function highlight(text: string, query: string): ReactNode {
  const tokens = tokenize(query).filter((t) => t.length > 0);
  if (tokens.length === 0) return text;

  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const splitRegex = new RegExp(`(${escaped.join('|')})`, 'gi');
  // 单独用一条「整段相等」的正则做判断，避免 g 标志带来的 lastIndex 状态问题
  const isMatch = new RegExp(`^(?:${escaped.join('|')})$`, 'i');
  const parts = text.split(splitRegex);

  return parts.map((part, i) => (isMatch.test(part) ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>));
}

/* ------------------------------------------------------------------ *
 * 组件
 * ------------------------------------------------------------------ */
export default function SearchDialog({ items, recentLimit = 12 }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [active, setActive] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  /*
   * 搜索面板里列出【全部】标签（以前只列前 8 个）。
   * 顶栏那个「标签」按钮已删掉，所以这里得能盖住所有标签。
   * 排序：出现次数多的在前，次数相同按名字排。
   */
  const allTags = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      for (const tag of item.tags) map.set(tag, (map.get(tag) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'))
      .map(([tag]) => tag);
  }, [items]);

  const results = useMemo(() => {
    const found = search(items, query, typeFilter);
    return query.trim() ? found.slice(0, 40) : found.slice(0, recentLimit);
  }, [items, query, typeFilter, recentLimit]);

  /* 快捷键：Ctrl / Cmd + K 打开，Esc 关闭 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* 打开时聚焦输入框 + 锁定页面滚动 */
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = previous;
    };
  }, [open]);

  /* 结果变化时重置选中项 */
  useEffect(() => setActive(0), [query, typeFilter]);

  const close = () => {
    setOpen(false);
    setQuery('');
    setTypeFilter('all');
  };

  const go = (item: SearchItem | undefined) => {
    if (!item) return;
    window.location.href = item.url;
  };

  const onListKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[active]?.item);
    }
  };

  /* 让选中项始终可见 */
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <>
      {/* 触发按钮（放在顶栏） */}
      <button
        type="button"
        className="search-trigger"
        onClick={() => setOpen(true)}
        aria-label="搜索文章"
        aria-keyshortcuts="Control+K Meta+K"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <span className="search-trigger__text">搜索随想 / 技术 / 标签…</span>
      </button>

      {open && (
        <div
          className="search-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="站内搜索"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="search-panel">
            <div className="search-panel__input-row">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                type="search"
                value={query}
                placeholder="输入关键词或标签，例如：Astro、CSS、日常…"
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onListKeyDown}
                autoComplete="off"
                spellCheck={false}
              />
              <button type="button" className="icon-btn" onClick={close} aria-label="关闭搜索">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="search-panel__filters">
              {(
                [
                  ['all', '全部'],
                  ['tech', '文章'],
                  ['thought', '动态'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className="chip"
                  aria-pressed={typeFilter === value}
                  onClick={() => setTypeFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/*
              全部标签：点一下就填进搜索框（再点一下取消）。
              标签可能很多，所以这块在 CSS 里限高 + 自己滚。
            */}
            {allTags.length > 0 && (
              <div className="search-panel__tags">
                <span className="search-panel__tags-label">全部标签</span>
                <div className="search-panel__tags-list">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="chip"
                      aria-pressed={query.trim() === tag}
                      onClick={() => setQuery(query.trim() === tag ? '' : tag)}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {results.length === 0 ? (
              <p className="search-panel__empty">
                没有找到和「{query}」相关的文章
                <br />
                换个关键词，或者点上面的标签试试
              </p>
            ) : (
              <ul className="search-panel__results" ref={listRef} onKeyDown={onListKeyDown}>
                {results.map(({ item }, index) => (
                  <li key={item.url}>
                    <a
                      className={`search-result${index === active ? ' search-result--active' : ''}`}
                      href={item.url}
                      data-active={index === active}
                      onMouseEnter={() => setActive(index)}
                    >
                      <p className="search-result__title">
                        {query.trim() ? highlight(item.title, query) : item.title}
                      </p>
                      {item.description && <p className="search-result__desc">{item.description}</p>}
                      <span className="search-result__meta">
                        <span className={`type-badge type-badge--${item.type}`}>
                          {item.typeLabel}
                        </span>
                        <span>{item.date}</span>
                        {item.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="tag" style={{ padding: '0 0.45rem' }}>
                            {tag}
                          </span>
                        ))}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}

            <div className="search-panel__foot">
              <span>
                {query.trim()
                  ? `找到 ${results.length} 条结果`
                  : `共 ${items.length} 篇文章 · 输入关键词开始搜索`}
              </span>
              <span>
                <kbd>↑</kbd> <kbd>↓</kbd> 选择 · <kbd>Enter</kbd> 打开 · <kbd>Esc</kbd> 关闭
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
