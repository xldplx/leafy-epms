import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff, User, Lock, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, LayoutGrid } from 'lucide-react';
import { authApi } from '../utils/api';

export default function Dashboard() {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const data = await authApi.login(credentials.username, credentials.password);
            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('userRole', data.role);
                localStorage.setItem('userName', data.username);
                navigate('/dashboard/main');
            } else {
                setError(data.message || 'Login failed. Please try again.');
            }
        } catch {
            setError('Cannot reach server. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 select-none relative overflow-hidden p-4 sm:p-8">
            
            {/* Subtle Ambient Background Blurs (Keeps the background from looking too empty) */}
            <div className="absolute top-0 left-1/4 w-[40rem] h-[40rem] bg-emerald-400/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[30rem] h-[30rem] bg-slate-300/10 rounded-full blur-3xl pointer-events-none" />

            {/* Login Card */}
            <div className="w-full max-w-[26rem] bg-white p-8 sm:p-10 rounded-[2rem] border border-slate-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] relative z-10 transition-shadow hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)]">
                
                {/* Branding */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Leafy</h1>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-[0.2em] mt-1.5">
                        Enterprise System
                    </p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="mb-6 flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs font-medium animate-in fade-in slide-in-from-top-2">
                        <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-red-200 flex items-center justify-center text-red-800 font-bold">!</span>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">

                    {/* Username Input */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                            Username
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                                <User className="w-4 h-4" />
                            </div>
                            <input
                                id="username"
                                type="text"
                                required
                                autoComplete="username"
                                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-slate-800 text-sm placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300"
                                placeholder="Enter your username"
                                value={credentials.username}
                                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                            Password
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                                <Lock className="w-4 h-4" />
                            </div>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                autoComplete="current-password"
                                className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-slate-800 text-sm placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300"
                                placeholder="••••••••"
                                value={credentials.password}
                                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                                tabIndex={-1}
                                aria-label="Toggle password visibility"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        id="login-submit"
                        disabled={isLoading}
                        className="w-full pt-2"
                    >
                        <div className="bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-70 text-white font-bold py-3.5 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.23)] hover:-translate-y-0.5">
                            {isLoading ? (
                                <><Loader2 className="animate-spin w-4 h-4" /> Authenticating...</>
                            ) : (
                                <>Sign In <ArrowRight className="w-4 h-4 ml-1" /></>
                            )}
                        </div>
                    </button>

                </form>
            </div>
        </div>
    );
}