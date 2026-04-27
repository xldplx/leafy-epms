import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle2, Settings, Loader2 } from 'lucide-react';
import { alertsApi } from '../../../utils/api';
import { INPUT_CLASS } from '../../../utils/uiConstants';

export default function Alerts() {
    const [alerts, setAlerts] = useState([]);
    const [thresholds, setThresholds] = useState({ cpi_amber:'1.00', cpi_red:'0.90', spi_amber:'1.00', spi_red:'0.90' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    const userRole = localStorage.getItem('userRole');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [alertsRes, threshRes] = await Promise.all([alertsApi.getAlerts(), alertsApi.getThresholds()]);
            setAlerts(alertsRes.data || []);
            if (threshRes.data) {
                setThresholds({ cpi_amber: String(threshRes.data.cpi_amber), cpi_red: String(threshRes.data.cpi_red), spi_amber: String(threshRes.data.spi_amber), spi_red: String(threshRes.data.spi_red) });
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSaveThresholds = async () => {
        setSaving(true);
        try {
            await alertsApi.updateThresholds({
                cpi_amber: parseFloat(thresholds.cpi_amber), cpi_red: parseFloat(thresholds.cpi_red),
                spi_amber: parseFloat(thresholds.spi_amber), spi_red: parseFloat(thresholds.spi_red),
            });
            setToast('Thresholds updated');
            setTimeout(() => setToast(''), 2500);
            fetchData();
        } catch (e) { setToast('Error: ' + e.message); setTimeout(() => setToast(''), 3000); }
        finally { setSaving(false); }
    };

    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const warningCount  = alerts.filter(a => a.severity === 'warning').length;
    const t = { cpi_amber: parseFloat(thresholds.cpi_amber)||0, cpi_red: parseFloat(thresholds.cpi_red)||0, spi_amber: parseFloat(thresholds.spi_amber)||0, spi_red: parseFloat(thresholds.spi_red)||0 };
    const thresholdWarning = t.cpi_red >= t.cpi_amber || t.spi_red >= t.spi_amber;
    const thresholdFields = [['cpi_amber','CPI — At Risk below'],['cpi_red','CPI — Critical below'],['spi_amber','SPI — At Risk below'],['spi_red','SPI — Critical below']];

    return (
        <div className="space-y-8">
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold ${toast.startsWith('Error') ? 'bg-red-600' : 'bg-emerald-600'} text-white`}>
                    <CheckCircle2 className="w-4 h-4" /> {toast}
                </div>
            )}
            <div>
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Early Warning Alerts</h2>
                <p className="text-slate-500 mt-1">Real-time threshold monitoring across all projects</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-32 gap-3 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading alerts...</div>
            ) : (
                <>
                    <div className="flex flex-wrap gap-3">
                        {alerts.length === 0 ? (
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold">
                                <CheckCircle2 className="w-4 h-4" /> All projects are within configured thresholds
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold"><Bell className="w-4 h-4" />{alerts.length} Active {alerts.length === 1 ? 'Alert' : 'Alerts'}</div>
                                {criticalCount > 0 && <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm font-semibold"><AlertTriangle className="w-4 h-4" />{criticalCount} Critical</div>}
                                {warningCount > 0 && <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl text-sm font-semibold"><AlertTriangle className="w-4 h-4" />{warningCount} At Risk</div>}
                            </>
                        )}
                    </div>

                    {userRole === 'Project Manager' && (
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-slate-50 rounded-xl text-slate-500"><Settings className="w-5 h-5" /></div>
                                    <div>
                                        <h3 className="font-bold text-slate-700">Threshold Configuration</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">Changes are saved to the database and apply globally.</p>
                                    </div>
                                </div>
                                <button onClick={handleSaveThresholds} disabled={saving}
                                    className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-60">
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Save Thresholds
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                                {thresholdFields.map(([key, label]) => (
                                    <div key={key} className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
                                        <input type="number" step="0.01" min="0" max="1.5" value={thresholds[key]}
                                            onChange={e => setThresholds({...thresholds,[key]:e.target.value})}
                                            onBlur={e => { const n=parseFloat(e.target.value); setThresholds({...thresholds,[key]:isNaN(n)?'0.00':Math.min(1.5,Math.max(0,n)).toFixed(2)}); }}
                                            className={INPUT_CLASS} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {thresholdWarning && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl text-sm font-semibold">
                            <AlertTriangle className="w-4 h-4 shrink-0" /> Critical threshold should be lower than the At Risk threshold.
                        </div>
                    )}

                    {alerts.length > 0 ? (
                        <div className="space-y-3">
                            {[...alerts].sort((a,b)=>(b.severity==='critical'?1:0)-(a.severity==='critical'?1:0)).map(alert => (
                                <div key={alert.id} className={`bg-white rounded-3xl border p-6 flex items-start gap-4 ${alert.severity==='critical'?'border-red-100':'border-amber-100'}`}>
                                    <div className={`p-2.5 rounded-xl shrink-0 ${alert.severity==='critical'?'bg-red-50 text-red-600':'bg-amber-50 text-amber-600'}`}>
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="font-bold text-slate-800">{alert.project?.project_name}</p>
                                                <p className="font-mono text-xs text-slate-400 mt-0.5">{alert.project?.project_code}</p>
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border shrink-0 ${alert.severity==='critical'?'bg-red-50 text-red-600 border-red-100':'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                {alert.severity === 'critical' ? 'Critical' : 'At Risk'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">{alert.recommendation}</p>
                                        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
                                            <span><strong className="text-slate-600">{alert.metric}:</strong> {typeof alert.value === 'number' ? alert.value.toFixed(2) : alert.value}</span>
                                            <span>Threshold: {typeof alert.threshold === 'number' ? alert.threshold.toFixed(2) : alert.threshold}</span>
                                            {typeof alert.value === 'number' && typeof alert.threshold === 'number' && <span>Deviation: {((alert.value - alert.threshold) * 100).toFixed(1)}%</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16">
                            <div className="flex flex-col items-center justify-center gap-2">
                                <CheckCircle2 className="w-12 h-12 text-emerald-300" />
                                <p className="text-slate-400">All projects are currently within configured thresholds.</p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}