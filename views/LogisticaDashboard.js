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

        // Construir la lista dinámica de todos los campos posibles en esta ruta
        const camposOriginales = e.campos || [e.campo];
        const camposCompletos = ['📦 Víveres Equipo Logística'];
        
        camposOriginales.forEach(c => {
            camposCompletos.push(c); // El campo principal
            camposCompletos.push(`${c} - Textos`); // Recompensa textos
            camposCompletos.push(`${c} - Amiguitos`); // Recompensa amiguitos
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
            alert("No hay datos nuevos para guardar, o los campos que editaste ya fueron registrados por otro compañero.");
        }
    };

    const handleFinalizar = (e) => {
        const misIngresos = cantidadesDetalle[e.id] || {};
        
        const viveresLogistica = misIngresos['📦 Víveres Equipo Logística'];
        if (viveresLogistica === undefined || viveresLogistica === "") {
            alert("⚠️ ALTO: Debes registrar cuántos víveres consumió el Equipo de Logística. Si no ocuparon nada, ingresa el número 0.");
            return;
        }

        const { nuevosDetalles, nuevosBloqueos } = procesarCamposParaGuardar(e);
        onActualizarEntrega(e.id, 'Entregado', nuevosDetalles, nuevosBloqueos);
    };

    const NavButton = ({ id, icon, label, width = 'w-[100px]' }) => (
        <button onClick={() => setVistaActual(id)} className={`flex flex-col items-center justify-center ${width} h-14 rounded-2xl transition-all ${vistaActual === id ? 'text-indigo-600 bg-indigo-50 font-black' : 'text-slate-400 hover:text-slate-600 font-bold'}`}>
            <i className={`fas ${icon} text-xl mb-1 ${vistaActual === id ? 'animate-bounce' : ''}`}></i><span className="text-[9px] tracking-wide">{label}</span>
        </button>
    );

    let contenidoLogistica;

    if (!miGrupo) {
        contenidoLogistica = (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in zoom-in-95">
                <div className="w-24 h-24 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center text-5xl mb-6 shadow-inner"><i className="fas fa-user-clock"></i></div>
                <h3 className="text-2xl font-black text-slate-700 mb-2">¡Hola, {nombreDisplay}!</h3>
                <p className="text-slate-500 text-sm leading-relaxed">Tu cuenta ha sido aprobada, pero el Director aún no te ha asignado a un <b>Grupo de Reparto</b>.<br/><br/>Pídele que te asigne desde su panel para poder ver tus rutas.</p>
            </div>
        );
    } else if (vistaActual === 'inicio') {
        contenidoLogistica = (
            <div className="flex flex-col h-full space-y-6 pt-4 animate-in fade-in duration-300">
                <div className="px-2">
                    <h2 className="text-3xl font-black text-slate-800">Hola, {nombreDisplay}</h2>
                    <p className="text-slate-400 text-sm mt-1">Equipo de Reparto: <b className="text-amber-500">{miGrupo}</b></p>
                </div>
                
                <div className="w-full bg-amber-500 p-6 rounded-[32px] text-white shadow-xl shadow-amber-200 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-bl-[100px] pointer-events-none"></div>
                    <div className="relative z-10"><p className="text-xs font-bold uppercase opacity-90 tracking-widest">Rutas Pendientes</p><p className="text-5xl font-black tracking-tighter mt-1">{entregasPendientes.length}</p></div>
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm relative z-10"><i className="fas fa-route"></i></div>
                </div>

                <div className="w-full bg-emerald-500 p-6 rounded-[32px] text-white shadow-xl shadow-emerald-200 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-bl-[100px] pointer-events-none"></div>
                    <div className="relative z-10"><p className="text-xs font-bold uppercase opacity-90 tracking-widest">Completadas Hoy</p><p className="text-5xl font-black tracking-tighter mt-1">{entregasCompletadas.length}</p></div>
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm relative z-10"><i className="fas fa-check-circle"></i></div>
                </div>
            </div>
        );
    } else if (vistaActual === 'misiones') {
        contenidoLogistica = (
            <div className="flex flex-col h-full pt-4 animate-in slide-in-from-right duration-300">
                <div className="px-2 mb-6"><h2 className="text-2xl font-black text-slate-800">Rutas de Entrega</h2><p className="text-slate-400 text-xs">Destinos asignados a {miGrupo}</p></div>
                
                <div className="flex-1 bg-white rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t border-slate-100 p-6 overflow-hidden flex flex-col">
                    <div className="overflow-y-auto space-y-6 pb-24 pr-2">
                        {entregasPendientes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
                                <div className="text-center p-6 mt-4 mb-4">
                                    <div className="w-24 h-24 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-5xl mx-auto mb-4 shadow-inner"><i className="fas fa-hourglass-half"></i></div>
                                    <h3 className="font-bold text-slate-700 text-xl">¡Misión Cumplida!</h3>
                                    <p className="text-slate-500 text-sm mt-2 leading-relaxed">Esperando a que el Administrador asigne nuevas rutas para tu equipo...</p>
                                </div>
                                {ultimaRutaCompletada && (
                                    <div className="w-full mt-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-3"><i className="fas fa-history mr-1"></i> Tu Ruta Anterior:</p>
                                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 relative overflow-hidden shadow-sm opacity-70 grayscale">
                                            <div className="absolute top-0 right-0 bg-slate-400 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl">{ultimaRutaCompletada.grupo}</div>
                                            <h3 className="font-black text-slate-600 text-base mb-1 mt-1"><i className="fas fa-check-double text-slate-500 mr-2"></i>Ruta Finalizada</h3>
                                            <p className="text-xs font-bold text-slate-500 mb-4 pl-7">Total asignado: {ultimaRutaCompletada.cantidad} Paquetes</p>
                                            <div className="space-y-2">
                                                {Object.entries(ultimaRutaCompletada.detalles || {}).map(([c, cant]) => (
                                                    <div key={c} className="flex justify-between items-center bg-white/50 p-2 px-3 rounded-xl border border-slate-200">
                                                        <span className="text-xs font-bold text-slate-500 w-1/2 truncate">{c}</span>
                                                        <span className="text-xs font-black text-slate-400">{cant} entregados</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            entregasPendientes.map(e => {
                                const camposDeRuta = e.campos || [e.campo];
                                
                                // Calculamos total ingresado construyendo dinámicamente las llaves
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
                                        <div className="absolute top-0 right-0 bg-amber-400 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl shadow-sm">{e.grupo}</div>
                                        <h3 className="font-black text-slate-800 text-lg mb-4 mt-1"><i className="fas fa-truck-loading text-amber-500 mr-2"></i>Ruta Activa</h3>
                                        
                                        <div className="bg-white p-3 rounded-2xl mb-5 flex justify-between items-center shadow-sm border border-slate-100">
                                            <div className="text-center w-1/3">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Carga Inicial</p>
                                                <p className="text-lg font-black text-indigo-600">{e.cantidad}</p>
                                            </div>
                                            <div className="text-center w-1/3 border-l border-r border-slate-100">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Entregados</p>
                                                <p className="text-lg font-black text-emerald-500">{totalIngresado}</p>
                                            </div>
                                            <div className="text-center w-1/3">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">En Vehículo</p>
                                                <p className={`text-lg font-black ${enVehiculo < 0 ? 'text-rose-500' : 'text-amber-500'}`}>{enVehiculo}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-4 mb-5">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-2">Detalle de Entrega por Campos:</p>
                                            
                                            {/* RENDERIZADO DE CAMPOS Y SUS RECOMPENSAS */}
                                            {camposDeRuta.map(c => {
                                                const keyTextos = `${c} - Textos`;
                                                const keyAmiguitos = `${c} - Amiguitos`;

                                                const bloqueo = e.bloqueos?.[c];
                                                const bloqueadoPorOtro = bloqueo && bloqueo.id !== datosUsuarioActual.id;
                                                const bloqueadoPorMi = bloqueo && bloqueo.id === datosUsuarioActual.id;

                                                const bloqueoTextos = e.bloqueos?.[keyTextos];
                                                const bloqueadoPorOtroTextos = bloqueoTextos && bloqueoTextos.id !== datosUsuarioActual.id;

                                                const bloqueoAmiguitos = e.bloqueos?.[keyAmiguitos];
                                                const bloqueadoPorOtroAmiguitos = bloqueoAmiguitos && bloqueoAmiguitos.id !== datosUsuarioActual.id;

                                                return (
                                                    <div key={c} className={`flex flex-col bg-white p-4 rounded-2xl border shadow-sm ${bloqueadoPorOtro ? 'border-rose-100 bg-rose-50/40' : bloqueadoPorMi ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-200'}`}>
                                                        
                                                        {/* 1. CAMPO PRINCIPAL */}
                                                        <div className="flex justify-between items-center mb-3">
                                                            <span className={`text-sm font-black w-1/2 truncate ${bloqueadoPorOtro ? 'text-slate-400' : 'text-slate-800'}`}>📍 {c}</span>
                                                            <div className="w-1/2 flex justify-end">
                                                                <input 
                                                                    type="number" 
                                                                    placeholder="Paquetes" 
                                                                    disabled={bloqueadoPorOtro}
                                                                    className={`w-20 p-2 rounded-lg text-xs font-black text-center outline-none transition-colors shadow-sm ${bloqueadoPorOtro ? 'bg-transparent text-slate-400' : 'bg-slate-50 border border-slate-200 text-indigo-600 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'}`}
                                                                    value={cantidadesDetalle[e.id]?.[c] !== undefined ? cantidadesDetalle[e.id]?.[c] : (e.detalles?.[c] || '')}
                                                                    onChange={(ev) => handleCantidadChange(e.id, c, ev.target.value)}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* 2. SUB-MENÚ DE RECOMPENSAS */}
                                                        <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100 space-y-3">
                                                            <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest"><i className="fas fa-gift mr-1"></i> Recompensas Extras (Opcional)</p>
                                                            
                                                            {/* Recompensa: 3 Textos */}
                                                            <div className="flex justify-between items-center">
                                                                <span className={`text-[10px] font-bold w-1/2 truncate ${bloqueadoPorOtroTextos ? 'text-slate-400' : 'text-slate-600'}`}><i className="fas fa-book-open text-amber-500 mr-1.5"></i>Por 3 Textos</span>
                                                                <div className="w-1/2 flex justify-end">
                                                                    <input 
                                                                        type="number" 
                                                                        placeholder="Cant." 
                                                                        disabled={bloqueadoPorOtroTextos}
                                                                        className={`w-16 p-1.5 rounded-lg text-xs font-black text-center outline-none transition-colors ${bloqueadoPorOtroTextos ? 'bg-transparent text-slate-400' : 'bg-white border border-amber-200 text-amber-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-200'}`}
                                                                        value={cantidadesDetalle[e.id]?.[keyTextos] !== undefined ? cantidadesDetalle[e.id]?.[keyTextos] : (e.detalles?.[keyTextos] || '')}
                                                                        onChange={(ev) => handleCantidadChange(e.id, keyTextos, ev.target.value)}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Recompensa: Amiguito */}
                                                            <div className="flex justify-between items-center">
                                                                <span className={`text-[10px] font-bold w-1/2 truncate ${bloqueadoPorOtroAmiguitos ? 'text-slate-400' : 'text-slate-600'}`}><i className="fas fa-user-plus text-amber-500 mr-1.5"></i>Por Amiguito</span>
                                                                <div className="w-1/2 flex justify-end">
                                                                    <input 
                                                                        type="number" 
                                                                        placeholder="Cant." 
                                                                        disabled={bloqueadoPorOtroAmiguitos}
                                                                        className={`w-16 p-1.5 rounded-lg text-xs font-black text-center outline-none transition-colors ${bloqueadoPorOtroAmiguitos ? 'bg-transparent text-slate-400' : 'bg-white border border-amber-200 text-amber-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-200'}`}
                                                                        value={cantidadesDetalle[e.id]?.[keyAmiguitos] !== undefined ? cantidadesDetalle[e.id]?.[keyAmiguitos] : (e.detalles?.[keyAmiguitos] || '')}
                                                                        onChange={(ev) => handleCantidadChange(e.id, keyAmiguitos, ev.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {bloqueadoPorOtro && (<p className="text-[9px] text-rose-500 font-bold mt-2 text-right"><i className="fas fa-lock mr-1"></i> Registrado por {bloqueo.nombre}</p>)}
                                                    </div>
                                                );
                                            })}

                                            {/* SEPARADOR VISUAL PARA GASTOS DEL EQUIPO (OBLIGATORIO) */}
                                            <div className="pt-3 mt-4 border-t-2 border-dashed border-slate-200">
                                                <div className={`flex flex-col bg-indigo-50 p-4 rounded-2xl border border-indigo-100 shadow-sm`}>
                                                    <label className="text-xs font-black text-indigo-800 mb-2 uppercase tracking-wide"><i className="fas fa-users-cog mr-1"></i> 📦 Víveres Equipo Logística</label>
                                                    <input 
                                                        type="number" 
                                                        placeholder="Cantidad (Obligatorio)" 
                                                        className="w-full p-3 rounded-xl text-sm font-black text-center outline-none bg-white border border-indigo-200 text-indigo-600 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
                                                        value={cantidadesDetalle[e.id]?.['📦 Víveres Equipo Logística'] !== undefined ? cantidadesDetalle[e.id]?.['📦 Víveres Equipo Logística'] : (e.detalles?.['📦 Víveres Equipo Logística'] || '')}
                                                        onChange={(ev) => handleCantidadChange(e.id, '📦 Víveres Equipo Logística', ev.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex space-x-2">
                                            <button onClick={() => handleGuardarAvance(e)} className="w-1/3 py-4 bg-white hover:bg-slate-100 text-indigo-500 border border-indigo-200 font-black rounded-2xl shadow-sm active:scale-95 transition-all flex flex-col items-center justify-center text-[10px] uppercase tracking-wide">
                                                <i className="fas fa-save mb-1 text-base"></i> Avance
                                            </button>
                                            <button onClick={() => handleFinalizar(e)} className="w-2/3 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center text-sm">
                                                <i className="fas fa-check-circle mr-2"></i> Finalizar Ruta
                                            </button>
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
                    <NavButton id="inicio" icon="fa-home" label="Resumen" width="w-[100px]" />
                    <NavButton id="misiones" icon="fa-truck" label="Ruta" width="w-[100px]" />
                </div>
            )}
        </>
    );
}

window.LogisticaDashboard = LogisticaDashboard;
