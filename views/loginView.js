var { useState, useEffect } = React;

function LoginView({ onLogin }) {
    const [rol, setRol] = useState('');
    const [nombre, setNombre] = useState('');
    const [campo, setCampo] = useState('');
    const [clave, setClave] = useState('');
    const [error, setError] = useState('');
    const [estadoPendiente, setEstadoPendiente] = useState(false); 
    const [loading, setLoading] = useState(false);
    const [esRecordado, setEsRecordado] = useState(false);
    const [recordarClave, setRecordarClave] = useState(false);
    const [diaNac, setDiaNac] = useState('');
    const [mesNac, setMesNac] = useState('');
    const [anioNac, setAnioNac] = useState('');

    const camposDisponibles = ["La Isla", "Las Delicias", "El Amatal", "El Manguito", "Buenos Aires", "Corozal #1", "El Porvenir", "El Caulote", "Corozal #2", "Valle Encantado", "La Playa"];

    useEffect(() => {
        const datosGuardados = localStorage.getItem('datos_recientes_login');
        if (datosGuardados) {
            try {
                const parsed = JSON.parse(datosGuardados);
                if (parsed.rol && parsed.rol !== 'PRUEBA') {
                    setRol(parsed.rol);
                    setEsRecordado(true); 
                }
                if (parsed.nombre) setNombre(parsed.nombre);
                if (parsed.campo) setCampo(parsed.campo);
                if (parsed.diaNac) setDiaNac(parsed.diaNac);
                if (parsed.mesNac) setMesNac(parsed.mesNac);
                if (parsed.anioNac) setAnioNac(parsed.anioNac);
                if (parsed.recordarClave) {
                    setRecordarClave(true);
                    if (parsed.clave) setClave(parsed.clave);
                }
            } catch (e) { console.error("Error leyendo caché"); }
        }
    }, []);

    const calcularEdad = (f) => { 
        if (!f) return null; const h = new Date(); const c = new Date(f); 
        let e = h.getFullYear() - c.getFullYear(); 
        if (h.getMonth() < c.getMonth() || (h.getMonth()===c.getMonth() && h.getDate()<c.getDate())) e--; 
        return e; 
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        if (rol !== 'ADMIN' && rol !== 'PRUEBA' && rol !== 'LOGISTICA' && rol !== 'SECRETARIA' && rol !== 'TESORERO' && !campo) {
            setError('Debes seleccionar un campo.');
            setLoading(false); return;
        }
        if (rol !== 'ADMIN' && rol !== 'PRUEBA' && !nombre.trim()) {
            setError('Debes ingresar tu nombre.');
            setLoading(false); return;
        }

        const fechaNacimiento = (rol !== 'ADMIN' && rol !== 'PRUEBA') ? `${anioNac}-${mesNac}-${diaNac}` : null;
        const edad = (rol !== 'ADMIN' && rol !== 'PRUEBA') ? calcularEdad(fechaNacimiento) : null;

        const res = await onLogin(rol, clave, nombre, campo, fechaNacimiento, edad);
        if (!res.exito) {
            setError(res.mensaje || 'Error al iniciar sesión');
            setEstadoPendiente(false); 
        } else if (res.mensaje) {
            setEstadoPendiente(true);
        }
        setLoading(false);
    };

    const limpiarFormulario = () => {
        setRol(''); setNombre(''); setCampo(''); setClave(''); 
        setDiaNac(''); setMesNac(''); setAnioNac('');
        setError(''); setEstadoPendiente(false); setEsRecordado(false); setRecordarClave(false);
        localStorage.removeItem('datos_recientes_login');
    };

    const esModoPrueba = rol === 'PRUEBA';

    return (
        <div className="flex flex-col items-center justify-center min-h-[100dvh] px-6 bg-slate-100 py-10">
            <div className="w-full max-w-sm bg-white p-8 rounded-[32px] shadow-2xl relative overflow-hidden">
                {esModoPrueba && <div className="absolute inset-0 bg-slate-900 pointer-events-none rounded-[32px]"></div>}
                {(rol || nombre) && !estadoPendiente && (
                    <button onClick={limpiarFormulario} className="absolute top-6 right-6 text-slate-400 z-10"><i className="fas fa-sync-alt"></i></button>
                )}
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 bg-indigo-50 text-indigo-600"><i className="fas fa-church"></i></div>
                <h1 className="text-2xl font-black text-center mb-2 text-slate-800">Bienvenido</h1>
                <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                    {!esRecordado && (
                        <div>
                            <select className="w-full p-4 rounded-2xl bg-slate-50 font-bold border" value={rol} onChange={(e) => setRol(e.target.value)} required>
                                <option value="" disabled>Selecciona un rol...</option>
                                <option value="MAESTRO">Maestro</option>
                                <option value="AUXILIAR">Auxiliar</option>
                                <option value="LOGISTICA">Logística</option>
                                <option value="SECRETARIA">Secretaría</option>
                                <option value="TESORERO">Tesorero/a</option>
                                <option value="ADMIN">Director (Admin)</option>
                                <option value="PRUEBA">⚙️ Modo Desarrollador</option>
                            </select>
                        </div>
                    )}
                    {rol && rol !== 'ADMIN' && rol !== 'PRUEBA' && !esRecordado && (
                        <input type="text" placeholder="Tu Nombre Completo" className="w-full p-4 rounded-2xl bg-slate-50 border font-bold" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                    )}
                    {rol && rol !== 'ADMIN' && rol !== 'PRUEBA' && rol !== 'LOGISTICA' && rol !== 'SECRETARIA' && rol !== 'TESORERO' && !esRecordado && (
                        <select className="w-full p-4 rounded-2xl bg-slate-50 border font-bold" value={campo} onChange={(e) => setCampo(e.target.value)} required>
                            <option value="" disabled>Selecciona tu campo...</option>
                            {camposDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    )}
                    {rol && (
                        <input type="password" placeholder="Contraseña o PIN" className="w-full p-4 rounded-2xl bg-slate-50 border font-black text-center tracking-widest" value={clave} onChange={(e) => setClave(e.target.value)} required />
                    )}
                    {error && <p className="text-xs font-bold text-center text-rose-500">{error}</p>}
                    <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl">{loading ? 'Cargando...' : 'Ingresar'}</button>
                </form>
            </div>
        </div>
    );
}

window.LoginView = LoginView;
