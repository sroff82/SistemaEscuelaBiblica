var { useState } = React;

function MaestroDashboard({
    alumnos = [], asistenciaHoy, historialAsistencias, usuario, datosUsuarioActual,
    onOpenAlumnoModal, onEditAlumno, onDeleteAlumno, onSaveAsistencia
}) {
    const [vistaActual, setVistaActual] = useState('inicio'); 
    const [subVistaGestion, setSubVistaGestion] = useState('directorio'); 
    const [mesCumpleExpandido, setMesCumpleExpandido] = useState(null);
    const [listaAsistencia, setListaAsistencia] = useState({});
    const [subVistaReporte, setSubVistaReporte] = useState('ranking');
    const [fechaInicioRanking, setFechaInicioRanking] = useState('');
    const [fechaFinRanking, setFechaFinRanking] = useState('');
    const [leccionImpartida, setLeccionImpartida] = useState(true);
    const [ofrenda, setOfrenda] = useState(''); 
    const [edadMin, setEdadMin] = useState('');
    const [edadMax, setEdadMax] = useState('');
    const [mesHistorialExp, setMesHistorialExp] = useState(null);
    const [modalCambioCampo, setModalCambioCampo] = useState(false);
    const [campoSeleccionado, setCampoSeleccionado] = useState(''); 
    
    const camposDisponibles = ["La Isla", "Las Delicias", "El Amatal", "El Manguito", "Buenos Aires", "Corozal #1", "El Porvenir", "El Caulote", "Corozal #2", "Valle Encantado", "La Playa"];
    const historialVisible = historialAsistencias.filter(h => !h.esReset);

    const formatoFecha = (f) => {
        if (!f) return ''; const p = f.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; 
    };

    const calcProgreso = (lec) => {
        const l = parseInt(lec);
        if (isNaN(l) || l === 0) return { parte: 1, leccion: 0, porc: 0 };
        if (l <= 25) return { parte: 1, leccion: l, porc: Math.round((l/25)*100) };
        if (l <= 54) return { parte: 2, leccion: l - 25, porc: Math.round(((l-25)/29)*100) };
        return { parte: 'Extra', leccion: l, porc: 100 };
    };

    const todosLosRegistros = [...historialAsistencias];
    if (asistenciaHoy && !todosLosRegistros.some(r => r.timestamp === asistenciaHoy.timestamp)) {
        todosLosRegistros.push(asistenciaHoy);
    }
    
    const historialOrdenado = todosLosRegistros.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const ultimoReg = historialOrdenado.find(h => h.leccion !== undefined);

    let leccionAsignada = 0;
    let leccionProgreso = 0;

    if (ultimoReg) {
        if (ultimoReg.esReset) {
            leccionAsignada = parseInt(ultimoReg.leccion);
            leccionProgreso = parseInt(ultimoReg.leccion);
        } else {
            leccionProgreso = parseInt(ultimoReg.leccion);
            leccionAsignada = ultimoReg.leccionImpartida ? parseInt(ultimoReg.leccion) + 1 : parseInt(ultimoReg.leccion);
        }
    }

    if (asistenciaHoy && asistenciaHoy.leccion) {
        leccionAsignada = parseInt(asistenciaHoy.leccion);
        leccionProgreso = parseInt(asistenciaHoy.leccion);
    }

    const dtHoyObj = new Date();
    const diaSemana = dtHoyObj.getDay();
    const esFinDeSemana = diaSemana === 0 || diaSemana === 6; 
    const dtHoyStr = dtHoyObj.toLocaleDateString('en-CA');

    let regOtroDiaFinde = null;
    if (esFinDeSemana) {
        const d = new Date(dtHoyObj);
        if (diaSemana === 6) d.setDate(d.getDate() + 1);
        else if (diaSemana === 0) d.setDate(d.getDate() - 1);
        const otroDiaStr = d.toLocaleDateString('en-CA');
        regOtroDiaFinde = todosLosRegistros.find(r => !r.esReset && r.fecha === otroDiaStr);
    }

    const asistenciaMostrar = asistenciaHoy || regOtroDiaFinde;
    const asistenciaTomada = !!asistenciaMostrar;
    const esDeOtroDia = asistenciaTomada && asistenciaMostrar.fecha !== dtHoyStr;
    const soyElAutor = asistenciaTomada && asistenciaMostrar.registradoPorId === datosUsuarioActual.id;
    const estaBloqueada = asistenciaTomada && (!soyElAutor || esDeOtroDia);

    React.useEffect(() => {
        if (vistaActual === 'asistencia' && alumnos.length > 0) {
            const inicial = {};
            if (asistenciaHoy && asistenciaHoy.registros && asistenciaHoy.timestamp >= (ultimoReg ? ultimoReg.timestamp : 0)) {
                asistenciaHoy.registros.forEach(r => inicial[r.idAlumno] = r.estado);
                setLeccionImpartida(asistenciaHoy.leccionImpartida !== false);
                setOfrenda(asistenciaHoy.ofrenda || ''); 
            } else {
                alumnos.forEach(a => inicial[a.id] = 'Presente');
                setLeccionImpartida(true);
                setOfrenda('');
            }
            setListaAsistencia(inicial);
        }
    }, [vistaActual, alumnos, asistenciaHoy]); 

    const guardarLista = async () => {
        if (alumnos.length === 0) { alert("Debes registrar alumnos primero."); return; }
        if (!ultimoReg) { alert("Por favor, espera la lección inicial asignada por dirección."); return; }
        const registros = alumnos.map(a => ({ idAlumno: a.id, nombre: a.nombre, estado: listaAsistencia[a.id] || 'Ausente' }));
        const exito = await onSaveAsistencia(registros, leccionAsignada, leccionImpartida, ofrenda);
        if (exito) setVistaActual('inicio');
    };

    const cambiarCampo = async (nuevoCampo) => {
        if (!nuevoCampo || nuevoCampo === datosUsuarioActual.campo) return;
        if (datosUsuarioActual.id === 'user_sandbox_secreto') {
            alert("🔒 MODO DESARROLLADOR\n\nCambio simulado a: " + nuevoCampo);
            setModalCambioCampo(false);
            return;
        }
        try {
            document.body.style.opacity = '0.5'; 
            await window.db.collection('maestros').doc(datosUsuarioActual.id).update({ campo: nuevoCampo });
            const nuevosDatos = { ...datosUsuarioActual, campo: nuevoCampo };
            localStorage.setItem('datos_usuario_dominical', JSON.stringify(nuevosDatos));
            window.location.reload(); 
        } catch (e) {
            document.body.style.opacity = '1';
            alert("Error al cambiar campo.");
        }
    };

    const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    const agrupalHistorialPorMes = (historial) => {
        if (!historial) return [];
        const grupos = {};
        historial.forEach(h => {
            const p = (h.fecha || '').split('-');
            if(p.length === 3) {
                const y = parseInt(p[0]); const m = parseInt(p[1]);
                const mesKey = `${y}-${p[1]}`; 
                const mesLabel = `${mesesNombres[m-1]} ${y}`;
                if(!grupos[mesKey]) grupos[mesKey] = { mesLabel, registros: [] };
                grupos[mesKey].registros.push(h);
            }
        });
        return Object.keys(grupos).sort((a,b) => b.localeCompare(a)).map(k => {
            grupos[k].registros.sort((x, y) => new Date(y.fecha) - new Date(x.fecha));
            return { id: k, ...grupos[k] };
        });
    };

    const gruposMesesHistorial = agrupalHistorialPorMes(historialVisible);
    const progInicio = calcProgreso(leccionProgreso);
    const miCampoActual = datosUsuarioActual?.campo;

    let campoDestinoFijo = null;
    if (miCampoActual === "El Caulote") campoDestinoFijo = "Corozal #2";
    if (miCampoActual === "Corozal #2") campoDestinoFijo = "El Caulote";
    const tienePermisoDeCambio = isSandbox || campoDestinoFijo !== null;

    const rankingOrdenado = [...alumnos].map(a => {
        let asistenciasLogradas = 0;
        historialVisible.forEach(ha => {
            if (ha.registros?.find(r => r.idAlumno === a.id && r.estado === 'Presente')) asistenciasLogradas++;
        });
        return { ...a, asistenciasLogradas };
    }).sort((a,b) => b.asistenciasLogradas - a.asistenciasLogradas);

    const NavButton = ({ id, icon, label }) => (
        <button onClick={() => setVistaActual(id)} className="flex flex-col items-center justify-center w-[70px] h-14 rounded-2xl transition-all">
            <i className={`fas ${icon} text-xl mb-1`}></i><span className="text-[9px] tracking-wide">{label}</span>
        </button>
    );

    let contenidoMaestro;

    if (vistaActual === 'inicio') {
        contenidoMaestro = (
            <div className="flex flex-col h-full pt-2 animate-in fade-in duration-300">
                {tienePermisoDeCambio && (
                    <div className="bg-indigo-50 border p-4 rounded-[24px] flex justify-between items-center mb-5 mx-1">
                        <div>
                            <p className="text-[9px] font-bold text-indigo-400 uppercase">Operando en:</p>
                            <p className="font-black text-indigo-700 text-sm">{miCampoActual}</p>
                        </div>
                        <button onClick={() => { if (isSandbox) setCampoSeleccionado(miCampoActual || ''); setModalCambioCampo(true); }} className="bg-white text-indigo-600 px-4 py-2.5 rounded-xl text-xs font-black shadow-sm">Cambiar</button>
                    </div>
                )}
                <div className={`w-full p-6 rounded-[32px] border relative overflow-hidden group shadow-lg mb-5 ${asistenciaTomada ? 'bg-white border-slate-100' : 'bg-rose-500 text-white'}`}>
                    <h3 className="font-bold text-sm mb-4"><i className="fas fa-clipboard-check mr-2"></i>Estado Asistencia</h3>
                    <p className="text-sm font-bold">{asistenciaTomada ? "Lista Enviada" : "Falta tomar lista hoy"}</p>
                </div>
                <div className="w-full bg-indigo-600 p-6 rounded-[32px] text-white shadow-xl flex justify-between items-center mx-1">
                    <div><p className="text-xs font-bold uppercase opacity-70">Alumnos Campo</p><p className="text-5xl font-black mt-1">{alumnos.length}</p></div>
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl"><i className="fas fa-users"></i></div>
                </div>
            </div>
        );
    } else if (vistaActual === 'asistencia') {
        contenidoMaestro = (
            <div className="flex flex-col h-full pt-4 animate-in slide-in-from-right duration-300">
                <h2 className="text-2xl font-black text-slate-800 px-2 mb-4">Pasar Lista</h2>
                <div className="flex-1 bg-white rounded-t-[40px] shadow-lg p-6 overflow-hidden flex flex-col">
                    <div className="bg-emerald-50 p-4 rounded-2xl border mb-4 flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 uppercase">Ofrenda ($)</span>
                        <input type="number" step="0.01" value={ofrenda} onChange={(e)=>setOfrenda(e.target.value)} placeholder="0.00" className="w-1/3 p-2 bg-white rounded-xl text-right font-black" />
                    </div>
                    <div className="overflow-y-auto space-y-4 pb-28 pr-2 flex-1">
                        {alumnos.map(a => (
                            <div key={a.id} className="p-4 bg-slate-50 rounded-2xl border flex justify-between items-center shadow-sm">
                                <span className="font-bold text-sm text-slate-700">{a.nombre}</span>
                                <select value={listaAsistencia[a.id] || 'Presente'} onChange={(e) => setListaAsistencia({...listaAsistencia, [a.id]: e.target.value})} className="p-2 rounded-xl text-xs font-bold border bg-white">
                                    <option value="Presente">Presente</option>
                                    <option value="Ausente">Ausente</option>
                                    <option value="Permiso">Permiso</option>
                                </select>
                            </div>
                        ))}
                    </div>
                    <button onClick={guardarLista} className="w-full p-4 bg-indigo-600 text-white font-black rounded-2xl mt-4">Guardar Asistencia</button>
                </div>
            </div>
        );
    } else if (vistaActual === 'gestion') {
        contenidoMaestro = (
            <div className="flex flex-col h-full pt-4 animate-in slide-in-from-right duration-300">
                <h2 className="text-2xl font-black text-slate-800 px-2 mb-4">Directorio Alumnos</h2>
                <button onClick={onOpenAlumnoModal} className="w-full bg-emerald-500 p-4 rounded-2xl text-white font-bold mb-4 shadow-md">Inscribir Alumno</button>
                <div className="overflow-y-auto flex-1 space-y-3 pb-24 px-1">
                    {alumnos.map(nino => (
                        <div key={nino.id} className="bg-white p-4 rounded-3xl border shadow-sm flex justify-between items-center">
                            <div>
                                <p className="font-black text-slate-700 text-sm">{nino.nombre}</p>
                                <p className="text-[11px] text-slate-500 mt-1">{nino.edad} Años • {nino.genero === 'M' ? 'Niño' : 'Niña'}</p>
                            </div>
                            <div className="flex space-x-1.5">
                                <button onClick={() => onEditAlumno(nino)} className="w-8 h-8 flex items-center justify-center bg-indigo-50 text-indigo-500 rounded-xl"><i className="fas fa-edit text-xs"></i></button>
                                <button onClick={() => onDeleteAlumno(nino)} className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl"><i className="fas fa-trash text-xs"></i></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    } else if (vistaActual === 'reportes') {
        contenidoMaestro = (
            <div className="flex flex-col h-full pt-4 animate-in slide-in-from-right duration-300">
                <h2 className="text-2xl font-black text-slate-800 px-2 mb-4">Reportes de Clase</h2>
                <div className="overflow-y-auto flex-1 space-y-3 pb-24 px-1">
                    {rankingOrdenado.map((nino, index) => (
                        <div key={nino.id} className="flex justify-between items-center p-4 bg-white rounded-2xl border">
                            <p className="font-bold text-slate-700 text-sm">#{index+1} {nino.nombre}</p>
                            <span className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-black">{nino.asistenciasLogradas} Asistencias</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <>
            {contenidoMaestro}
            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md border-t border-slate-100 flex justify-around items-center p-2 z-50 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <NavButton id="inicio" icon="fa-home" label="Resumen" />
                <NavButton id="asistencia" icon="fa-clipboard-check" label="Lista" />
                <NavButton id="gestion" icon="fa-users" label="Alumnos" />
                <NavButton id="reportes" icon="fa-chart-bar" label="Reportes" />
            </div>

            {modalCambioCampo && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl">
                        <h2 className="text-xl font-black text-slate-800 mb-4 text-center">Cambio de Campo</h2>
                        <button onClick={() => cambiarCampo(campoDestinoFijo)} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg">Saltar a {campoDestinoFijo}</button>
                        <button onClick={() => setModalCambioCampo(false)} className="w-full py-3 text-slate-400 font-bold text-xs uppercase mt-2">Cancelar</button>
                    </div>
                </div>
            )}
        </>
    );
}

window.MaestroDashboard = MaestroDashboard;
