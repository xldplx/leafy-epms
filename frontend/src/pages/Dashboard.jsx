import React, { useState } from 'react';
import { Loader2, Eye, EyeOff, Lock, ArrowRight, Hammer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../utils/api';

export default function Login() {
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
                if (data.email) localStorage.setItem('userEmail', data.email);
                if (data.full_name) localStorage.setItem('userFullName', data.full_name);
                navigate('/dashboard/overview');
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
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] select-none relative overflow-hidden p-4 sm:p-8">
            
            {/* Ambient Background Blurs (matches Dashboard theme) */}
            <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-emerald-100/30 blur-[120px] rounded-full z-0 pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-100/20 blur-[120px] rounded-full z-0 pointer-events-none" />

            {/* Centered Login Card (Enhanced Glassmorphism) */}
            <div className="relative z-10 w-full max-w-md">
                <div className="bg-white/70 backdrop-blur-2xl p-8 sm:p-10 rounded-[2rem] border border-white/40 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(16,185,129,0.15)] hover:-translate-y-1 group">
                    
                    {/* Decorative Top Accent */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1.5 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full opacity-80" />

                    {/* Branding */}
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 group-hover:shadow-emerald-300 transition-all duration-300">
                            <Hammer className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-center">
                            <h1 className="text-xl font-black text-slate-800 tracking-tight">Leafy</h1>
                            <p className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em] opacity-80">Enterprise</p>
                        </div>
                    </div>

                    {/* Login Header */}
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-[0.2em] mb-2">Welcome Back</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em] flex items-center justify-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Sign in to your account
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
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-emerald-500 transition-colors">
                                    <Hammer className="w-4 h-4" />
                                </div>
                                <input
                                    id="username"
                                    type="text"
                                    required
                                    autoComplete="username"
                                    className="w-full pl-11 pr-4 py-4 bg-white/80 border border-slate-200/70 rounded-2xl text-slate-800 text-sm placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 transition-all duration-300 shadow-sm group-hover/input:border-emerald-300"
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
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-emerald-500 transition-colors">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="current-password"
                                    className="w-full pl-11 pr-12 py-4 bg-white/80 border border-slate-200/70 rounded-2xl text-slate-800 text-sm placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 transition-all duration-300 shadow-sm group-hover/input:border-emerald-300"
                                    placeholder="••••••••"
                                    value={credentials.password}
                                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors p-1"
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
                            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.98] disabled:opacity-70 text-white font-bold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_8px_20px_-4px_rgba(16,185,129,0.3)] hover:shadow-[0_12px_30px_-4px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 group/btn">
                                {isLoading ? (
                                    <><Loader2 className="animate-spin w-4 h-4" /> Authenticating...</>
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </div>
                        </button>

                    </form>

                    {/* Account Recovery Text */}
                    <div className="mt-8 pt-6 border-t border-slate-100/50 text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em]">
                            Contact the IT team if you lost your account
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}