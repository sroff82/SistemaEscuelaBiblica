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

    // NUEVO ESTADO PARA ACORDEÓN DE HISTORIAL DE CLASES
    const [mesHistorialExp, setMesHistorialExp] = useState(null);

    const [modalCambioCampo, setModalCambioCampo] = useState(false);
    const [campoSeleccionado, setCampoSeleccionado] = useState(''); 
    
    const camposDisponibles = ["La Isla", "Las Delicias", "El Amatal", "El Manguito", "Buenos Aires", "Corozal #1", "El Porvenir", "El Caulote", "Corozal #2", "Valle Encantado", "La Playa"];

    const historialVisible = historialAsistencias.filter(h => !h.esReset);

    const formatoFecha = (f) => {
        if (!f) return '';
        const p = f.split('-');
        return `${p[2]}/${p[1]}/${p[0]}`; 
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
        if (!ultimoReg) { alert("Por favor, espera a que el Director asigne la lección inicial."); return; }
        const registros = alumnos.map(a => ({ idAlumno: a.id, nombre: a.nombre, estado: listaAsistencia[a.id] || 'Ausente' }));
        const exito = await onSaveAsistencia(registros, leccionAsignada, leccionImpartida, ofrenda);
        if (exito) setVistaActual('inicio');
    };

    const cambiarCampo = async (nuevoCampo) => {
        if (!nuevoCampo || nuevoCampo === datosUsuarioActual.campo) return;
        
        if (datosUsuarioActual.id === 'user_sandbox_secreto') {
            alert("🔒 MODO DESARROLLADOR\n\nCambio de campo simulado con éxito a: " + nuevoCampo);
            setModalCambioCampo(false);
            return;
        }

        try {
            document.body.style.opacity = '0.5'; 
            await window.db.collection('maestros').doc(datosUsuarioActual.id).update({ campo: nuevoCampo });
            
            const nuevosDatos = { ...datosUsuarioActual, campo: nuevoCampo };
            if (window.AuthService && window.AuthService.guardarSesion) {
                window.AuthService.guardarSesion(usuario, nuevosDatos);
            } else {
                localStorage.setItem('sesion_datos', JSON.stringify(nuevosDatos)); 
            }
            
            const sesionStr = localStorage.getItem('datos_recientes_login');
            if (sesionStr) {
                const sesionData = JSON.parse(sesionStr);
                sesionData.campo = nuevoCampo;
                localStorage.setItem('datos_recientes_login', JSON.stringify(sesionData));
            }
            
            window.location.reload(); 
        } catch (e) {
            document.body.style.opacity = '1';
            alert("Ocurrió un error al intentar cambiar de campo. Revisa tu conexión.");
        }
    };

    const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    // --- FUNCIÓN PARA AGRUPAR EL HISTORIAL DEL MAESTRO POR MES ---
    const agruparHistorialPorMes = (historial) => {
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

    const gruposMesesHistorial = agruparHistorialPorMes(historialVisible);

    const agruparCumpleanos = () => {
        const grupos = Array.from({length: 12}, (_, i) => ({
            mesNum: (i + 1).toString().padStart(2, '0'),
            nombreMes: mesesNombres[i],
            ninos: []
        }));
        
        const hoy = new Date();
        const anioActual = hoy.getFullYear();
        const mesActual = hoy.getMonth(); 
        const diaActual = hoy.getDate();

        alumnos.forEach(a => {
            if (a.fechaNacimiento) {
                const partes = a.fechaNacimiento.split('-');
                if (partes.length === 3) {
                    const anioNac = parseInt(partes[0], 10);
                    const mesNacIndex = parseInt(partes[1], 10) - 1;
                    const diaNac = parseInt(partes[2], 10);
                    
                    if(mesNacIndex >= 0 && mesNacIndex < 12) {
                        let proximoAnioCumple = anioActual;
                        
                        if (mesNacIndex < mesActual || (mesNacIndex === mesActual && diaNac < diaActual)) {
                            proximoAnioCumple++;
                        }
                        
                        grupos[mesNacIndex].ninos.push({
                            ...a,
                            diaNac: diaNac,
                            edadACumplir: proximoAnioCumple - anioNac 
                        });
                    }
                }
            }
        });
        
        grupos.forEach(g => g.ninos.sort((a, b) => a.diaNac - b.diaNac));
        return grupos;
    };
    const cumpleanosAgrupados = agruparCumpleanos();

    const NavButton = ({ id, icon, label, width = 'w-[70px]' }) => (
        <button onClick={() => setVistaActual(id)} className={`flex flex-col items-center justify-center ${width} h-14 rounded-2xl transition-all ${vistaActual === id ? 'text-indigo-600 bg-indigo-50 font-black' : 'text-slate-400 hover:text-slate-600 font-bold'}`}>
            <i className={`fas ${icon} text-xl mb-1 ${vistaActual === id ? 'animate-bounce' : ''}`}></i><span className="text-[9px] tracking-wide">{label}</span>
        </button>
    );
    
    const progInicio = calcProgreso(leccionProgreso);

    const historialRankingFiltrado = historialVisible.filter(ha => {
        if (!fechaInicioRanking && !fechaFinRanking) return true;
        const f = ha.fecha;
        if (fechaInicioRanking && f < fechaInicioRanking) return false;
        if (fechaFinRanking && f > fechaFinRanking) return false;
        return true;
    });

    const alumnosConRanking = alumnos.map(a => {
        let asistenciasLogradas = 0;
        historialRankingFiltrado.forEach(ha => {
            const registroAlumno = ha.registros?.find(r => r.idAlumno === a.id);
            if (registroAlumno && registroAlumno.estado === 'Presente') asistenciasLogradas++;
        });
        return { ...a, asistenciasLogradas };
    });

    const rankingOrdenado = [...alumnosConRanking].sort((a,b) => b.asistenciasLogradas - a.asistenciasLogradas);
    const alumnosFiltrados = alumnos.filter(a => {
        if (edadMin !== '' && a.edad < parseInt(edadMin)) return false;
        if (edadMax !== '' && a.edad > parseInt(edadMax)) return false;
        return true;
    });

    const isSandbox = datosUsuarioActual?.id === 'user_sandbox_secreto';
    const miCampoActual = datosUsuarioActual?.campo;

    let campoDestinoFijo = null;
    if (miCampoActual === "El Caulote") campoDestinoFijo = "Corozal #2";
    if (miCampoActual === "Corozal #2") campoDestinoFijo = "El Caulote";

    const tienePermisoDeCambio = isSandbox || campoDestinoFijo !== null;

    let contenidoMaestro;

    if (vistaActual === 'inicio') {
        contenidoMaestro = (
            <div className="flex flex-col h-full pt-2 animate-in fade-in duration-300">
                
                {tienePermisoDeCambio && (
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-[24px] flex justify-between items-center mb-5 shadow-sm mx-1">
                        <div>
                            <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Operando en:</p>
                            <p className="font-black text-indigo-700 text-sm"><i className="fas fa-map-marker-alt mr-1"></i> {miCampoActual || 'Global'}</p>
                        </div>
                        <button onClick={() => { 
                            if (isSandbox) setCampoSeleccionado(miCampoActual || ''); 
                            setModalCambioCampo(true); 
                        }} className="bg-white text-indigo-600 px-4 py-2.5 rounded-xl text-xs font-black shadow-sm border border-indigo-100 active:scale-95 transition-all">
                            Cambiar <i className="fas fa-exchange-alt ml-1"></i>
                        </button>
                    </div>
                )}

                <div className={`w-full p-6 rounded-[32px] text-left relative overflow-hidden group shadow-lg mb-5 ${estaBloqueada ? 'bg-slate-50 border border-slate-200' : asistenciaTomada ? 'bg-white border border-slate-100' : !esFinDeSemana ? 'bg-slate-200 text-slate-500 shadow-none' : 'bg-rose-500 text-white shadow-rose-200'}`}>
                    {asistenciaTomada ? (
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className={`font-bold text-sm flex items-center ${estaBloqueada ? 'text-slate-500' : 'text-slate-700'}`}>
                                    <i className={`fas ${estaBloqueada ? 'fa-lock' : 'fa-clipboard-check'} mr-2 text-lg ${estaBloqueada ? 'text-slate-400' : 'text-emerald-500'}`}></i> 
                                    {estaBloqueada ? 'Asistencia (Lectura)' : 'Asistencia Completada'}
                                </h3>
                                {estaBloqueada ? (
                                    <span className="text-[9px] bg-slate-200 text-slate-500 px-2 py-1 rounded-lg font-bold uppercase tracking-widest">{esDeOtroDia ? 'Reporte Fin de Semana' : 'Bloqueada'}</span>
                                ) : (
                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-bold">TUYA</span>
                                )}
                            </div>
                            <div className="flex justify-around text-center mb-6">
                                <div><p className={`text-3xl font-black ${estaBloqueada ? 'text-slate-500' : 'text-emerald-500'}`}>{asistenciaMostrar.totales.presentes}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Presentes</p></div>
                                <div><p className={`text-3xl font-black ${estaBloqueada ? 'text-slate-500' : 'text-rose-500'}`}>{asistenciaMostrar.totales.ausentes}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ausentes</p></div>
                                <div><p className={`text-3xl font-black ${estaBloqueada ? 'text-slate-500' : 'text-amber-500'}`}>{asistenciaMostrar.totales.permisos}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Permisos</p></div>
                            </div>
                            <div className={`pt-4 border-t ${estaBloqueada ? 'border-slate-200' : 'border-slate-50'}`}>
                                <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-2"><span>{!ultimoReg ? 'Material: Sin asignar' : `Material: Parte ${progInicio.parte} • Lección ${progInicio.leccion}`}</span><span className="text-emerald-500"><i className="fas fa-coins mr-1"></i>${Number(asistenciaMostrar.ofrenda||0).toFixed(2)}</span></div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden"><div className="bg-indigo-400 h-1.5 rounded-full" style={{width: `${progInicio.porc}%`}}></div></div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-bl-[100px] pointer-events-none"></div>
                            <div className="flex items-center space-x-4 relative z-10">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm ${!esFinDeSemana ? 'bg-slate-300 text-slate-400' : 'bg-white/20 animate-pulse'}`}>
                                    <i className={`fas ${!esFinDeSemana ? 'fa-calendar-times' : 'fa-clipboard-list'}`}></i>
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl">{!esFinDeSemana ? 'Día Inhábil' : 'Tomar Asistencia'}</h3>
                                    <p className={`text-xs ${!esFinDeSemana ? 'text-slate-500 font-bold' : 'text-rose-100'}`}>{!esFinDeSemana ? 'Disponible Sábado y Domingo' : 'Aún no registras la clase de hoy'}</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                
                <div className="w-full bg-indigo-600 p-6 rounded-[32px] text-white shadow-xl shadow-indigo-200 flex justify-between items-center relative overflow-hidden mx-1">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-bl-[100px] pointer-events-none"></div>
                    <div className="relative z-10"><p className="text-xs font-bold uppercase opacity-70 tracking-widest">Niños Totales</p><p className="text-5xl font-black tracking-tighter mt-1">{alumnos.length}</p></div>
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm relative z-10"><i className="fas fa-users"></i></div>
                </div>
            </div>
        );
    }

    if (vistaActual === 'asistencia') { 
        if (alumnos.length === 0) {
            contenidoMaestro = (
                <div className="flex flex-col h-full pt-4 animate-in slide-in-from-right duration-300">
                    <div className="px-2 mb-4"><div><h2 className="text-2xl font-black text-slate-800">Pasar Lista</h2></div></div>
                    <div className="flex-1 bg-white rounded-t-[40px] shadow-lg border-t border-slate-100 p-8 flex flex-col items-center justify-center text-center"><div className="w-24 h-24 bg-rose-50 text-rose-300 rounded-full flex items-center justify-center text-5xl mb-6 shadow-sm animate-pulse"><i className="fas fa-user-slash"></i></div><h3 className="text-xl font-black text-slate-700 mb-2">Salón Vacío</h3><p className="text-slate-500 text-sm leading-relaxed mb-8">Debes registrar al menos un alumno en tu campo antes de poder impartir una lección y tomar la asistencia.</p><button onClick={() => setVistaActual('gestion')} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 active:scale-95 transition-all"><i className="fas fa-plus mr-2"></i>Ir a Registrar</button></div>
                </div>
            );
        } else if (estaBloqueada) {
            contenidoMaestro = (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in">
                    <div className="w-24 h-24 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-5xl mb-6 shadow-inner"><i className="fas fa-lock"></i></div>
                    <h3 className="text-2xl font-black text-slate-700 mb-2">{esDeOtroDia ? 'Clase Completada' : 'Acceso Bloqueado'}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        {esDeOtroDia 
                            ? <>Ya enviaste el reporte de asistencia de este fin de semana el día <b className="text-slate-600">{formatoFecha(asistenciaMostrar.fecha)}</b>.</>
                            : <>La asistencia de hoy ya fue registrada por <b>{asistenciaMostrar?.maestro}</b>.</>}
                    </p>
                </div>
            );
        } else {
            const bloqueoHorario = !esFinDeSemana;
            const bloqueoMaterial = !ultimoReg;
            const formBloqueado = bloqueoHorario || bloqueoMaterial;

            contenidoMaestro = (
                <div className="flex flex-col h-full pt-4 animate-in slide-in-from-right duration-300">
                    <div className="flex items-center space-x-4 mb-4 px-2"><div><h2 className="text-2xl font-black text-slate-800">Pasar Lista</h2><p className="text-slate-400 text-xs">{new Date().toLocaleDateString()}</p></div></div>
                    
                    <div className="flex-1 bg-white rounded-t-[40px] shadow-lg border-t border-slate-100 p-6 overflow-hidden flex flex-col relative">
                        
                        {bloqueoHorario && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 flex items-center shadow-sm shrink-0">
                                <i className="fas fa-calendar-times text-slate-400 text-xl mr-3"></i>
                                <p className="text-[10px] font-bold text-slate-500 leading-tight">Fuera de horario. El registro de asistencia solo está habilitado los días <b>sábado y domingo</b>.</p>
                            </div>
                        )}
                        {bloqueoMaterial && (
                            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 mb-4 flex items-center shadow-sm shrink-0">
                                <i className="fas fa-book text-amber-500 text-xl mr-3"></i>
                                <p className="text-[10px] font-bold text-amber-700 leading-tight">Esperando que el Administrador te <b>asigne el material</b> de la lección para poder iniciar.</p>
                            </div>
                        )}

                        <div className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ${formBloqueado ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mb-4 flex-shrink-0 flex items-center justify-between shadow-sm">
                                <div>
                                    <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-widest"><i className="fas fa-hand-holding-usd mr-2"></i>Ofrenda</h3>
                                    <p className="text-[9px] text-emerald-600 mt-1 font-bold">Total recolectado ($)</p>
                                </div>
                                <div className="relative w-1/3">
                                    <span className="absolute left-3 top-3 text-emerald-600 font-black">$</span>
                                    <input type="number" step="0.01" min="0" value={ofrenda} onChange={(e)=>setOfrenda(e.target.value)} placeholder="0.00" className="w-full py-3 pl-7 pr-3 bg-white rounded-xl text-emerald-700 font-black outline-none border border-emerald-200 focus:ring-2 focus:ring-emerald-300 text-right shadow-sm" />
                                </div>
                            </div>

                            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 mb-4 flex-shrink-0">
                                <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-widest mb-3 flex items-center"><i className="fas fa-book mr-2"></i> Material de Clase</h3>
                                <div className="flex space-x-4 items-center">
                                    <div className="w-1/3 relative">
                                        <label className="text-[10px] font-bold text-indigo-400 uppercase ml-1 block mb-1">Lección N°</label>
                                        <input type="number" className="w-full p-3 bg-slate-200 rounded-xl outline-none border border-slate-300 text-center font-black text-slate-500 text-xl shadow-inner cursor-not-allowed opacity-80" value={leccionAsignada} readOnly disabled />
                                        <div className="absolute top-1 right-1 bg-slate-300 rounded-full w-5 h-5 flex items-center justify-center shadow-sm"><i className="fas fa-lock text-slate-500 text-[9px]"></i></div>
                                        <p className="text-[8px] text-slate-400 text-center mt-1 leading-tight font-bold uppercase tracking-widest">Automático</p>
                                    </div>
                                    <div className="w-2/3">
                                        <label className="text-[10px] font-bold text-indigo-400 uppercase ml-1 block mb-1">¿Se impartió hoy?</label>
                                        <div className="flex space-x-2">
                                            <button onClick={() => setLeccionImpartida(true)} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-colors ${leccionImpartida ? 'bg-emerald-500 text-white shadow-md' : 'bg-white border border-indigo-100 text-indigo-400 hover:bg-indigo-100'}`}>Sí ✅</button>
                                            <button onClick={() => setLeccionImpartida(false)} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-colors ${!leccionImpartida ? 'bg-rose-500 text-white shadow-md' : 'bg-white border border-indigo-100 text-indigo-400 hover:bg-indigo-100'}`}>No ❌</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-y-auto space-y-4 pb-28 pr-2">
                                {alumnos.map(a => (
                                    <div key={a.id} className="flex flex-col p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                                        <div className="flex items-center space-x-3 mb-3">
                                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-sm font-bold shrink-0">{a.nombre.charAt(0)}</div>
                                            <p className="font-bold text-slate-700 text-sm leading-tight">{a.nombre}</p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button onClick={() => setListaAsistencia({...listaAsistencia, [a.id]: 'Presente'})} className={`py-2 rounded-xl text-[11px] font-bold uppercase transition-all ${listaAsistencia[a.id] === 'Presente' ? 'bg-emerald-500 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-100'}`}>Presente</button>
                                            <button onClick={() => setListaAsistencia({...listaAsistencia, [a.id]: 'Ausente'})} className={`py-2 rounded-xl text-[11px] font-bold uppercase transition-all ${listaAsistencia[a.id] === 'Ausente' ? 'bg-rose-500 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-100'}`}>Ausente</button>
                                            <button onClick={() => setListaAsistencia({...listaAsistencia, [a.id]: 'Permiso'})} className={`py-2 rounded-xl text-[11px] font-bold uppercase transition-all ${listaAsistencia[a.id] === 'Permiso' ? 'bg-amber-400 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-100'}`}>Permiso</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="absolute bottom-6 left-6 right-6 z-20">
                            <button 
                                onClick={guardarLista} 
                                disabled={formBloqueado}
                                className={`w-full p-4 rounded-2xl font-black shadow-xl transition-all text-lg ${formBloqueado ? 'bg-slate-300 text-slate-500 shadow-none' : 'bg-indigo-600 text-white active:scale-95'}`}
                            >
                                {formBloqueado ? 'Acceso Restringido' : 'Guardar Asistencia'}
                            </button>
                        </div>
                    </div>
                </div>
            ); 
        }
    }

    if (vistaActual === 'gestion') {
        contenidoMaestro = (
            <div className="flex flex-col h-full pt-4 animate-in slide-in-from-right duration-300">
                <div className="px-2 mb-4"><h2 className="text-2xl font-black text-slate-800">Alumnos</h2><p className="text-slate-400 text-xs">Directorio y Cumpleaños</p></div>
                
                <div className="flex px-2 space-x-2 mb-4">
                    <button onClick={() => setSubVistaGestion('directorio')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${subVistaGestion === 'directorio' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-50 text-slate-400'}`}>
                        <i className="fas fa-address-book mr-2"></i>Directorio
                    </button>
                    <button onClick={() => setSubVistaGestion('cumpleanos')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${subVistaGestion === 'cumpleanos' ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-400'}`}>
                        <i className="fas fa-birthday-cake mr-2"></i>Cumpleaños
                    </button>
                </div>
                
                <div className="flex-1 bg-white rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t border-slate-100 p-6 overflow-hidden flex flex-col">
                    
                    {subVistaGestion === 'directorio' && (
                        <div className="animate-in fade-in h-full flex flex-col">
                            <button onClick={onOpenAlumnoModal} className="w-full bg-emerald-500 p-4 rounded-2xl shadow-lg shadow-emerald-200 active:scale-95 transition-all text-white flex items-center justify-center mb-6 shrink-0">
                                <i className="fas fa-user-plus mr-2 text-lg"></i><span className="font-bold">Inscribir Nuevo Niño</span>
                            </button>
                            
                            <div className="overflow-y-auto space-y-4 pb-24 pr-2 flex-1">
                                {alumnos.length === 0 ? <p className="text-center text-slate-400 text-sm italic mt-8">No hay alumnos inscritos.</p> : 
                                alumnos.map(nino => (
                                    <div key={nino.id} className="flex flex-col p-4 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm">
                                        <div className="flex items-center space-x-3 mb-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 shadow-sm ${nino.genero === 'M' ? 'bg-sky-100 text-sky-600' : nino.genero === 'F' ? 'bg-pink-100 text-pink-600' : 'bg-white text-slate-400 border border-slate-200'}`}>
                                                {nino.nombre.charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-black text-slate-700 text-sm leading-tight">{nino.nombre}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-between items-center bg-white p-2 pl-3 rounded-2xl border border-slate-100 shadow-sm">
                                            <p className="text-[11px] text-slate-500 font-bold tracking-wide">
                                                <i className="fas fa-birthday-cake mr-1.5 text-rose-300"></i>{nino.edad} Años 
                                                <span className="mx-2 text-slate-200">|</span> 
                                                <span className={nino.genero === 'M' ? 'text-sky-500' : 'text-pink-500'}>{nino.genero === 'M' ? 'Niño' : nino.genero === 'F' ? 'Niña' : '-'}</span>
                                            </p>
                                            <div className="flex space-x-1.5">
                                                <button onClick={() => onEditAlumno(nino)} className="w-8 h-8 flex items-center justify-center bg-indigo-50 text-indigo-500 hover:bg-indigo-100 rounded-xl transition-colors shadow-sm"><i className="fas fa-edit text-xs"></i></button>
                                                <button onClick={() => onDeleteAlumno(nino)} className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors shadow-sm"><i className="fas fa-trash text-xs"></i></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {subVistaGestion === 'cumpleanos' && (
                        <div className="animate-in fade-in h-full flex flex-col">
                            <p className="text-xs text-slate-500 mb-4 text-center leading-relaxed">
                                Aquí puedes ver todos los cumpleañeros de tu clase organizados por mes para que planifiques las celebraciones.
                            </p>
                            <div className="overflow-y-auto space-y-3 pb-24 pr-1">
                                {cumpleanosAgrupados.map(grupo => {
                                    const isExp = mesCumpleExpandido === grupo.mesNum;
                                    const tieneNinos = grupo.ninos.length > 0;
                                    
                                    return (
                                        <div key={grupo.mesNum} className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
                                            <button onClick={() => setMesCumpleExpandido(isExp ? null : grupo.mesNum)} className="w-full p-4 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shadow-sm ${tieneNinos ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-300'}`}>
                                                        {grupo.ninos.length}
                                                    </div>
                                                    <span className={`font-black text-sm uppercase tracking-wide ${tieneNinos ? 'text-slate-700' : 'text-slate-400'}`}>{grupo.nombreMes}</span>
                                                </div>
                                                <i className={`fas fa-chevron-down text-slate-300 transition-transform duration-300 ${isExp ? 'rotate-180' : ''}`}></i>
                                            </button>
                                            
                                            {isExp && (
                                                <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50 animate-in slide-in-from-top-2 duration-200">
                                                    {grupo.ninos.length === 0 ? (
                                                        <p className="text-xs text-slate-400 italic text-center mt-3 mb-2">Nadie cumple años este mes.</p>
                                                    ) : (
                                                        <div className="space-y-2 mt-3">
                                                            {grupo.ninos.map(nino => (
                                                                <div key={nino.id} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
                                                                    <div className="flex items-center space-x-3">
                                                                        <div className="w-8 h-8 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center font-black text-xs border border-orange-100">
                                                                            {nino.diaNac}
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold text-slate-700 text-xs">{nino.nombre}</p>
                                                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                                                                                <i className="fas fa-gift mr-1 text-orange-300"></i>
                                                                                Cumplirá <span className="text-orange-500">{nino.edadACumplir || '?'}</span> años
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (vistaActual === 'reportes') {
        contenidoMaestro = (
            <div className="flex flex-col h-full pt-4 animate-in slide-in-from-right duration-300">
                <div className="px-2 mb-4"><h2 className="text-2xl font-black text-slate-800">Reportes</h2><p className="text-slate-400 text-xs">Análisis y estadísticas de tu clase</p></div>
                <div className="flex px-2 space-x-2 mb-4"><button onClick={() => setSubVistaReporte('ranking')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${subVistaReporte === 'ranking' ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-400'}`}><i className="fas fa-trophy mr-2"></i>Ranking</button><button onClick={() => setSubVistaReporte('historial')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${subVistaReporte === 'historial' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-50 text-slate-400'}`}><i className="fas fa-history mr-2"></i>Clases</button><button onClick={() => setSubVistaReporte('filtro')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${subVistaReporte === 'filtro' ? 'bg-sky-100 text-sky-700' : 'bg-slate-50 text-slate-400'}`}><i className="fas fa-filter mr-2"></i>Edades</button></div>
                <div className="flex-1 bg-white rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t border-slate-100 p-6 overflow-hidden flex flex-col">
                    {subVistaReporte === 'ranking' && (
                        <>
                            <h3 className="text-sm font-bold text-slate-700 mb-3 px-2 flex items-center justify-between">Top Asistencia<span className="text-[9px] bg-amber-50 text-amber-600 px-2 py-1 rounded-lg uppercase tracking-widest">{historialRankingFiltrado.length} clases</span></h3>
                            <div className="bg-amber-50 p-3 rounded-2xl mb-4 border border-amber-100 flex space-x-3"><div className="w-1/2"><label className="text-[9px] font-bold text-amber-700 uppercase ml-1">Desde</label><input type="date" className="w-full p-2 mt-1 bg-white rounded-xl outline-none text-xs font-bold text-slate-600 border border-amber-100" value={fechaInicioRanking} onChange={e=>setFechaInicioRanking(e.target.value)} /></div><div className="w-1/2"><label className="text-[9px] font-bold text-amber-700 uppercase ml-1">Hasta</label><input type="date" className="w-full p-2 mt-1 bg-white rounded-xl outline-none text-xs font-bold text-slate-600 border border-amber-100" value={fechaFinRanking} onChange={e=>setFechaFinRanking(e.target.value)} /></div></div>
                            <div className="overflow-y-auto space-y-3 pb-24 pr-2">
                                {rankingOrdenado.map((nino, index) => (
                                    <div key={nino.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center space-x-4 flex-1 pr-2">
                                            <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-black ${index === 0 ? 'bg-amber-100 text-amber-600' : index === 1 ? 'bg-slate-200 text-slate-600' : index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-white text-slate-300 border border-slate-200'}`}>#{index + 1}</div>
                                            <p className="font-bold text-slate-700 text-sm leading-tight">{nino.nombre}</p>
                                        </div>
                                        <span className="bg-emerald-50 shrink-0 text-emerald-600 font-black text-xs px-3 py-1.5 rounded-lg border border-emerald-100"><i className="fas fa-star mr-1"></i>{nino.asistenciasLogradas} Clases</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    
                    {/* NUEVO HISTORIAL DE CLASES EN MODO ACORDEÓN POR MESES PARA EL MAESTRO */}
                    {subVistaReporte === 'historial' && (
                        <>
                            <h3 className="text-sm font-bold text-slate-700 mb-4 px-2">Días Anteriores (Solo Lectura)</h3>
                            <div className="overflow-y-auto space-y-3 pb-24 pr-2">
                                {gruposMesesHistorial.length === 0 ? <p className="text-center text-slate-400 text-sm italic mt-8">Sin registros previos.</p> : 
                                    gruposMesesHistorial.map(grupo => {
                                        const isExp = mesHistorialExp === grupo.id;
                                        return (
                                            <div key={grupo.id} className="bg-slate-50 rounded-[24px] border border-slate-200 overflow-hidden shadow-sm transition-all duration-300">
                                                <button onClick={() => setMesHistorialExp(isExp ? null : grupo.id)} className="w-full p-4 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                                                    <div className="text-left">
                                                        <p className="font-black text-slate-700 text-sm capitalize">{grupo.mesLabel}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">{grupo.registros.length} clases reportadas</p>
                                                    </div>
                                                    <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors shadow-sm ${isExp ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                        <i className={`fas fa-chevron-down transition-transform duration-300 ${isExp ? 'rotate-180' : ''}`}></i>
                                                    </div>
                                                </button>
                                                
                                                {isExp && (
                                                    <div className="p-3 pt-0 border-t border-slate-100 bg-slate-50 animate-in slide-in-from-top-2 duration-200 space-y-2 mt-3">
                                                        {grupo.registros.map((h, i) => (
                                                            <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
                                                                <div>
                                                                    <p className="font-bold text-slate-700 text-xs">{formatoFecha(h.fecha)}</p>
                                                                    <p className="text-[9px] text-slate-400 uppercase mt-0.5">Por: {h.maestro.split(' ')[0]}</p>
                                                                    {h.leccion && (<p className={`text-[9px] font-bold mt-1 ${h.leccionImpartida ? 'text-indigo-500' : 'text-rose-500'}`}><i className="fas fa-book-open mr-1"></i>Lección {h.leccion} {h.leccionImpartida ? '✅' : '❌'}</p>)}
                                                                </div>
                                                                <div className="flex flex-col space-y-1.5 items-end">
                                                                    <span className="text-[10px] font-black text-emerald-600 mb-1">${Number(h.ofrenda||0).toFixed(2)}</span>
                                                                    <div className="flex space-x-1 text-[9px] font-bold">
                                                                        <span className="bg-emerald-50 text-emerald-700 px-1.5 py-1 rounded border border-emerald-100">P: {h.totales?.presentes||0}</span>
                                                                        <span className="bg-rose-50 text-rose-700 px-1.5 py-1 rounded border border-rose-100">A: {h.totales?.ausentes||0}</span>
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
                        </>
                    )}
                    {subVistaReporte === 'filtro' && (
                        <>
                            <div className="flex space-x-4 mb-5"><div className="w-1/2"><label className="text-[10px] font-bold text-sky-600 uppercase ml-2">Edad Mínima</label><input type="number" placeholder="Ej: 0" className="w-full p-4 mt-1 bg-sky-50 rounded-2xl outline-none border border-sky-100 focus:ring-2 focus:ring-sky-300 text-xl font-black text-slate-700 text-center" value={edadMin} onChange={e=>setEdadMin(e.target.value)} /></div><div className="w-1/2"><label className="text-[10px] font-bold text-sky-600 uppercase ml-2">Edad Máxima</label><input type="number" placeholder="Ej: 5" className="w-full p-4 mt-1 bg-sky-50 rounded-2xl outline-none border border-sky-100 focus:ring-2 focus:ring-sky-300 text-xl font-black text-slate-700 text-center" value={edadMax} onChange={e=>setEdadMax(e.target.value)} /></div></div>
                            {(edadMin !== '' || edadMax !== '') && (<div className="flex justify-around items-center bg-sky-600 p-4 rounded-2xl shadow-sm mb-4"><div className="text-center"><p className="text-3xl font-black text-white">{alumnosFiltrados.length}</p><p className="text-[9px] font-bold text-sky-200 uppercase tracking-widest">Total</p></div><div className="text-center"><p className="text-2xl font-black text-white">{alumnosFiltrados.filter(a=>a.genero==='M').length}</p><p className="text-[9px] font-bold text-sky-200 uppercase tracking-widest">Niños</p></div><div className="text-center"><p className="text-2xl font-black text-white">{alumnosFiltrados.filter(a=>a.genero==='F').length}</p><p className="text-[9px] font-bold text-sky-200 uppercase tracking-widest">Niñas</p></div></div>)}
                            <div className="overflow-y-auto space-y-3 pb-24 pr-2">
                                {alumnosFiltrados.map(nino => (
                                    <div key={nino.id} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center text-xs font-bold shadow-sm ${nino.genero === 'M' ? 'bg-sky-50 text-sky-600' : 'bg-pink-50 text-pink-600'}`}>{nino.nombre.charAt(0)}</div>
                                        <div><p className="font-bold text-slate-700 text-xs leading-tight">{nino.nombre}</p><p className="text-[9px] text-slate-400 font-bold tracking-wide mt-0.5">{nino.edad} Años</p></div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
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

            {/* MODAL PARA CAMBIO DE CAMPO - RESTRINGIDO */}
            {modalCambioCampo && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                            <i className="fas fa-exchange-alt"></i>
                        </div>
                        <h2 className="text-xl font-black text-slate-800 mb-2 text-center">Cambio de Campo</h2>
                        <p className="text-xs text-slate-500 mb-6 text-center leading-relaxed">Estás a punto de saltar hacia tu otro campo asignado.</p>
                        
                        {isSandbox ? (
                            <select 
                                value={campoSeleccionado} 
                                onChange={e => setCampoSeleccionado(e.target.value)}
                                className="w-full p-4 bg-slate-50 rounded-2xl outline-none border border-slate-200 text-slate-700 font-bold mb-6 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            >
                                <option value="" disabled>Modo Prueba: Elige tu destino...</option>
                                {camposDisponibles.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="w-full p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-center mb-6 shadow-inner">
                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Destino Autorizado:</p>
                                <p className="text-lg font-black text-indigo-700">{campoDestinoFijo}</p>
                            </div>
                        )}

                        <div className="flex flex-col space-y-3">
                            <button 
                                onClick={() => cambiarCampo(isSandbox ? campoSeleccionado : campoDestinoFijo)}
                                disabled={isSandbox && (!campoSeleccionado || campoSeleccionado === miCampoActual)}
                                className="w-full py-4 bg-indigo-600 disabled:bg-slate-300 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all"
                            >
                                <i className="fas fa-bolt mr-2"></i> Saltar a este Campo
                            </button>
                            <button 
                                onClick={() => setModalCambioCampo(false)}
                                className="w-full py-3 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-rose-500 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

window.MaestroDashboard = MaestroDashboard;
