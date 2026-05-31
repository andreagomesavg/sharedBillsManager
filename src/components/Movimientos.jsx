import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Receipt, Search, Filter } from 'lucide-react' // Añadimos Search y Filter
import MovimientoModal from './MovimientoModal'

export default function Movimientos() {
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [movimientoSeleccionadoId, setMovimientoSeleccionadoId] = useState(null)  

  // --- ESTADOS PARA BUSCADOR Y FILTROS ---
  const [busqueda, setBusqueda] = useState('')
  const [filtroFondo, setFiltroFondo] = useState('todos')
  const [filtroUsuario, setFiltroUsuario] = useState('todos')
  const [orden, setOrden] = useState('recientes')

  // Guardaremos las categorías y usuarios únicos que existan en la BD
  const [categoriasDisponibles, setCategoriasDisponibles] = useState([])
  const [usuariosDisponibles, setUsuariosDisponibles] = useState([])

 const cargarDatos = async () => {
    try {
      // 1. Identificamos al usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      const miNombre = user ? user.email.split('@')[0].toLowerCase() : ''

      // 2. Traemos los fondos para ver cuáles son nuestras categorías
      const { data: dataFondos } = await supabase.from('fondos').select('categoria, miembros')
      let misCategorias = []
      
      if (dataFondos) {
        const misFondos = dataFondos.filter(f => f.miembros && f.miembros.map(m => m.toLowerCase()).includes(miNombre))
        misCategorias = misFondos.map(f => f.categoria)
      }

      // 3. Traemos SOLO los movimientos de nuestras categorías
      if (misCategorias.length > 0) {
        const { data, error } = await supabase
          .from('movement')
          .select('*')
          .in('categoria', misCategorias) // ✨ LA MAGIA: Solo movimientos de mis fondos
          .order('fecha', { ascending: false })
          
        if (error) throw error

        if (data) {
          setMovimientos(data)
          
          const categorias = [...new Set(data.map(m => m.categoria).filter(Boolean))]
          const usuarios = [...new Set(data.map(m => m.pagado_por).filter(Boolean))]
          
          setCategoriasDisponibles(categorias)
          setUsuariosDisponibles(usuarios)
        }
      } else {
        setMovimientos([]) // Si no estoy en ningún fondo, veo la lista vacía
      }
    } catch (error) {
      console.error("Error al obtener los movimientos:", error.message)
    } finally {
      setCargando(false)
    }
  }

  // Ahora solo tenemos UN useEffect (borré el repetido para que vaya más rápido)
  useEffect(() => {
    cargarDatos()
  }, [])

  const formatearFecha = (fechaDate) => {
    if (!fechaDate) return '';
    const fecha = new Date(fechaDate);
    return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // --- LÓGICA DE FILTRADO Y ORDENACIÓN ---
  const movimientosFiltrados = movimientos.filter(mov => {
    const coincideTexto = mov.concepto?.toLowerCase().includes(busqueda.toLowerCase())
    const coincideFondo = filtroFondo === 'todos' || mov.categoria === filtroFondo
    const coincideUsuario = filtroUsuario === 'todos' || mov.pagado_por === filtroUsuario
    
    return coincideTexto && coincideFondo && coincideUsuario
  }).sort((a, b) => {
    if (orden === 'recientes') return new Date(b.fecha) - new Date(a.fecha)
    if (orden === 'antiguos') return new Date(a.fecha) - new Date(b.fecha)
    return 0
  })

  if (cargando) {
    return <div className="p-4 text-center text-sm text-gray-500">Cargando movimientos...</div>
  }

  return (
   <> 
      {/* --- BUSCADOR Y FILTROS --- */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3 mb-4 mt-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input 
            type="text" 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar movimiento (ej: Mercadona, luz...)" 
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 shrink-0">
            <Filter size={14} /> Filtrar:
          </div>
          
          <select value={filtroFondo} onChange={(e) => setFiltroFondo(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none shrink-0 font-medium text-gray-700">
            <option value="todos">Fondo: Todos</option>
            {categoriasDisponibles.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select value={filtroUsuario} onChange={(e) => setFiltroUsuario(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none shrink-0 font-medium text-gray-700">
            <option value="todos">Usuario: Todos</option>
            {usuariosDisponibles.map(user => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>

          <select value={orden} onChange={(e) => setOrden(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none shrink-0 font-medium text-gray-700">
            <option value="recientes">Más recientes</option>
            <option value="antiguos">Más antiguos</option>
          </select>
        </div>
      </div>

      {/* --- LISTA DE MOVIMIENTOS --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {movimientosFiltrados.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            {movimientos.length === 0 ? 'Aún no hay movimientos registrados.' : 'No hay movimientos que coincidan con esta búsqueda.'}
          </div>
        ) : (
          movimientosFiltrados.map((mov, index) => (
            <div 
              key={mov.id} 
              onClick={() => setMovimientoSeleccionadoId(mov.id)}
              className={`p-4 flex justify-between items-center border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${index === movimientosFiltrados.length - 1 ? 'border-b-0' : ''}`}
            >
              {/* LADO IZQUIERDO: Foto + Textos */}
              <div className="flex items-center gap-4">
                {mov.url_ticket ? (
                  <img 
                    src={mov.url_ticket} 
                    alt={`Ticket de ${mov.concepto}`} 
                    className="w-12 h-12 rounded-lg object-cover border border-gray-200 shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300">
                    <Receipt size={24} />
                  </div>
                )}

                {/* LOS TEXTOS DEL MOVIMIENTO */}
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500 font-medium">{formatearFecha(mov.fecha)}</span>
                  <span className="font-bold text-gray-800">{mov.concepto}</span>
                  <div className="flex gap-2 text-xs mt-1">
                    <span className="bg-gray-100 px-2 py-1 rounded-full text-gray-600">{mov.categoria}</span>
                    <span className="text-gray-400 py-1">{mov.pagado_por}</span>
                  </div>
                </div>
              </div>
              
              {/* LADO DERECHO: Cantidad de dinero */}
              <div className={`text-lg font-bold ${mov.cantidad < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {mov.cantidad > 0 ? '+' : ''}{Number(mov.cantidad).toFixed(2).replace('.', ',')} €
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- MODAL DE DETALLES --- */}
      <MovimientoModal 
        id={movimientoSeleccionadoId} 
        onClose={() => setMovimientoSeleccionadoId(null)} 
        onActualizado={cargarDatos}
      />
      
    </>
  )
}