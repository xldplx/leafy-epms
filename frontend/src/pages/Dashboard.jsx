import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, LayoutGrid } from 'lucide-react';

export default function Dashboard() {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate network delay for animation check
        // await new Promise(resolve => setTimeout(resolve, 1000)); 

        try {
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
            });
            const data = await response.json();
            if (response.ok && data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('userRole', data.role);
                localStorage.setItem('userName', data.username);
                navigate('/dashboard/main');
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            setError('Server connection failed.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden select-none">

            {/* AMBIENT BACKGROUND BLOBS (To show off glassmorphism) */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-400/20 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-slate-400/20 rounded-full blur-[100px]" />

            {/* BACK BUTTON (Simple Arrow) */}
            <Link
                to="/"
                className="absolute top-8 left-8 text-slate-400 hover:text-emerald-600 transition-colors duration-300"
                title="Back to Home"
            >
                <ArrowLeft className="w-6 h-6" />
            </Link>

            {/* MAIN CARD: Glassmorphism + One Box Layout */}
            <div className="w-full max-w-[30rem] relative z-10">

                <div
                    className="bg-white/90 backdrop-blur-xl border border-gray-100 shadow-xl rounded-2xl p-8"
                >
                    {/* Header Section */}
                    <div className="text-center mb-8">
                        <div className="w-12 h-12 bg-emerald-100/80 rounded-xl flex items-center justify-center text-emerald-600 mx-auto mb-4 shadow-sm">
                            <LayoutGrid className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-widest">DASHBOARD LOGIN</h2>
                        <p className="text-sm text-slate-500 mt-2">Enter your credentials to access the dashboard system</p>
                    </div>

                    {/* Form Section */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-50/80 border border-red-100 text-red-600 text-xs text-center font-bold uppercase animate-pulse">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                                Username
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400 text-slate-700 text-sm"
                                placeholder="XXXXXXX"
                                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400 text-slate-700 text-sm"
                                placeholder="••••••••"
                                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-emerald-600 hover:cursor-pointer hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg shadow-lg shadow-emerald-200 transform active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 mt-2"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin w-5 h-5" />
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    {/* Footer / Meta */}
                    <div className="mt-8 pt-6 border-t border-slate-200/60 text-center">
                        <p className="text-xs text-slate-400">
                            Forgot password? Contact your IT support.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}