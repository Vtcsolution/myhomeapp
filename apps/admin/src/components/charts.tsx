/**
 * Lightweight SVG charts in the brand palette. Each chart exposes its data as
 * a visually hidden table for screen readers and shows a read-out for the
 * point under the pointer or keyboard focus.
 */
import { useId, useState } from 'react';

export interface SeriesPoint {
  /** Short axis label (e.g. "12 Oct"). */
  label: string;
  value: number;
}

const W = 640;
const H = 220;
const PAD = { top: 16, right: 12, bottom: 28, left: 56 };

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const steps = [1, 2, 2.5, 5, 10];
  const step = steps.find((s) => s * magnitude >= max / 4 + 1e-9) ?? 10;
  return Math.ceil(max / (step * magnitude)) * step * magnitude;
}

function HiddenTable({
  caption,
  points,
  format,
}: {
  caption: string;
  points: SeriesPoint[];
  format: (v: number) => string;
}) {
  return (
    <table className="visually-hidden">
      <caption>{caption}</caption>
      <tbody>
        {points.map((p, i) => (
          <tr key={i}>
            <th scope="row">{p.label}</th>
            <td>{format(p.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Time series: an area line (value) or bars (counts). Time always reads left to right. */
export function TimeSeriesChart({
  points,
  format,
  axisFormat,
  caption,
  variant = 'area',
  color = 'var(--accent)',
}: {
  points: SeriesPoint[];
  format: (value: number) => string;
  axisFormat?: (value: number) => string;
  caption: string;
  variant?: 'area' | 'bars';
  color?: string;
}) {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const step = points.length > 1 ? innerW / (points.length - 1) : innerW;
  const barW = Math.max(3, (innerW / Math.max(1, points.length)) * 0.62);
  const x = (i: number) =>
    variant === 'bars' ? PAD.left + (innerW / points.length) * (i + 0.5) : PAD.left + step * i;
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const labelEvery = Math.max(1, Math.ceil(points.length / 7));
  const line = points
    .map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(' ');
  const area = points.length
    ? `${line} L${x(points.length - 1).toFixed(1)},${PAD.top + innerH} L${x(0).toFixed(1)},${PAD.top + innerH} Z`
    : '';
  const shown = active ?? points.length - 1;
  const current = points[shown];

  return (
    <figure style={{ margin: 0 }} dir="ltr">
      {current ? (
        <div className="row small" style={{ marginBottom: 6, minHeight: 20 }} aria-live="polite">
          <span className="muted">{current.label}</span>
          <span className="strong num">{format(current.value)}</span>
        </div>
      ) : null}
      <svg
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={caption}
        onMouseLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line className="grid-line" x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} />
            <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end">
              {(axisFormat ?? format)(v)}
            </text>
          </g>
        ))}
        {variant === 'area' ? (
          <>
            <path d={area} fill={`url(#${gradientId})`} />
            <path d={line} fill="none" stroke={color} strokeWidth={2.25} strokeLinejoin="round" />
          </>
        ) : (
          points.map((p, i) => (
            <rect
              key={i}
              x={x(i) - barW / 2}
              y={y(p.value)}
              width={barW}
              height={Math.max(0, PAD.top + innerH - y(p.value))}
              rx={3}
              fill={i === shown ? 'var(--primary)' : color}
              opacity={i === shown ? 1 : 0.75}
            />
          ))
        )}
        {variant === 'area' && current ? (
          <circle
            cx={x(shown)}
            cy={y(current.value)}
            r={4.5}
            fill="var(--surface)"
            stroke={color}
            strokeWidth={2}
          />
        ) : null}
        {points.map((p, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle">
              {p.label}
            </text>
          ) : null,
        )}
        {/* Hit areas for pointer and keyboard exploration. */}
        {points.map((p, i) => (
          <rect
            key={`hit-${i}`}
            x={x(i) - (variant === 'bars' ? innerW / points.length / 2 : step / 2)}
            y={PAD.top}
            width={variant === 'bars' ? innerW / points.length : step}
            height={innerH}
            fill="transparent"
            tabIndex={0}
            aria-label={`${p.label}: ${format(p.value)}`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
          />
        ))}
      </svg>
      <HiddenTable caption={caption} points={points} format={format} />
    </figure>
  );
}

export interface Slice {
  label: string;
  value: number;
  color: string;
}

/** Donut with a legend (legend is the accessible description). */
export function DonutChart({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: Slice[];
  centerLabel: string;
  centerValue: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = 52;
  const c = 2 * Math.PI * r;
  // Each slice starts where the previous ones end.
  const lengths = slices.map((s) => (s.value / total) * c);
  const offsets = lengths.map((_, i) => lengths.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <div className="row row--wrap" style={{ gap: 20, alignItems: 'center' }}>
      <svg width={140} height={140} viewBox="0 0 140 140" aria-hidden>
        <circle cx={70} cy={70} r={r} fill="none" stroke="var(--surface-muted)" strokeWidth={16} />
        {slices.map((s, i) => {
          const length = lengths[i] ?? 0;
          return (
            <circle
              key={s.label}
              cx={70}
              cy={70}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={16}
              strokeDasharray={`${length} ${c - length}`}
              strokeDashoffset={-(offsets[i] ?? 0)}
              transform="rotate(-90 70 70)"
            />
          );
        })}
        <text
          x={70}
          y={68}
          textAnchor="middle"
          style={{ fontSize: 22, fontWeight: 700, fill: 'var(--text-primary)' }}
        >
          {centerValue}
        </text>
        <text
          x={70}
          y={88}
          textAnchor="middle"
          style={{ fontSize: 12, fill: 'var(--text-secondary)' }}
        >
          {centerLabel}
        </text>
      </svg>
      <ul
        className="legend"
        style={{
          flexDirection: 'column',
          gap: 6,
          listStyle: 'none',
          margin: 0,
          padding: 0,
          flex: 1,
          minWidth: 160,
        }}
      >
        {slices.map((s) => (
          <li key={s.label} className="row row--between">
            <span>
              <span className="legend__swatch" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="strong num">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ranked horizontal bars (categories, professionals). */
export function BarList({
  items,
}: {
  items: { label: string; value: number; display: string; meta?: string }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="stack" style={{ gap: 14 }}>
      {items.map((item) => (
        <div key={item.label} className="hbar">
          <div className="truncate">
            <div className="strong truncate">{item.label}</div>
            {item.meta ? <div className="cell-sub">{item.meta}</div> : null}
          </div>
          <div className="hbar__track" aria-hidden>
            <div className="hbar__fill" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          <span className="num strong">{item.display}</span>
        </div>
      ))}
    </div>
  );
}
