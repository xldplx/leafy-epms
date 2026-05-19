import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, LogOut, ChevronUp, User, Settings, FolderKanban, ClipboardList, BarChart3, Bell, Upload,
    Wrench, Package, Hammer, Wallet
} from 'lucide-react';

import Overview     from './features/Overview';
import Analytics    from './features/Analytics';
import Manpower     from './features/Manpower';
import Projects     from './features/Projects';
import DailyActuals from './features/DailyActuals';
import PlanVsActual from './features/PlanVsActual';
import Alerts       from './features/Alerts';
import ExcelImport  from './features/ExcelImport';
import Equipment    from './features/Equipment';
import Consumables  from './features/Consumables';
import Materials    from './features/Materials';
import Tools        from './features/Tools';
import Budget       from './features/Budget';

const pageComponents = {
    'Overview':      Overview,
    'Analytics':     Analytics,
    'Projects':      Projects,
    'Manpower':      Manpower,
    'Daily Actuals': DailyActuals,
    'Plan vs Actual':PlanVsActual,
    'Alerts':        Alerts,
    'Excel Import':  ExcelImport,
    'Equipment':     Equipment,
    'Consumables':   Consumables,
    'Materials':     Materials,
    'Tools':         Tools,
    'Budget':        Budget,
};

export default function DashboardLayout() {
    const navigate = useNavigate();
    const [activePage, setActivePage] = useState('Overview');
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const userRole = localStorage.getItem('userRole') || 'Guest';
    const userName = localStorage.getItem('userName') || 'User';

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const navItems = [
        { name: 'Overview',      icon: <LayoutDashboard className="w-5 h-5" />, allowedRoles: ['Project Manager','Planner','Cost Engineer','Site Engineer','Management'] },
        { name: 'Analytics',     icon: <BarChart3 className="w-5 h-5" />,       allowedRoles: ['Project Manager','Planner','Cost Engineer','Management'] },
        { name: 'Projects',      icon: <FolderKanban className="w-5 h-5" />,    allowedRoles: ['Project Manager','Planner','Cost Engineer','Site Engineer','Management'] },
        { name: 'Manpower',      icon: <Users className="w-5 h-5" />,           allowedRoles: ['Project Manager','Planner','Site Engineer'] },
        { name: 'Daily Actuals', icon: <ClipboardList className="w-5 h-5" />,   allowedRoles: ['Project Manager','Planner','Site Engineer'] },
        { name: 'Plan vs Actual',icon: <BarChart3 className="w-5 h-5" />,       allowedRoles: ['Project Manager','Planner','Cost Engineer','Management'] },
        { name: 'Alerts',        icon: <Bell className="w-5 h-5" />,            allowedRoles: ['Project Manager','Planner','Cost Engineer','Management'] },
        { name: 'Excel Import',  icon: <Upload className="w-5 h-5" />,          allowedRoles: ['Project Manager','Planner','Cost Engineer','Site Engineer','Management'] },
        { name: 'Equipment',     icon: <Wrench className="w-5 h-5" />,          allowedRoles: ['Project Manager','Planner','Site Engineer'] },
        { name: 'Consumables',   icon: <Package className="w-5 h-5" />,         allowedRoles: ['Project Manager','Planner','Site Engineer'] },
        { name: 'Materials',     icon: <Package className="w-5 h-5" />,         allowedRoles: ['Project Manager','Planner','Site Engineer'] },
        { name: 'Tools',         icon: <Hammer className="w-5 h-5" />,          allowedRoles: ['Project Manager','Planner','Site Engineer'] },
        { name: 'Budget',        icon: <Wallet className="w-5 h-5" />,          allowedRoles: ['Project Manager','Cost Engineer'] },
    ].filter(item => item.allowedRoles.includes(userRole));

    const ActiveComponent = pageComponents[activePage] || pageComponents['Overview'];

    return (
        <div className="h-screen bg-[#f8fafc] flex font-sans text-slate-600 selection:bg-emerald-100 selection:text-emerald-700 overflow-hidden relative">
            {/* BACKGROUND DECORATION */}
            <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-emerald-100/30 blur-[120px] rounded-full z-0" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-100/20 blur-[120px] rounded-full z-0" />

            {/* SIDEBAR */}
            <aside className="w-72 bg-white/70 backdrop-blur-2xl border-r border-white/40 flex flex-col h-full z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300 shrink-0">
                <div className="h-24 flex items-center px-8 border-b border-slate-100/50 shrink-0">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                                <Hammer className="w-4 h-4 text-white" />
                            </div>
                            <h1 className="text-xl font-black text-slate-800 tracking-tight">Leafy</h1>
                        </div>
                        <span className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em] mt-1 ml-0.5 opacity-80">Enterprise</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#6ee7b7_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-emerald-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-emerald-400">
                    {navItems.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => setActivePage(item.name)}
                            className={`w-full flex items-center gap-3.5 px-4 py-4 rounded-2xl text-sm font-bold transition-all duration-300 group ${
                                activePage === item.name
                                    ? 'bg-emerald-600 text-white shadow-[0_8px_20px_-4px_rgba(16,185,129,0.3)] translate-x-1'
                                    : 'text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm'
                            }`}
                        >
                            <span className={`transition-transform duration-300 group-hover:scale-110 ${activePage === item.name ? 'text-white' : 'text-slate-400 group-hover:text-emerald-500'}`}>
                                {item.icon}
                            </span>
                            <span className="tracking-tight">{item.name}</span>
                            {activePage === item.name && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
                            )}
                        </button>
                    ))}
                </nav>

                {/* USER PROFILE */}
                <div className="p-4 border-t border-slate-100/50 relative shrink-0" ref={menuRef}>
                    {isUserMenuOpen && (
                        <div className="absolute bottom-[calc(100%-10px)] left-4 right-4 bg-white border border-slate-200 shadow-xl shadow-slate-200/50 rounded-xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200 z-50">
                            <div className="p-2 space-y-1">
                                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors text-left">
                                    <User className="w-4 h-4 text-slate-400" /> My Profile
                                </button>
                                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors text-left">
                                    <Settings className="w-4 h-4 text-slate-400" /> Settings
                                </button>
                                <div className="h-px bg-slate-100 my-1 mx-2" />
                                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left">
                                    <LogOut className="w-4 h-4" /> Sign Out
                                </button>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                            isUserMenuOpen
                                ? 'bg-slate-50 border-emerald-200 ring-2 ring-emerald-100'
                                : 'bg-white border-slate-100 hover:border-emerald-200 hover:shadow-sm'
                        }`}
                    >
                        <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold uppercase shadow-md shadow-emerald-200 shrink-0">
                            {userName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-bold text-slate-800 truncate">{userName}</p>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter truncate">{userRole}</p>
                        </div>
                        <ChevronUp className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </aside>

            {/* MAIN */}
            <main className="flex-1 h-full overflow-y-auto p-8 lg:p-12 scroll-smooth">
                <div className="animate-in fade-in duration-300 max-w-7xl mx-auto">
                    <ActiveComponent key={activePage} />
                </div>
            </main>
        </div>
    );
}