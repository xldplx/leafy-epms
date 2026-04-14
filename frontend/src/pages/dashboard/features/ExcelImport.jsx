import { useState, useRef } from 'react';
import { Upload, CheckCircle2, AlertTriangle, FileSpreadsheet, X, ArrowRight, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { projectsApi, tasksApi } from '../../../utils/api';
import { INPUT_CLASS } from '../../../utils/uiConstants';

const TASK_FIELDS = [
    { key: 'task_name',     label: 'Task Name',    required: true,  type: 'string' },
    { key: 'wbs_code',      label: 'WBS Code',     required: true,  type: 'string' },
    { key: 'planned_cost',  label: 'Planned Cost',  required: true,  type: 'number' },
    { key: 'planned_hours', label: 'Planned Hours', required: true,  type: 'number' },
    { key: 'planned_start', label: 'Planned Start', required: false, type: 'date' },
    { key: 'planned_end',   label: 'Planned End',   required: false, type: 'date' },
    { key: 'weight',        label: 'Weight (0–1)',  required: false, type: 'weight' },
];

function autoDetectMapping(headers) {
    const mapping = {};
    const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const patterns = {
        task_name:     ['taskname','task','name','activity','description'],
        wbs_code:      ['wbs','wbscode','code'],
        planned_cost:  ['plannedcost','cost','budget','estimatedcost'],
        planned_hours: ['plannedhours','hours','manhours','laborhours'],
        planned_start: ['plannedstart','start','startdate','begin'],
        planned_end:   ['plannedend','end','enddate','finish'],
        weight:        ['weight','weighting','proportion'],
    };
    headers.forEach((header, index) => {
        const norm = normalize(header);
        for (const [field, keywords] of Object.entries(patterns)) {
            if (!mapping[field] && keywords.some(kw => norm.includes(kw))) mapping[field] = index;
        }
    });
    return mapping;
}

function validateRow(row, mapping) {
    const errors = [];
    const get = field => { const idx = mapping[field]; return idx !== undefined && idx !== '' ? row[idx] : undefined; };
    if (!get('task_name')?.toString().trim()) errors.push('Task Name is required');
    if (!get('wbs_code')?.toString().trim()) errors.push('WBS Code is required');
    const cost = parseFloat(get('planned_cost'));
    if (isNaN(cost) || cost <= 0) errors.push('Planned Cost must be > 0');
    const hours = parseFloat(get('planned_hours'));
    if (isNaN(hours) || hours <= 0) errors.push('Planned Hours must be > 0');
    const weight = get('weight');
    if (weight !== undefined && weight !== '' && weight !== null) {
        const w = parseFloat(weight);
        if (isNaN(w) || w < 0 || w > 1) errors.push('Weight must be 0–1');
    }
    return errors;
}

function parseTask(row, mapping) {
    const get = field => { const idx = mapping[field]; return idx !== undefined && idx !== '' ? row[idx] : undefined; };
    return {
        task_name:     get('task_name')?.toString().trim() || '',
        wbs_code:      get('wbs_code')?.toString().trim() || '',
        planned_cost:  parseFloat(get('planned_cost')) || 0,
        planned_hours: parseFloat(get('planned_hours')) || 0,
        planned_start: get('planned_start')?.toString() || '',
        planned_end:   get('planned_end')?.toString() || '',
        weight:        parseFloat(get('weight')) || 0,
    };
}

export default function ExcelImport() {
    const userRole = localStorage.getItem('userRole');
    const canImport = ['Project Manager', 'Planner'].includes(userRole);

    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [fileName, setFileName] = useState('');
    const [headers, setHeaders] = useState([]);
    const [dataRows, setDataRows] = useState([]);
    const [mapping, setMapping] = useState({});
    const [step, setStep] = useState('upload');
    const [validationResults, setValidationResults] = useState([]);
    const [importedCount, setImportedCount] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importError, setImportError] = useState('');
    const fileInputRef = useRef(null);

    // Fetch projects on mount
    useState(() => {
        projectsApi.getAll().then(res => setProjects(res.data || [])).catch(console.error);
    }, []);

    const handleFile = (file) => {
        if (!file) return;
        if (!file.name.match(/\.xlsx?$/i)) { alert('Please upload an .xlsx or .xls file.'); return; }
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, { type: 'array' });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            if (raw.length < 2) { alert('Spreadsheet must have at least a header row and one data row.'); return; }
            const hdrs = raw[0].map(h => (h ?? '').toString());
            const rows = raw.slice(1).filter(r => r.some(cell => cell !== undefined && cell !== ''));
            setHeaders(hdrs);
            setDataRows(rows);
            setMapping(autoDetectMapping(hdrs));
            setStep('mapping');
        };
        reader.readAsArrayBuffer(file);
    };

    const handleValidate = () => {
        const results = dataRows.map((row, idx) => ({ rowIndex: idx, errors: validateRow(row, mapping), data: row }));
        setValidationResults(results);
        setStep('validation');
    };

    const validRows = validationResults.filter(r => r.errors.length === 0);
    const invalidRows = validationResults.filter(r => r.errors.length > 0);

    const handleDownloadTemplate = () => {
        const wb = XLSX.utils.book_new();
        const templateData = [
            { 'Task Name': 'Excavation Works', 'WBS Code': '1.1.1', 'Planned Cost': 250000000, 'Planned Hours': 160, 'Planned Start': '2026-04-01', 'Planned End': '2026-04-30', 'Weight': 0.15 },
            { 'Task Name': 'Concrete Pouring', 'WBS Code': '1.1.2', 'Planned Cost': 180000000, 'Planned Hours': 120, 'Planned Start': '2026-05-01', 'Planned End': '2026-05-20', 'Weight': 0.10 },
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        XLSX.utils.book_append_sheet(wb, ws, 'Task Import Template');
        XLSX.writeFile(wb, 'Task_Import_Template.xlsx');
    };

    const handleImport = async () => {
        if (!selectedProjectId) { setImportError('Please select a project first.'); return; }
        setImporting(true);
        setImportError('');
        try {
            const tasks = validRows.map(r => parseTask(r.data, mapping));
            await tasksApi.bulkImport(selectedProjectId, tasks);
            setImportedCount(tasks.length);
            setStep('done');
        } catch (err) {
            setImportError(err.message || 'Import failed.');
        } finally {
            setImporting(false);
        }
    };

    const handleReset = () => {
        setFileName(''); setHeaders([]); setDataRows([]); setMapping({});
        setValidationResults([]); setImportedCount(0); setStep('upload');
        setImportError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (!canImport) {
        return (
            <div className="space-y-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Excel Import</h2>
                    <p className="text-slate-500 mt-1">Upload task data from spreadsheets</p>
                </div>
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 flex flex-col items-center justify-center gap-2">
                    <Upload className="w-12 h-12 text-slate-200" />
                    <p className="text-slate-400">Only Project Managers and Planners can import task data.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Excel Import</h2>
                    <p className="text-slate-500 mt-1">Upload task data from spreadsheets</p>
                </div>
                {step !== 'upload' && step !== 'done' && (
                    <button onClick={handleReset} className="text-sm font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2">
                        <X className="w-4 h-4" /> Start Over
                    </button>
                )}
            </div>

            {/* STEP INDICATOR */}
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                {['Upload', 'Map Columns', 'Validate', 'Import'].map((label, i) => {
                    const stepMap = ['upload', 'mapping', 'validation', 'done'];
                    const currentIdx = stepMap.indexOf(step);
                    const isActive = i === currentIdx;
                    const isDone = i < currentIdx;
                    return (
                        <div key={label} className="flex items-center gap-2">
                            {i > 0 && <ArrowRight className="w-3 h-3 text-slate-300" />}
                            <span className={`px-3 py-1.5 rounded-lg border ${isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : isDone ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                {isDone ? '✓' : ''} {label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* PROJECT SELECTOR */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-5">Target Project</h3>
                <div className="max-w-md space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Project</label>
                    <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className={INPUT_CLASS}>
                        <option value="">Select a project...</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>)}
                    </select>
                </div>
            </div>

            {/* IMPORT ERROR */}
            {importError && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold">❌ {importError}</div>
            )}

            {/* STEP 1: UPLOAD */}
            {step === 'upload' && (
                <div onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={e => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`bg-white rounded-3xl border-2 border-dashed p-16 text-center cursor-pointer transition-all duration-200 ${isDragging ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}`}>
                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={e => handleFile(e.target.files[0])} className="hidden" />
                    <div className="flex flex-col items-center gap-3">
                        <div className={`p-4 rounded-2xl transition-colors ${isDragging ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                            <Upload className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-700">Drop your Excel file here, or click to browse</p>
                            <p className="text-xs text-slate-400 mt-1">Accepts .xlsx and .xls files</p>
                        </div>
                        <button onClick={e => { e.stopPropagation(); handleDownloadTemplate(); }}
                            className="mt-2 text-xs font-semibold text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-200 flex items-center gap-1.5 hover:bg-slate-50 hover:text-slate-700">
                            <Download className="w-3.5 h-3.5" /> Download Template
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2: MAPPING */}
            {step === 'mapping' && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600"><FileSpreadsheet className="w-5 h-5" /></div>
                            <div>
                                <h3 className="font-bold text-slate-700">Column Mapping</h3>
                                <p className="text-xs text-slate-400 mt-0.5">{fileName} — {dataRows.length} data rows detected</p>
                            </div>
                        </div>
                        <button onClick={handleValidate}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-emerald-200 transition-all flex items-center gap-2">
                            Validate <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {TASK_FIELDS.map(field => (
                                <div key={field.key} className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                                        {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
                                    </label>
                                    <select value={mapping[field.key] ?? ''}
                                        onChange={e => setMapping({ ...mapping, [field.key]: e.target.value === '' ? '' : parseInt(e.target.value) })}
                                        className={INPUT_CLASS}>
                                        <option value="">— Skip —</option>
                                        {headers.map((h, i) => <option key={i} value={i}>Col {i + 1}: {h}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 3: VALIDATION */}
            {step === 'validation' && (
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold">
                            <CheckCircle2 className="w-4 h-4" /> {validRows.length} valid rows
                        </div>
                        {invalidRows.length > 0 && (
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm font-semibold">
                                <AlertTriangle className="w-4 h-4" /> {invalidRows.length} rows with errors
                            </div>
                        )}
                    </div>
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between gap-4">
                            <div>
                                <h3 className="font-bold text-slate-700">Validation Results</h3>
                                <p className="text-xs text-slate-400 mt-0.5">{validRows.length} of {validationResults.length} rows ready to import</p>
                            </div>
                            <button onClick={handleImport}
                                disabled={validRows.length === 0 || !selectedProjectId || importing}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none">
                                <Upload className="w-4 h-4" /> {importing ? 'Importing...' : `Import ${validRows.length} Tasks`}
                            </button>
                        </div>
                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0">
                                    <tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                        <th className="px-4 py-3">Row</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Task Name</th>
                                        <th className="px-4 py-3">WBS</th>
                                        <th className="px-4 py-3">Details / Errors</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                                    {validationResults.map(r => {
                                        const isValid = r.errors.length === 0;
                                        return (
                                            <tr key={r.rowIndex} className={`${isValid ? 'hover:bg-slate-50/50' : 'bg-red-50/30'} transition-colors`}>
                                                <td className="px-4 py-3 text-slate-400">{r.rowIndex + 1}</td>
                                                <td className="px-4 py-3">{isValid ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />}</td>
                                                <td className="px-4 py-3 font-semibold text-slate-700">{mapping.task_name !== undefined ? r.data[mapping.task_name] || '—' : '—'}</td>
                                                <td className="px-4 py-3 font-mono text-xs text-slate-400">{mapping.wbs_code !== undefined ? r.data[mapping.wbs_code] || '—' : '—'}</td>
                                                <td className="px-4 py-3">
                                                    {isValid ? <span className="text-emerald-600 text-xs">Ready to import</span>
                                                        : <div className="space-y-0.5">{r.errors.map((e, i) => <p key={i} className="text-red-600 text-xs">{e}</p>)}</div>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 4: DONE */}
            {step === 'done' && (
                <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-12">
                    <div className="flex flex-col items-center justify-center gap-4">
                        <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600"><CheckCircle2 className="w-10 h-10" /></div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-slate-800">Import Complete</h3>
                            <p className="text-slate-500 mt-1">Successfully imported <strong className="text-emerald-700">{importedCount} tasks</strong> from {fileName}</p>
                        </div>
                        <button onClick={handleReset} className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-emerald-200 transition-all">
                            Import Another File
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}