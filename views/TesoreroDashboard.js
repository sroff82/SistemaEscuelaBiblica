var { useState } = React;

function TesoreroDashboard({
    fondoTotal, fondoVoluntarioTotal, historialIngresos, onGuardarIngreso, onGuardarEgreso
}) {
    const [vistaActual, setVistaActual] = useState('inicio'); 
    
    // NUEVO ESTADO: Controla qué fondo estamos viendo ('general' o 'voluntario')
    const [fondoActivo, setFondoActivo] = useState('general');

    // Estados para nuevo ingreso/retiro
    const [tipoTransaccion, setTipoTransaccion] = useState('ingreso'); 
    const [monto, setMonto] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [cargando, setLoading] = useState(false);

    // Estados para el Acordeón Doble (Historial)
    const [mesExpandido, setMesExpandido] = useState(null);
    const [semanaExpandida, setSemanaExpandida] = useState(null);
    
    // Estados para el Acordeón Doble (Reportes)
    const [repMesExpandido, setRepMesExpandido] = useState(null); 
    const [repSemanaExpandida, setRepSemanaExpandida] = useState(null);
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');

    const [detalleMovExp, setDetalleMovExp] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        let exito = false;
        
        // Pasamos el fondo activo al backend
        if (tipoTransaccion === 'ingreso') {
            exito = await onGuardarIngreso(monto, descripcion, fondoActivo);
        } else {
            exito = await onGuardarEgreso(monto, descripcion, fondoActivo);
        }

        if (exito) {
            setMonto(''); setDescripcion(''); setVistaActual('historial'); 
            const hoy = new Date();
            const mesKey = `${hoy.getFullYear()}-${(hoy.getMonth()+1).toString().padStart(2, '0')}`;
            setMesExpandido(mesKey);
            setSemanaExpandida(null);
        }
        setLoading(false);
    };

    const formatoFecha = (f) => {
        if (!f) return ''; const p = f.split('-'); if (p.length !== 3) return f;
        return `${p[2]}/${p[1]}/${p[0]}`; 
    };

    const getWeekOfMonth = (year, month, day) => {
        const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); 
        return Math.ceil((day + firstDayOfMonth) / 7);
    };

    const mesesNombresCompletos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    // FILTRAMOS EL HISTORIAL SEGÚN EL FONDO SELECCIONADO
    const historialFiltradoPorFondo = (historialIngresos || []).filter(h => {
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

                if(!grupos[mesKey]) grupos[mesKey] = { mesLabel, ingresos: 0, egresos: 0, semanas: {} };
                if(h.tipo === 'egreso') grupos[mesKey].egresos += Number(h.monto) || 0;
                else grupos[mesKey].ingresos += Number(h.monto) || 0;

                if(!grupos[mesKey].semanas[semKey]) grupos[mesKey].semanas[semKey] = { label: semKey, ingresos: 0, egresos: 0, registros: [] };
                if(h.tipo === 'egreso') grupos[mesKey].semanas[semKey].egresos += Number(h.monto) || 0;
                else grupos[mesKey].semanas[semKey].ingresos += Number(h.monto) || 0;
                
                grupos[mesKey].semanas[semKey].registros.push(h);
            }
        });
        return Object.keys(grupos).sort((a,b) => b.localeCompare(a)).map(k => {
            const semanasArray = Object.keys(grupos[k].semanas).sort().map(sk => ({ id: sk, ...grupos[k].semanas[sk] }));
            return { id: k, ...grupos[k], semanasArray };
        });
    };

    const gruposMesesHistorial = agruparFinanzas(historialFiltradoPorFondo);

    const movsFiltrados = historialFiltradoPorFondo.filter(mov => {
        if (fechaDesde && mov.fecha < fechaDesde) return false;
        if (fechaHasta && mov.fecha > fechaHasta) return false;
        return true;
    });

    let repIngresos = 0; let repEgresos = 0;
    movsFiltrados.forEach(mov => {
        if (mov.tipo === 'egreso') repEgresos += Number(mov.monto);
        else repIngresos += Number(mov.monto);
    });
    const repBalance = repIngresos - repEgresos;
    const gruposMesesReportes = agruparFinanzas(movsFiltrados);

    const NavButton = ({ id, icon, label }) => (
        <button onClick={() => setVistaActual(id)} className={`flex flex-col items-center justify-center w-[90px] h-14 rounded-2xl transition-all ${vistaActual === id ? (fondoActivo === 'voluntario' ? 'text-emerald-600 bg-emerald-50 font-black' : 'text-amber-600 bg-amber-50 font-black') : 'text-slate-400 hover:text-slate-600 font-bold'}`}>
            <i className={`fas ${icon} text-xl mb-1 ${vistaActual === id ? 'animate-bounce' : ''}`}></i><span className="text-[10px] tracking-wide">{label}</span>
        </button>
    );

    const saldoVisible = fondoActivo === 'general' ? fondoTotal : (fondoVoluntarioTotal || 0);
    const colorTema = fondoActivo === 'voluntario' ? 'emerald' : 'amber';

    let contenido;

    if (vistaActual === 'inicio') {
        contenido = (
            <div className="space-y-6 animate-in fade-in duration-300 pt-2 pb-24">
                
                {/* SELECTOR DE FONDO GLOBAL */}
                <div className="flex bg-slate-200 p-1.5 rounded-2xl mx-1 shadow-inner">
                    <button onClick={() => setFondoActivo('general')} className={`flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${fondoActivo === 'general' ? 'bg-white text-amber-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Fondo General</button>
                    <button onClick={() => setFondoActivo('voluntario')} className={`flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${fondoActivo === 'voluntario' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Fondo Voluntario</button>
                </div>

                <div className={`bg-slate-800 p-8 rounded-[32px] text-white shadow-2xl mx-1 relative overflow-hidden transition-colors`}>
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-bl-[100px] pointer-events-none"></div>
                    <div className="relative z-10 text-center">
                        <p className={`text-xs font-bold uppercase opacity-90 tracking-widest mb-2 flex items-center justify-center text-${colorTema}-400`}>
                            <i className="fas fa-vault mr-2"></i> {fondoActivo === 'general' ? 'Fondo General Activo' : 'Fondo Voluntario Activo'}
                        </p>
                        <p className={`text-6xl font-black tracking-tighter text-${colorTema}-400`}>
                            ${Number(saldoVisible).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </p>
                    </div>
                </div>

                <div className={`bg-white p-6 rounded-[32px] border border-${colorTema}-100 shadow-sm mx-1`}>
                    <h3 className="font-black text-slate-700 text-lg mb-4 flex items-center"><i className={`fas fa-cash-register text-${colorTema}-400 mr-2`}></i>Registrar Movimiento</h3>
                    
                    <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
                        <button onClick={() => setTipoTransaccion('ingreso')} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all shadow-sm ${tipoTransaccion === 'ingreso' ? 'bg-white text-emerald-600 border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                            <i className="fas fa-arrow-down mr-1"></i> + Ingreso
                        </button>
                        <button onClick={() => setTipoTransaccion('egreso')} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all shadow-sm ${tipoTransaccion === 'egreso' ? 'bg-white text-rose-600 border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                            <i className="fas fa-arrow-up mr-1"></i> - Retiro
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2 mb-1 block">Monto a {tipoTransaccion === 'ingreso' ? 'ingresar' : 'retirar'} ($)</label>
                            <div className="relative">
                                <span className={`absolute left-4 top-4 font-black text-lg ${tipoTransaccion === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'}`}>$</span>
                                <input type="number" step="0.01" min="0.01" required value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" className={`w-full py-4 pl-9 pr-4 bg-slate-50 rounded-2xl outline-none border transition-all text-xl font-black text-slate-700 ${tipoTransaccion === 'ingreso' ? 'border-emerald-100 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100' : 'border-rose-100 focus:border-rose-400 focus:ring-2 focus:ring-rose-100'}`} />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2 mb-1 block">Descripción / Motivo</label>
                            <input type="text" required value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder={tipoTransaccion === 'ingreso' ? "Ej: Ofrenda voluntaria" : "Ej: Compra de material"} className={`w-full p-4 bg-slate-50 rounded-2xl outline-none border transition-all font-bold text-slate-700 ${tipoTransaccion === 'ingreso' ? 'border-emerald-100 focus:border-emerald-400' : 'border-rose-100 focus:border-rose-400'}`} />
                        </div>

                        <button type="submit" disabled={cargando} className={`w-full py-4 mt-2 rounded-2xl font-black text-white shadow-xl transition-all ${cargando ? 'bg-slate-400' : tipoTransaccion === 'ingreso' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'} active:scale-95`}>
                            {cargando ? 'Procesando...' : tipoTransaccion === 'ingreso' ? 'Guardar Ingreso' : 'Confirmar Retiro'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (vistaActual === 'historial') {
        contenido = (
            <div className="space-y-4 animate-in slide-in-from-right duration-300 pt-2 pb-24">
                {/* SELECTOR DE FONDO GLOBAL */}
                <div className="flex bg-slate-200 p-1.5 rounded-2xl mx-1 shadow-inner">
                    <button onClick={() => {setFondoActivo('general'); setMesExpandido(null);}} className={`flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${fondoActivo === 'general' ? 'bg-white text-amber-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Fondo General</button>
                    <button onClick={() => {setFondoActivo('voluntario'); setMesExpandido(null);}} className={`flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${fondoActivo === 'voluntario' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Fondo Voluntario</button>
                </div>

                <div className="px-2 mb-4 mt-4">
                    <h2 className={`text-2xl font-black text-slate-800 flex items-center`}>Libro Mayor</h2>
                    <p className="text-slate-400 text-xs mt-1">Viendo movimientos: <strong className={`uppercase ${fondoActivo === 'voluntario' ? 'text-emerald-500' : 'text-amber-500'}`}>{fondoActivo}</strong></p>
                </div>
                
                <div className="space-y-3 px-1">
                    {gruposMesesHistorial.length === 0 ? (
                        <div className={`text-center p-8 bg-slate-50 rounded-[32px] mt-4 border-2 border-dashed border-slate-200`}>
                            <i className="fas fa-book-open text-3xl text-slate-300 mb-3"></i>
                            <p className="text-sm font-bold text-slate-500">El libro está vacío para este fondo.</p>
                        </div>
                    ) : (
                        gruposMesesHistorial.map(grupo => {
                            const isExpMes = mesExpandido === grupo.id;

                            return (
                                <div key={grupo.id} className={`bg-white rounded-[24px] border border-${colorTema}-100 shadow-sm overflow-hidden transition-all duration-300`}>
                                    <button onClick={() => { setMesExpandido(isExpMes ? null : grupo.id); setSemanaExpandida(null); setDetalleMovExp(null); }} className="w-full p-5 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                                        <div className="text-left">
                                            <span className="font-black text-slate-700 text-lg uppercase tracking-wide">{grupo.mesLabel}</span>
                                            <p className="text-[10px] text-slate-400 mt-1 font-bold">{grupo.semanasArray.length} semanas con actividad</p>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="text-right mr-2 hidden sm:block">
                                                <p className="text-[10px] font-bold text-emerald-500">+${grupo.ingresos.toFixed(2)}</p>
                                                <p className="text-[10px] font-bold text-rose-500">-${grupo.egresos.toFixed(2)}</p>
                                            </div>
                                            <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors shadow-sm ${isExpMes ? `bg-${colorTema}-500 text-white` : 'bg-slate-50 text-slate-400'}`}>
                                                <i className={`fas fa-chevron-down transition-transform duration-300 ${isExpMes ? 'rotate-180' : ''}`}></i>
                                            </div>
                                        </div>
                                    </button>

                                    {isExpMes && (
                                        <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50 animate-in slide-in-from-top-2 duration-200">
                                            
                                            <div className="flex justify-between p-3 bg-white rounded-xl shadow-sm mb-4 mt-4 border border-slate-100">
                                                <div className="text-center w-1/2 border-r border-slate-100">
                                                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Ingresos</p>
                                                    <p className="font-black text-emerald-500">${grupo.ingresos.toFixed(2)}</p>
                                                </div>
                                                <div className="text-center w-1/2">
                                                    <p className="text-[9px] font-bold text-rose-600 uppercase tracking-widest mb-1">Retiros</p>
                                                    <p className="font-black text-rose-500">${grupo.egresos.toFixed(2)}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                {grupo.semanasArray.map(sem => {
                                                    const isSemExp = semanaExpandida === `${grupo.id}-${sem.id}`;
                                                    return (
                                                        <div key={sem.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                                            <button onClick={() => { setSemanaExpandida(isSemExp ? null : `${grupo.id}-${sem.id}`); setDetalleMovExp(null); }} className="w-full p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                                                <div className="text-left">
                                                                    <p className="font-bold text-slate-700 text-xs">{sem.label}</p>
                                                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">{sem.registros.length} movs</p>
                                                                </div>
                                                                <div className="flex items-center space-x-2 text-[9px] font-black">
                                                                    <div className="flex flex-col items-end mr-1">
                                                                        <span className="text-emerald-500">+${sem.ingresos.toFixed(2)}</span>
                                                                        <span className="text-rose-500">-${sem.egresos.toFixed(2)}</span>
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
                                                                            <div key={mov.id} onClick={() => setDetalleMovExp(isMovExp ? null : mov.id)} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm relative overflow-hidden cursor-pointer transition-colors hover:bg-slate-50">
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

    if (vistaActual === 'reportes') {
        contenido = (
            <div className="space-y-4 animate-in slide-in-from-right duration-300 pt-2 pb-24">
                {/* SELECTOR DE FONDO GLOBAL */}
                <div className="flex bg-slate-200 p-1.5 rounded-2xl mx-1 shadow-inner">
                    <button onClick={() => {setFondoActivo('general'); setRepMesExpandido(null);}} className={`flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${fondoActivo === 'general' ? 'bg-white text-amber-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Fondo General</button>
                    <button onClick={() => {setFondoActivo('voluntario'); setRepMesExpandido(null);}} className={`flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${fondoActivo === 'voluntario' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Fondo Voluntario</button>
                </div>

                <div className="px-2 mb-4 mt-4">
                    <h2 className="text-2xl font-black text-slate-800">Rendición de Cuentas</h2>
                    <p className="text-slate-400 text-xs mt-1">Viendo: <strong className={`uppercase ${fondoActivo === 'voluntario' ? 'text-emerald-500' : 'text-amber-500'}`}>{fondoActivo}</strong></p>
                </div>
                
                <div className="bg-white p-5 rounded-[24px] mx-1 border border-slate-100 shadow-sm space-y-4">
                    <div className="flex space-x-3">
                        <div className="w-1/2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1">Desde</label>
                            <input type="date" className={`w-full p-3 bg-slate-50 rounded-xl outline-none text-xs font-bold text-slate-700 border border-slate-100 focus:border-${colorTema}-400 focus:ring-1 focus:ring-${colorTema}-100 transition-all`} value={fechaDesde} onChange={e=>setFechaDesde(e.target.value)} />
                        </div>
                        <div className="w-1/2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1">Hasta</label>
                            <input type="date" className={`w-full p-3 bg-slate-50 rounded-xl outline-none text-xs font-bold text-slate-700 border border-slate-100 focus:border-${colorTema}-400 focus:ring-1 focus:ring-${colorTema}-100 transition-all`} value={fechaHasta} onChange={e=>setFechaHasta(e.target.value)} />
                        </div>
                    </div>
                </div>

                {(fechaDesde || fechaHasta) && (
                    <div className="bg-slate-800 p-6 rounded-[24px] text-white shadow-xl mx-1 relative overflow-hidden animate-in zoom-in-95">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-bl-[100px] pointer-events-none"></div>
                        <p className={`text-[10px] font-bold uppercase opacity-70 tracking-widest mb-4 flex items-center text-${colorTema}-400`}><i className="fas fa-chart-pie mr-2"></i> Resumen del Período</p>
                        
                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            <div>
                                <p className="text-[9px] text-emerald-400 uppercase font-bold tracking-widest">Entró</p>
                                <p className="text-xl font-black">+${repIngresos.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-rose-400 uppercase font-bold tracking-widest">Salió</p>
                                <p className="text-xl font-black">-${repEgresos.toFixed(2)}</p>
                            </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-slate-700">
                            <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-1">Balance del período</p>
                            <p className={`text-3xl font-black tracking-tighter ${repBalance >= 0 ? `text-${colorTema}-400` : 'text-rose-400'}`}>
                                {repBalance >= 0 ? '+' : '-'}${Math.abs(repBalance).toFixed(2)}
                            </p>
                        </div>
                    </div>
                )}

                <h3 className="font-bold text-slate-700 text-sm mt-6 px-2 border-b border-slate-100 pb-2">
                    Detalle de Transacciones Filtradas
                </h3>
                <div className="space-y-3 px-1">
                    {gruposMesesReportes.length === 0 ? (
                        <div className="text-center p-6 bg-slate-50 rounded-2xl mt-2 border border-slate-100">
                            <p className="text-xs font-bold text-slate-400">Ajusta las fechas para ver resultados.</p>
                        </div>
                    ) : (
                        gruposMesesReportes.map(grupo => {
                            const isExpMes = repMesExpandido === grupo.id;

                            return (
                                <div key={grupo.id} className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
                                    <button onClick={() => { setRepMesExpandido(isExpMes ? null : grupo.id); setRepSemanaExpandida(null); setDetalleMovExp(null); }} className="w-full p-4 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                                        <div className="text-left">
                                            <span className="font-bold text-slate-700 text-sm uppercase">{grupo.mesLabel}</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors shadow-sm ${isExpMes ? `bg-${colorTema}-500 text-white` : 'bg-slate-50 text-slate-400'}`}>
                                                <i className={`fas fa-chevron-down transition-transform duration-300 ${isExpMes ? 'rotate-180' : ''}`}></i>
                                            </div>
                                        </div>
                                    </button>

                                    {isExpMes && (
                                        <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50 animate-in slide-in-from-top-2 duration-200">
                                            <div className="space-y-3 mt-4">
                                                {grupo.semanasArray.map(sem => {
                                                    const isSemExp = repSemanaExpandida === `${grupo.id}-${sem.id}`;
                                                    return (
                                                        <div key={sem.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                                            <button onClick={() => { setRepSemanaExpandida(isSemExp ? null : `${grupo.id}-${sem.id}`); setDetalleMovExp(null); }} className="w-full p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                                                <div className="text-left">
                                                                    <p className="font-bold text-slate-700 text-xs">{sem.label}</p>
                                                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">{sem.registros.length} movs</p>
                                                                </div>
                                                                <div className="flex items-center space-x-2 text-[9px] font-black">
                                                                    <div className="flex flex-col items-end mr-1">
                                                                        <span className="text-emerald-500">+${sem.ingresos.toFixed(2)}</span>
                                                                        <span className="text-rose-500">-${sem.egresos.toFixed(2)}</span>
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
                                                                            <div key={mov.id} onClick={() => setDetalleMovExp(isMovExp ? null : mov.id)} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm relative overflow-hidden cursor-pointer transition-colors hover:bg-slate-50">
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

    return (
        <>
            {contenido}
            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md border-t border-slate-100 flex justify-around items-center p-2 z-50 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <NavButton id="inicio" icon="fa-vault" label="Transacción" />
                <NavButton id="historial" icon="fa-book" label="Historial" />
                <NavButton id="reportes" icon="fa-filter" label="Reportes" />
            </div>
        </>
    );
}

window.TesoreroDashboard = TesoreroDashboard;
