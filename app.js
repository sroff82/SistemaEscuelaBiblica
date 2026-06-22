var { useState, useEffect } = React;
var { AuthService, MaestrosService, AlumnosService, LogisticaService, LoginView, DashboardView } = window;

// =========================================================================
// LÍMITE DE ERRORES (ERROR BOUNDARY)
// =========================================================================
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error: error, errorInfo: errorInfo });
        console.error("Error capturado por ErrorBoundary:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-rose-50 p-8 flex flex-col items-center justify-center text-slate-800">
                    <div className="bg-white p-6 rounded-2xl shadow-xl border-l-4 border-rose-500 max-w-2xl w-full">
                        <div className="flex items-center space-x-3 mb-4 text-rose-600">
                            <i className="fas fa-exclamation-triangle text-3xl"></i>
                            <h2 className="text-xl font-black">Error Crítico del Sistema</h2>
                        </div>
                        <p className="text-sm font-bold text-slate-500 mb-4">El sistema ha detenido su ejecución para proteger los datos. Detalles técnicos:</p>
                        
                        <div className="bg-slate-900 text-rose-400 p-4 rounded-xl overflow-x-auto text-xs font-mono mb-4">
                            <strong>{this.state.error && this.state.error.toString()}</strong>
                            <br/><br/>
                            <span className="text-slate-400">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </span>
                        </div>
                        
                        <button onClick={() => window.location.reload()} className="px-5 py-3 bg-rose-500 text-white font-bold rounded-xl shadow-md hover:bg-rose-600 transition-colors">
                            Forzar Reinicio de Aplicación
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

function App() {
    const [usuario, setUsuario] = useState(null);
    const [datosUsuarioActual, setDatosUsuarioActual] = useState(null);
    const [modoSandboxActivo, setModoSandboxActivo] = useState(false);
    const [maestros, setMaestros] = useState([]);
    const [alumnos, setAlumnos] = useState([]);
    const [todosLosAlumnos, setTodosLosAlumnos] = useState([]);
    const [asistenciaHoy, setAsistenciaHoy] = useState(null);
    const [datosGlobalesAsistencia, setDatosGlobalesAsistencia] = useState({ registros: [], rango: null });
    const [historialAsistencias, setHistorialAsistencias] = useState([]);
    const [entregasLogistica, setEntregasLogistica] = useState([]);
    const [mantenimiento, setMantenimiento] = useState(false);
    const [inventarioDatos, setInventarioDatos] = useState({ historicoRecibido: 0, actualRecibido: 0 });
    const [fondoTotal, setFondoTotal] = useState(0);
    const [fondoVoluntarioTotal, setFondoVoluntarioTotal] = useState(0); 
    const [historialIngresos, setHistorialIngresos] = useState([]);
    const [fondoSecretariaTotal, setFondoSecretariaTotal] = useState(0);
    const [fondoSecretariaVoluntarioTotal, setFondoSecretariaVoluntarioTotal] = useState(0); 
    const [historialSecretaria, setHistorialSecretaria] = useState([]);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [modalAlumno, setModalAlumno] = useState(false);
    const [maestroEdicion, setMaestroEdicion] = useState(null);
    const [maestroABorrar, setMaestroABorrar] = useState(null);
    const [alumnoBorrar, setAlumnoBorrar] = useState(null); 
    const [alumnoEdicion, setAlumnoEdicion] = useState(null);
    const [campoABorrar, setCampoABorrar] = useState(null);
    const [edadCalculada, setEdadCalculada] = useState(null);
    const [diaNac, setDiaNac] = useState('');
    const [mesNac, setMesNac] = useState('');
    const [anioNac, setAnioNac] = useState('');

    const camposDisponibles = ["La Isla", "Las Delicias", "El Amatal", "El Manguito", "Buenos Aires", "Corozal #1", "El Porvenir", "El Caulote", "Corozal #2", "Valle Encantado", "La Playa"];
    const calcularEdad = (f) => { if (!f) return null; const h = new Date(); const c = new Date(f); let e = h.getFullYear() - c.getFullYear(); if (h.getMonth() < c.getMonth() || (h.getMonth()===c.getMonth() && h.getDate()<c.getDate())) e--; return e; };
    const isSandbox = datosUsuarioActual?.id === 'user_sandbox_secreto';
    const candadoSandbox = (accion) => { alert(`🔒 MODO DESARROLLADOR\n\nAcción simulada: [${accion}]`); };

    useEffect(() => {
        const sesion = AuthService.obtenerSesion();
        const datosGuardados = AuthService.obtenerDatosUsuario();
        if (sesion) { setUsuario(sesion); if (datosGuardados) setDatosUsuarioActual(datosGuardados); }
    }, []);

    useEffect(() => { 
        if (MaestrosService) {
            const unsubMaestros = MaestrosService.suscribir(setMaestros); 
            const unsubMantenimiento = MaestrosService.suscribirMantenimiento(setMantenimiento);
            return () => { unsubMaestros(); unsubMantenimiento(); };
        }
    }, []);

    useEffect(() => {
        if (usuario && usuario !== 'ADMIN' && datosUsuarioActual?.id) {
            if (isSandbox) return; 
            const unsubscribe = MaestrosService.vigilarUsuario(datosUsuarioActual.id, (u) => {
                if (!u) { 
                    alert("Tu usuario ha sido eliminado.");
                    localStorage.removeItem('datos_recientes_login');
                    handleLogout(); 
                } else { 
                    setDatosUsuarioActual(prev => {
                        if (!prev || prev.grupo !== u.grupo || prev.estado !== u.estado) {
                            const newData = { id: prev.id, ...u }; 
                            AuthService.guardarSesion(usuario, newData);
                            return newData;
                        }
                        return prev;
                    });
                }
            });
            return () => unsubscribe();
        }
    }, [usuario, datosUsuarioActual?.id]);

    useEffect(() => {
        if (!usuario) return;
        const unsubs = [];
        if (usuario === 'ADMIN' || usuario === 'SECRETARIA' || usuario === 'TESORERO') {
            unsubs.push(AlumnosService.suscribirTodos(setTodosLosAlumnos));
            unsubs.push(AlumnosService.suscribirAsistenciaSemanal(setDatosGlobalesAsistencia));
            unsubs.push(AlumnosService.suscribirHistorialGlobal(setHistorialAsistencias));
            unsubs.push(window.db.collection('sistema').doc('tesoreria').onSnapshot(doc => setFondoTotal(doc.exists ? doc.data().total : 0)));
            unsubs.push(window.db.collection('sistema').doc('tesoreria_voluntaria').onSnapshot(doc => setFondoVoluntarioTotal(doc.exists ? doc.data().total : 0)));
            unsubs.push(window.db.collection('ingresos_tesoreria').orderBy('timestamp', 'desc').limit(500).onSnapshot(snapshot => {
                const hist = []; snapshot.forEach(doc => hist.push({ id: doc.id, ...doc.data() })); setHistorialIngresos(hist);
            }));
            unsubs.push(window.db.collection('sistema').doc('finanzas_secretaria').onSnapshot(doc => setFondoSecretariaTotal(doc.exists ? doc.data().total : 0)));
            unsubs.push(window.db.collection('sistema').doc('finanzas_secretaria_voluntaria').onSnapshot(doc => setFondoSecretariaVoluntarioTotal(doc.exists ? doc.data().total : 0)));
            unsubs.push(window.db.collection('ingresos_secretaria').orderBy('timestamp', 'desc').limit(500).onSnapshot(snapshot => {
                const hist = []; snapshot.forEach(doc => hist.push({ id: doc.id, ...doc.data() })); setHistorialSecretaria(hist);
            }));
            if (usuario === 'ADMIN') {
                if(LogisticaService) unsubs.push(LogisticaService.suscribirTodas(setEntregasLogistica)); 
                unsubs.push(window.db.collection('sistema').doc('inventario').onSnapshot(doc => setInventarioDatos(doc.exists ? doc.data() : { historicoRecibido: 0, actualRecibido: 0 })));
            }
        } else if (usuario === 'LOGISTICA') {
            if(LogisticaService) unsubs.push(LogisticaService.suscribirTodas(setEntregasLogistica)); 
        } else if (datosUsuarioActual && datosUsuarioActual.campo) {
            unsubs.push(AlumnosService.suscribirPorCampo(datosUsuarioActual.campo, setAlumnos));
            unsubs.push(AlumnosService.suscribirAsistenciaHoy(datosUsuarioActual.campo, setAsistenciaHoy));
            unsubs.push(AlumnosService.suscribirHistorialPorCampo(datosUsuarioActual.campo, setHistorialAsistencias));
        }
        return () => unsubs.forEach(unsub => unsub && unsub());
    }, [usuario, datosUsuarioActual?.campo]); 

    const handleLogin = async (rol, clave, nombre, campo, fechaNacimiento, edad) => {
        if (rol === 'PRUEBA') { if (clave === '@Dev2026') { setModoSandboxActivo(true); return { exito: true }; } return { exito: false, mensaje: "PIN incorrecto." }; }
        if (mantenimiento && rol !== 'ADMIN') return { exito: false, mensaje: "Sistema en Mantenimiento." };
        if (!AuthService.verificar(rol, clave)) return { exito: false, mensaje: "Clave incorrecta." };
        if (rol === 'ADMIN') { setUsuario(rol); AuthService.guardarSesion(rol, null); return { exito: true }; }
        try {
            const snapshot = await window.db.collection('maestros').where('nombre', '==', nombre.trim()).where('clase', '==', rol).get();
            if (snapshot.empty) { 
                await MaestrosService.guardar({ nombre: nombre.trim(), clase: rol, campo: campo || '', telefono: '', grupo: '', fechaNacimiento: fechaNacimiento || '', edad: edad || null }, null, 'SISTEMA_AUTO'); 
                return { exito: true, mensaje: "Solicitud enviada." }; 
            } else { 
                const doc = snapshot.docs[0]; const d = doc.data(); 
                if (d.estado === 'Activo') { setUsuario(rol); const datos = { ...d, id: doc.id }; setDatosUsuarioActual(datos); AuthService.guardarSesion(rol, datos); return { exito: true }; } 
                return { exito: true, mensaje: "Pendiente." }; 
            }
        } catch (e) { return { exito: false, mensaje: "Error conexión." }; }
    };

    const handleLogout = () => { setUsuario(null); setDatosUsuarioActual(null); setAlumnos([]); setTodosLosAlumnos([]); setHistorialAsistencias([]); setEntregasLogistica([]); AuthService.cerrarSesion(); setModoSandboxActivo(false); };
    const handleVolverSandbox = () => { setUsuario(null); setDatosUsuarioActual(null); setAlumnos([]); setTodosLosAlumnos([]); setHistorialAsistencias([]); setEntregasLogistica([]); };

    const handleGuardarAsistencia = async (registros, leccion, leccionImpartida, ofrenda) => {
        try { await AlumnosService.guardarAsistencia({ fecha: new Date().toLocaleDateString('en-CA'), campo: datosUsuarioActual.campo, clase: 'General', maestro: datosUsuarioActual.nombre, registradoPorId: datosUsuarioActual.id, registros: registros, totales: { presentes: registros.filter(r=>r.estado==='Presente').length, ausentes: registros.filter(r=>r.estado==='Ausente').length, permisos: registros.filter(r=>r.estado==='Permiso').length }, leccion: leccion, leccionImpartida: leccionImpartida, ofrenda: Number(ofrenda) || 0, timestamp: Date.now() }); return true; } catch (e) { return false; }
    };

    const handleGuardarIngreso = async (monto, descripcion, fondoActivo) => {
        try { const m = parseFloat(monto); await window.db.collection('ingresos_tesoreria').add({ tipo: 'ingreso', monto: m, descripcion: descripcion.trim(), fecha: new Date().toLocaleDateString('en-CA'), timestamp: Date.now(), registradoPor: datosUsuarioActual.nombre, fondo: fondoActivo }); const name = fondoActivo === 'voluntario' ? 'tesoreria_voluntaria' : 'tesoreria'; const ref = window.db.collection('sistema').doc(name); const snap = await ref.get(); await ref.set({ total: (snap.exists ? snap.data().total : 0) + m }, { merge: true }); return true; } catch (e) { return false; }
    };

    const handleGuardarEgreso = async (monto, descripcion, fondoActivo) => {
        try { const m = parseFloat(monto); const name = fondoActivo === 'voluntario' ? 'tesoreria_voluntaria' : 'tesoreria'; const ref = window.db.collection('sistema').doc(name); const snap = await ref.get(); const act = snap.exists ? snap.data().total : 0; if (m > act) { alert("Fondos insuficientes."); return false; } await window.db.collection('ingresos_tesoreria').add({ tipo: 'egreso', monto: m, descripcion: descripcion.trim(), fecha: new Date().toLocaleDateString('en-CA'), timestamp: Date.now(), registradoPor: datosUsuarioActual.nombre, fondo: fondoActivo }); await ref.set({ total: act - m }, { merge: true }); return true; } catch (e) { return false; }
    };

    const handleGuardarIngresoSecretaria = async (monto, descripcion, fondoActivo) => {
        try { const m = parseFloat(monto); await window.db.collection('ingresos_secretaria').add({ tipo: 'ingreso', monto: m, descripcion: descripcion.trim(), fecha: new Date().toLocaleDateString('en-CA'), timestamp: Date.now(), registradoPor: datosUsuarioActual.nombre, fondo: fondoActivo }); const name = fondoActivo === 'voluntario' ? 'finanzas_secretaria_voluntaria' : 'finanzas_secretaria'; const ref = window.db.collection('sistema').doc(name); const snap = await ref.get(); await ref.set({ total: (snap.exists ? snap.data().total : 0) + m }, { merge: true }); return true; } catch (e) { return false; }
    };

    const handleGuardarEgresoSecretaria = async (monto, descripcion, fondoActivo) => {
        try { const m = parseFloat(monto); const name = fondoActivo === 'voluntario' ? 'finanzas_secretaria_voluntaria' : 'finanzas_secretaria'; const ref = window.db.collection('sistema').doc(name); const snap = await ref.get(); const act = snap.exists ? snap.data().total : 0; if (m > act) { alert("Fondos insuficientes."); return false; } await window.db.collection('ingresos_secretaria').add({ tipo: 'egreso', monto: m, descripcion: descripcion.trim(), fecha: new Date().toLocaleDateString('en-CA'), timestamp: Date.now(), registradoPor: datosUsuarioActual.nombre, fondo: fondoActivo }); await ref.set({ total: act - m }, { merge: true }); return true; } catch (e) { return false; }
    };

    if (!usuario && !modoSandboxActivo) return <LoginView onLogin={handleLogin} />;

    return (
        <div className="flex flex-col min-h-[100dvh] max-w-md mx-auto bg-white shadow-2xl relative">
            <header className="sticky top-0 backdrop-blur-md p-5 flex justify-between items-center border-b bg-white/95 z-40">
                <h1 className="text-xl font-black text-slate-800">{usuario === 'ADMIN' ? 'Director' : usuario}</h1>
                <button onClick={handleLogout} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl"><i className="fas fa-sign-out-alt"></i></button>
            </header>
            <main className="flex-1 p-5 pb-28 bg-slate-50/50">
                <DashboardView 
                    maestros={maestros} alumnos={alumnos} todosLosAlumnos={todosLosAlumnos} 
                    asistenciaHoy={asistenciaHoy} datosGlobalesAsistencia={datosGlobalesAsistencia} 
                    historialAsistencias={historialAsistencias} entregasLogistica={entregasLogistica} 
                    usuario={usuario} datosUsuarioActual={datosUsuarioActual} mantenimiento={mantenimiento} onToggleMantenimiento={()=>MaestrosService.toggleMantenimiento(mantenimiento)}
                    inventarioDatos={inventarioDatos} onActualizarInventario={(c)=>window.db.collection('sistema').doc('inventario').set({ historicoRecibido: (inventarioDatos.historicoRecibido||0)+c, actualRecibido: (inventarioDatos.actualRecibido||0)+c }, {merge:true})} onCerrarJornada={()=>window.db.collection('sistema').doc('inventario').set({ actualRecibido: 0 }, {merge:true})}
                    onApprove={MaestrosService.aprobar} onDelete={(m)=>window.db.collection('maestros').doc(m.id).delete()} 
                    onSaveAsistencia={handleGuardarAsistencia} onOpenAlumnoModal={()=>setModalAlumno(true)} onEditAlumno={(a)=>{setAlumnoEdicion(a); setModalAlumno(true);}} onDeleteAlumno={(a)=>AlumnosService.eliminar(a.id, a.campo)} onDeleteCampo={(c)=>AlumnosService.eliminarCampoCompleto(c)}
                    onResetLecciones={AlumnosService.reiniciarLecciones} onCrearEntrega={(d)=>LogisticaService.crear({...d, asignadoPor:'Director'})} onActualizarEntrega={(id, s, det, b)=>window.db.collection('entregas').doc(id).update({estado: s, detalles: det, bloqueos: b, fechaEntrega: Date.now()})} onGuardarAvanceEntrega={(id, det, b)=>window.db.collection('entregas').doc(id).update({detalles: det, bloqueos: b})} onBorrarEntrega={LogisticaService.eliminar} onAssignGroup={(id, g)=>window.db.collection('maestros').doc(id).update({grupo: g})}
                    fondoTotal={fondoTotal} fondoVoluntarioTotal={fondoVoluntarioTotal} historialIngresos={historialIngresos} onGuardarIngreso={handleGuardarIngreso} onGuardarEgreso={handleGuardarEgreso}
                    fondoSecretariaTotal={fondoSecretariaTotal} fondoSecretariaVoluntarioTotal={fondoSecretariaVoluntarioTotal} historialSecretaria={historialSecretaria} onGuardarIngresoSecretaria={handleGuardarIngresoSecretaria} onGuardarEgresoSecretaria={handleGuardarEgresoSecretaria}
                />
            </main>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);
