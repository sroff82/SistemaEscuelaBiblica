var { useState } = React;

function SecretariaDashboard({
    todosLosAlumnos, datosGlobalesAsistencia, historialAsistencias, maestros,
    fondoTotal, fondoVoluntarioTotal,
    fondoSecretariaTotal, fondoSecretariaVoluntarioTotal, historialSecretaria,
    onGuardarIngresoSecretaria, onGuardarEgresoSecretaria
}) {
    const [vistaActual, setVistaActual] = useState('inicio'); 
    const [fondoActivo, setFondoActivo] = useState('general'); 
    const [tipoTransaccion, setTipoTransaccion] = useState('ingreso'); 
    const [monto, setMonto] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [cargando, setLoading] = useState(false);
    const [mesAuditoriaExp, setMesAuditoriaExp] = useState(null);
    const [semanaAuditoriaExp, setSemanaAuditoriaExp] = useState(null);
    const [detalleMovExp, setDetalleMovExp] = useState(null);
    const [campoExpandido, setCampoExpandido] = useState(null); 
    const [mesCampoExp, setMesCampoExp] = useState(null);
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [filtroCampo, setFiltroCampo] = useState('TODOS');
    const [mesRepExpandido, setMesRepExpandido] = useState(null); 
    const [semanaRepExpandido, setSemanaRepExpandido] = useState(null); 

    const historialVisible = historialAsistencias.filter(h => !h.esReset);
    const todasAsistencias = datosGlobalesAsistencia?.registros || [];

    const formatoFecha = (f) => {
        if (!f) return ''; const p = f.split('-'); if (p.length !== 3) return f;
        return `${p[2]}/${p[1]}/${p[0]}`; 
    };

    const formatFechaDia = (f) => {
        if (!f) return ''; const d = new Date(f + 'T12:00:00'); 
        const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return `${dias[d.getDay()]}, ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
    };

    const mesesNombresCompletos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    const getWeekOfMonth = (year, month, day) => {
        const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); 
        return Math.ceil((day + firstDayOfMonth) / 7);
    };

    const textoFechas = datosGlobalesAsistencia?.rango ? `${formatoFecha(datosGlobalesAsistencia.rango.inicio).substring(0,5)} - ${formatoFecha(datosGlobalesAsistencia.rango.fin).substring(0,5)}` : 'Calculando...';
    const camposActivos = [...new Set([...maestros.filter(m => m.clase !== 'LOGISTICA' && m.campo).map(m => m.campo), ...todosLosAlumnos.map(a => a.campo), ...historialVisible.map(h => h.campo)].filter(Boolean))].sort();

    let tp = 0, ta = 0, tperm = 0, totalOfrendaSemana = 0; 
    todasAsistencias.forEach(r => { 
        if(r.totales){ tp+=r.totales.presentes; ta+=r.totales.ausentes; tperm+=r.totales.permisos; } 
        if(r.ofrenda) totalOfrendaSemana += Number(r.ofrenda);
    });

    const handleSubmitAuditoria = async (e) => {
        e.preventDefault();
        setLoading(true);
        let exito = false;
        
        if (tipoTransaccion === 'ingreso') exito = await onGuardarIngresoSecretaria(monto, descripcion, fondoActivo);
        else exito = await onGuardarEgresoSecretaria(monto, descripcion, fondoActivo);

        if (exito) {
            setMonto(''); setDescripcion('');
            const hoy = new Date();
            const mesKey = `${hoy.getFullYear()}-${(hoy.getMonth()+1).toString().padStart(2, '0')}`;
            setMesAuditoriaExp(mesKey);
            setSemanaAuditoriaExp(null);
            setDetalleMovExp(null);
        }
        setLoading(false);
    };

    const historialFiltradoPorFondo = (historialSecretaria || []).filter(h => {
        if (fondoActivo === 'general') return h.fondo === 'general' || !h.fondo;
        return h.fondo === 'voluntario';
    });

    const agruparFinanzas = (data) => {
        if (!data) return [];
        const grupos = {};
        data.forEach(h => {
            const p = (h.fecha || '').split('-');
            if(p.length === 3) {
                const y = parseInt(p[0]); const m = parseInt(p[1]); const d = parseInt(p[2]);
                const mesKey = `${y}-${p[1]}`;
                const mesLabel = `${mesesNombresCompletos[m-1]} ${y}`;
                const semKey = `Semana ${getWeekOfMonth(y, m, d)}`;

                if(!grupos[mesKey]) grupos[mesKey] = { mesLabel, totalIngreso: 0, totalEgreso: 0, semanas: {} };
                if(h.tipo === 'ingreso') grupos[mesKey].totalIngreso += Number(h.monto) || 0;
                if(h.tipo === 'egreso') grupos[mesKey].totalEgreso += Number(h.monto) || 0;

                if(!grupos[mesKey].semanas[semKey]) grupos[mesKey].semanas[semKey] = { label: semKey, totalIngreso: 0, totalEgreso: 0, registros: [] };
                if(h.tipo === 'ingreso') grupos[mesKey].semanas[semKey].totalIngreso += Number(h.monto) || 0;
                if(h.tipo === 'egreso') grupos[mesKey].semanas[semKey].totalEgreso += Number(h.monto) || 0;
                
                grupos[mesKey].semanas[semKey].registros.push(h);
            }
        });
        return Object.keys(grupos).sort((a,b) => b.localeCompare(a)).map(k => {
            const semanasArray = Object.keys(grupos[k].semanas).sort().map(sk => ({ id: sk, ...grupos[k].semanas[sk] }));
            return { id: k, ...grupos[k], semanasArray };
        });
    };
    
    const gruposMesesAuditoria = agruparFinanzas(historialFiltradoPorFondo);
    const saldoTesoreroActual = fondoActivo === 'general' ? fondoTotal : (fondoVoluntarioTotal || 0);
    const saldoSecretariaActual = fondoActivo === 'general' ? fondoSecretariaTotal : (fondoSecretariaVoluntarioTotal || 0);
    const diferencia = saldoTesoreroActual - saldoSecretariaActual;

    const agruparAsistenciaPorMes = (historial) => {
        if (!historial) return [];
        const grupos = {};
        historial.forEach(h => {
            const p = (h.fecha || '').split('-');
            if(p.length === 3) {
                const y = parseInt(p[0]); const m = parseInt(p[1]);
                const mesKey = `${y}-${p[1]}`; 
                const mesLabel = `${mesesNombresCompletos[m-1]} ${y}`;
                if(!grupos[mesKey]) grupos[mesKey] = { mesLabel, tp: 0, ta: 0, tperm: 0, registros: [] };
                grupos[mesKey].tp += (h.totales?.presentes || 0);
                grupos[mesKey].ta += (h.totales?.ausentes || 0);
                grupos[mesKey].tperm += (h.totales?.permisos || 0);
                grupos[mesKey].registros.push(h);
            }
        });
        return Object.keys(grupos).sort((a,b) => b.localeCompare(a)).map(k => {
            grupos[k].registros.sort((x, y) => new Date(y.fecha) - new Date(x.fecha));
            return { id: k, ...grupos[k] };
        });
    };

    const registrosFiltrados = historialVisible.filter(h => {
        if (fechaDesde && h.fecha < fechaDesde) return false;
        if (fechaHasta && h.fecha > fechaHasta) return false;
        if (filtroCampo !== 'TODOS' && h.campo !== filtroCampo) return false;
        return true;
    });

    let ofrendaPeriodo = 0, presentesPeriodo = 0, ausentesPeriodo = 0, permisosPeriodo = 0;
    const agruparReportesPorMesYSemana = (historial) => {
        if (!historial) return [];
        const grupos = {};
        historial.forEach(h => {
            const ofr = Number(h.ofrenda || 0);
            ofrendaPeriodo += ofr;
            presentesPeriodo += h.totales?.presentes || 0;
            ausentesPeriodo += h.totales?.ausentes || 0;
            permisosPeriodo += h.totales?.permisos || 0;

            if (filtroCampo === 'TODOS') {
                const parts = (h.fecha || '').split('-');
                if(parts.length === 3) {
                    const y = parseInt(parts[0]); const m = parseInt(parts[1]); const d = parseInt(parts[2]);
                    const mesKey = `${y}-${parts[1]}`;
                    const mesLabel = `${mesesNombresCompletos[m-1]} ${y}`;
                    const semKey = `Semana ${getWeekOfMonth(y, m, d)}`;

                    if (!grupos[mesKey]) grupos[mesKey] = { mesLabel, totalOfrenda: 0, semanas: {} };
                    grupos[mesKey].totalOfrenda += ofr;

                    if (!grupos[mesKey].semanas[semKey]) grupos[mesKey].semanas[semKey] = { label: semKey, totalOfrenda: 0, campos: {} };
                    grupos[mesKey].semanas[semKey].totalOfrenda += ofr;
                    if (!grupos[mesKey].semanas[semKey].campos[h.campo]) grupos[mesKey].semanas[semKey].campos[h.campo] = { ofrenda: 0, clases: 0 };
                    grupos[mesKey].semanas[semKey].campos[h.campo].ofrenda += ofr;
                }
            }
        });
        return Object.keys(grupos).sort((a,b) => b.localeCompare(a)).map(k => {
            const semanasArray = Object.keys(grupos[k].semanas).sort().map(sk => ({ id: sk, ...grupos[k].semanas[sk] }));
            return { id: k, ...grupos[k], semanasArray };
        });
    };
    const gruposMesesReportes = agruparReportesPorMesYSemana(registrosFiltrados);

    const NavButton = ({ id, icon, label }) => (
        <button onClick={() => setVistaActual(id)} className={`flex flex-col items-center justify-center w-[75px] h-14 rounded-2xl transition-all ${vistaActual === id ? 'text-pink-600 bg-pink-50 font-black' : 'text-slate-400 font-bold'}`}>
            <i className={`fas ${icon} text-xl mb-1`}></i><span className="text-[9px] tracking-wide">{label}</span>
        </button>
    );

    const colorTemaSecretaria = fondoActivo === 'voluntario' ? 'teal' : 'pink';

    let contenido;

    if (vistaActual === 'inicio') {
        contenido = (
            <div className="space-y-4 animate-in fade-in duration-300 pt-2 pb-24">
                <div className="bg-emerald-500 p-6 rounded-[32px] text-white shadow-xl flex justify-between items-center mx-1 mt-2">
                    <div>
                        <p className="text-xs font-bold uppercase opacity-90 mb-1">Ofrenda Total (Semana)</p>
                        <p className="text-5xl font-black">${totalOfrendaSemana.toFixed(2)}</p>
                    </div>
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl"><i className="fas fa-hand-holding-usd"></i></div>
                </div>
                <div className="bg-white rounded-[32px] border p-6 shadow-sm mx-1">
                    <div className="flex justify-between mb-4">
                        <h3 className="font-bold text-slate-700 text-sm">Asistencia Global</h3>
                        <span className="text-[10px] font-bold px-3 py-1 rounded-lg border">{textoFechas}</span>
                    </div>
                    <div className="flex justify-around text-center">
                        <div><p className="text-3xl font-black text-emerald-500">{tp}</p><p className="text-[9px] font-bold text-slate-400 uppercase">Presentes</p></div>
                        <div><p className="text-3xl font-black text-rose-500">{ta}</p><p className="text-[9px] font-bold text-slate-400 uppercase">Ausentes</p></div>
                    </div>
                </div>
            </div>
        );
    } else if (vistaActual === 'auditoria') {
        contenido = (
            <div className="space-y-4 animate-in slide-in-from-right duration-300 pt-2 pb-24">
                <div className="flex bg-slate-200 p-1.5 rounded-2xl mx-1 shadow-inner">
                    <button onClick={() => setFondoActivo('general')} className={`flex-1 py-3.5 rounded-xl font-black text-xs uppercase ${fondoActivo === 'general' ? 'bg-white text-pink-600' : 'text-slate-50'}`}>Fondo General</button>
                    <button onClick={() => setFondoActivo('voluntario')} className={`flex-1 py-3.5 rounded-xl font-black text-xs uppercase ${fondoActivo === 'voluntario' ? 'bg-white text-teal-600' : 'text-slate-50'}`}>Voluntario</button>
                </div>
                <div className="bg-slate-800 p-6 rounded-[32px] text-white shadow-xl mx-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div><p className="text-[9px] text-slate-400 font-bold uppercase">Secretaría</p><p className="text-2xl font-black">${saldoSecretariaActual.toFixed(2)}</p></div>
                        <div><p className="text-[9px] text-slate-400 font-bold uppercase">Tesorería</p><p className="text-2xl font-black">${saldoTesoreroActual.toFixed(2)}</p></div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-[24px] border shadow-sm mx-1">
                    <form onSubmit={handleSubmitAuditoria} className="space-y-3">
                        <div className="flex space-x-2">
                            <input type="number" step="0.01" required value={monto} onChange={(e)=>setMonto(e.target.value)} placeholder="Monto" className="w-1/3 p-3 bg-slate-50 rounded-xl font-black" />
                            <input type="text" required value={descripcion} onChange={(e)=>setDescripcion(e.target.value)} placeholder="Concepto" className="w-2/3 p-3 bg-slate-50 rounded-xl text-xs" />
                        </div>
                        <button type="submit" className="w-full py-3 bg-slate-800 text-white font-black rounded-xl">Guardar en mi registro</button>
                    </form>
                </div>
            </div>
        );
    } else if (vistaActual === 'campos') {
        contenido = (
            <div className="space-y-4 pt-2 pb-24 px-1">
                {camposActivos.map(campo => {
                    const registrosCampoTodo = historialVisible.filter(h => h.campo === campo);
                    const isExpanded = campoExpandido === campo;
                    return (
                        <div key={campo} className="bg-white p-5 rounded-[24px] border shadow-sm">
                            <div className="flex justify-between items-center">
                                <span className="font-black text-slate-700 text-lg">{campo}</span>
                                <button onClick={() => setCampoExpandido(isExpanded ? null : campo)} className="w-10 h-10 bg-slate-50 rounded-xl"><i className="fas fa-chevron-down"></i></button>
                            </div>
                            {isExpanded && (
                                <div className="mt-4 p-2 bg-slate-50 rounded-xl max-h-40 overflow-y-auto text-xs space-y-1">
                                    {registrosCampoTodo.map((r, idx) => (
                                        <div key={idx} className="flex justify-between bg-white p-2 rounded border">
                                            <span>{formatFechaDia(r.fecha)}</span>
                                            <span className="font-black text-emerald-600">${r.ofrenda.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    } else if (vistaActual === 'reportes') {
        contenido = (
            <div className="space-y-4 pt-2 pb-24">
                <div className="bg-white p-4 rounded-[24px] mx-1 border shadow-sm flex flex-col space-y-3">
                    <select className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold" value={filtroCampo} onChange={e=>setFiltroCampo(e.target.value)}>
                        <option value="TODOS">Todos los campos (Global)</option>
                        {camposActivos.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="bg-slate-800 p-5 rounded-[24px] text-white mx-1 flex justify-between">
                    <div><p className="text-[10px] opacity-70">Recaudación Período</p><p className="text-4xl font-black text-emerald-400">${ofrendaPeriodo.toFixed(2)}</p></div>
                </div>
            </div>
        );
    }

    return (
        <>
            {contenido}
            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md border-t border-slate-100 flex justify-around items-center p-2 z-50 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <NavButton id="inicio" icon="fa-chart-pie" label="Resumen" />
                <NavButton id="campos" icon="fa-map-marked-alt" label="Monitoreo" />
                <NavButton id="auditoria" icon="fa-balance-scale" label="Auditoría" />
                <NavButton id="reportes" icon="fa-filter" label="Reportes" />
            </div>
        </>
    );
}

window.SecretariaDashboard = SecretariaDashboard;
