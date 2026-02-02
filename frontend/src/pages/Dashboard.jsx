import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function Dashboard() {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 relative">
            <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-emerald-600 font-medium">
                <ArrowLeft className="w-5 h-5" /> Back to Home
            </Link>
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
                <div className="bg-emerald-700 px-8 py-8 text-center text-white">
                    <h2 className="text-3xl font-bold">EPMS Access</h2>
                    <p className="text-emerald-100 text-sm mt-2 font-medium">Enterprise Project Control System</p>
                </div>
                <form onSubmit={handleLogin} className="p-8 space-y-6">
                    {error && <div className="p-4 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Username ID</label>
                        <input type="text" name="username" onChange={(e) => setCredentials({...credentials, username: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-lg outline-none focus:border-emerald-500" required />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Password</label>
                        <input type="password" name="password" onChange={(e) => setCredentials({...credentials, password: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-lg outline-none focus:border-emerald-500" required />
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 py-3 rounded-lg text-white font-semibold hover:bg-emerald-700 transition-all">
                        {isLoading ? <Loader2 className="animate-spin mx-auto w-5 h-5" /> : 'Sign In to Dashboard'}
                    </button>
                </form>
            </div>
        </div>
    );
}