var { useState, useEffect } = React;

function LogisticaDashboard({ datosUsuarioActual, entregasLogistica, onActualizarEntrega, onGuardarAvanceEntrega }) {
    const [vistaActual, setVistaActual] = useState('inicio'); 
    const [cantidadesDetalle, setCantidadesDetalle] = useState({});
    
    const nombreDisplay = datosUsuarioActual ? datosUsuarioActual.nombre.split(' ')[0] : '';
    const miGrupo = datosUsuarioActual?.grupo; 
    
    const entregasPendientes = entregasLogistica.filter(e => e.estado === 'Pendiente' && e.grupo === miGrupo && !e.archivado);
    const entregasCompletadas = entregasLogistica.filter(e => e.estado === 'Entregado' && e.grupo === miGrupo && !e.archivado);
    const todasMisCompletadas = entregasLogistica.filter(e => e.estado === 'Entregado' && e.grupo === miGrupo);
    const entregasCompletadasOrdenadas = [...todasMisCompletadas].sort((a, b) => (b.fechaEntrega || 0) - (a.fechaEntrega || 0));
    const ultimaRutaCompletada = entregasCompletadasOrdenadas.length > 0 ? entregasCompletadasOrdenadas[0] : null;

    useEffect(() => {
        const inicial = {};
        entregasPendientes.forEach(e => {
            if (e.detalles) {
                inicial[e.id] = { ...e.detalles };
            }
        });
        setCantidadesDetalle(inicial);
    }, [entregasLogistica]);

    const handleCantidadChange = (idEntrega, campoRuta, valor) => {
        setCantidadesDetalle(prev => ({
            ...prev,
            [idEntrega]: {
                ...(prev[idEntrega] || {}),
                [campoRuta]: valor
            }
        }));
    };

    const procesarCamposParaGuardar = (e) => {
        const misIngresos = cantidadesDetalle[e.id] || {};
        const nuevosDetalles = { ...(e.detalles || {}) };
        const nuevosBloqueos = { ...(e.bloqueos || {}) };
        let huboCambios = false;

        const camposOriginales = e.campos || [e.campo];
        const camposCompletos = ['📦 Víveres Equipo Logística'];
        
        camposOriginales.forEach(c => {
            camposCompletos.push(c);
            camposCompletos.push(`${c} - Textos`);
            camposCompletos.push(`${c} - Amiguitos`);
        });

        camposCompletos.forEach(c => {
            const valorIngresado = misIngresos[c];
            const bloqueoActual = e.bloqueos?.[c];
            
            if (valorIngresado !== undefined && valorIngresado !== "") {
                if (!bloqueoActual || bloqueoActual.id === datosUsuarioActual.id) {
                    nuevosDetalles[c] = valorIngresado;
                    nuevosBloqueos[c] = { id: datosUsuarioActual.id, nombre: datosUsuarioActual.nombre };
                    huboCambios = true;
                }
            }
        });

        return { huboCambios, nuevosDetalles, nuevosBloqueos };
    };

    const handleGuardarAvance = (e) => {
        const { huboCambios, nuevosDetalles, nuevosBloqueos } = procesarCamposParaGuardar(e);
        if (huboCambios) {
            onGuardarAvanceEntrega(e.id, nuevosDetalles, nuevosBloqueos);
        } else {
            alert("No hay datos nuevos para guardar.");
        }
    };

    const handleFinalizar = (e) => {
        const misIngresos = cantidadesDetalle[e.id] || {};
        const viveresLogistica = misIngresos['📦 Víveres Equipo Logística'];
        if (viveresLogistica === undefined || viveresLogistica === "") {
            alert("⚠️ ALTO: Debes registrar los víveres consumió el Equipo de Logística (0 si fue nada).");
            return;
        }
        const { nuevosDetalles, nuevosBloqueos } = procesarCamposParaGuardar(e);
        onActualizarEntrega(e.id, 'Entregado', nuevosDetalles, nuevosBloqueos);
    };

    const NavButton = ({ id, icon, label }) => (
        <button onClick={() => setVistaActual(id)} className={`flex flex-col items-center justify-center w-[100px] h-14 rounded-2xl transition-all ${vistaActual === id ? 'text-indigo-600 bg-indigo-50 font-black' : 'text-slate-400 hover:text-slate-600 font-bold'}`}>
            <i className={`fas ${icon} text-xl mb-1`}></i><span className="text-[9px] tracking-wide">{label}</span>
        </button>
    );

    let contenidoLogistica;

    if (!miGrupo) {
        contenidoLogistica = (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in zoom-in-95">
                <div className="w-24 h-24 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center text-5xl mb-6 shadow-inner"><i className="fas fa-user-clock"></i></div>
                <h3 className="text-2xl font-black text-slate-700 mb-2">¡Hola, {nombreDisplay}!</h3>
                <p className="text-slate-500 text-sm leading-relaxed">Tu cuenta ha sido aprobada, pero aún no tienes asignado un Grupo de Reparto.</p>
            </div>
        );
    } else if (vistaActual === 'inicio') {
        contenidoLogistica = (
            <div className="flex flex-col h-full space-y-6 pt-4 animate-in fade-in duration-300">
                <div className="px-2">
                    <h2 className="text-3xl font-black text-slate-800">Hola, {nombreDisplay}</h2>
                    <p className="text-slate-400 text-sm mt-1">Equipo de Reparto: <b className="text-amber-500">{miGrupo}</b></p>
                </div>
                <div className="w-full bg-amber-500 p-6 rounded-[32px] text-white shadow-xl flex justify-between items-center relative overflow-hidden">
                    <div className="relative z-10"><p className="text-xs font-bold uppercase opacity-90 tracking-widest">Rutas Pendientes</p><p className="text-5xl font-black mt-1">{entregasPendientes.length}</p></div>
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm"><i className="fas fa-route"></i></div>
                </div>
                <div className="w-full bg-emerald-500 p-6 rounded-[32px] text-white shadow-xl flex justify-between items-center relative overflow-hidden">
                    <div className="relative z-10"><p className="text-xs font-bold uppercase opacity-90 tracking-widest">Completadas Hoy</p><p className="text-5xl font-black mt-1">{entregasCompletadas.length}</p></div>
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm"><i className="fas fa-check-circle"></i></div>
                </div>
            </div>
        );
    } else if (vistaActual === 'misiones') {
        contenidoLogistica = (
            <div className="flex flex-col h-full pt-4 animate-in slide-in-from-right duration-300">
                <div className="px-2 mb-6"><h2 className="text-2xl font-black text-slate-800">Rutas de Entrega</h2></div>
                <div className="flex-1 bg-white rounded-t-[40px] shadow-lg p-6 overflow-hidden flex flex-col">
                    <div className="overflow-y-auto space-y-6 pb-24 pr-2">
                        {entregasPendientes.length === 0 ? (
                            <div className="text-center p-6 mt-4">
                                <div className="w-24 h-24 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-5xl mx-auto mb-4 shadow-inner"><i className="fas fa-hourglass-half"></i></div>
                                <h3 className="font-bold text-slate-700 text-xl">¡Misión Cumplida!</h3>
                                <p className="text-slate-500 text-sm mt-2">Esperando nuevas rutas de la dirección...</p>
                            </div>
                        ) : (
                            entregasPendientes.map(e => {
                                const camposDeRuta = e.campos || [e.campo];
                                const keysParaSumar = ['📦 Víveres Equipo Logística'];
                                camposDeRuta.forEach(c => {
                                    keysParaSumar.push(c);
                                    keysParaSumar.push(`${c} - Textos`);
                                    keysParaSumar.push(`${c} - Amiguitos`);
                                });

                                const totalIngresado = keysParaSumar.reduce((sum, key) => {
                                    return sum + (Number(cantidadesDetalle[e.id]?.[key]) || Number(e.detalles?.[key]) || 0);
                                }, 0);
                                const enVehiculo = e.cantidad - totalIngresado;

                                return (
                                    <div key={e.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-200 relative overflow-hidden shadow-sm">
                                        <h3 className="font-black text-slate-800 text-lg mb-4"><i className="fas fa-truck-loading text-amber-500 mr-2"></i>Ruta Activa</h3>
                                        <div className="bg-white p-3 rounded-2xl mb-5 flex justify-between border border-slate-100">
                                            <div className="text-center w-1/3"><p className="text-[9px] font-bold text-slate-400 uppercase">Carga</p><p className="text-lg font-black text-indigo-600">{e.cantidad}</p></div>
                                            <div className="text-center w-1/3 border-l border-r"><p className="text-[9px] font-bold text-slate-400 uppercase">Enviados</p><p className="text-lg font-black text-emerald-500">{totalIngresado}</p></div>
                                            <div className="text-center w-1/3"><p className="text-[9px] font-bold text-slate-400 uppercase">Resta</p><p className="text-lg font-black text-amber-500">{enVehiculo}</p></div>
                                        </div>
                                        <div className="space-y-4 mb-5">
                                            {camposDeRuta.map(c => (
                                                <div key={c} className="flex justify-between items-center bg-white p-3 rounded-xl border">
                                                    <span className="text-sm font-black text-slate-800">📍 {c}</span>
                                                    <input type="number" placeholder="Cant." className="w-20 p-2 rounded-lg bg-slate-50 text-center text-xs font-black" value={cantidadesDetalle[e.id]?.[c] !== undefined ? cantidadesDetalle[e.id]?.[c] : (e.detalles?.[c] || '')} onChange={(ev) => handleCantidadChange(e.id, c, ev.target.value)} />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex space-x-2">
                                            <button onClick={() => handleGuardarAvance(e)} className="w-1/3 py-4 bg-white border text-indigo-500 font-black rounded-2xl text-[10px] uppercase">Guardar</button>
                                            <button onClick={() => handleFinalizar(e)} className="w-2/3 py-4 bg-emerald-500 text-white font-black rounded-2xl">Finalizar Ruta</button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {contenidoLogistica}
            {miGrupo && (
                <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md border-t border-slate-100 flex justify-around items-center p-2 z-50 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                    <NavButton id="inicio" icon="fa-home" label="Resumen" />
                    <NavButton id="misiones" icon="fa-truck" label="Ruta" />
                </div>
            )}
        </>
    );
}

window.LogisticaDashboard = LogisticaDashboard;
