import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, Truck, Fuel, Package, Wrench, Banknote, LogOut
} from 'lucide-react';

export default function DashboardLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    
    const userRole = localStorage.getItem('userRole') || 'Guest';
    const userName = localStorage.getItem('userName') || 'User';

    const handleLogout = () => {
        localStorage.clear();
        navigate('/dashboard');
    };

    const isActive = (path) => location.pathname === path;

    const navItems = [
        {
            name: 'Overview',
            path: '/dashboard/main',
            icon: <LayoutDashboard className="w-5 h-5" />,
            allowedRoles: ['Project Manager', 'Planner', 'Cost Engineer', 'Site Engineer', 'Management']
        },
        {
            name: 'Manpower',
            path: '/dashboard/manpower',
            icon: <Users className="w-5 h-5" />,
            allowedRoles: ['Project Manager', 'Planner', 'Site Engineer']
        },
        {
            name: 'Equipment',
            path: '/dashboard/empty', 
            icon: <Truck className="w-5 h-5" />,
            allowedRoles: ['Project Manager', 'Planner', 'Site Engineer']
        },
        {
            name: 'Consumables',
            path: '/dashboard/empty',
            icon: <Fuel className="w-5 h-5" />,
            allowedRoles: ['Project Manager', 'Planner', 'Site Engineer']
        },
        {
            name: 'Materials',
            path: '/dashboard/empty',
            icon: <Package className="w-5 h-5" />,
            allowedRoles: ['Project Manager', 'Planner', 'Site Engineer']
        },
        {
            name: 'Tools',
            path: '/dashboard/empty',
            icon: <Wrench className="w-5 h-5" />,
            allowedRoles: ['Project Manager', 'Planner', 'Site Engineer']
        },
        {
            name: 'Budget',
            path: '/dashboard/empty',
            icon: <Banknote className="w-5 h-5" />,
            allowedRoles: ['Project Manager', 'Cost Engineer']
        },
    ].filter(item => item.allowedRoles.includes(userRole)); 

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-600">
            <aside className="w-72 bg-white border-r border-slate-200 flex flex-col fixed h-full z-20 shadow-sm">
                <div className="h-24 flex items-center px-8 border-b border-slate-100">
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold text-slate-800">Capstone</h1>
                        <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-widest">Enterprise System</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                                isActive(item.path) ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            {item.icon}
                            {item.name}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold uppercase">
                            {userName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{userName}</p>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">{userRole}</p>
                        </div>
                        <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </aside>

            <main className="flex-1 ml-72 p-8 lg:p-12">
                <Outlet />
            </main>
        </div>
    );
}