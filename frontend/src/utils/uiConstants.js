/**
 * Shared UI constants and lightweight components.
 * Keeps presentation concerns separate from EVM computation (evmHelpers.js).
 */

// Status badge styles — used by Overview, Projects, ProjectDetail
export const STATUS_STYLES = {
    active:    'bg-emerald-50/50 backdrop-blur-sm text-emerald-700 border-emerald-100/50 shadow-sm shadow-emerald-500/5',
    planning:  'bg-blue-50/50 backdrop-blur-sm text-blue-700 border-blue-100/50 shadow-sm shadow-blue-500/5',
    completed: 'bg-slate-50/50 backdrop-blur-sm text-slate-600 border-slate-100/50 shadow-sm shadow-slate-500/5',
    on_hold:   'bg-amber-50/50 backdrop-blur-sm text-amber-700 border-amber-100/50 shadow-sm shadow-amber-500/5',
};

// Standardized null / empty display
export const NULL_DISPLAY = '\u2014'; // em dash "—"

// Standard form input (emerald focus ring)
export const INPUT_CLASS = 'w-full px-4 py-3 bg-white/40 backdrop-blur-md border border-slate-200/60 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-slate-700 text-sm shadow-sm appearance-none cursor-pointer hover:bg-white/60';

// Compact inline input for tables
export const INLINE_INPUT_CLASS = 'w-full px-3 py-1.5 bg-slate-50/50 backdrop-blur-sm border border-slate-200/50 rounded-lg text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all shadow-sm';

// Card container style
export const CARD_CLASS = 'bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-[2rem] overflow-hidden transition-all duration-300';
