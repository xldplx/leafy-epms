import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { projectsApi, tasksApi } from '../../../utils/api';
import { formatCurrency } from '../../../utils/evmHelpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { INPUT_CLASS } from '../../../utils/uiConstants';

export default function PlanVsActual() {
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [loadingTasks, setLoadingTasks] = useState(false);

    useEffect(() => {
        projectsApi.getAll().then(r => setProjects(r.data||[])).catch(console.error).finally(()=>setLoadingProjects(false));
    }, []);

    useEffect(() => {
        if (!selectedProjectId) { setTasks([]); return; }
        setLoadingTasks(true);
        tasksApi.getByProject(selectedProjectId).then(r=>setTasks(r.data||[])).catch(console.error).finally(()=>setLoadingTasks(false));
    }, [selectedProjectId]);

    const selectedProject = projects.find(p => p.id === parseInt(selectedProjectId));
    const chartData = tasks.map(t => ({
        name: t.wbs_code || t.task_name.substring(0,15),
        fullName: t.task_name,
        planned_cost: parseFloat(t.planned_cost)||0,
        actual_cost: parseFloat(t.actual_cost)||0,
        planned_hours: parseFloat(t.planned_hours)||0,
        actual_hours: parseFloat(t.actual_hours)||0,
        pct_complete: parseFloat(t.pct_complete)||0,
    }));

    const totals = tasks.reduce((s,t) => ({
        planned_cost: s.planned_cost + (parseFloat(t.planned_cost)||0),
        actual_cost:  s.actual_cost  + (parseFloat(t.actual_cost)||0),
        planned_hours:s.planned_hours+ (parseFloat(t.planned_hours)||0),
        actual_hours: s.actual_hours + (parseFloat(t.actual_hours)||0),
    }), { planned_cost:0, actual_cost:0, planned_hours:0, actual_hours:0 });

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Plan vs Actual</h2>
                <p className="text-slate-500 mt-1">Compare planned vs actual cost and hours per task</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <div className="space-y-1 max-w-sm">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Select Project</label>
                    <select value={selectedProjectId} onChange={e=>setSelectedProjectId(e.target.value)} className={INPUT_CLASS} disabled={loadingProjects}>
                        <option value="">{loadingProjects?'Loading...':'Select a project...'}</option>
                        {projects.map(p=><option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>)}
                    </select>
                </div>
            </div>

            {selectedProjectId && (
                <>
                    {loadingTasks ? (
                        <div className="flex items-center justify-center h-32 gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin"/>Loading tasks...</div>
                    ) : tasks.length === 0 ? (
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">No tasks found for this project.</div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    ['Planned Cost', formatCurrency(totals.planned_cost), 'text-slate-700'],
                                    ['Actual Cost', formatCurrency(totals.actual_cost), totals.actual_cost > totals.planned_cost ? 'text-red-600' : 'text-emerald-600'],
                                    ['Planned Hours', `${totals.planned_hours}h`, 'text-slate-700'],
                                    ['Actual Hours', `${totals.actual_hours}h`, totals.actual_hours > totals.planned_hours ? 'text-red-600' : 'text-emerald-600'],
                                ].map(([label,value,color])=>(
                                    <div key={label} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                                        <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Cost Chart */}
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6">Cost: Planned vs Actual</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={chartData} margin={{top:5,right:20,left:20,bottom:60}}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                                        <XAxis dataKey="name" tick={{fontSize:10,fill:'#94a3b8'}} angle={-35} textAnchor="end" tickLine={false}/>
                                        <YAxis tick={{fontSize:10,fill:'#94a3b8'}} tickLine={false} axisLine={false} tickFormatter={v=>`${(v/1e6).toFixed(1)}M`}/>
                                        <Tooltip formatter={(v,name)=>[formatCurrency(v),name]} labelFormatter={(_,payload)=>payload?.[0]?.payload?.fullName||''}/>
                                        <Legend wrapperStyle={{fontSize:'12px',paddingTop:'20px'}}/>
                                        <Bar dataKey="planned_cost" name="Planned Cost" fill="#cbd5e1" radius={[4,4,0,0]}/>
                                        <Bar dataKey="actual_cost" name="Actual Cost" fill="#10b981" radius={[4,4,0,0]}/>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Task Table */}
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-50"><h3 className="font-bold text-slate-700">Task Breakdown</h3></div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead><tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                            <th className="px-6 py-4">Task</th><th className="px-4 py-4">WBS</th>
                                            <th className="px-4 py-4">Planned Cost</th><th className="px-4 py-4">Actual Cost</th>
                                            <th className="px-4 py-4">Planned Hrs</th><th className="px-4 py-4">Actual Hrs</th>
                                            <th className="px-4 py-4">% Complete</th><th className="px-4 py-4">Variance</th>
                                        </tr></thead>
                                        <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                                            {tasks.map(t=>{
                                                const variance = (parseFloat(t.planned_cost)||0) - (parseFloat(t.actual_cost)||0);
                                                return (
                                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4 font-semibold text-slate-700">{t.task_name}</td>
                                                        <td className="px-4 py-4 font-mono text-xs text-slate-400">{t.wbs_code||'—'}</td>
                                                        <td className="px-4 py-4 text-slate-500">{formatCurrency(t.planned_cost)}</td>
                                                        <td className="px-4 py-4 text-slate-500">{formatCurrency(t.actual_cost)}</td>
                                                        <td className="px-4 py-4 text-slate-500">{t.planned_hours||0}h</td>
                                                        <td className="px-4 py-4 text-slate-500">{t.actual_hours||0}h</td>
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-16 bg-slate-100 rounded-full h-1.5">
                                                                    <div className="h-1.5 rounded-full bg-emerald-500" style={{width:`${Math.min(t.pct_complete||0,100)}%`}}/>
                                                                </div>
                                                                <span className="text-xs font-bold">{t.pct_complete||0}%</span>
                                                            </div>
                                                        </td>
                                                        <td className={`px-4 py-4 font-bold ${variance>=0?'text-emerald-600':'text-red-600'}`}>
                                                            {variance>=0?'+':''}{formatCurrency(variance)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}