/* global React */
// Tokens + Lucide icon + tiny Recharts-style helpers for the App UI kit.

const SPENDDA_LOGO = "../../assets/spendda-logo.png";

function Icon({ name, className = "h-4 w-4" }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = `<i data-lucide="${name}"></i>`;
    window.lucide && window.lucide.createIcons && window.lucide.createIcons({ nameAttr: "data-lucide" });
  }, [name]);
  return <span ref={ref} className={className} style={{ display: "inline-flex" }} />;
}

// Tiny inline sparkline (blue line + blue area).
function AreaSpark({ data, height = 80, className = "" }) {
  const w = 640, h = height;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const norm = (v) => h - ((v - min) / Math.max(1, max - min)) * (h - 16) - 8;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${norm(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={`w-full ${className}`} style={{ height }}>
      <defs>
        <linearGradient id="ds-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(217 91% 53%)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="hsl(217 91% 53%)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill="url(#ds-area)" points={`0,${h} ${pts} ${w},${h}`} />
      <polyline fill="none" stroke="hsl(217 91% 62%)" strokeWidth="2" points={pts} />
    </svg>
  );
}

// Donut for risk breakdown — 3 slices.
function Donut({ parts, size = 140, className = "" }) {
  const total = parts.reduce((a, b) => a + b.value, 0) || 1;
  const R = 60, r = 38, cx = size / 2, cy = size / 2;
  let start = -Math.PI / 2;
  const arcs = parts.map((p) => {
    const angle = (p.value / total) * Math.PI * 2;
    const end = start + angle;
    const large = angle > Math.PI ? 1 : 0;
    const x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start);
    const x2 = cx + R * Math.cos(end), y2 = cy + R * Math.sin(end);
    const xi2 = cx + r * Math.cos(end), yi2 = cy + r * Math.sin(end);
    const xi1 = cx + r * Math.cos(start), yi1 = cy + r * Math.sin(start);
    const d = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${r} ${r} 0 ${large} 0 ${xi1} ${yi1} Z`;
    start = end;
    return { d, fill: p.color };
  });
  return (
    <svg width={size} height={size} className={className}>
      {arcs.map((a, i) => <path key={i} d={a.d} fill={a.fill} />)}
    </svg>
  );
}

function Bars({ data, height = 150, barColor = "hsl(217 91% 53%)" }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div className="w-full rounded-t-md" style={{ height: `${(d.value / max) * 86}%`, background: `linear-gradient(180deg, ${barColor}, hsl(217 91% 62%))` }} />
          <div className="truncate text-[10.5px] text-muted-foreground">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { SPENDDA_LOGO, Icon, AreaSpark, Donut, Bars });
