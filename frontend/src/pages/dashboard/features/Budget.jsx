import React from 'react';
import { Wallet } from 'lucide-react';

export default function Budget() {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Budget</h2>
                <p className="text-slate-500 mt-1">CAPEX & OPEX financial resources — planned vs actual with variance analysis</p>
            </div>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16">
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                    <div className="p-4 bg-amber-50 rounded-2xl text-amber-500">
                        <Wallet className="w-10 h-10" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-slate-700">Under Construction</p>
                        <p className="text-sm text-slate-400 mt-1">This module is currently being developed and will be available soon.</p>
                    </div>
                    <span className="text-[11px] font-bold uppercase px-3 py-1.5 rounded-lg border bg-amber-50 text-amber-600 border-amber-100">Coming Soon</span>
                </div>
            </div>
        </div>
    );
}