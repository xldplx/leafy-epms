import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, Truck, Fuel, Package, Wrench, Banknote, LogOut,
    Construction, ArrowRight
} from 'lucide-react';

// imported files to show on the page components
import Overview from './features/Overview';
import Manpower from './features/Manpower';
import Empty from './features/Empty';

// page components
const pageComponents = {
    'Overview': Overview,
    'Manpower': Manpower,
};

export default function DashboardLayout() {
    const navigate = useNavigate();

    // State for Active Page (Default to Overview)
    const [activePage, setActivePage] = useState('Overview');

    const userRole = localStorage.getItem('userRole') || 'Guest';
    const userName = localStorage.getItem('userName') || 'User';

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    // Navigation Configuration
    const navItems = [
        {
            name: 'Overview',
            icon: <LayoutDashboard className="w-5 h-5" />,
            allowedRoles: ['Project Manager', 'Planner', 'Cost Engineer', 'Site Engineer', 'Management']
        },
        {
            name: 'Manpower',
            icon: <Users className="w-5 h-5" />,
            allowedRoles: ['Project Manager', 'Planner', 'Site Engineer']
        },
        {
            name: 'Equipment',
            icon: <Truck className="w-5 h-5" />,
            allowedRoles: ['Project Manager', 'Planner', 'Site Engineer']
        },
        {
            name: 'Consumables',
            icon: <Fuel className="w-5 h-5" />,
            allowedRoles: ['Project Manager', 'Planner', 'Site Engineer']
        },
        {
            name: 'Materials',
            icon: <Package className="w-5 h-5" />,
            allowedRoles: ['Project Manager', 'Planner', 'Site Engineer']
        },
        {
            name: 'Tools',
            icon: <Wrench className="w-5 h-5" />,
            allowedRoles: ['Project Manager', 'Planner', 'Site Engineer']
        },
        {
            name: 'Budget',
            icon: <Banknote className="w-5 h-5" />,
            allowedRoles: ['Project Manager', 'Cost Engineer']
        },
    ].filter(item => item.allowedRoles.includes(userRole));

    // --- LOGIC: Resolve the Component ---
    // 1. Find the current Nav Item object
    const currentNavItem = navItems.find(item => item.name === activePage) || navItems[0];

    // 2. Check if a component exists in the map. If not, use GenericPage.
    const ActiveComponent = pageComponents[activePage] || (() => <Empty />);

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-600 selection:bg-emerald-100 selection:text-emerald-700">
            {/* SIDEBAR */}
            <aside className="w-72 bg-white border-r border-slate-200 flex flex-col fixed h-full z-20 shadow-sm transition-all duration-300">
                <div className="h-24 flex items-center px-8 border-b border-slate-100">
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold text-slate-800">Capstone</h1>
                        <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-widest">Enterprise System</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => setActivePage(item.name)}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group ${activePage === item.name
                                ? 'bg-emerald-50 text-emerald-700 shadow-sm translate-x-1'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                }`}
                        >
                            <span className={activePage === item.name ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'}>
                                {item.icon}
                            </span>
                            {item.name}

                            {/* Chevron for active state */}
                            {activePage === item.name && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold uppercase shadow-md shadow-emerald-200">
                            {userName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{userName}</p>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">{userRole}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 ml-72 p-8 lg:p-12 transition-all">
                {/* Header for the Content Area */}
                {/* <div className="flex items-center justify-between mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{activePage}</h2>
                        <p className="text-slate-500 text-sm">Manage your project {activePage.toLowerCase()} here.</p>
                    </div>
                  
                </div> */}

                {/* Render the Active Component */}
                <div className="animate-in fade-in zoom-in-95 h-full duration-300">
                    <ActiveComponent />
                </div>
            </main>
        </div>
    );
}