/**
 * ErrorBoundary — catches render-time crashes in a page so one broken page never
 * white-screens the whole dashboard. Key it by active page to reset on navigation.
 * Location: frontend/src/components/ErrorBoundary.jsx
 */
import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        // Swap for Sentry/structured logging once available (Ananta's monitoring task).
        console.error('ErrorBoundary caught:', error, info);
    }

    reset = () => this.setState({ error: null });

    render() {
        if (this.state.error) {
            return (
                <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                    <div className="p-4 bg-red-50 rounded-2xl text-red-500"><AlertTriangle className="w-8 h-8" /></div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">This page hit a snag</h3>
                        <p className="text-sm text-slate-500 mt-1 max-w-md">
                            {this.state.error?.message || 'An unexpected error occurred.'}
                        </p>
                    </div>
                    <button
                        onClick={this.reset}
                        className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                    >
                        <RotateCcw className="w-4 h-4" /> Try again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
