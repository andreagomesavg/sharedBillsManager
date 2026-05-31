import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { Trash2, ShoppingBag, AlertCircle, CheckCircle2, Plus, ExternalLink, Link as LinkIcon, Edit2, X, Search, Filter, Eye, AlignLeft, Star } from 'lucide-react'

export default function Deseos() {
  const [deseos, setDeseos] = useState([])
  const [fondos, setFondos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [usuarioActual, setUsuarioActual] = useState(null)
  
  // --- NUEVO ESTADO PARA OCULTAR/MOSTRAR EL FORMULARIO ---
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  // Estados de Creación
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoCoste, setNuevoCoste] = useState('')
  const [nuevaNota, setNuevaNota] = useState('')
  const [fondoSeleccionado, setFondoSeleccionado] = useState('')
  const [prioridad, setPrioridad] = useState('normal')
  const [creando, setCreando] = useState(false)
  const [opcionesActuales, setOpcionesActuales] = useState([])
  const [tempTienda, setTempTienda] = useState('')
  const [tempPrecio, setTempPrecio] = useState('')
  const [tempUrl, setTempUrl] = useState('')

  // Estados de Edición
  const [deseoEditando, setDeseoEditando] = useState(null)
  const [editNombre, setEditNombre] = useState('')
  const [editCoste, setEditCoste] = useState('')
  const [editNota, setEditNota] = useState('')
  const [editFondo, setEditFondo] = useState('')
  const [editPrioridad, setEditPrioridad] = useState('normal')
  const [editOpciones, setEditOpciones] = useState([])
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)

  // Estado para Ver Detalles
  const [deseoViendo, setDeseoViendo] = useState(null)
  const [editandoNotaDetalle, setEditandoNotaDetalle] = useState(false)
  const [notaDetalleTemp, setNotaDetalleTemp] = useState('')

  // Estados PARA EL NUEVO MODAL DE COMPRA
  const [modalCompra, setModalCompra] = useState(null) 
  const [usarOtroPrecio, setUsarOtroPrecio] = useState(false)
  const [precioPersonalizado, setPrecioPersonalizado] = useState('')
  const [procesandoCompra, setProcesandoCompra] = useState(false)

  // Estados de Búsqueda y Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroPrioridad, setFiltroPrioridad] = useState('todas')
  const [filtroFondo, setFiltroFondo] = useState('todos')
  const [orden, setOrden] = useState('recientes')

  const cargarDatos = async () => {
    // 1. Identificamos al usuario actual
    const { data: { user } } = await supabase.auth.getUser()
    const miNombre = user ? user.email.split('@')[0].toLowerCase() : ''
    setUsuarioActual(miNombre)

    // 2. Traemos TODOS los fondos, pero nos quedamos solo con los nuestros
    const { data: dataFondos } = await supabase.from('fondos').select('*').order('categoria', { ascending: true })
    let misFondosIds = []
    
    if (dataFondos) {
      const misFondos = dataFondos.filter(f => f.miembros && f.miembros.map(m => m.toLowerCase()).includes(miNombre))
      misFondosIds = misFondos.map(f => f.id)
      
      setFondos(misFondos) // Guardamos solo nuestros fondos para los desplegables
      if (misFondos.length > 0 && !fondoSeleccionado) {
        setFondoSeleccionado(misFondos[0].id)
      }
    }

    // 3. Traemos SOLO los deseos que pertenezcan a nuestros fondos
    if (misFondosIds.length > 0) {
      const { data: dataDeseos } = await supabase
        .from('deseos')
        .select('*')
        .eq('comprado', false)
        .in('fondo_id', misFondosIds) 
        .order('creado_en', { ascending: false })
        
      if (dataDeseos) setDeseos(dataDeseos)
    } else {
      setDeseos([]) 
    }
    
    setCargando(false)
  }
  
  useEffect(() => { cargarDatos() }, [])

  // --- LÓGICA DE FAVORITOS (ESTRELLAS) ---
  const toggleFavorito = async (deseo, opcionId) => {
    if (!usuarioActual) return

    const nuevasOpciones = deseo.opciones.map(opt => {
      if (opt.id === opcionId) {
        let likes = opt.likes || []
        if (likes.includes(usuarioActual)) {
          likes = likes.filter(user => user !== usuarioActual) 
        } else {
          likes.push(usuarioActual) 
        }
        return { ...opt, likes }
      }
      return opt
    })

    await supabase.from('deseos').update({ opciones: nuevasOpciones }).eq('id', deseo.id)
    cargarDatos()
    
    if (deseoViendo && deseoViendo.id === deseo.id) {
      setDeseoViendo({ ...deseoViendo, opciones: nuevasOpciones })
    }
  }

  const agregarOpcionListado = () => {
    if (!tempTienda || !tempPrecio) return
    let urlSegura = tempUrl
    if (urlSegura && !urlSegura.startsWith('http')) urlSegura = 'https://' + urlSegura
    setOpcionesActuales([...opcionesActuales, { id: Date.now(), tienda: tempTienda.trim(), precio: parseFloat(tempPrecio), url: urlSegura, likes: [] }])
    setTempTienda(''); setTempPrecio(''); setTempUrl('')
  }

  const agregarOpcionEdicion = () => {
    if (!tempTienda || !tempPrecio) return
    let urlSegura = tempUrl
    if (urlSegura && !urlSegura.startsWith('http')) urlSegura = 'https://' + urlSegura
    setEditOpciones([...editOpciones, { id: Date.now(), tienda: tempTienda.trim(), precio: parseFloat(tempPrecio), url: urlSegura, likes: [] }])
    setTempTienda(''); setTempPrecio(''); setTempUrl('')
  }

  const iniciarEdicion = (deseo) => {
    setDeseoEditando(deseo); setEditNombre(deseo.nombre); setEditCoste(deseo.coste_estimado); setEditNota(deseo.notas || ''); setEditFondo(deseo.fondo_id); setEditPrioridad(deseo.prioridad); setEditOpciones(deseo.opciones || []); setTempTienda(''); setTempPrecio(''); setTempUrl('')
  }

  const guardarCambiosDeseo = async (e) => {
    e.preventDefault()
    if (!editNombre.trim() || !editCoste || !editFondo || !deseoEditando) return
    setGuardandoEdicion(true)
    const { error } = await supabase.from('deseos').update({ nombre: editNombre.trim(), coste_estimado: parseFloat(editCoste), notas: editNota.trim(), fondo_id: editFondo, prioridad: editPrioridad, opciones: editOpciones }).eq('id', deseoEditando.id)
    if (!error) { setDeseoEditando(null); cargarDatos() }
    setGuardandoEdicion(false)
  }

  const agregarDeseo = async (e) => {
    e.preventDefault()
    if (!nuevoNombre.trim() || !nuevoCoste || !fondoSeleccionado) return
    setCreando(true)
    const { error } = await supabase.from('deseos').insert([{ nombre: nuevoNombre.trim(), coste_estimado: parseFloat(nuevoCoste), notas: nuevaNota.trim(), fondo_id: fondoSeleccionado, prioridad: prioridad, opciones: opcionesActuales }])
    
    if (!error) { 
      setNuevoNombre(''); setNuevoCoste(''); setNuevaNota(''); setPrioridad('normal'); setOpcionesActuales([]); 
      cargarDatos();
      setMostrarFormulario(false); // Ocultamos el formulario al terminar
    }
    setCreando(false)
  }

  const abrirModalCompra = (deseo, precioOpcion = null) => {
    const precioBase = precioOpcion !== null ? precioOpcion : deseo.coste_estimado
    setModalCompra({ deseo, precioSugerido: precioBase })
    setUsarOtroPrecio(false)
    setPrecioPersonalizado('')
  }

  const guardarNotaDetalle = async () => {
    if (!deseoViendo) return
    const { error } = await supabase.from('deseos').update({ notas: notaDetalleTemp.trim() }).eq('id', deseoViendo.id)
    if (!error) {
      setDeseoViendo({ ...deseoViendo, notas: notaDetalleTemp.trim() })
      setEditandoNotaDetalle(false)
      cargarDatos()
    } else {
      alert("Error al guardar la nota.")
    }
  }


  const confirmarCompra = async () => {
    const { deseo, precioSugerido } = modalCompra
    
    let costeFinalStr = usarOtroPrecio ? precioPersonalizado : precioSugerido
    if (typeof costeFinalStr === 'string') costeFinalStr = costeFinalStr.replace(',', '.')
    
    const costeFinal = parseFloat(costeFinalStr)
    
    if (isNaN(costeFinal) || costeFinal <= 0) {
      return alert("Por favor, introduce un importe válido.")
    }

    const fondoVinculado = fondos.find(f => f.id === deseo.fondo_id)
    if (!fondoVinculado) return alert("Error: No se encuentra el fondo asociado.")

    setProcesandoCompra(true)
    try {
      await supabase.from('deseos').update({ comprado: true }).eq('id', deseo.id)
      await supabase.from('movement').insert([{ concepto: deseo.nombre, amount: -Math.abs(costeFinal), cantidad: -Math.abs(costeFinal), categoria: fondoVinculado.categoria, fecha: new Date().toISOString(), pagado_por: 'Fondo Común' }])
      await supabase.from('fondos').update({ saldo_total: fondoVinculado.saldo_total - costeFinal }).eq('id', deseo.fondo_id)
      
      setModalCompra(null)
      setDeseoViendo(null) 
      cargarDatos()
    } catch (err) { 
      console.error(err)
      alert("Hubo un error al procesar la compra.")
    }
    setProcesandoCompra(false)
  }

  const eliminarDeseo = async (id) => {
    if (!window.confirm('¿Seguro que quieres borrar este deseo?')) return
    await supabase.from('deseos').delete().eq('id', id)
    cargarDatos()
  }

  const deseosFiltrados = deseos.filter(deseo => {
    const coincideTexto = deseo.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const coincidePrioridad = filtroPrioridad === 'todas' || deseo.prioridad === filtroPrioridad
    const coincideFondo = filtroFondo === 'todos' || deseo.fondo_id === filtroFondo
    return coincideTexto && coincidePrioridad && coincideFondo
  }).sort((a, b) => {
    if (orden === 'recientes') return new Date(b.creado_en) - new Date(a.creado_en)
    if (orden === 'antiguos') return new Date(a.creado_en) - new Date(b.creado_en)
    if (orden === 'prioridad') {
      const pesos = { urgente: 3, normal: 2, capricho: 1 }
      return pesos[b.prioridad] - pesos[a.prioridad]
    }
    return 0
  })

  if (cargando) return <p className="text-center p-4 text-gray-500">Cargando lista de deseos...</p>

  const coloresPrioridad = {
    urgente: 'bg-red-100 text-red-700 border-red-200',
    normal: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    capricho: 'bg-blue-100 text-blue-700 border-blue-200'
  }

  return (
    <div className="space-y-6 mt-4">
      
      {/* --- CREADOR DE DESEOS (AHORA CON BOTÓN DESPLEGABLE) --- */}
      {!mostrarFormulario ? (
        <button 
          onClick={() => setMostrarFormulario(true)}
          className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-sm hover:bg-gray-800 transition-colors active:scale-95"
        >
          <Plus size={20} /> Añadir nuevo deseo
        </button>
      ) : (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 animate-fade-in relative">
          
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Añadir a la lista</h2>
            <button 
              onClick={() => setMostrarFormulario(false)} 
              className="text-gray-400 hover:text-gray-600 bg-gray-50 p-1.5 rounded-full transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={agregarDeseo} className="flex flex-col gap-3">
            <input type="text" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Ej: Freidora de aire" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-blue-500" required />
            
            <div className="flex gap-2">
              <input type="number" step="0.01" value={nuevoCoste} onChange={(e) => setNuevoCoste(e.target.value)} placeholder="Presupuesto €" className="w-1/3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-blue-500" required />
              <select value={fondoSeleccionado} onChange={(e) => setFondoSeleccionado(e.target.value)} className="w-2/3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-blue-500" required>
                {fondos.map(f => (
                  <option key={f.id} value={f.id}>{f.categoria} ({Number(f.saldo_total).toFixed(2).replace('.', ',')}€)</option>
                ))}
              </select>
            </div>

            <textarea value={nuevaNota} onChange={(e) => setNuevaNota(e.target.value)} placeholder="Notas (color, tamaño, motivo...) - Opcional" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-blue-500 text-sm resize-none" rows="2" />

            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/50 space-y-3">
              <p className="text-xs font-bold text-blue-800 uppercase flex items-center gap-1"><LinkIcon size={14} /> Opciones de compra (Opcional)</p>
              {opcionesActuales.length > 0 && (
                <div className="space-y-2">
                  {opcionesActuales.map(opt => (
                    <div key={opt.id} className="flex justify-between items-center bg-white p-2 rounded-lg text-xs shadow-sm border border-gray-100">
                      <div><span className="font-bold text-gray-700">{opt.tienda}</span> - <span className="text-blue-600 font-semibold">{Number(opt.precio).toFixed(2).replace('.', ',')}€</span></div>
                      <button type="button" onClick={() => setOpcionesActuales(opcionesActuales.filter(o => o.id !== opt.id))} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2"><input type="text" value={tempTienda} onChange={(e) => setTempTienda(e.target.value)} placeholder="Tienda (Amazon...)" className="w-1/2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none" /><input type="number" step="0.01" value={tempPrecio} onChange={(e) => setTempPrecio(e.target.value)} placeholder="Precio €" className="w-1/2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none" /></div>
              <div className="flex gap-2"><input type="url" value={tempUrl} onChange={(e) => setTempUrl(e.target.value)} placeholder="Link del producto" className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none" /><button type="button" onClick={agregarOpcionListado} disabled={!tempTienda || !tempPrecio} className="bg-blue-100 text-blue-700 px-3 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"><Plus size={20} /></button></div>
            </div>

            <div className="flex gap-2 items-center">
              <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-blue-500">
                <option value="urgente">🔴 Urgente</option><option value="normal">🟡 Normal</option><option value="capricho">🔵 Capricho</option>
              </select>
              <button type="submit" disabled={creando || fondos.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold transition-colors">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* --- BUSCADOR Y FILTROS --- */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar en la lista..." className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-blue-500"/>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 shrink-0"><Filter size={14} /> Filtrar:</div>
          <select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none shrink-0 font-medium text-gray-700">
            <option value="todas">Prioridad: Todas</option><option value="urgente">🔴 Urgentes</option><option value="normal">🟡 Normales</option><option value="capricho">🔵 Caprichos</option>
          </select>
          <select value={filtroFondo} onChange={(e) => setFiltroFondo(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none shrink-0 font-medium text-gray-700">
            <option value="todos">Fondo: Todos</option>
            {fondos.map(f => (<option key={f.id} value={f.id}>{f.categoria}</option>))}
          </select>
          <select value={orden} onChange={(e) => setOrden(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none shrink-0 font-medium text-gray-700">
            <option value="recientes">Ordenar: Más recientes</option><option value="antiguos">Ordenar: Más antiguos</option><option value="prioridad">Ordenar: Por urgencia</option>
          </select>
        </div>
      </div>

      {/* --- LISTA PRINCIPAL --- */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 px-1 mb-3">Pendientes ({deseosFiltrados.length})</h2>
        {deseosFiltrados.length === 0 ? (
          <p className="text-center text-gray-500 py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">No hay resultados.</p>
        ) : (
          <div className="space-y-4">
            {deseosFiltrados.map(deseo => {
              const fondoAsociado = fondos.find(f => f.id === deseo.fondo_id)
              const saldoDisponible = fondoAsociado ? fondoAsociado.saldo_total : 0
              const seLoPuedenPermitir = saldoDisponible >= deseo.coste_estimado
              const tieneOpciones = deseo.opciones && deseo.opciones.length > 0
              const tieneNotas = deseo.notas && deseo.notas.trim() !== ''

              return (
                <div key={deseo.id} className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                  
                  {/* ZONA SUPERIOR CLICKABLE */}
                  <div onClick={() => setDeseoViendo(deseo)} className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg leading-tight flex items-center gap-2">
                          {deseo.nombre}
                          {tieneOpciones && <span className="text-blue-500 bg-blue-50 p-1 rounded-md" title="Contiene enlaces"><LinkIcon size={14} /></span>}
                          {tieneNotas && <span className="text-amber-500 bg-amber-50 p-1 rounded-md" title="Contiene notas"><AlignLeft size={14} /></span>}
                        </h3>
                        <div className="flex gap-2 mt-2">
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-full uppercase font-bold tracking-wider">{fondoAsociado ? fondoAsociado.categoria : 'Sin fondo'}</span>
                          <span className={`text-[10px] px-2 py-1 rounded-full border uppercase tracking-wider font-bold ${coloresPrioridad[deseo.prioridad]}`}>{deseo.prioridad}</span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-sm text-gray-400 font-medium leading-tight">Presupuesto</span>
                        <span className="text-lg font-extrabold text-gray-900 leading-none">{Number(deseo.coste_estimado).toFixed(2).replace('.', ',')} €</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                      <Eye size={14}/> Toca para ver detalles {tieneOpciones && 'y opciones'}
                    </p>
                  </div>

                  {/* ZONA INFERIOR */}
                  <div className="border-t border-gray-100 p-3 bg-white flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-xs">
                      {seLoPuedenPermitir ? (
                        <span className="flex items-center text-emerald-600 font-bold"><CheckCircle2 size={16} className="mr-1" /> ¡Fondos ok!</span>
                      ) : (
                        <span className="flex items-center text-orange-500 font-bold"><AlertCircle size={16} className="mr-1" /> Faltan {Number(deseo.coste_estimado - saldoDisponible).toFixed(2).replace('.', ',')}€</span>
                      )}
                    </div>

                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => iniciarEdicion(deseo)} className="p-2 text-gray-400 hover:text-blue-500 transition-colors bg-gray-50 rounded-lg"><Edit2 size={16} /></button>
                      <button onClick={() => eliminarDeseo(deseo.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-gray-50 rounded-lg"><Trash2 size={16} /></button>
                      <button onClick={() => abrirModalCompra(deseo)} className="flex items-center gap-1.5 bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm active:scale-95"><ShoppingBag size={16} /> Comprar</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* =======================================================
          --- 🔍 MODAL DE DETALLES Y LIKES ---
          ======================================================= */}
      {deseoViendo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-xl font-black text-gray-900 leading-tight">{deseoViendo.nombre}</h3>
                <p className="text-sm font-medium text-gray-500 mt-1">
                  Presupuesto: <span className="text-gray-900 font-bold">{Number(deseoViendo.coste_estimado).toFixed(2).replace('.', ',')}€</span>
                </p>
              </div>
              <button onClick={() => { setDeseoViendo(null); setEditandoNotaDetalle(false); }} className="text-gray-400 hover:text-gray-600 p-1 bg-gray-50 rounded-full"><X size={20} /></button>
            </div>

          {/* SECCIÓN DE NOTAS EN DETALLES (AHORA EDITABLE) */}
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-xs font-bold text-amber-800 uppercase flex items-center gap-1"><AlignLeft size={14} /> Notas</h4>
                {!editandoNotaDetalle && (
                  <button onClick={() => { setNotaDetalleTemp(deseoViendo.notas || ''); setEditandoNotaDetalle(true); }} className="text-amber-600 hover:text-amber-800 text-xs font-bold flex items-center gap-1">
                    <Edit2 size={12} /> Editar
                  </button>
                )}
              </div>
              
              {editandoNotaDetalle ? (
                <div className="mt-2 space-y-2">
                  <textarea 
                    value={notaDetalleTemp} 
                    onChange={(e) => setNotaDetalleTemp(e.target.value)} 
                    className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 outline-none text-sm resize-none focus:border-amber-400"
                    rows="3" autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setEditandoNotaDetalle(false)} className="flex-1 bg-amber-100 text-amber-800 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-200">Cancelar</button>
                    <button onClick={guardarNotaDetalle} className="flex-1 bg-amber-500 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-amber-600">Guardar</button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => { setNotaDetalleTemp(deseoViendo.notas || ''); setEditandoNotaDetalle(true); }} 
                  className="cursor-pointer hover:bg-amber-100/50 p-1 -mx-1 rounded transition-colors" title="Haz clic para editar"
                >
                  {deseoViendo.notas ? (
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{deseoViendo.notas}</p>
                  ) : (
                    <p className="text-sm text-amber-600/60 italic">Haz clic aquí para añadir una nota...</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-500 uppercase">Opciones de Compra</h4>
              
              {deseoViendo.opciones && deseoViendo.opciones.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {deseoViendo.opciones.map(opt => {
                    const likes = opt.likes || []
                    const leHeDadoLike = likes.includes(usuarioActual)

                    return (
                      <div key={opt.id} className="bg-gray-50 p-3 rounded-xl border border-gray-200 shadow-sm">
                        
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-800 text-base">{opt.tienda}</span>
                            
                            {/* SECCIÓN DE ME GUSTA (ESTRELLA) */}
                            <div className="flex items-center gap-1.5 mt-1">
                              <button 
                                onClick={() => toggleFavorito(deseoViendo, opt.id)} 
                                className={`p-1 rounded-full transition-colors ${leHeDadoLike ? 'bg-yellow-100 text-yellow-500' : 'bg-gray-200 text-gray-400 hover:bg-gray-300'}`}
                              >
                                <Star size={16} className={leHeDadoLike ? "fill-current" : ""} />
                              </button>
                              {likes.length > 0 && (
                                <span className="text-xs text-gray-500 font-medium">
                                  Favorito de: <span className="capitalize text-gray-700 font-bold">{likes.join(', ')}</span>
                                </span>
                              )}
                            </div>
                            
                          </div>
                          <span className="text-blue-600 font-extrabold text-lg">{Number(opt.precio).toFixed(2).replace('.', ',')} €</span>
                        </div>
                        
                        <div className="flex gap-2 mt-3">
                          {opt.url && (
                            <a href={opt.url} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg font-bold text-sm hover:bg-gray-100 transition-colors">
                              <ExternalLink size={16} /> Ver tienda
                            </a>
                          )}
                          <button onClick={() => abrirModalCompra(deseoViendo, opt.precio)} className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white py-2 rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors shadow-sm active:scale-95">
                            <ShoppingBag size={16} /> Comprar este
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-xl italic">No hay enlaces ni opciones guardadas para este deseo.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          --- 🛒 NUEVO MODAL PERSONALIZADO DE COMPRA ---
          ======================================================= */}
      {modalCompra && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-5">
            
            <div className="text-center space-y-1">
              <div className="mx-auto bg-emerald-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                <ShoppingBag className="text-emerald-600" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Confirmar Compra</h3>
              <p className="text-gray-500 text-sm">¿Estás a punto de registrar la compra de <span className="font-bold text-gray-800">"{modalCompra.deseo.nombre}"</span>?</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={usarOtroPrecio}
                  onChange={(e) => setUsarOtroPrecio(e.target.checked)}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-bold text-gray-700">¿Lo compraste por otro precio?</span>
              </label>

              {usarOtroPrecio ? (
                <div className="mt-3">
                  <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Precio final pagado (€)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={precioPersonalizado} 
                    onChange={(e) => setPrecioPersonalizado(e.target.value)} 
                    placeholder={`Ej: ${Number(modalCompra.precioSugerido).toFixed(2)}`}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-lg font-bold"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="mt-3 flex justify-between items-center border-t border-gray-200 pt-3">
                  <span className="text-sm text-gray-500">Se descontará:</span>
                  <span className="text-xl font-black text-emerald-600">{Number(modalCompra.precioSugerido).toFixed(2).replace('.', ',')} €</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setModalCompra(null)} 
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl text-sm transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarCompra} 
                disabled={procesandoCompra}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {procesandoCompra ? 'Guardando...' : `Pagar ${usarOtroPrecio && precioPersonalizado ? Number(precioPersonalizado.replace(',', '.')).toFixed(2) : Number(modalCompra.precioSugerido).toFixed(2)}€`}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =======================================================
          --- 🔲 MODAL DE EDICIÓN ---
          ======================================================= */}
      {deseoEditando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Editar Deseo ✏️</h3>
              <button onClick={() => setDeseoEditando(null)} className="text-gray-400 hover:text-gray-600 p-1 bg-gray-50 rounded-full"><X size={20} /></button>
            </div>
            <form onSubmit={guardarCambiosDeseo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre</label>
                <input type="text" value={editNombre} onChange={(e) => setEditNombre(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none" required />
              </div>
              <div className="flex gap-3">
                <div className="w-1/3">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Presupuesto</label>
                  <input type="number" step="0.01" value={editCoste} onChange={(e) => setEditCoste(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none" required />
                </div>
                <div className="w-2/3">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fondo Asociado</label>
                  <select value={editFondo} onChange={(e) => setEditFondo(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none" required>
                    {fondos.map(f => (<option key={f.id} value={f.id}>{f.categoria}</option>))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notas (Opcional)</label>
                <textarea value={editNota} onChange={(e) => setEditNota(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none text-sm resize-none" rows="2" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prioridad</label>
                <select value={editPrioridad} onChange={(e) => setEditPrioridad(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none">
                  <option value="urgente">🔴 Urgente</option><option value="normal">🟡 Normal</option><option value="capricho">🔵 Capricho</option>
                </select>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-3">
                <label className="block text-xs font-bold text-gray-600 uppercase">Gestionar opciones/links</label>
                {editOpciones.length > 0 && (
                  <div className="space-y-1.5">
                    {editOpciones.map(opt => (
                      <div key={opt.id} className="flex justify-between items-center bg-white p-2 rounded-lg text-xs border border-gray-200">
                        <span><b>{opt.tienda}</b> ({Number(opt.precio).toFixed(2)}€)</span>
                        <button type="button" onClick={() => setEditOpciones(editOpciones.filter(o => o.id !== opt.id))} className="text-red-400 hover:text-red-500"><Trash2 size={14}/></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2"><input type="text" value={tempTienda} onChange={(e) => setTempTienda(e.target.value)} placeholder="Tienda" className="w-1/2 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs" /><input type="number" step="0.01" value={tempPrecio} onChange={(e) => setTempPrecio(e.target.value)} placeholder="Precio" className="w-1/2 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs" /></div>
                <div className="flex gap-2"><input type="url" value={tempUrl} onChange={(e) => setTempUrl(e.target.value)} placeholder="Link opcional" className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs" /><button type="button" onClick={agregarOpcionEdicion} disabled={!tempTienda || !tempPrecio} className="bg-blue-600 text-white px-2.5 rounded-lg text-xs font-bold">Añadir</button></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setDeseoEditando(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-sm transition-colors">Cancelar</button>
                <button type="submit" disabled={guardandoEdicion} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">{guardandoEdicion ? 'Guardando...' : 'Guardar Cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}