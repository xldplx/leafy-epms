import React, { useState } from 'react';
import { Loader2, Eye, EyeOff, Lock, ArrowRight, Hammer, User, Users, Wallet, BarChart3 } from 'lucide-react';
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
        <div className="min-h-screen flex items-center justify-center bg-slate-950 select-none relative overflow-hidden p-4 sm:p-6 font-sans">

            {/* Ambient Dark Grid & Glows */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[140px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[140px] rounded-full pointer-events-none" />

            <div className="relative z-10 w-full max-w-md">
                {/* Premium Centered Dark Card */}
                <div className="bg-slate-900/60 backdrop-blur-2xl p-8 sm:p-10 rounded-[2.5rem] border border-slate-800/80 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.6)] hover:border-emerald-500/20 transition-all duration-500 group">

                    {/* Top Decorative Line */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full opacity-60" />

                    {/* Centered Branding (Matching Card Background) */}
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="w-12 h-12 bg-gradient-to-tr from-emerald-600 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-950/50 hover:scale-105 transition-transform duration-300">
                            <Hammer className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tight mt-4 leading-none">Leafy</h1>
                        <p className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.2em] mt-2 opacity-90 leading-none">Enterprise Management</p>
                    </div>

                    <div className="text-center mb-8">
                        <h2 className="text-xl font-extrabold text-white tracking-tight uppercase">
                            Welcome Back
                        </h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1.5 flex items-center justify-center gap-1.5">
                            Sign in to access the system
                        </p>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-950/20 border border-rose-900/50 text-rose-350 text-xs font-semibold animate-in fade-in slide-in-from-top-2 mb-6">
                            <span className="mt-0.5 shrink-0 w-4.5 h-4.5 rounded-full bg-rose-900 flex items-center justify-center text-rose-350 font-black">!</span>
                            <span className="leading-relaxed">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">

                        {/* Username */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-widest ml-1">
                                Username
                            </label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-emerald-500 transition-colors">
                                    <User className="w-4 h-4" />
                                </div>
                                <input
                                    id="username"
                                    type="text"
                                    required
                                    autoComplete="username"
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl text-slate-200 text-sm placeholder:text-slate-600 outline-none focus:bg-slate-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 shadow-inner"
                                    placeholder="Enter your username"
                                    value={credentials.username}
                                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-widest ml-1">
                                Password
                            </label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-emerald-500 transition-colors">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="current-password"
                                    className="w-full pl-11 pr-12 py-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl text-slate-200 text-sm placeholder:text-slate-600 outline-none focus:bg-slate-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 shadow-inner"
                                    placeholder="••••••••"
                                    value={credentials.password}
                                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-450 transition-colors p-1"
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
                            className="w-full pt-3"
                        >
                            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.98] disabled:opacity-70 text-white font-bold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/30 hover:shadow-emerald-500/20 hover:-translate-y-0.5 group/btn">
                                {isLoading ? (
                                    <><Loader2 className="animate-spin w-4 h-4 text-white" /> Authenticating...</>
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform text-white" />
                                    </>
                                )}
                            </div>
                        </button>

                    </form>

                    {/* Support Contact */}
                    <div className="pt-8 mt-6 border-t border-slate-800/80 text-center">
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                            Contact IT Helpdesk for credential recovery support.
                        </p>
                    </div>

                </div>
            </div>

        </div>
    );
}