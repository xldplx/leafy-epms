/**
 * EmptyState — shared "no data" block.
 * Location: frontend/src/components/EmptyState.jsx
 */
export default function EmptyState({ icon: Icon, title, hint, action }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
            {Icon && <Icon className="w-12 h-12 text-slate-200" />}
            <p className="text-slate-500 font-semibold">{title}</p>
            {hint && <p className="text-sm text-slate-400 max-w-sm leading-relaxed">{hint}</p>}
            {action && <div className="mt-1">{action}</div>}
        </div>
    );
}
