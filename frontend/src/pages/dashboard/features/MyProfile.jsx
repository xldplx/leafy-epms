
import React, { useState } from 'react';
import { User, Mail, Briefcase, Save, AlertCircle } from 'lucide-react';
import { apiFetch } from '../../../utils/api';

export default function MyProfile() {
    const [name, setName] = useState(localStorage.getItem('userFullName') || localStorage.getItem('userName') || 'User');
    const [email, setEmail] = useState(localStorage.getItem('userEmail') || '');
    const [role] = useState(localStorage.getItem('userRole') || 'Guest');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const userId = token ? JSON.parse(atob(token.split('.')[1])).id : null;
            if (!userId) throw new Error('Not authenticated. Please log in again.');
            await apiFetch(`/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify({ email, full_name: name }),
            });
            localStorage.setItem('userName', name);
            localStorage.setItem('userFullName', name);
            if (email) localStorage.setItem('userEmail', email);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (e) {
            setError(e.message || 'Failed to save profile.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">My Profile</h2>
                    <p className="text-slate-500 mt-1 font-medium">Manage your account details</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                        <div className="w-24 h-24 rounded-full bg-emerald-600 flex items-center justify-center text-white text-4xl font-black shadow-lg shadow-emerald-200 mb-4">
                            {name.charAt(0)}
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">{name}</h3>
                        <p className="text-sm text-slate-500 font-semibold mt-1">{email || 'No email provided'}</p>
                        <div className="mt-4 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-wider rounded-full border border-emerald-100">
                            {role}
                        </div>
                    </div>
                </div>

                {/* Profile Form */}
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <User className="w-5 h-5" /> Account Details
                    </h3>
                    {success && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2 mb-6">
                            <AlertCircle className="w-4 h-4" />
                            <span className="font-semibold">Profile updated successfully!</span>
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 mb-6">
                            <AlertCircle className="w-4 h-4" />
                            <span className="font-semibold">{error}</span>
                        </div>
                    )}
                    <div className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
                                placeholder="Enter your full name"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
                                placeholder="Enter your email address"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Role</label>
                            <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold">
                                {role}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Role is set by your administrator</p>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="mt-4 w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 transition-all disabled:opacity-60"
                        >
                            <Save className="w-4 h-4" />
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
