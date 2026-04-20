/* global React */
// Shared tokens + CSS for the Marketing UI kit.
// Exposed on window so other component scripts can read them.

const SPENDDA_LOGO = "../../assets/spendda-logo.png";

const shell = "mx-auto max-w-7xl px-6 lg:px-8";
const label = "text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 sm:text-sm";
const card =
  "rounded-2xl border border-white/[0.12] bg-white/[0.025] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-blue-400/35 motion-safe:hover:shadow-[0_20px_50px_-12px_rgba(37,99,235,0.2)]";
const cardLink =
  "rounded-2xl border border-white/[0.12] bg-white/[0.025] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-blue-400/35 motion-safe:hover:bg-white/[0.04] motion-safe:hover:shadow-[0_20px_50px_-12px_rgba(37,99,235,0.2)]";
const reveal = "motion-safe:animate-fade-in-up";

// Lucide icon renderer — returns a <span> with innerHTML populated by window.lucide.
function Icon({ name, className = "h-4 w-4" }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = `<i data-lucide="${name}"></i>`;
    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons({ nameAttr: "data-lucide" });
    }
  }, [name]);
  return <span ref={ref} className={className} style={{ display: "inline-flex" }} />;
}

Object.assign(window, { SPENDDA_LOGO, shell, label, card, cardLink, reveal, Icon });
