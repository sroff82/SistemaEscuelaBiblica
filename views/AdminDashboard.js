var { useState } = React;

function AdminDashboard({
    maestros, todosLosAlumnos, datosGlobalesAsistencia, historialAsistencias, entregasLogistica,
    mantenimiento, onToggleMantenimiento, onApprove, onDelete, onToggleModal, 
    onDeleteCampo, onResetLecciones, onCrearEntrega, onBorrarEntrega, onAssignGroup,
    inventarioDatos, onActualizarInventario, onCerrarJornada,
    fondoTotal, fondoVoluntarioTotal, fondoSecretariaTotal, fondoSecretariaVoluntarioTotal, onEdit, historialIngresos, historialSecretaria,
    datosUsuarioActual
}) {
    const [busqueda, setBusqueda] = useState('');
    const [vistaActual, setVistaActual] = useState('inicio'); 
    
    // ESTADOS PARA SUB-VISTAS DEL PANEL DIRECTOR
    const [subVistaInicio, setSubVistaInicio] = useState(null); 
    
    // ESTADOS PARA EL DOBLE ACORDEÓN DE AUDITORÍA
    const [fondoAuditoriaActivo, setFondoAuditoriaActivo] = useState('general');
    const [tabAuditoria, setTabAuditoria] = useState('tesoreria'); 
    const [mesAuditoriaExp, setMesAuditoriaExp] = useState(null);
    const [semanaAuditoriaExp, setSemanaAuditoriaExp] = useState(null);

    // ESTADOS PARA EL DOBLE ACORDEÓN DE OFRENDAS
    const [mesOfrendaExp, setMesOfrendaExp] = useState(null);
    const [semanaOfrendaExp, setSemanaOfrendaExp] = useState(null);

    // ESTADOS PARA EL DOBLE ACORDEÓN DE ASISTENCIA GLOBAL
    const [mesAsistenciaExp, setMesAsistenciaExp] = useState(null); 
    const [semanaAsistenciaExp, setSemanaAsistenciaExp] = useState(null); 

    // ESTADOS PARA EL DOBLE ACORDEÓN DE CLASES POR CAMPO
    const [mesClasesExp, setMesClasesExp] = useState(null);
    const [semanaClasesExp, setSemanaClasesExp] = useState(null);

    // ESTADOS PARA EL TRIPLE ACORDEÓN DE LOGÍSTICA
    const [subVistaAdminLogistica, setSubVistaAdminLogistica] = useState('bodega'); 
    const [grupoCompletadoExp, setGrupoCompletadoExp] = useState(null);
    const [mesLogisticaExp, setMesLogisticaExp] = useState(null);
    const [semanaLogisticaExp, setSemanaLogisticaExp] = useState(null);

    // ESTADOS PARA ACORDEÓN DE CAMPOS Y FILTROS
    const [campoExpandido, setCampoExpandido] = useState(null); 
    const [campoAccionActiva, setCampoAccionActiva] = useState(null); 
    const [rolExpandido, setRolExpandido] = useState(null); 
    const [edadMin, setEdadMin] = useState('');
    const [edadMax, setEdadMax] = useState('');
    const [camposRuta, setCamposRuta] = useState([]);
    
    const [rutaEditandoId, setRutaEditandoId] = useState(null);
    const [nuevaCantidadRuta, setNuevaCantidadRuta] = useState('');

    const historialVisible = historialAsistencias.filter(h => !h.esReset);
    const todasAsistencias = datosGlobalesAsistencia?.registros || [];

    const formatoFecha = (f) => {
        if (!f) return '';
        const p = f.split('-');
        if (p.length !== 3) return f;
        return `${p[2]}/${p[1]}/${p[0]}`; 
    };

    const formatFechaDia = (f) => {
        if (!f) return '';
        const d = new Date(f + 'T12:00:00'); 
        const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return `${dias[d.getDay()]}, ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
    };

    const formatFechaHora = (timestamp) => {
        if (!timestamp) return 'Fecha no registrada';
        const d = new Date(timestamp);
        return `${d.toLocaleDateString()} a las ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    };

    const mesesNombresCompletos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    const getWeekOfMonth = (year, month, day) => {
        const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); 
        return Math.ceil((day + firstDayOfMonth) / 7);
    };

    // ==========================================
    // NUEVA FUNCIÓN: DESCARGAR RESPALDO LOCAL
    // ==========================================
    const handleDescargarRespaldo = () => {
        const isSandbox = datosUsuarioActual?.id === 'user_sandbox_secreto';
        if (isSandbox) {
            alert("🔒 MODO DESARROLLADOR\n\nAcción simulada: [Descargar Copia de Seguridad]");
            return;
        }

        const confirmar = window.confirm("¿Deseas descargar una copia de seguridad de toda la base de datos ahora mismo?");
        if (!confirmar) return;

        // Empaquetamos todo lo que el sistema tiene en memoria
        const datosRespaldo = {
            fechaGeneracion: new Date().toISOString(),
            saldos: {
                tesoreriaGeneral: fondoTotal,
                tesoreriaVoluntario: fondoVoluntarioTotal,
                secretariaGeneral: fondoSecretariaTotal,
                secretariaVoluntario: fondoSecretariaVoluntarioTotal,
                inventarioLogistica: inventarioDatos
            },
            colecciones: {
                maestros: maestros,
                alumnos: todosLosAlumnos,
                asistencias: historialAsistencias,
                ingresosTesoreria: historialIngresos,
                ingresosSecretaria: historialSecretaria,
                entregasLogistica: entregasLogistica
            }
        };

        // Creamos el archivo y forzamos la descarga
        const blob = new Blob([JSON.stringify(datosRespaldo, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fechaNombre = new Date().toLocaleDateString('en-CA');
        a.download = `Respaldo_Bitinia_${fechaNombre}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

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

    const agruparOfrendas = (historial) => {
        if (!historial) return [];
        const grupos = {};
        historial.forEach(h => {
            if(!h.ofrenda || Number(h.ofrenda) === 0) return;
            const p = (h.fecha || '').split('-');
            if(p.length === 3) {
                const y = parseInt(p[0]); const m = parseInt(p[1]); const d = parseInt(p[2]);
                const mesKey = `${y}-${p[1]}`;
                const mesLabel = `${mesesNombresCompletos[m-1]} ${y}`;
                const semKey = `Semana ${getWeekOfMonth(y, m, d)}`;

                if(!grupos[mesKey]) grupos[mesKey] = { mesLabel, total: 0, semanas: {} };
                grupos[mesKey].total += Number(h.ofrenda) || 0;

                if(!grupos[mesKey].semanas[semKey]) grupos[mesKey].semanas[semKey] = { label: semKey, total: 0, registros: [] };
                grupos[mesKey].semanas[semKey].total += Number(h.ofrenda) || 0;
                grupos[mesKey].semanas[semKey].registros.push(h);
            }
        });
        return Object.keys(grupos).sort((a,b) => b.localeCompare(a)).map(k => {
            const semanasArray = Object.keys(grupos[k].semanas).sort().map(sk => {
                grupos[k].semanas[sk].registros.sort((x, y) => new Date(y.fecha) - new Date(x.fecha));
                return { id: sk, ...grupos[k].semanas[sk] };
            });
            return { id: k, ...grupos[k], semanasArray };
        });
    };

    const agruparAsistenciaPorMesYSemana = (historial) => {
        if (!historial) return [];
        const grupos = {};
        historial.forEach(h => {
            const p = (h.fecha || '').split('-');
            if(p.length === 3) {
                const y = parseInt(p[0]); const m = parseInt(p[1]); const d = parseInt(p[2]);
                const mesKey = `${y}-${p[1]}`; 
                const mesLabel = `${mesesNombresCompletos[m-1]} ${y}`;
                const semKey = `Semana ${getWeekOfMonth(y, m, d)}`;

                if(!grupos[mesKey]) grupos[mesKey] = { mesLabel, tp: 0, ta: 0, tperm: 0, semanas: {} };
                grupos[mesKey].tp += (h.totales?.presentes || 0);
                grupos[mesKey].ta += (h.totales?.ausentes || 0);
                grupos[mesKey].tperm += (h.totales?.permisos || 0);

                if(!grupos[mesKey].semanas[semKey]) grupos[mesKey].semanas[semKey] = { label: semKey, tp: 0, ta: 0, tperm: 0, registros: [] };
                grupos[mesKey].semanas[semKey].tp += (h.totales?.presentes || 0);
                grupos[mesKey].semanas[semKey].ta += (h.totales?.ausentes || 0);
                grupos[mesKey].semanas[semKey].tperm += (h.totales?.permisos || 0);
                grupos[mesKey].semanas[semKey].registros.push(h);
            }
        });

        return Object.keys(grupos).sort((a,b) => b.localeCompare(a)).map(k => {
            const semanasArray = Object.keys(grupos[k].semanas).sort().map(sk => {
                grupos[k].semanas[sk].registros.sort((x, y) => new Date(y.fecha) - new Date(x.fecha));
                return { id: sk, ...grupos[k].semanas[sk] };
            });
            return { id: k, ...grupos[k], semanasArray };
        });
    };

    const agruparLogisticaPorGrupo = (entregas) => {
        const grupos = {};
        entregas.forEach(e => {
            const grp = e.grupo || 'Sin Grupo';
            if(!grupos[grp]) grupos[grp] = { total: 0, meses: {} };
            grupos[grp].total++;
            
            const d = e.fechaEntrega ? new Date(e.fechaEntrega) : new Date();
            const y = d.getFullYear(); const m = d.getMonth() + 1; const day = d.getDate();
            const mesKey = `${y}-${m.toString().padStart(2, '0')}`;
            const mesLabel = `${mesesNombresCompletos[m-1]} ${y}`;
            const semKey = `Semana ${getWeekOfMonth(y, m, day)}`;

            if(!grupos[grp].meses[mesKey]) grupos[grp].meses[mesKey] = { label: mesLabel, total: 0, semanas: {} };
            grupos[grp].meses[mesKey].total++;

            if(!grupos[grp].meses[mesKey].semanas[semKey]) grupos[grp].meses[mesKey].semanas[semKey] = { label: semKey, total: 0, registros: [] };
            grupos[grp].meses[mesKey].semanas[semKey].total++;
            grupos[grp].meses[mesKey].semanas[semKey].registros.push(e);
        });
        
        return Object.keys(grupos).sort().map(g => {
            const mesesArray = Object.keys(grupos[g].meses).sort((a,b)=>b.localeCompare(a)).map(mk => {
                const semanasArray = Object.keys(grupos[g].meses[mk].semanas).sort().map(sk => {
                    grupos[g].meses[mk].semanas[sk].registros.sort((x,y) => y.fechaEntrega - x.fechaEntrega);
                    return { id: sk, ...grupos[g].meses[mk].semanas[sk] };
                });
                return { id: mk, ...grupos[g].meses[mk], semanasArray };
            });
            return { id: g, label: g, total: grupos[g].total, mesesArray };
        });
    };

    const textoFechas = datosGlobalesAsistencia?.rango ? `${formatoFecha(datosGlobalesAsistencia.rango.inicio).substring(0,5)} al ${formatoFecha(datosGlobalesAsistencia.rango.fin).substring(0,5)}` : 'Calculando...';

    const calcProgreso = (lec) => {
        const l = parseInt(lec);
        if (isNaN(l) || l === 0) return { parte: 1, leccion: 0, porc: 0 };
        if (l <= 25) return { parte: 1, leccion: l, porc: Math.round((l/25)*100) };
        if (l <= 54) return { parte: 2, leccion: l - 25, porc: Math.round(((l-25)/29)*100) };
        return { parte: 'Extra', leccion: l, porc: 100 };
    };

    const NavButton = ({ id, icon, label, width = 'w-[75px]' }) => (
        <button onClick={() => {setVistaActual(id); setSubVistaInicio(null);}} className={`flex flex-col items-center justify-center ${width} h-14 rounded-2xl transition-all ${vistaActual === id ? 'text-indigo-600 bg-indigo-50 font-black' : 'text-slate-400 hover:text-slate-600 font-bold'}`}>
            <i className={`fas ${icon} text-xl mb-1 ${vistaActual === id ? 'animate-bounce' : ''}`}></i><span className="text-[9px] tracking-wide">{label}</span>
        </button>
    );

    const ActionCard = ({ title, desc, icon, color, onClick }) => (
        <button onClick={onClick} className={`bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-start text-left active:scale-95 transition-all group`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-3 ${color === 'emerald' ? 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white' : color === 'amber' ? 'bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white' : color === 'sky' ? 'bg-sky-50 text-sky-500 group-hover:bg-sky-500 group-hover:text-white' : color === 'teal' ? 'bg-teal-50 text-teal-500 group-hover:bg-teal-500 group-hover:text-white' : 'bg-indigo-50 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white'} transition-colors`}>
                <i className={`fas ${icon}`}></i>
            </div>
            <h4 className="font-black text-slate-800 text-sm leading-tight">{title}</h4>
            <p className="text-[10px] text-slate-400 font-bold mt-1">{desc}</p>
        </button>
    );

    const pendientes = maestros.filter(m => m.estado === 'Pendiente');
    const activos = maestros.filter(m => m.estado === 'Activo');
    const listaAdminVisible = maestros.filter(m => m.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (m.campo && m.campo.toLowerCase().includes(busqueda.toLowerCase())));
    
    const gruposPersonal = { 'MAESTRO': [], 'AUXILIAR': [], 'LOGISTICA': [], 'SECRETARIA': [], 'TESORERO': [], 'Dirección': [] };
    listaAdminVisible.forEach(m => { if (m.estado === 'Activo') { if (gruposPersonal[m.clase]) gruposPersonal[m.clase].push(m); else gruposPersonal[m.clase] = [m]; } });
    const rolesConGente = Object.keys(gruposPersonal).filter(k => gruposPersonal[k].length > 0);

    const camposActivos = [...new Set([...maestros.filter(m => m.clase !== 'LOGISTICA' && m.campo).map(m => m.campo), ...todosLosAlumnos.map(a => a.campo), ...historialVisible.map(h => h.campo)].filter(Boolean))].sort();
    const camposFijos = ["La Isla", "Las Delicias", "El Amatal", "El Manguito", "Buenos Aires", "Corozal #1", "El Porvenir", "El Caulote", "Corozal #2", "Valle Encantado", "La Playa"];

    const toggleCampoRuta = (c) => {
        if(camposRuta.includes(c)) setCamposRuta(camposRuta.filter(x => x !== c));
        else setCamposRuta([...camposRuta, c]);
    };

    const submitMision = (e) => {
        e.preventDefault();
        if(camposRuta.length === 0) { alert("⚠️ Debes seleccionar al menos un campo para armar la ruta."); return; }
        const fd = new FormData(e.target);
        onCrearEntrega({ campos: camposRuta, cantidad: parseInt(fd.get('cantidad')), grupo: fd.get('grupo') });
        setCamposRuta([]); 
        e.target.reset();
    };

    const handleGuardarNuevaCantidadRuta = async (idEntrega) => {
        const isSandbox = datosUsuarioActual?.id === 'user_sandbox_secreto';
        if (isSandbox) { alert("🔒 MODO DESARROLLADOR\n\nAcción simulada: [Editar Cantidad de Víveres en Ruta]"); setRutaEditandoId(null); return; }
        const cantidadNumerica = parseInt(nuevaCantidadRuta);
        if (isNaN(cantidadNumerica) || cantidadNumerica < 0) { alert("Por favor ingresa una cantidad válida."); return; }
        try { await window.db.collection('entregas').doc(idEntrega).update({ cantidad: cantidadNumerica }); setRutaEditandoId(null); } catch (error) { alert("Error al actualizar la cantidad."); }
    };

    let tp = 0, ta = 0, tperm = 0; 
    let totalOfrendaSemana = 0;
    todasAsistencias.forEach(r => { 
        if(r.totales){ tp+=r.totales.presentes; ta+=r.totales.ausentes; tperm+=r.totales.permisos; } 
        totalOfrendaSemana += (Number(r.ofrenda) || 0);
    });
    
    const difGeneral = (fondoTotal || 0) - (fondoSecretariaTotal || 0);
    const difVoluntario = (fondoVoluntarioTotal || 0) - (fondoSecretariaVoluntarioTotal || 0);
    const hayDescuadreGeneral = difGeneral !== 0;
    const hayDescuadreVoluntario = difVoluntario !== 0;

    let contenidoAdmin;

    if (vistaActual === 'inicio') {
        
        if (subVistaInicio === null) {
            contenidoAdmin = (
                <div className="space-y-4 animate-in fade-in duration-300 pt-2 px-1 pb-24">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800">Centro de Control</h2>
                            <p className="text-slate-400 text-xs mt-1">Supervisión general del ministerio</p>
                        </div>
                        <div className="flex space-x-2">
                            {/* BOTÓN DE RESPALDO (NUEVO) */}
                            <button onClick={handleDescargarRespaldo} className="flex items-center px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-sky-500 text-white hover:bg-sky-600 shadow-md active:scale-95" title="Descargar Copia de Seguridad">
                                <i className="fas fa-cloud-download-alt"></i>
                            </button>
                            {/* BOTÓN DE MANTENIMIENTO */}
                            <button onClick={onToggleMantenimiento} className={`flex items-center px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mantenimiento ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 animate-pulse' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                                <i className={`fas fa-tools ${mantenimiento ? '' : 'mr-1.5'}`}></i> {mantenimiento ? 'En Pausa' : 'Activo'}
                            </button>
                        </div>
                    </div>

                    {pendientes.length > 0 && (
                        <div className="bg-amber-400 p-5 rounded-[24px] shadow-lg shadow-amber-200 text-white">
                            <h3 className="font-black text-sm mb-3 flex items-center"><i className="fas fa-bell mr-2 animate-bounce"></i> Solicitudes Pendientes ({pendientes.length})</h3>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                {pendientes.map(p => (
                                    <div key={p.id} className="bg-white/20 p-3 rounded-2xl flex justify-between items-center backdrop-blur-sm">
                                        <div><p className="font-bold text-sm">{p.nombre}</p><span className="text-[9px] font-black uppercase tracking-widest opacity-80">{p.clase} • {p.campo}</span></div>
                                        <div className="flex space-x-2"><button onClick={() => onApprove(p.id)} className="w-8 h-8 bg-white text-amber-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-colors"><i className="fas fa-check"></i></button><button onClick={() => onDelete(p)} className="w-8 h-8 bg-black/10 text-white rounded-xl hover:bg-rose-500 transition-colors"><i className="fas fa-times"></i></button></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(hayDescuadreGeneral || hayDescuadreVoluntario) && (
                        <div className="bg-rose-50 border-l-4 border-l-rose-500 p-4 rounded-2xl flex items-center shadow-sm">
                            <div className="w-10 h-10 bg-rose-100 text-rose-500 rounded-xl flex items-center justify-center text-xl shrink-0 mr-3"><i className="fas fa-exclamation-triangle"></i></div>
                            <div>
                                <h4 className="font-black text-rose-700 text-xs uppercase tracking-widest">Alerta de Descuadre</h4>
                                {hayDescuadreGeneral && <p className="text-[10px] text-rose-600 font-bold mt-0.5">General: Diferencia de ${Math.abs(difGeneral).toFixed(2)}</p>}
                                {hayDescuadreVoluntario && <p className="text-[10px] text-rose-600 font-bold mt-0.5">Voluntario: Diferencia de ${Math.abs(difVoluntario).toFixed(2)}</p>}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <ActionCard title="Auditoría Financiera" desc="Tesorero vs Secretaría" icon="fa-balance-scale" color="sky" onClick={()=>setSubVistaInicio('auditoria')} />
                        <ActionCard title="Ofrendas de Clases" desc="Recolección por campos" icon="fa-hand-holding-usd" color="amber" onClick={()=>setSubVistaInicio('ofrendas')} />
                        <ActionCard title="Asistencia Global" desc="Métricas semanales" icon="fa-users" color="emerald" onClick={()=>setSubVistaInicio('asistencia')} />
                        <ActionCard title="Demografía Red" desc="Filtro de edades general" icon="fa-chart-pie" color="indigo" onClick={()=>setSubVistaInicio('demografia')} />
                    </div>
                </div>
            );
        }

        if (subVistaInicio === 'auditoria') {
            const dataActiva = tabAuditoria === 'tesoreria' ? historialIngresos : historialSecretaria;
            
            const historialFiltrado = dataActiva.filter(h => {
                if (fondoAuditoriaActivo === 'general') return h.fondo === 'general' || !h.fondo;
                return h.fondo === 'voluntario';
            });
            
            const gruposMesesFinanzas = agruparFinanzas(historialFiltrado);
            
            const saldoTesoreroAct = fondoAuditoriaActivo === 'general' ? fondoTotal : (fondoVoluntarioTotal || 0);
            const saldoSecretariaAct = fondoAuditoriaActivo === 'general' ? fondoSecretariaTotal : (fondoSecretariaVoluntarioTotal || 0);
            const diferenciaFinanzasAct = saldoTesoreroAct - saldoSecretariaAct;
            const colorTemaAdmin = fondoAuditoriaActivo === 'voluntario' ? 'teal' : 'sky';

            contenidoAdmin = (
                <div className="animate-in slide-in-from-right duration-300 space-y-4 pt-2 flex flex-col h-full">
                    <button onClick={() => setSubVistaInicio(null)} className="text-slate-500 font-black text-[10px] uppercase tracking-widest mb-1 px-2 hover:text-indigo-500 transition-colors w-max"><i className="fas fa-arrow-left mr-2"></i> Volver al Menú</button>
                    
                    <div className="px-2 mb-2">
                        <h2 className="text-2xl font-black text-slate-800">Auditoría Financiera</h2>
                        <p className="text-slate-400 text-xs">Supervisión en vivo de movimientos</p>
                    </div>

                    <div className="flex bg-slate-200 p-1.5 rounded-2xl mx-1 shadow-inner mb-2">
                        <button onClick={() => {setFondoAuditoriaActivo('general'); setMesAuditoriaExp(null); setSemanaAuditoriaExp(null);}} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${fondoAuditoriaActivo === 'general' ? 'bg-white text-sky-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Fondo General</button>
                        <button onClick={() => {setFondoAuditoriaActivo('voluntario'); setMesAuditoriaExp(null); setSemanaAuditoriaExp(null);}} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${fondoAuditoriaActivo === 'voluntario' ? 'bg-white text-teal-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Voluntario Campos</button>
                    </div>

                    <div className="bg-slate-800 rounded-[32px] p-6 shadow-xl relative overflow-hidden mx-1 shrink-0">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-bl-[100px] pointer-events-none"></div>
                        <div className="flex justify-between items-center mb-5 relative z-10">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest"><i className="fas fa-shield-alt mr-1"></i> Control Cruzado</span>
                            <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border ${diferenciaFinanzasAct === 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                                {diferenciaFinanzasAct === 0 ? 'CUADRADO' : `DESCUADRE $${Math.abs(diferenciaFinanzasAct).toFixed(2)}`}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 text-center">
                                <p className={`text-[9px] font-bold text-${colorTemaAdmin}-400 uppercase tracking-widest mb-1`}><i className="fas fa-vault mr-1"></i> Tesorería</p>
                                <p className="text-2xl font-black text-white">${Number(saldoTesoreroAct || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 text-center">
                                <p className="text-[9px] font-bold text-pink-400 uppercase tracking-widest mb-1"><i className="fas fa-book mr-1"></i> Secretaría</p>
                                <p className="text-2xl font-black text-white">${Number(saldoSecretariaAct || 0).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 bg-white rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t border-slate-100 p-6 overflow-hidden flex flex-col mt-2 mx-1">
                        <div className="flex space-x-2 mb-4 shrink-0">
                            <button onClick={() => {setTabAuditoria('tesoreria'); setMesAuditoriaExp(null); setSemanaAuditoriaExp(null);}} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${tabAuditoria === 'tesoreria' ? `bg-${colorTemaAdmin}-50 text-${colorTemaAdmin}-600 border-${colorTemaAdmin}-100 shadow-sm` : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>Ver Tesorería</button>
                            <button onClick={() => {setTabAuditoria('secretaria'); setMesAuditoriaExp(null); setSemanaAuditoriaExp(null);}} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${tabAuditoria === 'secretaria' ? 'bg-pink-50 text-pink-600 border-pink-100 shadow-sm' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>Ver Secretaría</button>
                        </div>
                        
                        <div className="overflow-y-auto space-y-3 pb-24 pr-1 flex-1">
                            {gruposMesesFinanzas.length === 0 ? <p className="text-center text-slate-400 text-xs italic mt-8">Sin registros guardados.</p> : 
                                gruposMesesFinanzas.map(grupo => {
                                    const isExpMes = mesAuditoriaExp === grupo.id;
                                    return (
                                        <div key={grupo.id} className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden shadow-sm transition-all duration-300">
                                            {/* ACORDEÓN MES */}
                                            <button onClick={() => {setMesAuditoriaExp(isExpMes ? null : grupo.id); setSemanaAuditoriaExp(null);}} className="w-full p-4 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                                                <div className="text-left">
                                                    <p className="font-black text-slate-700 text-sm capitalize">{grupo.mesLabel}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">{grupo.semanasArray.length} semanas</p>
                                                </div>
                                                <div className="flex items-center space-x-3 text-[10px] font-black">
                                                    <div className="flex flex-col items-end mr-2">
                                                        <span className="text-emerald-500">+${grupo.totalIngreso.toFixed(2)}</span>
                                                        <span className="text-rose-500">-${grupo.totalEgreso.toFixed(2)}</span>
                                                    </div>
                                                    <i className={`fas fa-chevron-down text-slate-300 transition-transform duration-300 ${isExpMes ? 'rotate-180' : ''}`}></i>
                                                </div>
                                            </button>
                                            
                                            {isExpMes && (
                                                <div className="p-3 pt-0 border-t border-slate-100 bg-slate-50 animate-in slide-in-from-top-2 duration-200 space-y-3">
                                                    <div className="mt-3 space-y-3">
                                                        {grupo.semanasArray.map(sem => {
                                                            const isSemExp = semanaAuditoriaExp === `${grupo.id}-${sem.id}`;
                                                            return (
                                                                <div key={sem.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                                                    {/* ACORDEÓN SEMANA */}
                                                                    <button onClick={() => setSemanaAuditoriaExp(isSemExp ? null : `${grupo.id}-${sem.id}`)} className="w-full p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
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

                                                                    {/* DETALLES */}
                                                                    {isSemExp && (
                                                                        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
                                                                            {sem.registros.map(h => (
                                                                                <div key={h.id} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex flex-col justify-between items-start gap-1">
                                                                                    <div className="flex justify-between items-start w-full">
                                                                                        <div className="w-2/3 pr-2">
                                                                                            <p className="font-bold text-slate-700 text-[11px] truncate mb-1">{h.descripcion}</p>
                                                                                            <p className="text-[9px] font-bold text-slate-400 uppercase"><i className="fas fa-user-tag mr-1 text-slate-300"></i>{h.registradoPor} • {h.fecha}</p>
                                                                                        </div>
                                                                                        <div className={`px-2 py-1 rounded-lg text-[10px] font-black shadow-sm shrink-0 ${h.tipo === 'ingreso' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                                                            {h.tipo === 'ingreso' ? '+' : '-'}${Number(h.monto).toFixed(2)}
                                                                                        </div>
                                                                                    </div>
                                                                                    {h.campo && (
                                                                                        <p className="text-[9px] text-teal-600 font-bold uppercase mt-1 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                                                                                            📍 {h.campo}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            ))}
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
                            }
                        </div>
                    </div>
                </div>
            );
        }

        if (subVistaInicio === 'ofrendas') {
            const gruposMesesOfrendas = agruparOfrendas(historialVisible);

            contenidoAdmin = (
                <div className="animate-in slide-in-from-right duration-300 space-y-4 pt-2 flex flex-col h-full">
                    <button onClick={() => setSubVistaInicio(null)} className="text-slate-500 font-black text-[10px] uppercase tracking-widest mb-1 px-2 hover:text-amber-500 transition-colors w-max"><i className="fas fa-arrow-left mr-2"></i> Volver al Menú</button>
                    <div className="px-2 mb-2">
                        <h2 className="text-2xl font-black text-slate-800">Ofrendas de Clases</h2>
                        <p className="text-slate-400 text-xs">Recolectadas por maestros (Sáb/Dom)</p>
                    </div>

                    <div className="bg-amber-400 p-6 rounded-[32px] text-white shadow-lg shadow-amber-200 text-center relative overflow-hidden mx-1 shrink-0">
                        <div className="w-40 h-40 bg-white opacity-10 rounded-full absolute -top-10 -right-10"></div>
                        <i className="fas fa-coins absolute -left-4 -bottom-4 text-7xl opacity-20"></i>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Total Semanal (Actual)</p>
                            <p className="text-5xl font-black tracking-tighter">${totalOfrendaSemana.toFixed(2)}</p>
                            <p className="text-[9px] font-bold mt-2 bg-amber-500/50 inline-block px-3 py-1 rounded-full">{textoFechas}</p>
                        </div>
                    </div>

                    <div className="flex-1 bg-white rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t border-slate-100 p-6 overflow-hidden flex flex-col mt-2 mx-1">
                        <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest mb-4 shrink-0"><i className="fas fa-history text-amber-500 mr-2"></i> Récord por Mes y Semana</h3>
                        <div className="overflow-y-auto space-y-3 pb-24 pr-1 flex-1">
                            {gruposMesesOfrendas.length === 0 ? <p className="text-center text-slate-400 text-xs italic mt-8">Aún no hay ofrendas registradas en las clases.</p> :
                                gruposMesesOfrendas.map(grupo => {
                                    const isExpMes = mesOfrendaExp === grupo.id;
                                    return (
                                        <div key={grupo.id} className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden shadow-sm transition-all duration-300">
                                            {/* ACORDEÓN MES */}
                                            <button onClick={() => {setMesOfrendaExp(isExpMes ? null : grupo.id); setSemanaOfrendaExp(null);}} className="w-full p-4 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                                                <div className="text-left">
                                                    <p className="font-black text-slate-700 text-sm capitalize">{grupo.mesLabel}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">{grupo.semanasArray.length} semanas con ofrenda</p>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <span className="bg-amber-100 text-amber-600 font-black text-sm px-3 py-1.5 rounded-xl">${grupo.total.toFixed(2)}</span>
                                                    <i className={`fas fa-chevron-down text-slate-300 transition-transform duration-300 ${isExpMes ? 'rotate-180' : ''}`}></i>
                                                </div>
                                            </button>
                                            
                                            {isExpMes && (
                                                <div className="p-3 pt-0 border-t border-slate-100 bg-slate-50 animate-in slide-in-from-top-2 duration-200 space-y-3">
                                                    <div className="mt-3 space-y-3">
                                                        {grupo.semanasArray.map(sem => {
                                                            const isSemExp = semanaOfrendaExp === `${grupo.id}-${sem.id}`;
                                                            return (
                                                                <div key={sem.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                                                    {/* ACORDEÓN SEMANA */}
                                                                    <button onClick={() => setSemanaOfrendaExp(isSemExp ? null : `${grupo.id}-${sem.id}`)} className="w-full p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                                                        <div className="text-left">
                                                                            <p className="font-bold text-slate-700 text-xs">{sem.label}</p>
                                                                            <p className="text-[9px] text-slate-400 font-bold mt-0.5">{sem.registros.length} aportes</p>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2 text-[9px] font-black">
                                                                            <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">${sem.total.toFixed(2)}</span>
                                                                            <i className={`fas fa-chevron-down text-slate-300 transition-transform duration-300 ${isSemExp ? 'rotate-180' : ''}`}></i>
                                                                        </div>
                                                                    </button>

                                                                    {/* DETALLES DE LA SEMANA */}
                                                                    {isSemExp && (
                                                                        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
                                                                            {sem.registros.map((det, i) => (
                                                                                <div key={i} className="flex justify-between items-center text-xs font-bold bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                                                                    <div className="flex flex-col w-2/3 truncate">
                                                                                        <span className="text-slate-700 truncate"><i className="fas fa-map-marker-alt text-amber-400 mr-1.5"></i>{det.campo}</span>
                                                                                        <span className="text-[9px] text-slate-400 mt-1 uppercase tracking-wide">{formatFechaDia(det.fecha)}</span>
                                                                                    </div>
                                                                                    <span className="text-emerald-600 shrink-0 font-black">${(Number(det.ofrenda)||0).toFixed(2)}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </div>
                </div>
            );
        }

        if (subVistaInicio === 'asistencia') {
            const gruposMesesAsistencia = agruparAsistenciaPorMesYSemana(historialVisible);

            contenidoAdmin = (
                <div className="animate-in slide-in-from-right duration-300 space-y-4 pt-2 flex flex-col h-full">
                    <button onClick={() => setSubVistaInicio(null)} className="text-slate-500 font-black text-[10px] uppercase tracking-widest mb-1 px-2 hover:text-emerald-500 transition-colors w-max"><i className="fas fa-arrow-left mr-2"></i> Volver al Menú</button>
                    <div className="px-2 mb-2">
                        <h2 className="text-2xl font-black text-slate-800">Asistencia Global</h2>
                        <p className="text-slate-400 text-xs">Acumulado y reportes por campos</p>
                    </div>

                    <div className="bg-emerald-500 rounded-[32px] p-6 shadow-xl mx-1 relative overflow-hidden text-white shrink-0">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-bl-[100px] pointer-events-none"></div>
                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <div><h3 className="font-bold text-white text-sm flex items-center"><i className="fas fa-chart-line mr-2"></i> Resumen de Semana</h3></div>
                            <span className="text-[9px] bg-emerald-600/50 text-emerald-50 font-black tracking-widest px-3 py-1.5 rounded-lg uppercase">{textoFechas}</span>
                        </div>
                        <div className="flex justify-around text-center divide-x divide-emerald-400/50 relative z-10">
                            <div className="px-2 w-1/3"><p className="text-4xl font-black tracking-tighter">{tp}</p><p className="text-[9px] font-bold text-emerald-100 uppercase tracking-widest mt-1">Presentes</p></div>
                            <div className="px-2 w-1/3"><p className="text-4xl font-black tracking-tighter text-rose-200">{ta}</p><p className="text-[9px] font-bold text-emerald-100 uppercase tracking-widest mt-1">Ausentes</p></div>
                            <div className="px-2 w-1/3"><p className="text-4xl font-black tracking-tighter text-amber-200">{tperm}</p><p className="text-[9px] font-bold text-emerald-100 uppercase tracking-widest mt-1">Permisos</p></div>
                        </div>
                    </div>

                    <div className="flex-1 bg-white rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t border-slate-100 p-6 overflow-hidden flex flex-col mt-2 mx-1">
                        <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest mb-4 shrink-0"><i className="fas fa-list-alt text-emerald-500 mr-2"></i> Récord por Mes y Semana</h3>
                        <div className="overflow-y-auto space-y-3 pb-24 pr-1 flex-1">
                            {gruposMesesAsistencia.length === 0 ? <p className="text-center text-slate-400 text-xs italic mt-8">Sin registros de asistencia guardados.</p> : 
                                gruposMesesAsistencia.map(grupo => {
                                    const isExpMes = mesAsistenciaExp === grupo.id;
                                    
                                    return (
                                        <div key={grupo.id} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all duration-300">
                                            
                                            {/* ACORDEÓN NIVEL 1: MES */}
                                            <button onClick={() => { setMesAsistenciaExp(isExpMes ? null : grupo.id); setSemanaAsistenciaExp(null); }} className="w-full p-4 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                                                <div className="text-left">
                                                    <p className="font-black text-slate-700 text-sm capitalize">{grupo.mesLabel}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">{grupo.semanasArray.length} semanas registradas</p>
                                                </div>
                                                <div className="flex items-center space-x-3 text-[10px] font-black">
                                                    <div className="flex space-x-2 mr-2">
                                                        <span className="text-emerald-500 bg-emerald-50 px-2 py-1 rounded">P:{grupo.tp}</span>
                                                        <span className="text-rose-500 bg-rose-50 px-2 py-1 rounded">A:{grupo.ta}</span>
                                                    </div>
                                                    <i className={`fas fa-chevron-down text-slate-300 transition-transform duration-300 ${isExpMes ? 'rotate-180' : ''}`}></i>
                                                </div>
                                            </button>
                                            
                                            {isExpMes && (
                                                <div className="p-3 pt-0 border-t border-slate-100 bg-slate-50 animate-in slide-in-from-top-2 duration-200 space-y-3">
                                                    <div className="mt-3 space-y-3">
                                                        {grupo.semanasArray.map(sem => {
                                                            const isSemExp = semanaAsistenciaExp === `${grupo.id}-${sem.id}`;
                                                            
                                                            return (
                                                                <div key={sem.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                                                    
                                                                    {/* ACORDEÓN NIVEL 2: SEMANA */}
                                                                    <button onClick={() => setSemanaAsistenciaExp(isSemExp ? null : `${grupo.id}-${sem.id}`)} className="w-full p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                                                        <div className="text-left">
                                                                            <p className="font-bold text-slate-700 text-xs">{sem.label}</p>
                                                                            <p className="text-[9px] text-slate-400 font-bold mt-0.5">{sem.registros.length} reportes</p>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2 text-[9px] font-black">
                                                                            <div className="flex space-x-1 mr-1">
                                                                                <span className="text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded">P:{sem.tp}</span>
                                                                                <span className="text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">A:{sem.ta}</span>
                                                                            </div>
                                                                            <i className={`fas fa-chevron-down text-slate-300 transition-transform duration-300 ${isSemExp ? 'rotate-180' : ''}`}></i>
                                                                        </div>
                                                                    </button>

                                                                    {/* DETALLES DE LA SEMANA (CAMPOS) */}
                                                                    {isSemExp && (
                                                                        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
                                                                            {sem.registros.map((h, idx) => (
                                                                                <div key={idx} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex justify-between items-center">
                                                                                    <div className="w-1/2 pr-2">
                                                                                        <p className="font-bold text-slate-700 text-xs truncate mb-0.5"><i className="fas fa-map-marker-alt text-emerald-400 mr-1.5"></i> {h.campo}</p>
                                                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{formatFechaDia(h.fecha)}</p>
                                                                                    </div>
                                                                                    <div className="flex space-x-1 text-[9px] font-black tracking-wider shrink-0">
                                                                                        <span className="bg-slate-50 text-emerald-600 px-2 py-1.5 rounded border border-slate-100">P:{h.totales?.presentes || 0}</span>
                                                                                        <span className="bg-slate-50 text-rose-500 px-2 py-1.5 rounded border border-slate-100">A:{h.totales?.ausentes || 0}</span>
                                                                                        <span className="bg-slate-50 text-amber-500 px-2 py-1.5 rounded border border-slate-100">Pe:{h.totales?.permisos || 0}</span>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
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
                            }
                        </div>
                    </div>
                </div>
            );
        }

        if (subVistaInicio === 'demografia') {
            const adminAlumnosFiltrados = todosLosAlumnos.filter(a => { if (edadMin !== '' && a.edad < parseInt(edadMin)) return false; if (edadMax !== '' && a.edad > parseInt(edadMax)) return false; return true; });
            const m = adminAlumnosFiltrados.filter(a => a.genero === 'M').length; 
            const f = adminAlumnosFiltrados.filter(a => a.genero === 'F').length;

            contenidoAdmin = (
                <div className="animate-in slide-in-from-right duration-300 space-y-4 pt-2">
                    <button onClick={() => setSubVistaInicio(null)} className="text-slate-500 font-black text-[10px] uppercase tracking-widest mb-1 px-2 hover:text-indigo-500 transition-colors"><i className="fas fa-arrow-left mr-2"></i> Volver al Menú</button>
                    <div className="px-2 mb-4">
                        <h2 className="text-2xl font-black text-slate-800">Filtro Demográfico</h2>
                        <p className="text-slate-400 text-xs">Analizar edades en toda la Red</p>
                    </div>

                    <div className="bg-sky-50 rounded-[32px] p-6 shadow-sm border border-sky-100 mx-1">
                        <div className="flex space-x-4 mb-4">
                            <div className="w-1/2"><label className="text-[10px] font-bold text-sky-600 uppercase ml-2 tracking-widest mb-1 block">Edad Mínima</label><input type="number" placeholder="Ej: 0" className="w-full p-4 bg-white rounded-2xl outline-none border border-sky-100 focus:ring-2 focus:ring-sky-300 text-2xl font-black text-slate-700 text-center shadow-sm transition-all" value={edadMin} onChange={e=>setEdadMin(e.target.value)} /></div>
                            <div className="w-1/2"><label className="text-[10px] font-bold text-sky-600 uppercase ml-2 tracking-widest mb-1 block">Edad Máxima</label><input type="number" placeholder="Ej: 12" className="w-full p-4 bg-white rounded-2xl outline-none border border-sky-100 focus:ring-2 focus:ring-sky-300 text-2xl font-black text-slate-700 text-center shadow-sm transition-all" value={edadMax} onChange={e=>setEdadMax(e.target.value)} /></div>
                        </div>
                        
                        <div className="bg-white p-5 rounded-2xl shadow-sm mt-6 border border-sky-100">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">Resultado del Filtro</h4>
                            <div className="flex justify-around items-center">
                                <div className="text-center w-1/3"><p className="text-4xl font-black text-sky-600 tracking-tighter">{adminAlumnosFiltrados.length}</p><p className="text-[9px] font-bold text-sky-500 uppercase mt-1">Total</p></div>
                                <div className="w-px h-12 bg-slate-100"></div>
                                <div className="text-center w-1/3"><p className="text-3xl font-black text-indigo-500 tracking-tighter">{m}</p><p className="text-[9px] font-bold text-indigo-400 uppercase mt-1">Niños</p></div>
                                <div className="w-px h-12 bg-slate-100"></div>
                                <div className="text-center w-1/3"><p className="text-3xl font-black text-pink-500 tracking-tighter">{f}</p><p className="text-[9px] font-bold text-pink-400 uppercase mt-1">Niñas</p></div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
    }

    if (vistaActual === 'poblacion') {
        contenidoAdmin = (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
                <div className="px-2 mb-2 pt-2"><h2 className="text-2xl font-black text-slate-800">Campos Activos</h2><p className="text-slate-400 text-xs">Gestión y control de material</p></div>

                <div className="space-y-3 pb-24 px-1 mt-4">
                    {camposActivos.length === 0 ? (
                        <div className="text-center p-8 bg-slate-50 rounded-[32px] mt-4 border-2 border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl text-slate-300 mx-auto mb-3 shadow-sm"><i className="fas fa-seedling"></i></div>
                            <p className="text-sm font-bold text-slate-500">No hay campos activos aún</p>
                        </div>
                    ) : (
                        camposActivos.map(campo => {
                            const total = todosLosAlumnos.filter(a => a.campo === campo).length; 
                            const isExpanded = campoExpandido === campo;
                            
                            const registrosCampoTodo = historialAsistencias.filter(h => h.campo === campo && h.leccion !== undefined);
                            const registrosOrdenados = registrosCampoTodo.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                            const ultimoReg = registrosOrdenados[0];
                            
                            let currLec = 0;
                            if (ultimoReg) currLec = parseInt(ultimoReg.leccion);

                            const prog = calcProgreso(currLec);
                            const registrosCampo = historialVisible.filter(h => h.campo === campo);
                            
                            return (
                                <div key={campo} className="bg-slate-50 rounded-[24px] border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">
                                    
                                    <button onClick={() => { setCampoExpandido(isExpanded ? null : campo); setCampoAccionActiva(null); setMesClasesExp(null); setSemanaClasesExp(null); }} className="w-full bg-white p-5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                        <div className="text-left w-3/4">
                                            <h4 className="font-black text-slate-800 text-lg leading-tight truncate">{campo}</h4>
                                            <p className="text-[11px] text-slate-500 font-bold mt-1 uppercase tracking-widest"><i className="fas fa-users mr-1.5 text-indigo-400"></i> {total} Alumnos</p>
                                        </div>
                                        <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors shadow-sm shrink-0 ${isExpanded ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            <i className={`fas fa-chevron-down transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="p-5 pt-4 animate-in slide-in-from-top-2 duration-200 border-t border-slate-100">
                                            
                                            <div className="mb-5 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-2 px-1">
                                                    <span>{!ultimoReg ? 'Material: Sin Asignar' : `Material: Parte ${prog.parte} • Lección ${prog.leccion}`}</span>
                                                    <span className="text-indigo-500">{prog.porc}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden"><div className="bg-indigo-500 h-2 rounded-full transition-all duration-1000" style={{width: `${prog.porc}%`}}></div></div>
                                            </div>

                                            <div className="flex space-x-2">
                                                <button onClick={() => { setCampoAccionActiva(campoAccionActiva === 'clases' ? null : 'clases'); setMesClasesExp(null); setSemanaClasesExp(null); }} className={`flex-1 py-3 rounded-xl text-[11px] font-black transition-colors border ${campoAccionActiva === 'clases' ? 'bg-indigo-500 text-white border-indigo-600 shadow-md' : 'bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50'}`}><i className="fas fa-history mr-1.5"></i> Clases</button>
                                                <button onClick={() => setCampoAccionActiva(campoAccionActiva === 'asignar' ? null : 'asignar')} className={`flex-1 py-3 rounded-xl text-[11px] font-black transition-colors border ${campoAccionActiva === 'asignar' ? 'bg-sky-500 text-white border-sky-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}><i className="fas fa-cog mr-1.5"></i> Asignar</button>
                                                <button onClick={() => onDeleteCampo(campo)} className="w-12 flex flex-col justify-center items-center rounded-xl text-rose-500 bg-white border border-rose-200 hover:bg-rose-500 hover:text-white transition-colors shrink-0"><i className="fas fa-trash-alt"></i></button>
                                            </div>

                                            {campoAccionActiva === 'asignar' && (
                                                <div className="mt-4 p-4 bg-white rounded-2xl border border-sky-100 animate-in fade-in shadow-sm">
                                                    <p className="text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest text-center"><i className="fas fa-cog mr-1"></i> Asignar Lección Exacta</p>
                                                    <form onSubmit={(e) => { 
                                                        e.preventDefault(); 
                                                        onResetLecciones(campo, parseInt(e.target.leccion.value)); 
                                                        setCampoAccionActiva(null); 
                                                    }} className="flex space-x-2">
                                                        <input type="number" name="leccion" min="1" max="54" required placeholder="N° (1 al 54)" className="w-1/2 p-3 bg-slate-50 rounded-xl text-sm font-black text-slate-700 text-center border border-slate-200 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all" />
                                                        <button type="submit" className="w-1/2 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-[11px] font-black shadow-md active:scale-95 transition-all"><i className="fas fa-check mr-2"></i>Aplicar</button>
                                                    </form>
                                                    <p className="text-[9px] text-slate-400 text-center mt-3 font-bold">Lec. 1 al 25 = Mat 1 | Lec. 26 al 54 = Mat 2</p>
                                                </div>
                                            )}

                                            {/* HISTORIAL DE CLASES */}
                                            {campoAccionActiva === 'clases' && (
                                                <div className="mt-4 pt-4 border-t border-slate-200 animate-in fade-in">
                                                    <p className="text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest"><i className="fas fa-history mr-1"></i> Historial de Clases ({registrosCampo.length})</p>
                                                    
                                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                                        {registrosCampo.length === 0 ? <p className="text-xs text-slate-400 italic text-center py-2">Sin clases registradas aún.</p> : (() => {
                                                            const gruposMesesCampo = agruparAsistenciaPorMesYSemana(registrosCampo);
                                                            return gruposMesesCampo.map(grupo => {
                                                                const isExpMes = mesClasesExp === `${campo}-${grupo.id}`;
                                                                return (
                                                                    <div key={grupo.id} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all duration-300">
                                                                        
                                                                        {/* ACORDEÓN MES (CAMPO) */}
                                                                        <button onClick={() => { setMesClasesExp(isExpMes ? null : `${campo}-${grupo.id}`); setSemanaClasesExp(null); }} className="w-full p-3 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                                                                            <div className="text-left">
                                                                                <p className="font-bold text-slate-700 text-xs capitalize">{grupo.mesLabel}</p>
                                                                            </div>
                                                                            <div className="flex items-center space-x-2 text-[9px] font-black">
                                                                                <span className="text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">P:{grupo.tp}</span>
                                                                                <i className={`fas fa-chevron-down text-slate-300 transition-transform duration-300 ${isExpMes ? 'rotate-180' : ''}`}></i>
                                                                            </div>
                                                                        </button>
                                                                        
                                                                        {/* ACORDEÓN SEMANAS (CAMPO) */}
                                                                        {isExpMes && (
                                                                            <div className="p-2 border-t border-slate-100 bg-slate-50 space-y-2">
                                                                                {grupo.semanasArray.map(sem => {
                                                                                    const isSemExp = semanaClasesExp === `${campo}-${grupo.id}-${sem.id}`;
                                                                                    return (
                                                                                        <div key={sem.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                                                                                            <button onClick={() => setSemanaClasesExp(isSemExp ? null : `${campo}-${grupo.id}-${sem.id}`)} className="w-full p-2.5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                                                                                <div className="text-left">
                                                                                                    <p className="font-bold text-slate-600 text-[10px]">{sem.label}</p>
                                                                                                </div>
                                                                                                <div className="flex items-center space-x-2 text-[9px] font-black">
                                                                                                    <span className="text-slate-400">{sem.registros.length} rep.</span>
                                                                                                    <i className={`fas fa-chevron-down text-slate-300 transition-transform duration-300 ${isSemExp ? 'rotate-180' : ''}`}></i>
                                                                                                </div>
                                                                                            </button>

                                                                                            {/* DETALLES DEL REPORTE */}
                                                                                            {isSemExp && (
                                                                                                <div className="p-2 border-t border-slate-100 bg-slate-50/50 space-y-2">
                                                                                                    {sem.registros.map((h, idx) => (
                                                                                                        <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
                                                                                                            <div>
                                                                                                                <p className="font-black text-slate-700 text-xs">{formatFechaDia(h.fecha)}</p>
                                                                                                                <p className="text-[9px] text-slate-400 uppercase mt-0.5"><i className="fas fa-user mr-1"></i>{h.maestro}</p>
                                                                                                                {h.leccion !== undefined && (<p className={`text-[9px] font-bold mt-1 ${h.leccionImpartida ? 'text-indigo-500' : 'text-rose-500'}`}>Lec. {h.leccion} {h.leccionImpartida ? '✅' : '❌'}</p>)}
                                                                                                            </div>
                                                                                                            <div className="flex flex-col items-end">
                                                                                                                <span className="text-[10px] font-black text-emerald-600 mb-1.5 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100"><i className="fas fa-coins mr-1"></i>${Number(h.ofrenda||0).toFixed(2)}</span>
                                                                                                                <div className="flex space-x-1 text-[9px] font-black tracking-wider">
                                                                                                                    <span className="bg-slate-100 text-emerald-600 px-1.5 py-1 rounded border border-slate-200">P:{h.totales?.presentes || 0}</span>
                                                                                                                    <span className="bg-slate-100 text-rose-500 px-1.5 py-1 rounded border border-slate-200">A:{h.totales?.ausentes || 0}</span>
                                                                                                                    <span className="bg-slate-100 text-amber-500 px-1.5 py-1 rounded border border-slate-200">Pe:{h.totales?.permisos || 0}</span>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                </div>
                                            )}
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

    if (vistaActual === 'logistica') {
        const entregasPendientes = entregasLogistica.filter(e => e.estado === 'Pendiente');
        const entregasCompletadas = entregasLogistica.filter(e => e.estado === 'Entregado');
        const personalLogistica = activos.filter(m => m.clase === 'LOGISTICA'); 

        const gruposLogistica = agruparLogisticaPorGrupo(entregasCompletadas);

        const historicoRecibido = inventarioDatos?.historicoRecibido || 0;
        const actualRecibido = inventarioDatos?.actualRecibido || 0;

        let totalEntregadoHistorico = 0;
        let totalEntregadoActual = 0;
        const rutasParaArchivar = [];

        entregasLogistica.forEach(e => {
            let sumRoute = 0;
            if (e.detalles && typeof e.detalles === 'object') {
                Object.values(e.detalles).forEach(val => sumRoute += (Number(val) || 0));
            }
            totalEntregadoHistorico += sumRoute;
            
            if (e.estado === 'Entregado' && !e.archivado) {
                totalEntregadoActual += sumRoute;
                rutasParaArchivar.push(e);
            }
        });

        const stockFisico = historicoRecibido - totalEntregadoHistorico;
        const restanActual = actualRecibido - totalEntregadoActual;

        contenidoAdmin = (
            <div className="space-y-4 animate-in slide-in-from-right duration-300 h-full flex flex-col pt-2">
                <div className="px-2 mb-2"><h2 className="text-2xl font-black text-slate-800">Logística</h2><p className="text-slate-400 text-xs">Inventario, rutas y equipos</p></div>
                
                <div className="flex px-2 space-x-2 mb-2">
                    <button onClick={() => setSubVistaAdminLogistica('bodega')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${subVistaAdminLogistica === 'bodega' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-50 text-slate-400'}`}><i className="fas fa-warehouse mr-2"></i>Bodega</button>
                    <button onClick={() => setSubVistaAdminLogistica('misiones')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${subVistaAdminLogistica === 'misiones' ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-400'}`}><i className="fas fa-route mr-2"></i>Rutas</button>
                    <button onClick={() => setSubVistaAdminLogistica('equipos')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${subVistaAdminLogistica === 'equipos' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-400'}`}><i className="fas fa-users-cog mr-2"></i>Equipos</button>
                </div>

                <div className="flex-1 overflow-y-auto pb-24">
                    
                    {subVistaAdminLogistica === 'bodega' && (
                        <div className="animate-in slide-in-from-left duration-200 px-1 mt-2">
                            <div className="bg-indigo-600 p-6 rounded-[32px] text-white shadow-xl shadow-indigo-200 relative overflow-hidden mb-5 mt-2">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-bl-[100px] pointer-events-none"></div>
                                <div className="relative z-10">
                                    <p className="text-xs font-bold uppercase opacity-80 tracking-widest mb-1">Stock Físico en Bodega</p>
                                    <p className="text-6xl font-black tracking-tighter">{stockFisico}</p>
                                </div>
                                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm absolute bottom-6 right-6 z-10"><i className="fas fa-boxes"></i></div>
                            </div>

                            <div className="bg-slate-50 rounded-3xl p-5 mb-5 border border-slate-200 shadow-sm">
                                <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">Control Actual (Esta Jornada)</h3>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="text-center w-1/3"><p className="text-[10px] font-bold text-slate-400 uppercase">Recibido</p><p className="text-xl font-black text-slate-700">{actualRecibido}</p></div>
                                    <div className="text-center w-1/3 border-l border-r border-slate-200"><p className="text-[10px] font-bold text-slate-400 uppercase">Entregado</p><p className="text-xl font-black text-emerald-500">{totalEntregadoActual}</p></div>
                                    <div className="text-center w-1/3"><p className="text-[10px] font-bold text-slate-400 uppercase">Por entregar</p><p className="text-xl font-black text-amber-500">{restanActual}</p></div>
                                </div>
                                <button onClick={() => onCerrarJornada(rutasParaArchivar)} className="w-full py-3 bg-white text-rose-500 border border-rose-200 font-bold rounded-xl shadow-sm text-[11px] uppercase tracking-widest active:scale-95 transition-all"><i className="fas fa-flag-checkered mr-2"></i> Cerrar Jornada (Reiniciar Actual)</button>
                            </div>

                            <div className="flex space-x-3 mb-6">
                                <div className="w-1/2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Histórico Recibido</p>
                                    <p className="text-2xl font-black text-slate-700">{historicoRecibido}</p>
                                </div>
                                <div className="w-1/2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Histórico Entregado</p>
                                    <p className="text-2xl font-black text-emerald-500">{totalEntregadoHistorico}</p>
                                </div>
                            </div>

                            <form onSubmit={(e) => { e.preventDefault(); onActualizarInventario(Number(e.target.nuevoStock.value)); e.target.reset(); }} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                                <h3 className="font-bold text-slate-700 text-sm mb-1 flex items-center"><i className="fas fa-boxes text-indigo-500 mr-2"></i> Ajustar Inventario</h3>
                                <p className="text-[10px] text-slate-400 mb-3 leading-tight">Agrega stock o usa un signo menos (-) para restar mermas. Ej: -20</p>
                                <div className="flex space-x-3">
                                    <input type="number" name="nuevoStock" required placeholder="Ej: 100 o -20" className="w-2/3 p-4 bg-slate-50 rounded-2xl outline-none border border-slate-200 text-lg font-black text-slate-700 text-center focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
                                    <button type="submit" className="w-1/3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-md active:scale-95 transition-all flex items-center justify-center">Ajustar</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {subVistaAdminLogistica === 'misiones' && (
                        <>
                            <form onSubmit={submitMision} className="bg-amber-50 p-6 rounded-[32px] border border-amber-100 shadow-sm mx-1 mt-2">
                                <h3 className="font-bold text-amber-800 text-sm mb-4 flex items-center"><i className="fas fa-map-marked-alt mr-2"></i> Asignar / Agregar a Ruta</h3>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-amber-700 uppercase mb-2">1. Selecciona los campos a visitar:</p>
                                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-3 bg-white rounded-2xl border border-amber-100 shadow-inner">
                                            {camposFijos.map(c => (
                                                <label key={c} className="flex items-center space-x-2 text-xs font-bold text-slate-600 cursor-pointer active:scale-95 transition-transform">
                                                    <input type="checkbox" checked={camposRuta.includes(c)} onChange={() => toggleCampoRuta(c)} className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400" />
                                                    <span className="truncate">{c}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-amber-700 uppercase mb-2">2. Asigna Cantidad y Equipo:</p>
                                        <div className="flex space-x-3">
                                            <div className="w-1/2"><input type="number" name="cantidad" required placeholder="N° Víveres" className="w-full p-4 bg-white rounded-2xl outline-none border border-amber-100 text-sm font-bold text-slate-700 text-center shadow-sm focus:ring-2 focus:ring-amber-200" /></div>
                                            <div className="w-1/2">
                                                <select name="grupo" required className="w-full p-4 bg-white rounded-2xl outline-none border border-amber-100 text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-amber-200">
                                                    <option value="">¿A qué Grupo?</option>
                                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (<option key={n} value={`Grupo ${n}`}>Grupo {n}</option>))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all mt-2"><i className="fas fa-paper-plane mr-2"></i>Enviar Ruta</button>
                                </div>
                            </form>

                            <div className="mt-6 px-1">
                                {entregasPendientes.length > 0 && (
                                    <div className="mb-6"><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2 border-b border-slate-100 pb-2">Rutas Pendientes Activas ({entregasPendientes.length})</h4>
                                    <div className="space-y-3 mt-3">
                                        {entregasPendientes.map(e => {
                                            const totalEntregado = (e.detalles && typeof e.detalles === 'object') ? Object.values(e.detalles).reduce((sum, val) => sum + (Number(val) || 0), 0) : 0;
                                            const diferencia = (Number(e.cantidad) || 0) - totalEntregado;
                                            const camposArrayStr = Array.isArray(e.campos) ? e.campos.join(', ') : (e.campo || 'Campos no definidos');

                                            return (
                                                <div key={e.id} className="bg-white p-4 rounded-2xl border-l-4 border-l-amber-400 shadow-sm flex flex-col justify-between">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="pr-2">
                                                            <p className="font-black text-slate-800 text-sm mb-1">{e.grupo || 'Sin grupo'}</p>
                                                            <p className="text-[10px] text-slate-500 font-bold leading-relaxed"><i className="fas fa-map-marker-alt mr-1 text-amber-500"></i> {camposArrayStr}</p>
                                                        </div>
                                                        <button onClick={() => onBorrarEntrega(e.id)} className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-colors flex-shrink-0"><i className="fas fa-trash-alt"></i></button>
                                                    </div>
                                                    
                                                    <div className="bg-slate-50 p-2.5 rounded-xl mt-2 flex justify-between items-center text-[10px] font-black border border-slate-100 tracking-wide">
                                                        {rutaEditandoId === e.id ? (
                                                            <div className="flex items-center space-x-1.5">
                                                                <span className="text-indigo-600">Total:</span>
                                                                <input 
                                                                    type="number" 
                                                                    className="w-12 p-1 rounded border border-indigo-200 text-indigo-700 outline-none text-center" 
                                                                    value={nuevaCantidadRuta} 
                                                                    onChange={(ev) => setNuevaCantidadRuta(ev.target.value)} 
                                                                    autoFocus
                                                                />
                                                                <button onClick={() => handleGuardarNuevaCantidadRuta(e.id)} className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-md hover:bg-emerald-500 hover:text-white flex items-center justify-center"><i className="fas fa-check text-[9px]"></i></button>
                                                                <button onClick={() => setRutaEditandoId(null)} className="w-5 h-5 bg-rose-100 text-rose-600 rounded-md hover:bg-rose-500 hover:text-white flex items-center justify-center"><i className="fas fa-times text-[9px]"></i></button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => { setRutaEditandoId(e.id); setNuevaCantidadRuta(e.cantidad); }} className="text-indigo-600 flex items-center hover:bg-indigo-100 px-2 py-1 rounded transition-colors" title="Editar cantidad">
                                                                Total: {e.cantidad || 0} <i className="fas fa-pencil-alt ml-1 opacity-50"></i>
                                                            </button>
                                                        )}
                                                        <span className="text-emerald-600">Avance: {totalEntregado}</span>
                                                        <span className={diferencia < 0 ? 'text-rose-500' : 'text-amber-600'}>En Vehículo: {diferencia}</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-1.5">
                                                        {e.detalles && typeof e.detalles === 'object' && Object.entries(e.detalles).map(([campo, cant]) => {
                                                            const creador = e.bloqueos?.[campo]?.nombre;
                                                            return (
                                                                <p key={campo} className="text-[10px] font-bold text-slate-500 truncate flex justify-between bg-slate-50 p-1.5 rounded-lg">
                                                                    <span><i className="fas fa-map-marker-alt text-slate-400 mr-1"></i> {campo}</span>
                                                                    <span className="text-indigo-600 font-black">{cant} <span className="font-normal text-slate-400 ml-1">{creador ? `(${creador})` : ''}</span></span>
                                                                </p>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div></div>
                                )}

                                {gruposLogistica.length > 0 && (
                                    <div><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2 border-b border-slate-100 pb-2">Historial de Rutas Completadas</h4>
                                    <div className="space-y-3 opacity-95 mt-3">
                                        {gruposLogistica.map(grupoL => {
                                            const isGrpExp = grupoCompletadoExp === grupoL.id;

                                            return (
                                                <div key={grupoL.id} className="bg-slate-50 rounded-[24px] border border-slate-200 overflow-hidden shadow-sm transition-all duration-300">
                                                    {/* ACORDEÓN NIVEL 1: GRUPO DE REPARTO */}
                                                    <button onClick={() => {setGrupoCompletadoExp(isGrpExp ? null : grupoL.id); setMesLogisticaExp(null); setSemanaLogisticaExp(null);}} className="w-full p-4 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                                                        <div className="text-left">
                                                            <p className="font-black text-slate-800 text-sm">{grupoL.label}</p>
                                                            <p className="text-[10px] text-slate-500 font-bold mt-0.5">{grupoL.total} misiones finalizadas</p>
                                                        </div>
                                                        <div className="flex items-center space-x-3">
                                                            <span className="text-emerald-500 font-bold text-lg"><i className="fas fa-check-circle"></i></span>
                                                            <i className={`fas fa-chevron-down text-slate-300 transition-transform duration-300 ${isGrpExp ? 'rotate-180' : ''}`}></i>
                                                        </div>
                                                    </button>
                                                    
                                                    {isGrpExp && (
                                                        <div className="p-3 pt-0 border-t border-slate-100 bg-slate-50 animate-in slide-in-from-top-2 duration-200 space-y-3">
                                                            <div className="mt-3 space-y-3">
                                                                {grupoL.mesesArray.map(mes => {
                                                                    const isMesExp = mesLogisticaExp === `${grupoL.id}-${mes.id}`;
                                                                    
                                                                    return (
                                                                        <div key={mes.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                                                            {/* ACORDEÓN NIVEL 2: MES */}
                                                                            <button onClick={() => {setMesLogisticaExp(isMesExp ? null : `${grupoL.id}-${mes.id}`); setSemanaLogisticaExp(null);}} className="w-full p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                                                                <div className="text-left">
                                                                                    <p className="font-bold text-slate-700 text-xs capitalize">{mes.label}</p>
                                                                                </div>
                                                                                <div className="flex items-center space-x-2 text-[9px] font-black">
                                                                                    <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{mes.total} Rutas</span>
                                                                                    <i className={`fas fa-chevron-down text-slate-300 transition-transform duration-300 ${isMesExp ? 'rotate-180' : ''}`}></i>
                                                                                </div>
                                                                            </button>

                                                                            {isMesExp && (
                                                                                <div className="p-2 border-t border-slate-100 bg-slate-50/50 space-y-2">
                                                                                    {mes.semanasArray.map(sem => {
                                                                                        const isSemExp = semanaLogisticaExp === `${grupoL.id}-${mes.id}-${sem.id}`;
                                                                                        return (
                                                                                            <div key={sem.id} className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
                                                                                                {/* ACORDEÓN NIVEL 3: SEMANA */}
                                                                                                <button onClick={() => setSemanaLogisticaExp(isSemExp ? null : `${grupoL.id}-${mes.id}-${sem.id}`)} className="w-full p-2.5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                                                                                    <div className="text-left">
                                                                                                        <p className="font-bold text-slate-600 text-[11px]">{sem.label}</p>
                                                                                                    </div>
                                                                                                    <div className="flex items-center space-x-2 text-[9px] font-bold">
                                                                                                        <span className="text-amber-500">{sem.total} Rutas</span>
                                                                                                        <i className={`fas fa-chevron-down text-slate-300 transition-transform duration-300 ${isSemExp ? 'rotate-180' : ''}`}></i>
                                                                                                    </div>
                                                                                                </button>

                                                                                                {/* DETALLES DE LAS RUTAS COMPLETADAS EN ESA SEMANA */}
                                                                                                {isSemExp && (
                                                                                                    <div className="p-3 border-t border-slate-100 bg-slate-50/30 space-y-3 max-h-[300px] overflow-y-auto">
                                                                                                        {sem.registros.map(e => {
                                                                                                            const totalEntregado = (e.detalles && typeof e.detalles === 'object') ? Object.values(e.detalles).reduce((sum, val) => sum + (Number(val) || 0), 0) : 0;
                                                                                                            const diferencia = (Number(e.cantidad) || 0) - totalEntregado;

                                                                                                            return (
                                                                                                                <div key={e.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative">
                                                                                                                    <div className="flex justify-between items-start border-b border-slate-100 pb-2 mb-2">
                                                                                                                        <div>
                                                                                                                            <p className="text-[10px] font-bold text-indigo-500"><i className="far fa-calendar-alt mr-1"></i> {formatFechaHora(e.fechaEntrega)}</p>
                                                                                                                            <p className="text-xs font-black text-slate-700 mt-1">Asignado: {e.cantidad} | Entregado: {totalEntregado}</p>
                                                                                                                        </div>
                                                                                                                        <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${diferencia === 0 ? 'bg-emerald-100 text-emerald-700' : diferencia > 0 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                                                                                                            {diferencia === 0 ? 'Exacto' : diferencia > 0 ? `Sobró ${diferencia}` : `Faltó ${Math.abs(diferencia)}`}
                                                                                                                        </span>
                                                                                                                    </div>
                                                                                                                    <div className="grid grid-cols-1 gap-1.5">
                                                                                                                        {e.detalles && typeof e.detalles === 'object' && Object.entries(e.detalles).map(([campo, cant]) => {
                                                                                                                            const creador = e.bloqueos?.[campo]?.nombre;
                                                                                                                            return (
                                                                                                                                <p key={campo} className="text-[10px] font-bold text-slate-500 truncate flex justify-between bg-slate-50 p-1.5 rounded-lg">
                                                                                                                                    <span><i className="fas fa-map-marker-alt text-slate-400 mr-1"></i> {campo}</span>
                                                                                                                                    <span className="text-indigo-600 font-black">{cant} <span className="font-normal text-slate-400 ml-1">{creador ? `(${creador})` : ''}</span></span>
                                                                                                                                </p>
                                                                                                                            )
                                                                                                                        })}
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            )
                                                                                                        })}
                                                                                                    </div>
                                                                                                )}
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
                                        })}
                                    </div></div>
                                )}
                            </div>
                        </>
                    )}

                    {subVistaAdminLogistica === 'equipos' && (
                        <div className="px-1 animate-in slide-in-from-right duration-200 mt-2">
                            <p className="text-xs text-slate-500 mb-4 px-2 leading-relaxed">Asigna a qué grupo de reparto pertenece cada integrante de logística.</p>
                            <div className="space-y-3">
                                {personalLogistica.length === 0 ? <p className="text-center text-slate-400 text-sm italic mt-8">No hay personal de logística registrado.</p> :
                                    personalLogistica.map(p => (
                                        <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                                            <div className="flex items-center space-x-3 w-1/2">
                                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-sm">{p.nombre.charAt(0)}</div>
                                                <p className="font-bold text-slate-700 text-sm truncate">{p.nombre}</p>
                                            </div>
                                            <div className="w-1/2">
                                                <select 
                                                    value={p.grupo || ''} 
                                                    onChange={(e) => onAssignGroup(p.id, e.target.value)} 
                                                    className={`w-full p-3 rounded-xl text-xs font-bold outline-none border ${p.grupo ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-rose-50 border-rose-100 text-rose-500'}`}
                                                >
                                                    <option value="">-- Sin Grupo --</option>
                                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                                                        <option key={n} value={`Grupo ${n}`}>Grupo {n}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (vistaActual === 'personal') {
        contenidoAdmin = (
            <div className="space-y-4 animate-in slide-in-from-right duration-300 h-full flex flex-col pt-2">
                <div className="flex justify-between items-center px-2 mb-2">
                    <div><h2 className="text-2xl font-black text-slate-800">Directorio</h2><p className="text-slate-400 text-xs">{activos.length} Miembros Activos</p></div>
                    <button onClick={onToggleModal} className="w-10 h-10 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all"><i className="fas fa-plus"></i></button>
                </div>
                <div className="flex items-center bg-white rounded-2xl px-5 py-4 shadow-sm border border-slate-100 mx-1"><i className="fas fa-search text-slate-300 mr-3 text-lg"></i><input type="text" placeholder="Buscar por nombre o campo..." className="bg-transparent w-full outline-none text-sm font-bold text-slate-700" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></div>
                
                <div className="flex-1 overflow-y-auto space-y-3 pb-24 pr-1 mt-2 px-1">
                    {rolesConGente.map(rolGrp => {
                        const isExp = rolExpandido === rolGrp;
                        const miembros = gruposPersonal[rolGrp];
                        return (
                            <div key={rolGrp} className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
                                <button onClick={() => setRolExpandido(isExp ? null : rolGrp)} className="w-full p-4 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                                    <div className="text-left">
                                        <span className="font-black text-slate-700 text-sm uppercase tracking-wide">{rolGrp}</span>
                                        <p className="text-[10px] text-slate-400 mt-1 font-bold">{miembros.length} registrados</p>
                                    </div>
                                    <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors shadow-sm ${isExp ? 'bg-indigo-500 text-white' : 'bg-slate-50 text-slate-400'}`}>
                                        <i className={`fas fa-chevron-down transition-transform duration-300 ${isExp ? 'rotate-180' : ''}`}></i>
                                    </div>
                                </button>
                                
                                {isExp && (
                                    <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50 animate-in slide-in-from-top-2 duration-200">
                                        <div className="space-y-2 mt-4 max-h-[350px] overflow-y-auto pr-1">
                                            {miembros.map(m => (
                                                <div key={m.id} className="bg-white p-3 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                                                    <div className="flex items-center space-x-3 w-3/4">
                                                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-sm shrink-0">{m.nombre.charAt(0)}</div>
                                                        <div className="truncate">
                                                            <p className="font-bold text-slate-700 text-xs truncate">{m.nombre}</p>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 truncate">
                                                                {m.campo ? `Campo: ${m.campo}` : m.grupo ? `Grupo: ${m.grupo}` : 'Global'} • <span className="text-indigo-400">{m.edad ? `${m.edad} Años` : 'Edad N/D'}</span>
                                                            </p>
                                                            <p className="text-[9px] text-slate-500 mt-0.5 font-bold truncate">
                                                                Nacimiento: {m.fechaNacimiento ? formatoFecha(m.fechaNacimiento) : 'No registrada'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col space-y-1.5 shrink-0 ml-2">
                                                        <button onClick={() => onDelete(m)} className="text-rose-400 w-8 h-8 flex items-center justify-center bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors shadow-sm"><i className="fas fa-trash"></i></button>
                                                        <button onClick={() => onEdit(m)} className="text-indigo-400 w-8 h-8 flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors shadow-sm"><i className="fas fa-edit"></i></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    }

    return (
        <>
            {contenidoAdmin}
            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md border-t border-slate-100 flex justify-around items-center p-2 z-50 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <NavButton id="inicio" icon="fa-home" label="Panel" width="w-[75px]" />
                <NavButton id="poblacion" icon="fa-layer-group" label="Campos" width="w-[75px]" />
                <NavButton id="logistica" icon="fa-truck" label="Logística" width="w-[75px]" />
                <NavButton id="personal" icon="fa-address-book" label="Personal" width="w-[75px]" />
            </div>
        </>
    );
}

window.AdminDashboard = AdminDashboard;
