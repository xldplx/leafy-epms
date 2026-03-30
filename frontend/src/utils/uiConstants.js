/**
 * Shared UI constants and lightweight components.
 * Keeps presentation concerns separate from EVM computation (evmHelpers.js).
 */

// Status badge styles — used by Overview, Projects, ProjectDetail
export const STATUS_STYLES = {
    active:    'bg-emerald-50 text-emerald-600 border-emerald-100',
    planning:  'bg-blue-50 text-blue-600 border-blue-100',
    completed: 'bg-slate-50 text-slate-500 border-slate-100',
    on_hold:   'bg-amber-50 text-amber-600 border-amber-100',
};

// Standardized null / empty display
export const NULL_DISPLAY = '\u2014'; // em dash "—"

// Standard form input (emerald focus ring)
export const INPUT_CLASS = 'w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm';

// Compact inline input for tables
export const INLINE_INPUT_CLASS = 'w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all';
