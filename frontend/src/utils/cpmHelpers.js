/**
 * Critical Path Method (CPM) and S-Curve calculation helpers.
 */

/**
 * Calculates CPM metrics (ES, EF, LS, LF, Float) for a set of tasks.
 * @param {Array} tasks - Array of task objects with id, duration, and predecessors.
 * @returns {Array} - Tasks with added CPM metrics.
 */
export function calculateCPM(tasks) {
    if (!tasks || tasks.length === 0) return [];

    // 1. Initialize metrics
    const taskMap = {};
    tasks.forEach(t => {
        taskMap[t.id] = {
            ...t,
            duration: t.planned_duration || 0,
            predecessors: t.predecessors || [],
            successors: [],
            es: 0,
            ef: 0,
            ls: 0,
            lf: 0,
            float: 0
        };
    });

    // 2. Build successors
    Object.values(taskMap).forEach(t => {
        t.predecessors.forEach(predId => {
            if (taskMap[predId]) {
                taskMap[predId].successors.push(t.id);
            }
        });
    });

    const taskList = Object.values(taskMap);

    // 3. Forward Pass (ES, EF)
    // We need to process tasks in topological order or iteratively
    let changed = true;
    while (changed) {
        changed = false;
        taskList.forEach(t => {
            let maxEF = 0;
            t.predecessors.forEach(predId => {
                if (taskMap[predId]) {
                    maxEF = Math.max(maxEF, taskMap[predId].ef);
                }
            });
            const newES = maxEF;
            const newEF = newES + t.duration;
            if (newES !== t.es || newEF !== t.ef) {
                t.es = newES;
                t.ef = newEF;
                changed = true;
            }
        });
    }

    // 4. Backward Pass (LS, LF)
    const maxProjectEF = Math.max(...taskList.map(t => t.ef));
    taskList.forEach(t => {
        t.lf = maxProjectEF;
        t.ls = t.lf - t.duration;
    });

    changed = true;
    while (changed) {
        changed = false;
        taskList.forEach(t => {
            if (t.successors.length > 0) {
                let minLS = maxProjectEF;
                t.successors.forEach(succId => {
                    if (taskMap[succId]) {
                        minLS = Math.min(minLS, taskMap[succId].ls);
                    }
                });
                const newLF = minLS;
                const newLS = newLF - t.duration;
                if (newLF !== t.lf || newLS !== t.ls) {
                    t.lf = newLF;
                    t.ls = newLS;
                    changed = true;
                }
            }
        });
    }

    // 5. Calculate Float and Critical Path
    taskList.forEach(t => {
        t.float = t.lf - t.ef;
        t.isCritical = t.float === 0;
    });

    return taskList;
}

/**
 * Generates S-Curve data (cumulative PV, EV, AC) over time.
 * @param {Array} tasks - Tasks with planned/actual costs and dates.
 * @param {string} startDate - Project start date.
 * @param {string} endDate - Project end date.
 * @returns {Array} - Data points for Recharts.
 */
export function generateSCurveData(tasks, startDate, endDate) {
    if (!tasks || tasks.length === 0) return [];

    const start = new Date(startDate);
    const end = new Date(endDate);
    const dayDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    // Create daily buckets
    const days = [];
    for (let i = 0; i <= dayDiff; i++) {
        const current = new Date(start);
        current.setDate(start.getDate() + i);
        days.push({
            date: current.toISOString().split('T')[0],
            pv: 0,
            ev: 0,
            ac: 0
        });
    }

    tasks.forEach(task => {
        const taskStart = new Date(task.planned_start);
        const taskEnd = new Date(task.planned_end);
        const taskDuration = Math.max(1, Math.ceil((taskEnd - taskStart) / (1000 * 60 * 60 * 24)));
        
        const dailyPV = (task.planned_cost || 0) / taskDuration;
        const dailyEV = ((task.planned_cost || 0) * (task.pct_complete / 100)) / taskDuration;
        const dailyAC = (task.actual_cost || 0) / taskDuration;

        days.forEach(day => {
            const dayDate = new Date(day.date);
            if (dayDate >= taskStart && dayDate <= taskEnd) {
                day.pv += dailyPV;
                day.ev += dailyEV;
                day.ac += dailyAC;
            }
        });
    });

    // Cumulative sum
    let cumPV = 0, cumEV = 0, cumAC = 0;
    return days.map(day => {
        cumPV += day.pv;
        cumEV += day.ev;
        cumAC += day.ac;
        return {
            ...day,
            PV: Math.round(cumPV),
            EV: Math.round(cumEV),
            AC: Math.round(cumAC)
        };
    });
}
