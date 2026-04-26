import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { X, Receipt, Edit2, Save, Trash } from 'lucide-react'

export default function MovimientoModal({ id, onClose, onActualizado }) {
  const [movimiento, setMovimiento] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [imagenAmpliada, setImagenAmpliada] = useState(false)
  
  // Listas dinámicas para los desplegables
  const [fondos, setFondos] = useState([])
  const [miembros, setMiembros] = useState([]) // <--- ¡Añadido para los nombres!
  
  const [modoEdicion, setModoEdicion] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [formData, setFormData] = useState({
    concepto: '',
    cantidad: '',
    categoria: '',
    pagado_por: 'Fondo correspondiente',
    fecha: ''
  })

  // 1. Cargar los fondos y los miembros disponibles
  useEffect(() => {
    const traerDatos = async () => {
      // Traer fondos
      const { data: dataFondos } = await supabase.from('fondos').select('categoria').order('categoria')
      if (dataFondos) setFondos(dataFondos)

      // Traer miembros (usando la función mágica de SQL que creamos)
      const { data: dataMiembros } = await supabase.rpc('get_nombres_mi_grupo')
      if (dataMiembros) setMiembros(dataMiembros)
    }
    traerDatos()
  }, [])

  // 2. Cargar los datos del movimiento a editar
  useEffect(() => {
    if (!id) return

    const obtenerDetalle = async () => {
      setCargando(true)
      try {
        const { data, error } = await supabase
          .from('movement')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error
        if (data) {
          setMovimiento(data)
          setFormData({
            concepto: data.concepto,
            cantidad: data.cantidad, 
            categoria: data.categoria,
            pagado_por: data.pagado_por,
            fecha: data.fecha
          })
        }
      } catch (error) {
        console.error("Error al cargar el detalle:", error.message)
      } finally {
        setCargando(false)
      }
    }

    obtenerDetalle()
    setModoEdicion(false) 
  }, [id])

  const guardarCambios = async (e) => {
    e.preventDefault()
    setGuardando(true)

    try {
      const { error } = await supabase
        .from('movement')
        .update({
          concepto: formData.concepto,
          cantidad: parseFloat(formData.cantidad),
          categoria: formData.categoria,
          pagado_por: formData.pagado_por,
          fecha: formData.fecha
        })
        .eq('id', id)

      if (error) throw error

      setMovimiento({ ...movimiento, ...formData }) 
      setModoEdicion(false) 
      if (onActualizado) onActualizado() 
      
    } catch (error) {
      console.error("Error al actualizar:", error.message)
      alert("Hubo un error al guardar los cambios")
    } finally {
      setGuardando(false)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const borrarMovimiento = async () => {
    const confirmar = window.confirm("¿Seguro que quieres borrar este movimiento?")
    if (!confirmar) return

    try {
      const { error } = await supabase
        .from('movement')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert("Movimiento borrado")
      if (onActualizado) onActualizado() 
      onClose() 
    } catch (error) {
      console.error("Error al borrar:", error.message)
      alert("No se pudo borrar el movimiento")
    }
  }

  if (!id) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden relative">
        
        <button onClick={onClose} className="absolute top-4 right-4 bg-white/80 hover:bg-white p-2 rounded-full text-gray-600 transition-colors z-10">
          <X size={20} />
        </button>

        {cargando ? (
          <div className="p-12 text-center text-gray-500">Cargando detalles...</div>
        ) : movimiento ? (
          <>
            <div className="h-48 bg-gray-50 flex items-center justify-center border-b border-gray-100 relative cursor-pointer" onClick={() => {
                if (movimiento.url_ticket) setImagenAmpliada(true)
              }}>
              {movimiento.url_ticket ? (
                <img src={movimiento.url_ticket} alt="Ticket" className="w-full h-full object-cover" />
              ) : (
                <div className="text-gray-300 flex flex-col items-center gap-2">
                  <Receipt size={48} />
                  <span className="text-sm">Sin ticket adjunto</span>
                </div>
              )}
            </div>

            <div className="p-6">
              {modoEdicion ? (
                <form onSubmit={guardarCambios} className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Concepto</label>
                    <input type="text" name="concepto" value={formData.concepto} onChange={handleChange} required className="w-full border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Cantidad (€)</label>
                      <input type="number" step="0.01" name="cantidad" value={formData.cantidad} onChange={handleChange} required className="w-full border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Fecha</label>
                      <input type="date" name="fecha" value={formData.fecha} onChange={handleChange} required className="w-full border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Categoría</label>
                      <select 
                        name="categoria" 
                        value={formData.categoria || ''} 
                        onChange={handleChange} 
                        className="w-full border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        {fondos.length === 0 && <option value="">Sin fondos...</option>}
                        {fondos.map(f => (
                          <option key={f.categoria} value={f.categoria}>{f.categoria}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Pagado por</label>
                      <select 
                        name="pagado_por" 
                        value={formData.pagado_por || ''} 
                        onChange={handleChange} 
                        className="w-full border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="Fondo correspondiente" className="font-bold text-blue-600">💰 Bote</option>
                        <optgroup label="Personal:">
                          {/* AQUÍ MAPEAMOS LOS NOMBRES REALES */}
                          {miembros.map(m => (
                            <option key={m.nombre} value={m.nombre} className="capitalize">
                              👤 {m.nombre}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                    <button type="button" onClick={() => setModoEdicion(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium">
                      Cancelar
                    </button>
                    <button type="submit" disabled={guardando} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex justify-center items-center gap-2">
                      <Save size={18} />
                      {guardando ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">{movimiento.concepto}</h2>
                      <p className="text-gray-500">{new Date(movimiento.fecha).toLocaleDateString('es-ES')}</p>
                    </div>
                    <div className={`text-2xl font-bold ${movimiento.cantidad < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {movimiento.cantidad > 0 ? '+' : ''}{Number(movimiento.cantidad).toFixed(2).replace('.', ',')} €
                    </div>
                  </div>

                  <div className="space-y-3 mt-6 border-t border-gray-100 pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Categoría:</span>
                      <span className="font-medium bg-gray-100 px-3 py-1 rounded-full">{movimiento.categoria}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Pagado por:</span>
                      <span className="font-medium capitalize">{movimiento.pagado_por}</span>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-row">
                    <button 
                      onClick={() => setModoEdicion(true)} 
                      className="w-full py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium flex justify-center items-center gap-2 transition-colors"
                    >
                      <Edit2 size={18} />
                      Editar movimiento
                    </button>
                    <button 
                      onClick={borrarMovimiento}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
                      title="Borrar"
                    >
                      <Trash size={20} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-red-500">No se encontró el movimiento</div>
        )}
      </div>

      {imagenAmpliada && (
        <div 
          className="fixed inset-0 bg-black/95 z-[60] flex justify-center items-center p-4 cursor-zoom-out"
          onClick={() => setImagenAmpliada(false)}
        >
          <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2">
            <X size={32} />
          </button>
          <img 
            src={movimiento.url_ticket} 
            alt="Ticket ampliado" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  )
}