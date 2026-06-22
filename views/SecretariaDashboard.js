var { useState } = React;

function SecretariaDashboard({
    todosLosAlumnos, datosGlobalesAsistencia, historialAsistencias, maestros,
    fondoTotal, fondoVoluntarioTotal, // Fondos del Tesorero
    fondoSecretariaTotal, fondoSecretariaVoluntarioTotal, historialSecretaria, // Fondos del Secretario
    onGuardarIngresoSecretaria, onGuardarEgresoSecretaria
}) {
    const [vistaActual, setVistaActual] = useState('inicio'); 
    
    // ESTADOS PARA AUDITORÍA (DOBLE ACORDEÓN + CONTROL CRUZADO)
    const [fondoActivo, setFondoActivo] = useState('general'); // <-- NUEVO SELECTOR DE FONDO
    const [tipoTransaccion, setTipoTransaccion] = useState('ingreso'); 
    const [monto, setMonto] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [cargando, setLoading] = useState(false);
    const [mesAuditoriaExp, setMesAuditoriaExp] = useState(null);
    const [semanaAuditoriaExp, setSemanaAuditoriaExp] = useState(null);
    const [detalleMovExp, setDetalleMovExp] = useState(null);

    // ESTADOS PARA MONITOREO DE CAMPOS
    const [campoExpandido, setCampoExpandido] = useState(null); 
    const [mesCampoExp, setMesCampoExp] = useState(null);

    // ESTADOS PARA REPORTES
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

    // 1. Cálculos de la Pestaña INICIO
    let tp = 0, ta = 0, tperm = 0, totalOfrendaSemana = 0; 
    todasAsistencias.forEach(r => { 
        if(r.totales){ tp+=r.totales.presentes; ta+=r.totales.ausentes; tperm+=r.totales.permisos; } 
        if(r.ofrenda) totalOfrendaSemana += Number(r.ofrenda);
    });

    // 2. Lógica de la Pestaña AUDITORÍA
    const handleSubmitAuditoria = async (e) => {
        e.preventDefault();
        setLoading(true);
        let exito = false;
        
        // Pasamos el fondoActivo para que se guarde en la colección correcta
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

    // FILTRAMOS EL HISTORIAL SECRETARIAL SEGÚN EL FONDO SELECCIONADO
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

    // CÁLCULO DEL CONTROL CRUZADO DINÁMICO
    const saldoTesoreroActual = fondoActivo === 'general' ? fondoTotal : (fondoVoluntarioTotal || 0);
    const saldoSecretariaActual = fondoActivo === 'general' ? fondoSecretariaTotal : (fondoSecretariaVoluntarioTotal || 0);
    const diferencia = saldoTesoreroActual - saldoSecretariaActual;

    // 3. Lógica de la Pestaña MONITOREO
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

    // 4. Lógica de la Pestaña REPORTES
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
            const p = h.totales?.presentes || 0;
            const a = h.totales?.ausentes || 0;
            const per = h.totales?.permisos || 0;

            ofrendaPeriodo += ofr; presentesPeriodo += p; ausentesPeriodo += a; permisosPeriodo += per;

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

                    if (!grupos[mesKey].semanas[semKey].campos[h.campo]) {
                        grupos[mesKey].semanas[semKey].campos[h.campo] = { ofrenda: 0, clases: 0 };
                    }
                    grupos[mesKey].semanas[semKey].campos[h.campo].ofrenda += ofr;
                    grupos[mesKey].semanas[semKey].campos[h.campo].clases += 1;
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
        <button onClick={() => setVistaActual(id)} className={`flex flex-col items-center justify-center w-[75px] h-14 rounded-2xl transition-all ${vistaActual === id ? 'text-pink-600 bg-pink-50 font-black' : 'text-slate-400 hover:text-slate-600 font-bold'}`}>
            <i className={`fas ${icon} text-xl mb-1 ${vistaActual === id ? 'animate-bounce' : ''}`}></i><span className="text-[9px] tracking-wide">{label}</span>
        </button>
    );

    let contenido;

    if (vistaActual === 'inicio') {
        contenido = (
            <div className="space-y-4 animate-in fade-in duration-300 pt-2 pb-24">
                <div className="bg-emerald-500 p-6 rounded-[32px] text-white shadow-xl shadow-emerald-200 flex justify-between items-center relative overflow-hidden mx-1 mt-2">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-bl-[100px] pointer-events-none"></div>
                    <div className="relative z-10">
                        <p className="text-xs font-bold uppercase opacity-90 tracking-widest mb-1">Ofrenda Total (Semana)</p>
                        <p className="text-5xl font-black tracking-tighter">${totalOfrendaSemana.toFixed(2)}</p>
                    </div>
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm relative z-10">
                        <i className="fas fa-hand-holding-usd"></i>
                    </div>
                </div>

                <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm mx-1">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="font-bold text-slate-700 text-sm flex items-center"><i className="fas fa-globe text-pink-500 mr-2"></i> Asistencia Global</h3>
                            <p className="text-[10px] text-slate-400 pl-6">Todos los campos</p>
                        </div>
                        <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-3 py-1 rounded-lg border border-slate-200">{textoFechas}</span>
                    </div>
                    <div className="flex justify-around text-center divide-x divide-slate-50">
                        <div className="px-2"><p className="text-3xl font-black text-emerald-500">{tp}</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1">Presentes</p></div>
                        <div className="px-2"><p className="text-3xl font-black text-rose-500">{ta}</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1">Ausentes</p></div>
                        <div className="px-2"><p className="text-3xl font-black text-amber-500">{tperm}</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1">Permisos</p></div>
                    </div>
                </div>
            </div>
        );
    }

    if (vistaActual === 'auditoria') {
        const colorTemaSecretaria = fondoActivo === 'voluntario' ? 'teal' : 'pink';

        contenido = (
            <div className="space-y-4 animate-in slide-in-from-right duration-300 pt-2 pb-24">
                
                {/* NUEVO SELECTOR DE FONDO */}
                <div className="flex bg-slate-200 p-1.5 rounded-2xl mx-1 shadow-inner">
                    <button onClick={() => {setFondoActivo('general'); setMesAuditoriaExp(null);}} className={`flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${fondoActivo === 'general' ? 'bg-white text-pink-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Fondo General</button>
                    <button onClick={() => {setFondoActivo('voluntario'); setMesAuditoriaExp(null);}} className={`flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${fondoActivo === 'voluntario' ? 'bg-white text-teal-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Voluntario Campos</button>
                </div>

                <div className="px-2 mb-2 mt-4">
                    <h2 className="text-2xl font-black text-slate-800">Control Cruzado</h2>
                    <p className="text-slate-400 text-xs mt-1">Auditando el <strong className={`uppercase text-${colorTemaSecretaria}-500`}>{fondoActivo}</strong></p>
                </div>

                <div className="bg-slate-800 p-6 rounded-[32px] text-white shadow-xl mx-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-bl-[100px] pointer-events-none"></div>
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <div className="border-r border-slate-700">
                            <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-1">Mi Control (Secretaría)</p>
                            <p className={`text-2xl font-black text-${colorTemaSecretaria}-400`}>${Number(saldoSecretariaActual || 0).toFixed(2)}</p>
                        </div>
                        <div className="pl-2">
                            <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-1">Reporte Tesorería</p>
                            <p className={`text-2xl font-black ${fondoActivo === 'voluntario' ? 'text-emerald-400' : 'text-sky-400'}`}>${Number(saldoTesoreroActual || 0).toFixed(2)}</p>
                        </div>
                    </div>
                    
                    <div className={`mt-5 p-4 rounded-2xl flex items-center justify-between border ${diferencia === 0 ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/20 border-rose-500/30 text-rose-400'}`}>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest">Estado de Cuentas</p>
                            <p className="text-sm font-black">{diferencia === 0 ? 'Cuadre Perfecto' : 'Descuadre Detectado'}</p>
                        </div>
                        {diferencia !== 0 && (
                            <div className="text-right">
                                <p className="text-xl font-black">
                                    {diferencia > 0 ? '+' : '-'}${Math.abs(diferencia).toFixed(2)}
                                </p>
                            </div>
                        )}
                    </div>
                    {diferencia !== 0 && (
                        <p className="text-[9px] text-slate-400 mt-2 text-center italic">
                            {diferencia > 0 ? "Tesorería reporta MÁS fondos de los que tú has registrado." : "Tesorería reporta MENOS fondos de los que tú has registrado."}
                        </p>
                    )}
                </div>

                <div className={`bg-white p-5 rounded-[24px] border border-${colorTemaSecretaria}-100 shadow-sm mx-1 mt-4`}>
                    <h3 className="font-bold text-slate-700 text-sm mb-4">Añadir a mi Control Interno</h3>
                    <div className="flex bg-slate-100 p-1 rounded-2xl mb-4">
                        <button onClick={() => setTipoTransaccion('ingreso')} className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all shadow-sm ${tipoTransaccion === 'ingreso' ? `bg-white text-emerald-600 border border-slate-200` : 'text-slate-400 hover:text-slate-600'}`}>
                            + Ingreso
                        </button>
                        <button onClick={() => setTipoTransaccion('egreso')} className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all shadow-sm ${tipoTransaccion === 'egreso' ? 'bg-white text-rose-600 border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                            - Retiro
                        </button>
                    </div>

                    <form onSubmit={handleSubmitAuditoria} className="space-y-3">
                        <div className="flex space-x-2">
                            <div className="w-1/3 relative">
                                <span className={`absolute left-3 top-3 font-black text-sm ${tipoTransaccion === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'}`}>$</span>
                                <input type="number" step="0.01" min="0.01" required value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" className="w-full py-3 pl-7 pr-2 bg-slate-50 rounded-xl outline-none border border-slate-100 text-sm font-black text-slate-700" />
                            </div>
                            <div className="w-2/3">
                                <input type="text" required value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Concepto..." className="w-full py-3 px-3 bg-slate-50 rounded-xl outline-none border border-slate-100 text-xs font-bold text-slate-700" />
                            </div>
                        </div>
                        <button type="submit" disabled={cargando} className={`w-full py-3 rounded-xl font-black text-white shadow-md transition-all active:scale-95 ${cargando ? 'bg-slate-400' : `bg-slate-800 hover:bg-slate-700`}`}>
                            {cargando ? 'Guardando...' : 'Guardar en mi registro'}
                        </button>
                    </form>
                </div>

                <h3 className="font-bold text-slate-700 text-sm mt-6 px-2 border-b border-slate-100 pb-2">Mi Libro Mayor</h3>
                <div className="space-y-3 px-1">
                    {gruposMesesAuditoria.length === 0 ? (
                        <div className="text-center p-6 bg-slate-50 rounded-2xl mt-2 border border-slate-100">
                            <p className="text-xs font-bold text-slate-400">Aún no has registrado movimientos en este fondo.</p>
                        </div>
                    ) : (
                        gruposMesesAuditoria.map(grupo => {
                            const isExpMes = mesAuditoriaExp === grupo.id;

                            return (
                                <div key={grupo.id} className={`bg-white rounded-[24px] border border-${colorTemaSecretaria}-100 shadow-sm overflow-hidden transition-all duration-300`}>
                                    <button onClick={() => {setMesAuditoriaExp(isExpMes ? null : grupo.id); setSemanaAuditoriaExp(null); setDetalleMovExp(null);}} className="w-full p-4 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                                        <div className="text-left">
                                            <span className="font-bold text-slate-700 text-sm uppercase">{grupo.mesLabel}</span>
                                            <p className="text-[9px] text-slate-400 mt-1 font-bold">{grupo.semanasArray.length} semanas</p>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-[10px] font-bold text-emerald-500">+${grupo.totalIngreso.toFixed(2)}</p>
                                                <p className="text-[10px] font-bold text-rose-500">-${grupo.totalEgreso.toFixed(2)}</p>
                                            </div>
                                            <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors shadow-sm ${isExpMes ? `bg-${colorTemaSecretaria}-500 text-white` : 'bg-slate-50 text-slate-400'}`}>
                                                <i className={`fas fa-chevron-down transition-transform duration-300 ${isExpMes ? 'rotate-180' : ''}`}></i>
                                            </div>
                                        </div>
                                    </button>

                                    {isExpMes && (
                                        <div className="p-3 pt-0 border-t border-slate-100 bg-slate-50 animate-in slide-in-from-top-2 duration-200 space-y-3">
                                            <div className="mt-3 space-y-3">
                                                {grupo.semanasArray.map(sem => {
                                                    const isSemExp = semanaAuditoriaExp === `${grupo.id}-${sem.id}`;
                                                    return (
                                                        <div key={sem.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                                            <button onClick={() => {setSemanaAuditoriaExp(isSemExp ? null : `${grupo.id}-${sem.id}`); setDetalleMovExp(null);}} className="w-full p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                                                <div className="text-left">
                                                                    <p className="font-bold text-slate-700 text-xs">{sem.label}</p>
                                                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">{sem.registros.length} movs</p>
                                                                </div>
                                                                <div className="flex items-center space-x-2 text-[9px] font-black">
                                                                    <div className="flex flex-col items-end mr-1">
                                                                        <span className="text-emerald-500">+${sem.totalIngreso.toFixed(2)}</span>
                                                                        <span className="text-rose-500">-${sem.totalEgreso.toFixed(2)}</span>
                                                                    </div>
                                                                    <i className={`fas fa-chevron-down text-slate-300 transition-transform duration-300 ${isSemExp ? 'rotate-180' : ''}`}></i>
                                                                </div>
                                                            </button>

                                                            {isSemExp && (
                                                                <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
                                                                    {sem.registros.map(mov => {
                                                                        const esIngreso = mov.tipo !== 'egreso';
                                                                        const fechaObj = new Date(mov.timestamp || mov.fecha);
                                                                        const hora = mov.timestamp ? fechaObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
                                                                        const isMovExp = detalleMovExp === mov.id;

                                                                        return (
                                                                            <div key={mov.id} onClick={() => setDetalleMovExp(isMovExp ? null : mov.id)} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm relative overflow-hidden cursor-pointer transition-colors hover:bg-slate-50 group">
                                                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${esIngreso ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                                                                                <div className="flex justify-between items-start">
                                                                                    <div className="pl-2 w-[70%] pr-2">
                                                                                        <p className={`font-bold text-slate-700 text-xs transition-all ${isMovExp ? 'whitespace-normal break-words' : 'truncate'}`}>{mov.descripcion}</p>
                                                                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                                                                                            {formatoFecha(mov.fecha)} {hora && `a las ${hora}`}
                                                                                        </p>
                                                                                    </div>
                                                                                    <div className="text-right w-[30%] flex flex-col items-end">
                                                                                        <span className={`text-xs font-black px-2 py-1 rounded-lg ${esIngreso ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                                                            {esIngreso ? '+' : '-'}${Number(mov.monto).toFixed(2)}
                                                                                        </span>
                                                                                        <i className={`fas fa-chevron-down text-[8px] text-slate-300 mt-2 transition-transform duration-300 ${isMovExp ? 'rotate-180' : ''}`}></i>
                                                                                    </div>
                                                                                </div>
                                                                                
                                                                                {isMovExp && (
                                                                                    <div className="pl-2 mt-3 pt-2 border-t border-slate-50 animate-in fade-in duration-200">
                                                                                        <p className="text-[10px] text-slate-500 leading-relaxed"><strong className="text-slate-600">Detalle completo:</strong> {mov.descripcion}</p>
                                                                                        {mov.registradoPor && (
                                                                                            <p className="text-[10px] text-slate-500 mt-1"><strong className="text-slate-600">Por:</strong> {mov.registradoPor}</p>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    }

    if (vistaActual === 'campos') {
        contenido = (
            <div className="space-y-4 animate-in slide-in-from-right duration-300 pt-2 pb-24">
                <div className="px-2 mb-4">
                    <h2 className="text-2xl font-black text-slate-800">Monitoreo en Vivo</h2>
                    <p className="text-slate-400 text-xs mt-1">Revisa el estado actual de cada campo</p>
                </div>
                
                <div className="space-y-3 px-1">
                    {camposActivos.length === 0 ? (
                        <div className="text-center p-8 bg-slate-50 rounded-[32px] mt-4 border-2 border-dashed border-slate-200">
                            <i className="fas fa-seedling text-3xl text-slate-300 mb-3"></i>
                            <p className="text-sm font-bold text-slate-500">No hay campos activos aún</p>
                        </div>
                    ) : (
                        camposActivos.map(campo => {
                            const registrosCampoTodo = historialVisible.filter(h => h.campo === campo);
                            const gruposMesesCampo = agruparAsistenciaPorMes(registrosCampoTodo);
                            
                            const isExpanded = campoExpandido === campo;
                            
                            const hoyStr = new Date().toLocaleDateString('en-CA');
                            const registroHoy = registrosCampoTodo.find(r => r.fecha === hoyStr);
                            const pasaronListaHoy = !!registroHoy;

                            return (
                                <div key={campo} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
                                    <div className="flex justify-between items-center">
                                        <div className="w-1/2">
                                            <span className="font-black text-slate-700 text-lg truncate block">{campo}</span>
                                            {pasaronListaHoy ? (
                                                <p className="text-[10px] text-emerald-500 mt-1 font-bold tracking-wide uppercase flex items-center"><i className="fas fa-check-circle mr-1"></i> Lista Enviada</p>
                                            ) : (
                                                <p className="text-[10px] text-amber-500 mt-1 font-bold tracking-wide uppercase flex items-center animate-pulse"><i className="fas fa-clock mr-1"></i> Pendiente</p>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-3 w-1/2 justify-end">
                                            {pasaronListaHoy && (
                                                <span className="bg-emerald-50 text-emerald-600 font-black text-sm px-3 py-1.5 rounded-xl border border-emerald-100 shadow-sm">
                                                    ${Number(registroHoy.ofrenda||0).toFixed(2)}
                                                </span>
                                            )}
                                            <button onClick={() => { setCampoExpandido(isExpanded ? null : campo); setMesCampoExp(null); }} className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors shadow-sm ${isExpanded ? 'bg-pink-500 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}><i className={`fas fa-chevron-down transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i></button>
                                        </div>
                                    </div>

                                    {/* ACORDEÓN SOLO DE MESES PARA MONITOREO DE CAMPOS */}
                                    {isExpanded && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                                            <p className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest flex items-center"><i className="fas fa-history mr-2 text-pink-400"></i> Historial del Campo ({registrosCampoTodo.length})</p>
                                            
                                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                                {registrosCampoTodo.length === 0 ? <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl">Nadie ha pasado asistencia aquí.</p> : 
                                                    gruposMesesCampo.map(grupo => {
                                                        const isExpMes = mesCampoExp === `${campo}-${grupo.id}`;
                                                        return (
                                                            <div key={grupo.id} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all duration-300">
                                                                <button onClick={() => setMesCampoExp(isExpMes ? null : `${campo}-${grupo.id}`)} className="w-full p-3 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                                                                    <div className="text-left">
                                                                        <p className="font-bold text-slate-700 text-xs capitalize">{grupo.mesLabel}</p>
                                                                    </div>
                                                                    <div className="flex items-center space-x-2 text-[9px] font-black">
                                                                        <span className="text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">P:{grupo.tp}</span>
                                                                        <i className={`fas fa-chevron-down text-slate-300 transition-transform duration-300 ${isExpMes ? 'rotate-180' : ''}`}></i>
                                                                    </div>
                                                                </button>
                                                                
                                                                {isExpMes && (
                                                                    <div className="p-2 border-t border-slate-100 bg-slate-50/50 space-y-2">
                                                                        {grupo.registros.map((h, idx) => (
                                                                            <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
                                                                                <div>
                                                                                    <p className="font-black text-slate-700 text-xs">{formatFechaDia(h.fecha)}</p>
                                                                                    <p className="text-[9px] text-slate-500 uppercase mt-0.5 truncate max-w-[120px]"><i className="fas fa-user-edit mr-1 text-slate-400"></i>{h.maestro}</p>
                                                                                    {h.leccion !== undefined && (<p className={`text-[9px] font-bold mt-1 ${h.leccionImpartida ? 'text-indigo-500' : 'text-rose-500'}`}>Lec. {h.leccion} {h.leccionImpartida ? '✅' : '❌'}</p>)}
                                                                                </div>
                                                                                <div className="flex flex-col items-end space-y-1.5 text-[10px] font-bold">
                                                                                    <span className="text-emerald-600 font-black">${Number(h.ofrenda||0).toFixed(2)}</span>
                                                                                    <div className="flex space-x-1">
                                                                                        <span className="bg-emerald-100 text-emerald-700 px-1.5 py-1 rounded-md">P: {h.totales?.presentes || 0}</span>
                                                                                        <span className="bg-rose-100 text-rose-700 px-1.5 py-1 rounded-md">A: {h.totales?.ausentes || 0}</span>
                                                                                        <span className="bg-amber-100 text-amber-700 px-1.5 py-1 rounded-md">Pe: {h.totales?.permisos || 0}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                }
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    }

    if (vistaActual === 'reportes') {
        contenido = (
            <div className="space-y-4 animate-in slide-in-from-right duration-300 pt-2 pb-24">
                <div className="px-2 mb-2">
                    <h2 className="text-2xl font-black text-slate-800">Reportes de Campos</h2>
                    <p className="text-slate-400 text-xs mt-1">Filtra asistencia y ofrendas históricas</p>
                </div>
                
                {/* CAJA DE FILTROS */}
                <div className="bg-white p-4 rounded-[24px] mx-1 border border-slate-100 shadow-sm space-y-3">
                    <div className="flex space-x-3">
                        <div className="w-1/2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Desde la fecha</label>
                            <input type="date" className="w-full p-3 mt-1 bg-slate-50 rounded-xl outline-none text-xs font-bold text-slate-700 border border-slate-100 focus:border-pink-400 focus:ring-1 focus:ring-pink-100 transition-all" value={fechaDesde} onChange={e=>setFechaDesde(e.target.value)} />
                        </div>
                        <div className="w-1/2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Hasta la fecha</label>
                            <input type="date" className="w-full p-3 mt-1 bg-slate-50 rounded-xl outline-none text-xs font-bold text-slate-700 border border-slate-100 focus:border-pink-400 focus:ring-1 focus:ring-pink-100 transition-all" value={fechaHasta} onChange={e=>setFechaHasta(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Filtrar por Campo</label>
                        <select className="w-full p-3 mt-1 bg-slate-50 rounded-xl outline-none text-xs font-bold text-slate-700 border border-slate-100 focus:border-pink-400 focus:ring-1 focus:ring-pink-100 transition-all" value={filtroCampo} onChange={e=>setFiltroCampo(e.target.value)}>
                            <option value="TODOS">Todos los campos (Global)</option>
                            {camposActivos.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                {/* RESULTADO DEL FILTRO */}
                <div className="bg-slate-800 p-5 rounded-[24px] text-white shadow-xl mx-1 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-bl-[100px] pointer-events-none"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold uppercase opacity-70 tracking-widest mb-1">Recaudación del Período</p>
                        <p className="text-4xl font-black tracking-tighter text-emerald-400">${ofrendaPeriodo.toFixed(2)}</p>
                    </div>
                    <div className="text-right relative z-10">
                        <p className="text-[10px] font-bold uppercase opacity-70 tracking-widest mb-1">Asistencia</p>
                        <p className="text-sm font-black"><span className="text-emerald-400">P: {presentesPeriodo}</span> | <span className="text-rose-400">A: {ausentesPeriodo}</span></p>
                    </div>
                </div>

                <h3 className="font-bold text-slate-700 text-sm mt-6 px-2 border-b border-slate-100 pb-2">
                    {filtroCampo === 'TODOS' ? 'Aportes por Mes y Semana' : `Historial de Clases: ${filtroCampo}`}
                </h3>
                <div className="space-y-3 px-1">
                    {registrosFiltrados.length === 0 ? (
                        <div className="text-center p-8 bg-slate-50 rounded-3xl mt-2 border border-slate-100">
                            <i className="fas fa-search text-3xl text-slate-300 mb-3"></i>
                            <p className="text-sm font-bold text-slate-500">No hay registros en estas fechas</p>
                        </div>
                    ) : filtroCampo === 'TODOS' ? (
                        // ACORDEÓN POR MESES PARA VISTA GLOBAL
                        gruposMesesReportes.map(grupo => {
                            const isExpMes = mesRepExpandido === grupo.id;

                            return (
                                <div key={grupo.id} className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
                                    <button onClick={() => {setMesRepExpandido(isExpMes ? null : grupo.id); setSemanaRepExpandido(null);}} className="w-full p-4 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                                        <div className="text-left">
                                            <span className="font-bold text-slate-700 text-sm uppercase">{grupo.mesLabel}</span>
                                            <p className="text-[9px] text-slate-400 mt-1 font-bold">{grupo.semanasArray.length} semanas con ofrenda</p>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <span className="text-emerald-500 font-black text-sm">${grupo.totalOfrenda.toFixed(2)}</span>
                                            <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors shadow-sm ${isExpMes ? 'bg-pink-500 text-white' : 'bg-slate-50 text-slate-400'}`}>
                                                <i className={`fas fa-chevron-down transition-transform duration-300 ${isExpMes ? 'rotate-180' : ''}`}></i>
                                            </div>
                                        </div>
                                    </button>

                                    {isExpMes && (
                                        <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50 animate-in slide-in-from-top-2 duration-200">
                                            <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-1">
                                                {grupo.semanasArray.map(sem => {
                                                    const isSemExp = semanaRepExpandido === `${grupo.id}-${sem.id}`;
                                                    const camposSemana = Object.keys(sem.campos).sort((a,b) => sem.campos[b].ofrenda - sem.campos[a].ofrenda);

                                                    return (
                                                        <div key={sem.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                                            <button onClick={() => setSemanaRepExpandido(isSemExp ? null : `${grupo.id}-${sem.id}`)} className="w-full p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                                                <div className="text-left">
                                                                    <p className="font-bold text-slate-700 text-xs">{sem.label}</p>
                                                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">{camposSemana.length} campos</p>
                                                                </div>
                                                                <div className="flex items-center space-x-2 text-[9px] font-black">
                                                                    <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">${sem.totalOfrenda.toFixed(2)}</span>
                                                                    <i className={`fas fa-chevron-down text-slate-300 transition-transform duration-300 ${isSemExp ? 'rotate-180' : ''}`}></i>
                                                                </div>
                                                            </button>

                                                            {isSemExp && (
                                                                <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
                                                                    {camposSemana.map((campo, index) => {
                                                                        const cData = sem.campos[campo];
                                                                        return (
                                                                            <div key={campo} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex justify-between items-center">
                                                                                <div className="flex items-center space-x-2 flex-1">
                                                                                    <div className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[8px] font-black ${index === 0 ? 'bg-amber-100 text-amber-600' : index === 1 ? 'bg-slate-200 text-slate-600' : index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>#{index + 1}</div>
                                                                                    <div>
                                                                                        <p className="font-bold text-slate-700 text-[11px]">{campo}</p>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="text-right">
                                                                                    <p className="font-black text-emerald-600 text-xs">${cData.ofrenda.toFixed(2)}</p>
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        registrosFiltrados.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).map((h, i) => (
                            <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                                <div>
                                    <p className="font-black text-slate-700 text-xs">{formatoFecha(h.fecha)}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Lec. {h.leccion || '-'} • Por: {h.maestro.split(' ')[0]}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-emerald-600 text-base">${Number(h.ofrenda||0).toFixed(2)}</p>
                                    <div className="flex space-x-1.5 mt-1 text-[9px] font-bold justify-end">
                                        <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">P: {h.totales?.presentes||0}</span>
                                        <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded">A: {h.totales?.ausentes||0}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
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
