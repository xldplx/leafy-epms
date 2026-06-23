/**
 * ErrorState — shared fetch/operation failure block, replaces silent catch(console.error).
 * Location: frontend/src/components/ErrorState.jsx
 */
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function ErrorState({ message = 'Something went wrong while loading this data.', onRetry }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
            <div className="p-3 bg-red-50 rounded-2xl text-red-500"><AlertTriangle className="w-7 h-7" /></div>
            <p className="text-slate-600 font-semibold max-w-md">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="mt-1 inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                    <RotateCcw className="w-4 h-4" /> Retry
                </button>
            )}
        </div>
    );
}
