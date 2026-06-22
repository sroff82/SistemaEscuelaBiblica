var { useState } = React;

function TesoreroDashboard({
    fondoTotal, fondoVoluntarioTotal, historialIngresos, onGuardarIngreso, onGuardarEgreso
}) {
    const [vistaActual, setVistaActual] = useState('inicio'); 
    const [fondoActivo, setFondoActivo] = useState('general');
    const [tipoTransaccion, setTipoTransaccion] = useState('ingreso'); 
    const [monto, setMonto] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [cargando, setLoading] = useState(false);
    const [mesExpandido, setMesExpandido] = useState(null);
    const [semanaExpandida, setSemanaExpandida] = useState(null);
    const [repMesExpandido, setRepMesExpandido] = useState(null); 
    const [repSemanaExpandida, setRepSemanaExpandida] = useState(null);
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [detalleMovExp, setDetalleMovExp] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        let exito = false;
        
        if (tipoTransaccion === 'ingreso') exito = await onGuardarIngreso(monto, descripcion, fondoActivo);
        else exito = await onGuardarEgreso(monto, descripcion, fondoActivo);

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
    const saldoVisible = fondoActivo === 'general' ? fondoTotal : (fondoVoluntarioTotal || 0);
    const colorTema = fondoActivo === 'voluntario' ? 'emerald' : 'amber';

    const NavButton = ({ id, icon, label }) => (
        <button onClick={() => setVistaActual(id)} className={`flex flex-col items-center justify-center w-[90px] h-14 rounded-2xl transition-all ${vistaActual === id ? `text-${colorTema}-600 bg-slate-50 font-black` : 'text-slate-400 font-bold'}`}>
            <i className={`fas ${icon} text-xl mb-1`}></i><span className="text-[10px] tracking-wide">{label}</span>
        </button>
    );

    let contenido;

    if (vistaActual === 'inicio') {
        contenido = (
            <div className="space-y-6 animate-in fade-in duration-300 pt-2 pb-24">
                <div className="flex bg-slate-200 p-1.5 rounded-2xl mx-1 shadow-inner">
                    <button onClick={() => setFondoActivo('general')} className={`flex-1 py-3.5 rounded-xl font-black text-xs uppercase ${fondoActivo === 'general' ? 'bg-white text-amber-600' : 'text-slate-50'}`}>Fondo General</button>
                    <button onClick={() => setFondoActivo('voluntario')} className={`flex-1 py-3.5 rounded-xl font-black text-xs uppercase ${fondoActivo === 'voluntario' ? 'bg-white text-emerald-600' : 'text-slate-50'}`}>Fondo Voluntario</button>
                </div>
                <div className="bg-slate-800 p-8 rounded-[32px] text-white shadow-2xl mx-1 text-center">
                    <p className="text-xs font-bold uppercase tracking-widest mb-2"><i className="fas fa-vault mr-2"></i> {fondoActivo === 'general' ? 'Fondo General Activo' : 'Fondo Voluntario Activo'}</p>
                    <p className={`text-6xl font-black text-${colorTema}-400`}>${Number(saldoVisible).toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-[32px] border shadow-sm mx-1">
                    <h3 className="font-black text-slate-700 text-lg mb-4">Registrar Movimiento</h3>
                    <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
                        <button onClick={() => setTipoTransaccion('ingreso')} className={`flex-1 py-3 rounded-xl font-bold text-xs ${tipoTransaccion === 'ingreso' ? 'bg-white text-emerald-600' : 'text-slate-400'}`}>+ Ingreso</button>
                        <button onClick={() => setTipoTransaccion('egreso')} className={`flex-1 py-3 rounded-xl font-bold text-xs ${tipoTransaccion === 'egreso' ? 'bg-white text-rose-600' : 'text-slate-400'}`}>- Retiro</button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex space-x-2">
                            <input type="number" step="0.01" min="0.01" required value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" className="w-1/3 p-3 bg-slate-50 rounded-xl outline-none font-black text-sm" />
                            <input type="text" required value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Concepto..." className="w-2/3 p-3 bg-slate-50 rounded-xl outline-none text-xs" />
                        </div>
                        <button type="submit" disabled={cargando} className="w-full py-4 bg-slate-800 text-white font-black rounded-2xl">{cargando ? 'Procesando...' : 'Confirmar Operación'}</button>
                    </form>
                </div>
            </div>
        );
    } else if (vistaActual === 'historial') {
        contenido = (
            <div className="space-y-4 pt-2 pb-24 px-1">
                {gruposMesesHistorial.map(grupo => {
                    const isExpMes = mesExpandido === grupo.id;
                    return (
                        <div key={grupo.id} className="bg-white rounded-[24px] border shadow-sm overflow-hidden">
                            <button onClick={() => setMesExpandido(isExpMes ? null : grupo.id)} className="w-full p-5 flex justify-between items-center">
                                <span className="font-black text-slate-700 text-sm uppercase">{grupo.mesLabel}</span>
                                <i className="fas fa-chevron-down text-slate-300"></i>
                            </button>
                            {isExpMes && (
                                <div className="p-4 bg-slate-50 space-y-2">
                                    {grupo.semanasArray.map(sem => (
                                        <div key={sem.id} className="p-3 bg-white rounded-xl border">
                                            <p className="font-bold text-xs text-slate-700">{sem.label}</p>
                                            <div className="text-[11px] font-black text-emerald-600 mt-1">+{sem.ingresos.toFixed(2)} | <span className="text-rose-500">-${sem.egresos.toFixed(2)}</span></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <>
            {contenido}
            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md border-t border-slate-100 flex justify-around items-center p-2 z-50 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <NavButton id="inicio" icon="fa-vault" label="Transacción" />
                <NavButton id="historial" icon="fa-book" label="Historial" />
            </div>
        </>
    );
}

window.TesoreroDashboard = TesoreroDashboard;
