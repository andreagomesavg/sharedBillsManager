import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Trash2, Plus } from 'lucide-react'

export default function Resumen() {
  const [fondos, setFondos] = useState([])
  // La app empieza en modo "cargando" por defecto
  const [cargando, setCargando] = useState(true) 
  
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [creando, setCreando] = useState(false)

  const cargarFondos = async () => {
    // ¡Aquí hemos quitado el setCargando(true) para que React no se queje!
    
    const { data, error } = await supabase
      .from('fondos')
      .select('*')
      .order('categoria', { ascending: true })
    
    if (error) console.error('Error:', error.message)
    else setFondos(data || [])
    
    // Solo lo cambiamos a false cuando ya tenemos los datos
    setCargando(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarFondos()
  }, [])

  const agregarFondo = async (e) => {
    e.preventDefault()
    if (!nuevaCategoria.trim()) return

    setCreando(true)
    const { error } = await supabase.from('fondos').insert([
      { categoria: nuevaCategoria.trim(), saldo_total: 0 }
    ])

    if (error) {
      console.error('Error al crear fondo:', error.message)
      alert("Error al crear la categoría")
    } else {
      setNuevaCategoria('')
      cargarFondos() // Se actualiza la lista en silencio y queda súper fluido
    }
    setCreando(false)
  }

  const eliminarFondo = async (id, categoria) => {
    const confirmar = window.confirm(`¿Seguro que quieres borrar el fondo de ${categoria}?`)
    if (!confirmar) return

    const { error } = await supabase.from('fondos').delete().eq('id', id)
    
    if (error) {
      console.error('Error al borrar:', error.message)
      alert("Error al borrar el fondo")
    } else {
      cargarFondos()
    }
  }

  if (cargando && fondos.length === 0) return <p className="text-center p-4 text-gray-500">Cargando fondos...</p>

  return (
    <div className="space-y-6 mt-4">
      
      {/* CREAR NUEVO FONDO */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">Crear nueva categoría</h2>
        <form onSubmit={agregarFondo} className="flex gap-2">
          <input
            type="text"
            value={nuevaCategoria}
            onChange={(e) => setNuevaCategoria(e.target.value)}
            placeholder="Ej: Vacaciones, Mascotas..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-blue-500 transition-colors"
            required
          />
          <button 
            type="submit" 
            disabled={creando}
            className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors disabled:bg-blue-300"
          >
            <Plus size={20} />
          </button>
        </form>
      </div>

      {/* LISTA DE FONDOS */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 px-1 mb-3">Tus Fondos</h2>
        
        {fondos.length === 0 ? (
          <p className="text-center text-gray-500 py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            Aún no has creado ninguna categoría. ¡Añade la primera arriba!
          </p>
        ) : (
          <div className="space-y-3">
            {fondos.map(fondo => (
              <div key={fondo.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group">
                
                <div className="flex flex-col">
                  <span className="font-bold text-gray-700">{fondo.categoria}</span>
                  <span className="text-xs text-gray-400">Total acumulado</span>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xl font-extrabold text-blue-600">{fondo.saldo_total} €</span>
                  <button 
                    onClick={() => eliminarFondo(fondo.id, fondo.categoria)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-2"
                    title="Borrar fondo"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
      
    </div>
  )
}