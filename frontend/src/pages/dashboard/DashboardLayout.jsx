import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, LogOut, ChevronUp, User, Settings,
    FolderKanban, ClipboardList, BarChart3, Bell, Upload,
    Wrench, Package, Hammer, Wallet, FileText, ChevronLeft, ChevronRight, Menu
} from 'lucide-react';
import { useTranslation } from '../../utils/i18n';

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
import SettingsPage from './features/Settings';
import Report       from './features/Report';
import MyProfile    from './features/MyProfile';
import ErrorBoundary from '../../components/ErrorBoundary';

export default function DashboardLayout() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [activePage, setActivePage]     = useState('Overview');
    const [pendingProjectId, setPendingProjectId] = useState(null);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isCollapsed, setIsCollapsed]         = useState(false);
    const menuRef = useRef(null);
    const notificationsRef = useRef(null);

    const userRole = localStorage.getItem('userRole') || 'Guest';
    const userName = localStorage.getItem('userName') || 'User';

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    // Cross-page navigation (e.g. an Alert deep-linking into its project).
    const navigateTo = (page, projectId = null) => {
        if (projectId != null) setPendingProjectId(projectId);
        setActivePage(page);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
                setIsNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Nav items re-ordered logically by operational flow
    const NAV_ITEMS = [
        { id: 'Overview',       labelKey: 'nav.overview',      icon: <LayoutDashboard className="w-5 h-5" />, allowedRoles: ['Project Manager','Planner','Cost Engineer','Site Engineer','Management'] },
        { id: 'Analytics',      labelKey: 'nav.analytics',     icon: <BarChart3 className="w-5 h-5" />,       allowedRoles: ['Project Manager','Planner','Cost Engineer','Management'] },
        { id: 'Plan vs Actual', labelKey: 'nav.planVsActual',  icon: <BarChart3 className="w-5 h-5" />,       allowedRoles: ['Project Manager','Planner','Cost Engineer','Management'] },
        { id: 'Projects',       labelKey: 'nav.projects',      icon: <FolderKanban className="w-5 h-5" />,    allowedRoles: ['Project Manager','Planner','Cost Engineer','Site Engineer','Management'] },
        { id: 'Daily Actuals',  labelKey: 'nav.dailyActuals',  icon: <ClipboardList className="w-5 h-5" />,   allowedRoles: ['Project Manager','Planner','Site Engineer'] },
        { id: 'Manpower',       labelKey: 'nav.manpower',      icon: <Users className="w-5 h-5" />,           allowedRoles: ['Project Manager','Planner','Site Engineer'] },
        { id: 'Equipment',      labelKey: 'nav.equipment',     icon: <Wrench className="w-5 h-5" />,          allowedRoles: ['Project Manager','Planner','Site Engineer'] },
        { id: 'Materials',      labelKey: 'nav.materials',     icon: <Package className="w-5 h-5" />,         allowedRoles: ['Project Manager','Planner','Site Engineer'] },
        { id: 'Consumables',    labelKey: 'nav.consumables',   icon: <Package className="w-5 h-5" />,         allowedRoles: ['Project Manager','Planner','Site Engineer'] },
        { id: 'Tools',          labelKey: 'nav.tools',         icon: <Hammer className="w-5 h-5" />,          allowedRoles: ['Project Manager','Planner','Site Engineer'] },
        { id: 'Budget',         labelKey: 'nav.budget',        icon: <Wallet className="w-5 h-5" />,          allowedRoles: ['Project Manager','Cost Engineer'] },
        { id: 'Alerts',         labelKey: 'nav.alerts',        icon: <Bell className="w-5 h-5" />,            allowedRoles: ['Project Manager','Planner','Cost Engineer','Management'] },
        { id: 'Report',         labelKey: 'nav.report',        icon: <FileText className="w-5 h-5" />,        allowedRoles: ['Project Manager','Planner','Cost Engineer','Management'] },
        { id: 'Excel Import',   labelKey: 'nav.excelImport',   icon: <Upload className="w-5 h-5" />,          allowedRoles: ['Project Manager','Planner','Cost Engineer','Site Engineer','Management'] },
    ].filter(item => item.allowedRoles.includes(userRole));

    // Page components keyed by stable English ID
    const PAGE_COMPONENTS = {
        'Overview':       Overview,
        'Analytics':      Analytics,
        'Projects':       Projects,
        'Manpower':       Manpower,
        'Daily Actuals':  DailyActuals,
        'Plan vs Actual': PlanVsActual,
        'Alerts':         Alerts,
        'Report':         Report,
        'Excel Import':   ExcelImport,
        'Equipment':      Equipment,
        'Consumables':    Consumables,
        'Materials':      Materials,
        'Tools':          Tools,
        'Budget':         Budget,
        'Settings':       SettingsPage,
        'MyProfile':      MyProfile,
    };

    const ActiveComponent = PAGE_COMPONENTS[activePage] || Overview;
    // Date string helper
    const formattedDate = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    const PAGE_META = {
        'Overview': { title: t('nav.overview'), subtitle: 'Portfolio tracking, overall performance metrics, and activity timeline' },
        'Analytics': { title: t('nav.analytics'), subtitle: 'Predictive modeling, production graphs, and statistical dashboards' },
        'Plan vs Actual': { title: t('nav.planVsActual'), subtitle: 'Comparison of planned timelines against real-time field progress' },
        'Projects': { title: t('nav.projects'), subtitle: 'Comprehensive lists of all active, pending, and completed projects' },
        'Daily Actuals': { title: t('nav.dailyActuals'), subtitle: 'Daily site activity logs, resource logs, and output records' },
        'Manpower': { title: t('nav.manpower'), subtitle: 'Workforce deployment, hour records, and allocation matrices' },
        'Equipment': { title: t('nav.equipment'), subtitle: 'Heavy machinery tracking, utilization logging, and fleet status' },
        'Materials': { title: t('nav.materials'), subtitle: 'Primary inventory supply, receipts, and allocation tracking' },
        'Consumables': { title: t('nav.consumables'), subtitle: 'Stock control, disbursements, and store records' },
        'Tools': { title: t('nav.tools'), subtitle: 'Instrument logs, asset tracking, and verification history' },
        'Budget': { title: t('nav.budget'), subtitle: 'Financial analysis, cost items, and variance thresholds' },
        'Alerts': { title: t('nav.alerts'), subtitle: 'Critical notifications, threshold violations, and action items' },
        'Report': { title: t('nav.report'), subtitle: 'Exportable summary reports, PDF print decks, and metrics' },
        'Excel Import': { title: t('nav.excelImport'), subtitle: 'Parse and verify external spreadsheet logs into core tables' },
        'Settings': { title: t('nav.settings'), subtitle: 'Platform parameters, language selections, and configurations' },
        'MyProfile': { title: 'My Profile', subtitle: 'Personal credentials, active roles, and authorization clearance' }
    };

    return (
        <div className="h-screen bg-slate-50 flex font-sans text-slate-600 selection:bg-emerald-105 selection:text-emerald-700 overflow-hidden relative">
            
            {/* Ambient Background Blur Elements */}
            <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full z-0 pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full z-0 pointer-events-none" />

            {/* DOCKED SIDEBAR */}
            <aside className={`bg-slate-950 border-r border-slate-900 flex flex-col h-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] shrink-0 relative z-10 transition-[width] duration-300 ease-in-out will-change-[width] ${
                isCollapsed ? 'w-20' : 'w-72'
            }`}>

                {/* BRAND CONTAINER */}
                <div className="h-20 flex items-center justify-between px-6 border-b border-slate-900 shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-950/40 shrink-0">
                            <Hammer className="w-5 h-5 text-white" />
                        </div>
                        {!isCollapsed && (
                            <div className="animate-in fade-in duration-200">
                                <h1 className="text-base font-extrabold text-white tracking-tight leading-none">Leafy</h1>
                                <span className="text-[9px] font-black uppercase text-emerald-400 tracking-[0.25em] mt-1 block opacity-95">Enterprise</span>
                            </div>
                        )}
                    </div>
                    {/* COLLAPSE TOGGLE BUTTON */}
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-emerald-450 transition-colors border border-slate-800"
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                </div>

                {/* MAIN NAV */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#34d399_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-800 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {/* Menu Group Label */}
                    {!isCollapsed && (
                        <div className="px-3 pb-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest animate-in fade-in duration-200">
                            Modules Deck
                        </div>
                    )}
                    {NAV_ITEMS.map((item) => {
                        const isActive = activePage === item.id;
                        return (
                            <button 
                                key={item.id} 
                                onClick={() => setActivePage(item.id)}
                                className={`w-full flex items-center rounded-xl text-xs font-bold transition-all duration-300 group text-left ${
                                    isActive
                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/30'
                                        : 'text-slate-400 hover:bg-slate-900/60 hover:text-white'
                                } ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-3'}`}
                                title={isCollapsed ? t(item.labelKey) : undefined}
                            >
                                <span className={`transition-transform duration-300 group-hover:scale-110 shrink-0 ${isActive ? 'text-white' : 'text-slate-455 group-hover:text-emerald-400'}`}>
                                    {item.icon}
                                </span>
                                {!isCollapsed && (
                                    <span className="tracking-tight animate-in fade-in duration-200">{t(item.labelKey)}</span>
                                )}
                                {isActive && !isCollapsed && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* USER PROFILE */}
                <div className="p-3 border-t border-slate-900 relative shrink-0" ref={menuRef}>
                    {/* Account Dropdown Overlay with Smooth CSS Animation */}
                    <div className={`absolute bottom-[calc(100%-8px)] left-3 right-3 bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl overflow-hidden transition-all duration-200 transform origin-bottom-left z-50 ${
                        isUserMenuOpen 
                            ? 'opacity-100 scale-100 translate-y-0 visible' 
                            : 'opacity-0 scale-95 translate-y-2 invisible pointer-events-none'
                    }`}>
                        <div className="p-1.5 space-y-0.5">
                            <button
                                onClick={() => { setActivePage('MyProfile'); setIsUserMenuOpen(false); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-850 hover:text-white rounded-lg transition-colors text-left">
                                <User className="w-4 h-4 text-slate-400" /> My Profile
                            </button>
                            <button
                                onClick={() => { setActivePage('Settings'); setIsUserMenuOpen(false); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-850 hover:text-white rounded-lg transition-colors text-left">
                                <Settings className="w-4 h-4 text-slate-400" /> {t('nav.settings')}
                            </button>
                            <div className="h-px bg-slate-800 my-1 mx-2" />
                            <button onClick={handleLogout}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors text-left">
                                <LogOut className="w-4 h-4 text-rose-500" /> Sign Out
                            </button>
                        </div>
                    </div>

                    <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className={`w-full flex items-center rounded-2xl border transition-all duration-200 ${
                            isUserMenuOpen ? 'bg-slate-900 border-slate-700 ring-4 ring-slate-800' : 'bg-slate-955 border-slate-900 hover:border-slate-800'
                        } ${isCollapsed ? 'justify-center p-1.5' : 'gap-3 p-2.5'}`}
                    >
                        <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 flex items-center justify-center text-white font-bold uppercase shadow-md shadow-emerald-500/10 shrink-0">
                            {userName.charAt(0)}
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0 text-left text-slate-300 animate-in fade-in duration-200">
                                <p className="text-xs font-black text-white truncate leading-none">{userName}</p>
                                <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter truncate mt-1">{userRole}</p>
                            </div>
                        )}
                        {!isCollapsed && (
                            <ChevronUp className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                        )}
                    </button>
                </div>
            </aside>

            {/* MAIN CONTAINER */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative z-10 bg-slate-50">
                
                {/* DYNAMIC HEADER BAR */}
                <header className="h-20 bg-white border-b border-slate-200/80 flex items-center justify-between px-8 shrink-0 shadow-sm">
                    <div className="flex flex-col text-left">
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider leading-none">
                            {PAGE_META[activePage]?.title || activePage}
                        </h2>
                        {PAGE_META[activePage]?.subtitle && (
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-1.5">
                                {PAGE_META[activePage].subtitle}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Current Date */}
                        <div className="hidden sm:flex flex-col text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date Today</span>
                            <span className="text-xs font-bold text-slate-700">{formattedDate}</span>
                        </div>
                        
                        <div className="w-px h-8 bg-slate-200 hidden sm:block" />

                        {/* Notifications (Dropdown Action) */}
                        <div className="relative" ref={notificationsRef}>
                            <button 
                                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-200 relative ${
                                    isNotificationsOpen ? 'bg-emerald-50 border-emerald-300 text-emerald-600 ring-4 ring-emerald-100' : 'bg-slate-50 border-slate-200/60 text-slate-500 hover:text-emerald-600 hover:bg-white hover:border-slate-300'
                                }`}
                            >
                                <Bell className="w-4.5 h-4.5" />
                                <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
                            </button>
                            
                            {/* Notifications Dropdown */}
                            <div className={`absolute right-0 mt-2 w-80 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden transition-all duration-200 transform origin-top-right z-50 ${
                                isNotificationsOpen
                                    ? 'opacity-100 scale-100 translate-y-0 visible'
                                    : 'opacity-0 scale-95 -translate-y-2 invisible pointer-events-none'
                            }`}>
                                <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
                                    <span className="text-xs font-black uppercase text-slate-800 tracking-wider">Latest Alerts</span>
                                </div>
                                <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                                    <div className="p-3.5 hover:bg-slate-50 transition-colors text-left">
                                        <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Manpower Limit</div>
                                        <div className="text-xs text-slate-700 mt-1 font-medium leading-normal">Attendance threshold reached for Project Alpha (Site Engineer action required).</div>
                                        <div className="text-[9px] text-slate-400 mt-1">2 hours ago</div>
                                    </div>
                                    <div className="p-3.5 hover:bg-slate-50 transition-colors text-left">
                                        <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Cost Overrun Warning</div>
                                        <div className="text-xs text-slate-700 mt-1 font-medium leading-normal">Weekly materials cost has exceeded planned projections by 8.4%.</div>
                                        <div className="text-[9px] text-slate-400 mt-1">5 hours ago</div>
                                    </div>
                                    <div className="p-3.5 hover:bg-slate-50 transition-colors text-left">
                                        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">System Update</div>
                                        <div className="text-xs text-slate-700 mt-1 font-medium leading-normal">Excel inventory import successfully verified and parsed into main pipeline.</div>
                                        <div className="text-[9px] text-slate-400 mt-1">1 day ago</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => { setActivePage('Alerts'); setIsNotificationsOpen(false); }}
                                    className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 text-center text-xs font-bold text-emerald-600 border-t border-slate-100 block transition-colors"
                                >
                                    Show All Notifications
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* SCROLLABLE MAIN CONTENT AREA */}
                <main className="flex-1 min-h-0 overflow-y-auto p-8 lg:p-12 scroll-smooth">
                    <div className="animate-in fade-in duration-300 max-w-7xl mx-auto">
                        <ErrorBoundary key={activePage}>
                            <ActiveComponent
                                onNavigate={navigateTo}
                                initialProjectId={activePage === 'Projects' ? pendingProjectId : null}
                                onConsumeInitial={() => setPendingProjectId(null)}
                            />
                        </ErrorBoundary>
                    </div>
                </main>
            </div>

        </div>
    );
}