const { useState, useEffect } = React;
const { AuthService, MaestrosService, AlumnosService, LogisticaService, LoginView, DashboardView } = window;

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
    
    // ESTADO PARA EL MODO DESARROLLADOR
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
    const candadoSandbox = (accion) => {
        alert(`🔒 MODO DESARROLLADOR\n\nAcción simulada: [${accion}]\n\nLos datos reales están protegidos y no se han modificado en la base de datos.`);
    };

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
                    if (usuario === 'LOGISTICA') alert("Tu usuario ha sido eliminado y no puedes acceder al sistema hasta que te vuelvas a registrar.");
                    else alert("Tu usuario ha sido eliminado.");
                    localStorage.removeItem('datos_recientes_login');
                    handleLogout(); 
                }
                else { 
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
            
            const unsubFondo = window.db.collection('sistema').doc('tesoreria').onSnapshot(doc => {
                if (doc.exists) setFondoTotal(doc.data().total || 0); else setFondoTotal(0);
            });
            unsubs.push(unsubFondo);

            const unsubFondoVoluntario = window.db.collection('sistema').doc('tesoreria_voluntaria').onSnapshot(doc => {
                if (doc.exists) setFondoVoluntarioTotal(doc.data().total || 0); else setFondoVoluntarioTotal(0);
            });
            unsubs.push(unsubFondoVoluntario);

            const unsubIngresos = window.db.collection('ingresos_tesoreria').orderBy('timestamp', 'desc').limit(500).onSnapshot(snapshot => {
                const hist = []; snapshot.forEach(doc => hist.push({ id: doc.id, ...doc.data() })); setHistorialIngresos(hist);
            });
            unsubs.push(unsubIngresos);

            const unsubFondoSec = window.db.collection('sistema').doc('finanzas_secretaria').onSnapshot(doc => {
                if (doc.exists) setFondoSecretariaTotal(doc.data().total || 0); else setFondoSecretariaTotal(0);
            });
            unsubs.push(unsubFondoSec);

            const unsubFondoSecVol = window.db.collection('sistema').doc('finanzas_secretaria_voluntaria').onSnapshot(doc => {
                if (doc.exists) setFondoSecretariaVoluntarioTotal(doc.data().total || 0); else setFondoSecretariaVoluntarioTotal(0);
            });
            unsubs.push(unsubFondoSecVol);

            const unsubIngresosSec = window.db.collection('ingresos_secretaria').orderBy('timestamp', 'desc').limit(500).onSnapshot(snapshot => {
                const hist = []; snapshot.forEach(doc => hist.push({ id: doc.id, ...doc.data() })); setHistorialSecretaria(hist);
            });
            unsubs.push(unsubIngresosSec);

            if (usuario === 'ADMIN') {
                if(LogisticaService) unsubs.push(LogisticaService.suscribirTodas(setEntregasLogistica)); 
                const unsubInv = window.db.collection('sistema').doc('inventario').onSnapshot(doc => {
                    if (doc.exists) setInventarioDatos(doc.data()); else setInventarioDatos({ historicoRecibido: 0, actualRecibido: 0 });
                });
                unsubs.push(unsubInv);
            }

        } else if (usuario === 'LOGISTICA') {
            if(LogisticaService) unsubs.push(LogisticaService.suscribirTodas(setEntregasLogistica)); 
        } else if (datosUsuarioActual && datosUsuarioActual.campo) {
            if (isSandbox) {
                setAlumnos([
                    { id: 'fake1', nombre: '👧 Anita Prueba', edad: 10, genero: 'F', campo: '🧪 Zona Pruebas', fechaNacimiento: '2016-05-10' },
                    { id: 'fake2', nombre: '👦 Juanito Prueba', edad: 8, genero: 'M', campo: '🧪 Zona Pruebas', fechaNacimiento: '2018-08-20' },
                    { id: 'fake3', nombre: '👦 Pedrito Code', edad: 12, genero: 'M', campo: '🧪 Zona Pruebas', fechaNacimiento: '2014-01-15' }
                ]);
                setAsistenciaHoy(null);
                const d = new Date(); d.setDate(d.getDate() - 7);
                setHistorialAsistencias([{ 
                    fecha: d.toLocaleDateString('en-CA'), maestro: '🧪 Admin Pruebas', campo: '🧪 Zona Pruebas',
                    totales: { presentes: 3, ausentes: 0, permisos: 0 }, ofrenda: 5.50, leccion: 1, leccionImpartida: true, esReset: false, timestamp: Date.now() - 600000 
                }]);
            } else {
                unsubs.push(AlumnosService.suscribirPorCampo(datosUsuarioActual.campo, setAlumnos));
                unsubs.push(AlumnosService.suscribirAsistenciaHoy(datosUsuarioActual.campo, setAsistenciaHoy));
                unsubs.push(AlumnosService.suscribirHistorialPorCampo(datosUsuarioActual.campo, setHistorialAsistencias));
            }
        }
        return () => { unsubs.forEach(unsub => unsub && unsub()); };
    }, [usuario, datosUsuarioActual?.campo]); 

    useEffect(() => {
        if (diaNac && mesNac && anioNac) { setEdadCalculada(calcularEdad(`${anioNac}-${mesNac}-${diaNac}`)); } else { setEdadCalculada(null); }
    }, [diaNac, mesNac, anioNac]);

    const handleLogin = async (rol, clave, nombre, campo, fechaNacimiento, edad) => {
        if (rol === 'PRUEBA') {
            if (clave === '@Dev2026') {
                setModoSandboxActivo(true);
                return { exito: true };
            } else {
                return { exito: false, mensaje: "PIN de seguridad incorrecto." };
            }
        }

        if (mantenimiento && rol !== 'ADMIN') return { exito: false, mensaje: "El sistema está en Mantenimiento." };
        if (!AuthService.verificar(rol, clave)) return { exito: false, mensaje: "Clave incorrecta." };
        if (rol === 'ADMIN') { setUsuario(rol); AuthService.guardarSesion(rol, null); return { exito: true }; }
        try {
            const snapshot = await window.db.collection('maestros').where('nombre', '==', nombre.trim()).where('clase', '==', rol).get();
            if (snapshot.empty) { 
                await MaestrosService.guardar({ nombre: nombre.trim(), clase: rol, campo: campo || '', telefono: '', grupo: '', fechaNacimiento: fechaNacimiento || '', edad: edad || null }, null, 'SISTEMA_AUTO'); 
                return { exito: true, mensaje: "Solicitud enviada." }; 
            } 
            else { 
                const doc = snapshot.docs[0]; const d = doc.data(); 
                if (d.estado === 'Activo') { setUsuario(rol); const datos = { ...d, id: doc.id }; setDatosUsuarioActual(datos); AuthService.guardarSesion(rol, datos); return { exito: true }; } 
                else return { exito: true, mensaje: "Pendiente." }; 
            }
        } catch (error) { return { exito: false, mensaje: "Error conexión." }; }
    };

    const handleLogout = () => { 
        setUsuario(null); setDatosUsuarioActual(null); setAlumnos([]); setTodosLosAlumnos([]); 
        setHistorialAsistencias([]); setEntregasLogistica([]); AuthService.cerrarSesion(); 
        setModoSandboxActivo(false);
    };

    const handleVolverSandbox = () => {
        setUsuario(null); setDatosUsuarioActual(null); setAlumnos([]); setTodosLosAlumnos([]); 
        setHistorialAsistencias([]); setEntregasLogistica([]); 
    };
    
    const handleGuardar = async (e) => { 
        e.preventDefault(); 
        if (isSandbox) { candadoSandbox("Inscribir/Editar Personal"); setModalAbierto(false); return; }
        const d = Object.fromEntries(new FormData(e.target)); 
        if (diaNac && mesNac && anioNac) { const fechaFinal = `${anioNac}-${mesNac}-${diaNac}`; d.fechaNacimiento = fechaFinal; d.edad = calcularEdad(fechaFinal); }
        try { const n = await MaestrosService.guardar(d, maestroEdicion?.id, usuario); if (n && usuario !== 'ADMIN') MaestrosService.notificar(n); setModalAbierto(false); setMaestroEdicion(null); setDiaNac(''); setMesNac(''); setAnioNac(''); } catch (err) { alert("Error"); } 
    };

    const handleGuardarAlumno = async (e) => {
        e.preventDefault(); 
        if (isSandbox) { candadoSandbox("Inscribir/Editar Alumno"); setModalAlumno(false); return; }
        const fd = new FormData(e.target); const nombre = fd.get('nombre').trim(); const genero = fd.get('genero'); 
        if (!nombre || !diaNac || !mesNac || !anioNac || !genero) { alert("Por favor completa todos los campos."); return; }
        const fechaFinal = `${anioNac}-${mesNac}-${diaNac}`; const edad = calcularEdad(fechaFinal);
        const datos = { nombre: nombre, fechaNacimiento: fechaFinal, edad: edad, genero: genero, maestroResponsable: datosUsuarioActual?.nombre, registradoPorId: datosUsuarioActual?.id, campo: datosUsuarioActual?.campo || 'Sin Campo', clase: 'General' };
        try { if (alumnoEdicion) { await AlumnosService.actualizar(alumnoEdicion.id, datos); alert("Alumno actualizado"); } else { await AlumnosService.registrar(datos); alert("Registrado exitosamente"); } setModalAlumno(false); setAlumnoEdicion(null); setEdadCalculada(null); setDiaNac(''); setMesNac(''); setAnioNac(''); } catch (error) { alert("Error al guardar alumno"); }
    };

    const handleAbrirModalAlumno = () => { setAlumnoEdicion(null); setEdadCalculada(null); setDiaNac(''); setMesNac(''); setAnioNac(''); setModalAlumno(true); };
    const handleEditarAlumno = (a) => { setAlumnoEdicion(a); setEdadCalculada(a.edad); if (a.fechaNacimiento) { const partes = a.fechaNacimiento.split('-'); if (partes.length === 3) { setAnioNac(partes[0]); setMesNac(partes[1]); setDiaNac(partes[2]); } } setModalAlumno(true); };

    const handleBorrarMaestro = async () => { 
        if (isSandbox) { candadoSandbox("Eliminar Usuario"); setMaestroABorrar(null); return; }
        if (!maestroABorrar) return; 
        try { const nombreUser = maestroABorrar.nombre; if (maestroABorrar.clase === 'SECRETARIA' || maestroABorrar.clase === 'TESORERO') { await window.db.collection('maestros').doc(maestroABorrar.id).delete(); alert(`El acceso de ${nombreUser} ha sido revocado.`); } else { await MaestrosService.eliminarConAlumnos(maestroABorrar.id, null); alert(`El usuario ${nombreUser} ha sido eliminado.`); } setMaestroABorrar(null); } catch (e) { alert("Error."); } 
    };

    const handleBorrarAlumno = async () => { 
        if (isSandbox) { candadoSandbox("Eliminar Alumno"); setAlumnoBorrar(null); return; }
        if (!alumnoBorrar) return; try { await AlumnosService.eliminar(alumnoBorrar.id, alumnoBorrar.campo); setAlumnoBorrar(null); alert("Alumno eliminado."); } catch (e) { alert("Error."); } 
    };
    
    const handleBorrarCampo = async () => { 
        if (isSandbox) { candadoSandbox("Limpiar Campo Completo"); setCampoABorrar(null); return; }
        if (!campoABorrar) return; try { await AlumnosService.eliminarCampoCompleto(campoABorrar); setCampoABorrar(null); alert("🧹 Limpieza completada."); } catch (e) { alert("Error."); } 
    };
    
    const handleResetLecciones = async (campo, proximaLeccion) => { 
        if (isSandbox) { candadoSandbox("Ajustar Material de Clase"); return; }
        try { await AlumnosService.reiniciarLecciones(campo, proximaLeccion); alert(`✅ Material ajustado.`); } catch (e) { alert("Error."); } 
    };
    
    const handleGuardarAsistencia = async (registros, leccion, leccionImpartida, ofrenda) => { 
        if (isSandbox) { candadoSandbox("Guardar Asistencia y Ofrenda"); return true; }
        const p = registros.filter(r=>r.estado==='Presente').length; const a = registros.filter(r=>r.estado==='Ausente').length; const per = registros.filter(r=>r.estado==='Permiso').length; 
        try { await AlumnosService.guardarAsistencia({ fecha: new Date().toLocaleDateString('en-CA'), campo: datosUsuarioActual.campo, clase: 'General', maestro: datosUsuarioActual.nombre, registradoPorId: datosUsuarioActual.id, registros: registros, totales: { presentes: p, ausentes: a, permisos: per }, leccion: leccion, leccionImpartida: leccionImpartida, ofrenda: Number(ofrenda) || 0, timestamp: Date.now() }); alert("Asistencia guardada."); return true; } catch (e) { return false; } 
    };

    const handleGuardarIngreso = async (monto, descripcion, fondoActivo = 'general') => {
        if (isSandbox) { candadoSandbox(`Sumar Ingreso ${fondoActivo}: $${monto}`); return true; }
        try { 
            const montoNum = parseFloat(monto); if (isNaN(montoNum) || montoNum <= 0) return false; 
            
            await window.db.collection('ingresos_tesoreria').add({ 
                tipo: 'ingreso', monto: montoNum, descripcion: descripcion.trim(), 
                fecha: new Date().toLocaleDateString('en-CA'), timestamp: Date.now(), 
                registradoPor: datosUsuarioActual.nombre,
                fondo: fondoActivo 
            }); 
            
            const docName = fondoActivo === 'voluntario' ? 'tesoreria_voluntaria' : 'tesoreria';
            const docRef = window.db.collection('sistema').doc(docName); 
            const docSnap = await docRef.get(); 
            let actual = docSnap.exists ? (docSnap.data().total || 0) : 0; 
            await docRef.set({ total: actual + montoNum }, { merge: true }); 
            
            alert(`✅ Se han agregado $${montoNum.toFixed(2)} al fondo ${fondoActivo}.`); return true; 
        } catch (error) { return false; }
    };

    const handleGuardarEgreso = async (monto, descripcion, fondoActivo = 'general') => {
        if (isSandbox) { candadoSandbox(`Retirar Fondos ${fondoActivo}: $${monto}`); return true; }
        try { 
            const montoNum = parseFloat(monto); if (isNaN(montoNum) || montoNum <= 0) return false; 
            
            const docName = fondoActivo === 'voluntario' ? 'tesoreria_voluntaria' : 'tesoreria';
            const docRef = window.db.collection('sistema').doc(docName); 
            const docSnap = await docRef.get(); 
            let actual = docSnap.exists ? (docSnap.data().total || 0) : 0; 
            
            if (montoNum > actual) { alert(`❌ Fondos insuficientes en el fondo ${fondoActivo}.`); return false; } 
            
            await window.db.collection('ingresos_tesoreria').add({ 
                tipo: 'egreso', monto: montoNum, descripcion: descripcion.trim(), 
                fecha: new Date().toLocaleDateString('en-CA'), timestamp: Date.now(), 
                registradoPor: datosUsuarioActual.nombre,
                fondo: fondoActivo 
            }); 
            
            await docRef.set({ total: actual - montoNum }, { merge: true }); 
            alert(`🔻 Se han retirado $${montoNum.toFixed(2)} del fondo ${fondoActivo}.`); return true; 
        } catch (error) { return false; }
    };

    const handleGuardarIngresoSecretaria = async (monto, descripcion, fondoActivo = 'general') => {
        if (isSandbox) { candadoSandbox(`Registro Cruzado Ingreso ${fondoActivo}: $${monto}`); return true; }
        try { 
            const montoNum = parseFloat(monto); if (isNaN(montoNum) || montoNum <= 0) return false; 
            await window.db.collection('ingresos_secretaria').add({ 
                tipo: 'ingreso', monto: montoNum, descripcion: descripcion.trim(), 
                fecha: new Date().toLocaleDateString('en-CA'), timestamp: Date.now(), 
                registradoPor: datosUsuarioActual.nombre,
                fondo: fondoActivo 
            }); 
            
            const docName = fondoActivo === 'voluntario' ? 'finanzas_secretaria_voluntaria' : 'finanzas_secretaria';
            const docRef = window.db.collection('sistema').doc(docName); 
            const docSnap = await docRef.get(); 
            let actual = docSnap.exists ? (docSnap.data().total || 0) : 0; 
            await docRef.set({ total: actual + montoNum }, { merge: true }); 
            
            alert(`✅ Ingreso registrado en el fondo ${fondoActivo}.`); return true; 
        } catch (error) { return false; }
    };
    
    const handleGuardarEgresoSecretaria = async (monto, descripcion, fondoActivo = 'general') => {
        if (isSandbox) { candadoSandbox(`Registro Cruzado Egreso ${fondoActivo}: $${monto}`); return true; }
        try { 
            const montoNum = parseFloat(monto); if (isNaN(montoNum) || montoNum <= 0) return false; 
            
            const docName = fondoActivo === 'voluntario' ? 'finanzas_secretaria_voluntaria' : 'finanzas_secretaria';
            const docRef = window.db.collection('sistema').doc(docName); 
            const docSnap = await docRef.get(); 
            let actual = docSnap.exists ? (docSnap.data().total || 0) : 0; 
            
            if (montoNum > actual) { alert(`❌ Fondos insuficientes en el fondo ${fondoActivo}.`); return false; } 
            
            await window.db.collection('ingresos_secretaria').add({ 
                tipo: 'egreso', monto: montoNum, descripcion: descripcion.trim(), 
                fecha: new Date().toLocaleDateString('en-CA'), timestamp: Date.now(), 
                registradoPor: datosUsuarioActual.nombre,
                fondo: fondoActivo 
            }); 
            
            await docRef.set({ total: actual - montoNum }, { merge: true }); 
            alert(`🔻 Retiro registrado en el fondo ${fondoActivo}.`); return true; 
        } catch (error) { return false; }
    };

    const handleCrearEntrega = async (datos) => { if (isSandbox) { candadoSandbox("Crear Ruta Logística"); return; } try { await LogisticaService.crear({ ...datos, asignadoPor: 'Director' }); alert("Ruta asignada."); } catch (error) { alert("Error."); } };
    const handleActualizarEntrega = async (id, estado, detalles = null, bloqueos = null) => { if (isSandbox) { candadoSandbox("Finalizar Ruta Logística"); return; } try { const payload = { estado: estado }; if (estado === 'Entregado') payload.fechaEntrega = Date.now(); if (detalles) payload.detalles = detalles; if (bloqueos) payload.bloqueos = bloqueos; await window.db.collection('entregas').doc(id).update(payload); } catch (error) { alert("Error."); } };
    const handleGuardarAvanceEntrega = async (id, detalles, bloqueos) => { if (isSandbox) { candadoSandbox("Guardar Avance de Entregas"); return; } try { await window.db.collection('entregas').doc(id).update({ detalles: detalles, bloqueos: bloqueos }); alert("Avance guardado."); } catch (error) { alert("Error."); } };
    const handleBorrarEntrega = async (id) => { if (isSandbox) { candadoSandbox("Borrar Ruta Logística"); return; } try { await LogisticaService.eliminar(id); } catch (error) { alert("Error."); } };
    const handleToggleMantenimiento = () => { if (isSandbox) { candadoSandbox("Activar/Desactivar Mantenimiento"); return; } MaestrosService.toggleMantenimiento(mantenimiento); };
    const handleAssignGroup = async (idUsuario, nuevoGrupo) => { if (isSandbox) { candadoSandbox("Asignar Miembro a Grupo"); return; } try { await window.db.collection('maestros').doc(idUsuario).update({ grupo: nuevoGrupo }); } catch (error) { alert("Error."); } };
    const handleActualizarInventario = async (cantidadAgregada) => { if (isSandbox) { candadoSandbox("Agregar Víveres al Inventario"); return; } try { const docRef = window.db.collection('sistema').doc('inventario'); const data = inventarioDatos; await docRef.set({ historicoRecibido: (data.historicoRecibido || 0) + cantidadAgregada, actualRecibido: (data.actualRecibido || 0) + cantidadAgregada }, { merge: true }); alert(`✅ Agregados al stock.`); } catch(e) { alert("Error."); } };
    const handleCerrarJornada = async (rutasParaArchivar) => { if (isSandbox) { candadoSandbox("Cerrar Jornada Logística"); return; } try { await window.db.collection('sistema').doc('inventario').set({ actualRecibido: 0 }, { merge: true }); if (rutasParaArchivar && rutasParaArchivar.length > 0) { const batch = window.db.batch(); rutasParaArchivar.forEach(ruta => { const ref = window.db.collection('entregas').doc(ruta.id); batch.update(ref, { archivado: true }); }); await batch.commit(); } alert("🏁 Jornada Finalizada."); } catch (e) { alert("Error."); } };

    // =========================================================================
    // INICIO DEL BLOQUE DE CUMPLEAÑOS
    // =========================================================================
    const hoy = new Date();
    const diaSemanaActual = hoy.getDay(); 
    const diffLunes = diaSemanaActual === 0 ? -6 : 1 - diaSemanaActual;
    const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    const semanaMap = {};
    for (let i = 0; i < 7; i++) {
        const d = new Date(hoy);
        d.setDate(hoy.getDate() + diffLunes + i);
        const mmdd = `${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
        semanaMap[mmdd] = diasNombres[d.getDay()];
    }

    const mesHoyStr = (hoy.getMonth() + 1).toString().padStart(2, '0');
    const diaHoyStr = hoy.getDate().toString().padStart(2, '0');
    const mmddHoyStr = `${mesHoyStr}-${diaHoyStr}`;

    const cumpleanerosSemana = [];
    let soyCumpleaneroHoy = false;

    maestros.forEach(m => {
        if (m.estado !== 'Activo' || !m.fechaNacimiento) return;
        const partes = m.fechaNacimiento.split('-');
        if (partes.length === 3) {
            const mmdd = `${partes[1]}-${partes[2]}`;
            
            if (mmdd === mmddHoyStr && datosUsuarioActual && m.id === datosUsuarioActual.id) {
                soyCumpleaneroHoy = true;
            }

            if (semanaMap[mmdd]) {
                const diaCelebracion = mmdd === mmddHoyStr ? 'Hoy' : semanaMap[mmdd];
                cumpleanerosSemana.push({
                    id: m.id,
                    nombreCompleto: m.nombre,
                    clase: m.clase,
                    diaCelebracion: diaCelebracion
                });
            }
        }
    });

    const otrosCumpleanerosSemana = cumpleanerosSemana.filter(c => !(soyCumpleaneroHoy && c.diaCelebracion === 'Hoy' && c.id === datosUsuarioActual?.id));
    // =========================================================================
    // FIN DEL BLOQUE DE CUMPLEAÑOS
    // =========================================================================

    if (!usuario && !modoSandboxActivo) return <LoginView onLogin={handleLogin} />;
    
    if (modoSandboxActivo && !usuario) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-slate-900 px-6 py-10 animate-in fade-in duration-500 relative overflow-y-auto overflow-x-hidden">
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(0,255,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none fixed"></div>
                
                <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 relative z-10 shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-emerald-500/30 mt-8">
                    <i className="fas fa-terminal"></i>
                </div>
                <h1 className="text-3xl font-black text-white mb-2 relative z-10 tracking-wider">MODO SANDBOX</h1>
                <p className="text-emerald-400/80 mb-8 relative z-10 text-sm">Entorno de Pruebas Seguro</p>
                
                <p className="text-slate-400 mb-6 text-xs text-center max-w-xs relative z-10">Selecciona el traje que deseas usar. Todas las interacciones con la base de datos están bloqueadas.</p>
                
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm relative z-10">
                    {['MAESTRO', 'AUXILIAR', 'LOGISTICA', 'SECRETARIA', 'TESORERO', 'ADMIN'].map(r => (
                        <button key={r} onClick={() => {
                            setUsuario(r);
                            setDatosUsuarioActual({ 
                                id: 'user_sandbox_secreto', 
                                nombre: '🧪 Admin Pruebas', 
                                campo: '🧪 Zona Pruebas', 
                                clase: r, 
                                estado: 'Activo',
                                grupo: 'Grupo 1' 
                            });
                        }} className={`p-4 rounded-2xl font-black border transition-all text-xs tracking-widest ${r === 'ADMIN' ? 'bg-indigo-900/50 border-indigo-500 text-indigo-400 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] col-span-2' : 'bg-slate-800 text-white border-slate-700 hover:border-emerald-500 hover:text-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] active:scale-95'}`}>
                            {r}
                        </button>
                    ))}
                </div>
                
                <button onClick={handleLogout} className="mt-12 mb-8 py-3 px-6 bg-slate-800/50 text-slate-500 font-bold rounded-xl border border-slate-700 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 transition-all relative z-10 text-xs uppercase tracking-widest">
                    <i className="fas fa-power-off mr-2"></i> Cerrar Entorno
                </button>
            </div>
        );
    }

    if (mantenimiento && usuario !== 'ADMIN' && !isSandbox) { 
        return ( <div className="flex flex-col items-center justify-center min-h-[100dvh] max-w-md mx-auto bg-slate-900 p-8 text-center shadow-2xl animate-in zoom-in-95"><div className="w-32 h-32 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center text-6xl mb-8 animate-pulse shadow-[0_0_40px_rgba(244,63,94,0.3)]"><i className="fas fa-tools"></i></div><h1 className="text-3xl font-black text-white mb-4">Sistema en<br/>Mantenimiento</h1><p className="text-slate-400 text-sm leading-relaxed mb-10">El Director está realizando ajustes.</p><button onClick={handleLogout} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl transition-colors">Cerrar Sesión</button></div> ); 
    }

    return (
        <div className="flex flex-col min-h-[100dvh] max-w-md mx-auto bg-white shadow-2xl relative">
            <header className={`sticky top-0 backdrop-blur-md p-5 flex justify-between items-center border-b z-40 ${isSandbox ? 'bg-slate-900/95 border-emerald-900/50' : 'bg-white/95 border-slate-100'}`}>
                <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isSandbox ? 'text-emerald-400 animate-pulse' : 'text-indigo-500'}`}>
                        {isSandbox ? 'MODO DE SOLO LECTURA' : 'Gestión Ministerial'}
                    </p>
                    <h1 className={`text-xl font-black ${isSandbox ? 'text-white' : 'text-slate-800'}`}>
                        {usuario === 'ADMIN' ? 'Director' : `${usuario.charAt(0).toUpperCase() + usuario.slice(1).toLowerCase()}: ${datosUsuarioActual?.nombre?.split(' ')[0] || ''}`}
                    </h1>
                    {usuario !== 'ADMIN' && datosUsuarioActual && (
                        <p className={`text-[10px] font-bold mt-1 ${isSandbox ? 'text-emerald-500/70' : 'text-slate-500'}`}>
                            Campo: <span className="uppercase">{datosUsuarioActual.campo || datosUsuarioActual.grupo || 'Global'}</span>
                        </p>
                    )}
                </div>
                
                <button 
                    onClick={isSandbox ? handleVolverSandbox : handleLogout} 
                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${isSandbox ? 'bg-slate-800 text-emerald-500 hover:bg-emerald-500/20 hover:text-emerald-400' : 'bg-slate-50 text-slate-400 hover:text-rose-500'}`}
                    title={isSandbox ? 'Cambiar Traje' : 'Cerrar Sesión'}
                >
                    <i className={`fas ${isSandbox ? 'fa-exchange-alt' : 'fa-sign-out-alt'}`}></i>
                </button>
            </header>

            {soyCumpleaneroHoy && (
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white p-3 text-center shadow-md animate-in slide-in-from-top-2 z-30 relative">
                    <p className="font-black text-sm">🎉 ¡Muchas Felicidades en tu cumpleaños, {datosUsuarioActual?.nombre}!</p>
                    <p className="text-[10px] font-bold opacity-90">Que pases un día excelente y muy especial.</p>
                </div>
            )}
            
            {otrosCumpleanerosSemana.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 shadow-md animate-in slide-in-from-top-2 z-30 relative flex flex-col items-center">
                    <p className="font-black text-xs mb-1 text-center">🎉 Cumpleañeros de la semana</p>
                    <p className="text-[10px] font-bold opacity-90 mb-3 text-center">No olvides felicitar a:</p>
                    <ul className="text-[10px] font-medium text-white/95 space-y-2 w-full max-w-sm px-2 text-left">
                        {otrosCumpleanerosSemana.map((c, idx) => (
                            <li key={idx} className="flex items-start bg-white/10 rounded-lg p-2.5">
                                <span className="mr-2 text-indigo-200 mt-0.5 text-xs">•</span>
                                <span className="leading-relaxed">
                                    <strong className="text-white text-[11px]">{c.nombreCompleto}</strong> <span className="opacity-80">({c.clase})</span><br/>
                                    <span className="text-indigo-200 text-[9px] uppercase tracking-wider font-bold">El día {c.diaCelebracion}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            <main className={`flex-1 p-5 pb-28 ${isSandbox ? 'bg-slate-900/50' : 'bg-slate-50/50'}`}>
                <DashboardView 
                    maestros={maestros} alumnos={alumnos} todosLosAlumnos={todosLosAlumnos} 
                    asistenciaHoy={asistenciaHoy} datosGlobalesAsistencia={datosGlobalesAsistencia} 
                    historialAsistencias={historialAsistencias} entregasLogistica={entregasLogistica} 
                    usuario={usuario} datosUsuarioActual={datosUsuarioActual} mantenimiento={mantenimiento} onToggleMantenimiento={handleToggleMantenimiento}
                    inventarioDatos={inventarioDatos} onActualizarInventario={handleActualizarInventario} onCerrarJornada={handleCerrarJornada}
                    onApprove={MaestrosService.aprobar} onDelete={setMaestroABorrar} 
                    onEdit={(m) => { 
                        setMaestroEdicion(m); 
                        if (m.fechaNacimiento) {
                            const p = m.fechaNacimiento.split('-');
                            if(p.length === 3) { setAnioNac(p[0]); setMesNac(p[1]); setDiaNac(p[2]); }
                        } else { setAnioNac(''); setMesNac(''); setDiaNac(''); }
                        setModalAbierto(true); 
                    }} 
                    onToggleModal={() => { 
                        setMaestroEdicion(null); setAnioNac(''); setMesNac(''); setDiaNac(''); setModalAbierto(true); 
                    }}
                    onSaveAsistencia={handleGuardarAsistencia} onOpenAlumnoModal={handleAbrirModalAlumno} onEditAlumno={handleEditarAlumno} onDeleteAlumno={setAlumnoBorrar} onDeleteCampo={setCampoABorrar}
                    onResetLecciones={handleResetLecciones} onCrearEntrega={handleCrearEntrega} onActualizarEntrega={handleActualizarEntrega} onGuardarAvanceEntrega={handleGuardarAvanceEntrega} onBorrarEntrega={handleBorrarEntrega} onAssignGroup={handleAssignGroup}
                    
                    fondoTotal={fondoTotal} 
                    fondoVoluntarioTotal={fondoVoluntarioTotal}
                    historialIngresos={historialIngresos}
                    onGuardarIngreso={handleGuardarIngreso} onGuardarEgreso={handleGuardarEgreso}
                    
                    fondoSecretariaTotal={fondoSecretariaTotal} 
                    fondoSecretariaVoluntarioTotal={fondoSecretariaVoluntarioTotal}
                    historialSecretaria={historialSecretaria}
                    onGuardarIngresoSecretaria={handleGuardarIngresoSecretaria} onGuardarEgresoSecretaria={handleGuardarEgresoSecretaria}
                />
            </main>

            {modalAbierto && (<div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in"><div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom max-h-[90vh] overflow-y-auto"><h2 className="text-2xl font-black text-slate-800 mb-6">{maestroEdicion ? 'Editar Personal' : 'Inscribir Manual'}</h2><form onSubmit={handleGuardar} className="space-y-4"><input type="text" name="nombre" required defaultValue={maestroEdicion?.nombre || ''} className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="Nombre Completo" />
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-[-10px]">Fecha de Nacimiento</label><div className="flex space-x-2"><select className="w-1/3 p-3 bg-slate-50 rounded-2xl outline-none font-bold text-slate-600" value={diaNac} onChange={e=>setDiaNac(e.target.value)} required><option value="" disabled>Día</option>{Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d.toString().padStart(2, '0')}>{d}</option>)}</select><select className="w-1/3 p-3 bg-slate-50 rounded-2xl outline-none font-bold text-slate-600" value={mesNac} onChange={e=>setMesNac(e.target.value)} required><option value="" disabled>Mes</option>{['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((m, i) => <option key={m} value={(i+1).toString().padStart(2, '0')}>{m}</option>)}</select><select className="w-1/3 p-3 bg-slate-50 rounded-2xl outline-none font-bold text-slate-600" value={anioNac} onChange={e=>setAnioNac(e.target.value)} required><option value="" disabled>Año</option>{Array.from({length: 80}, (_, i) => new Date().getFullYear() - 10 - i).map(a => <option key={a} value={a}>{a}</option>)}</select></div>
            <select name="clase" defaultValue={maestroEdicion?.clase || 'MAESTRO'} className="w-full p-4 bg-slate-50 rounded-2xl outline-none bg-white border border-slate-100">{['MAESTRO', 'AUXILIAR', 'LOGISTICA', 'SECRETARIA', 'TESORERO', 'Dirección'].map(c => <option key={c} value={c}>{c}</option>)}</select>
            <select name="campo" defaultValue={maestroEdicion?.campo || ''} className="w-full p-4 bg-slate-50 rounded-2xl outline-none bg-white border border-slate-100"><option value="">-- Ninguno --</option>{camposDisponibles.map(c => <option key={c} value={c}>{c}</option>)}</select><input type="tel" name="telefono" defaultValue={maestroEdicion?.telefono || ''} className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="Teléfono/WhatsApp" /><div className="pt-4 flex flex-col space-y-3"><button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl">Guardar Cambios</button><button type="button" onClick={() => {setModalAbierto(false); setDiaNac(''); setMesNac(''); setAnioNac('');}} className="text-slate-400 font-bold text-xs uppercase">Cancelar</button></div></form></div></div>)}
            {modalAlumno && ( <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in"><div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom"><div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"><i className="fas fa-child"></i></div><h2 className="text-2xl font-black text-slate-800 mb-2 text-center">{alumnoEdicion ? 'Editar' : 'Registrar'}</h2><form onSubmit={handleGuardarAlumno} className="space-y-4 mt-4"><input type="text" name="nombre" required defaultValue={alumnoEdicion?.nombre || ''} placeholder="Nombre Completo" className="w-full p-4 bg-slate-50 rounded-2xl outline-none" /><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-[-10px]">Fecha de Nacimiento</label><div className="flex space-x-2"><select className="w-1/3 p-3 bg-slate-50 rounded-2xl outline-none font-bold text-slate-600" value={diaNac} onChange={e=>setDiaNac(e.target.value)} required><option value="" disabled>Día</option>{Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d.toString().padStart(2, '0')}>{d}</option>)}</select><select className="w-1/3 p-3 bg-slate-50 rounded-2xl outline-none font-bold text-slate-600" value={mesNac} onChange={e=>setMesNac(e.target.value)} required><option value="" disabled>Mes</option>{['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((m, i) => <option key={m} value={(i+1).toString().padStart(2, '0')}>{m}</option>)}</select><select className="w-1/3 p-3 bg-slate-50 rounded-2xl outline-none font-bold text-slate-600" value={anioNac} onChange={e=>setAnioNac(e.target.value)} required><option value="" disabled>Año</option>{Array.from({length: 25}, (_, i) => new Date().getFullYear() - i).map(a => <option key={a} value={a}>{a}</option>)}</select></div><select name="genero" required defaultValue={alumnoEdicion?.genero || ''} className="w-full p-4 bg-slate-50 rounded-2xl outline-none bg-white border border-slate-100 text-slate-600 font-bold"><option value="">Seleccionar Género</option><option value="M">Masculino</option><option value="F">Femenino</option></select>{edadCalculada !== null && (<div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between"><span className="text-emerald-800 text-xs font-bold uppercase tracking-widest">Edad detectada:</span><span className="text-2xl font-black text-emerald-600">{edadCalculada} Años</span></div>)}<div className="pt-2 flex flex-col space-y-3"><button type="submit" className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-white font-black rounded-2xl shadow-xl">Guardar</button><button type="button" onClick={() => { setModalAlumno(false); setAlumnoEdicion(null); setDiaNac(''); setMesNac(''); setAnioNac(''); }} className="text-slate-400 font-bold text-xs uppercase tracking-widest">Cancelar</button></div></form></div></div>)}
            {maestroABorrar && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-6 animate-in fade-in">
                    <div className="bg-white rounded-[32px] p-8 w-full max-w-xs text-center shadow-2xl animate-in zoom-in-95 border-2 border-indigo-100">
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"><i className="fas fa-user-minus"></i></div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">Revocar Acceso</h3>
                        <div className="text-slate-500 text-xs mb-4 leading-relaxed bg-slate-50 p-4 rounded-xl text-left border border-slate-100">
                            Estás a punto de eliminar el acceso a: <br/> <b className="text-slate-700 text-sm">{maestroABorrar.nombre}</b> <span className="text-[10px] uppercase">({maestroABorrar.clase})</span>.<br/><br/>
                            {maestroABorrar.clase === 'LOGISTICA' ? (
                                <span className="text-rose-600 font-bold"><i className="fas fa-exclamation-circle mr-1"></i> Sus datos se borrarán.</span>
                            ) : maestroABorrar.clase === 'SECRETARIA' || maestroABorrar.clase === 'TESORERO' ? (
                                <span className="text-emerald-600 font-bold"><i className="fas fa-shield-alt mr-1"></i> SEGURO: Todos sus registros financieros y fondos quedarán intactos.</span>
                            ) : (
                                <span className="text-emerald-600 font-bold"><i className="fas fa-shield-alt mr-1"></i> SEGURO: Los alumnos y la asistencia de su campo se conservarán seguros.</span>
                            )}
                        </div>
                        <div className="space-y-3">
                            <button onClick={handleBorrarMaestro} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all">Sí, quitar acceso</button>
                            <button onClick={() => setMaestroABorrar(null)} className="w-full py-2 text-slate-400 font-bold text-xs uppercase tracking-widest">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
            {alumnoBorrar && (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-6 animate-in fade-in"><div className="bg-white rounded-[32px] p-8 w-full max-w-xs text-center shadow-2xl animate-in zoom-in-95"><div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"><i className="fas fa-trash-alt"></i></div><h3 className="text-xl font-black text-slate-800 mb-2">¿Eliminar Alumno?</h3><p className="text-xs text-slate-500 mb-4">Se borrará permanentemente.</p><div className="space-y-3"><button onClick={handleBorrarAlumno} className="w-full py-3 bg-rose-500 text-white font-bold rounded-2xl shadow-lg">Sí, borrar</button><button onClick={() => setAlumnoBorrar(null)} className="w-full py-2 text-slate-400 font-bold text-xs uppercase">Cancelar</button></div></div></div>)}
            {campoABorrar && (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-6 animate-in fade-in"><div className="bg-white rounded-[32px] p-8 w-full max-w-xs text-center shadow-2xl animate-in zoom-in-95 border-2 border-rose-100"><div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"><i className="fas fa-bomb"></i></div><h3 className="text-xl font-black text-slate-800 mb-2">¡Limpieza de Campo!</h3><div className="text-slate-600 text-xs mb-4 leading-relaxed bg-rose-50 p-3 rounded-xl border border-rose-100">Vas a limpiar la base de datos de:<br/> <b className="text-rose-600 text-sm">{campoABorrar}</b>.<br/><br/>Se borrarán <span className="font-bold">TODOS</span> sus alumnos y su asistencia permanentemente.</div><div className="space-y-3"><button onClick={handleBorrarCampo} className="w-full py-3 bg-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-all">Destruir datos</button><button onClick={() => setCampoABorrar(null)} className="w-full py-2 text-slate-400 font-bold text-xs uppercase tracking-widest">Cancelar</button></div></div></div>)}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);
