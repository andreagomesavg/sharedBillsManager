import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Resumen() {
  const [fondos, setFondos] = useState([])
  const [cargando, setCargando] = useState(true)

  // Función para obtener los datos reales
  const obtenerFondos = async () => {
    try {
      setCargando(true)
      const { data, error } = await supabase
        .from('fondos')
        .select('*')
        .order('categoria', { ascending: true })

      if (error) throw error
      if (data) setFondos(data)
    } catch (error) {
      console.error('Error al obtener fondos:', error.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    obtenerFondos()

    // OPCIONAL: Escuchar cambios en tiempo real
    // Si quieres que el saldo cambie solo sin refrescar cuando metas un gasto
    const subscription = supabase
      .channel('cambios-fondos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fondos' }, () => {
        obtenerFondos()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [])

  // Función para asignar colores y emojis si no vienen de la DB
  const getEstiloExtra = (categoria) => {
    const estilos = {
      'Mascota': { emoji: '🐱', color: 'bg-pink-500' },
      'Comida': { emoji: '🛒', color: 'bg-amber-400' },
      'Luz': { emoji: '💡', color: 'bg-yellow-400' },
      'Casa': { emoji: '🏠', color: 'bg-blue-500' }
    }
    return estilos[categoria] || estilos['default']
  }

  if (cargando && fondos.length === 0) {
    return <div className="p-4 text-center text-gray-500">Actualizando saldos...</div>
  }

  return (
    <div className="flex flex-col gap-4">
      {fondos.map((fondo) => {
        const estilo = getEstiloExtra(fondo.categoria)
        
        return (
          <div 
            key={fondo.id} 
            className={`${fondo.color || estilo.color} rounded-2xl p-6 text-white shadow-md flex items-center justify-between transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl">{fondo.emoji || estilo.emoji}</span>
              <div>
                <h2 className="text-xl font-bold uppercase tracking-wider">{fondo.categoria}</h2>
                <p className="text-sm opacity-90">Saldo disponible</p>
              </div>
            </div>
            <div className="text-2xl font-extrabold text-right">
              {/* Usamos Number() por si el saldo viene como string y toFixed para los decimales */}
              {Number(fondo.saldo_total).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
          </div>
        )
      })}

      {fondos.length === 0 && !cargando && (
        <div className="p-10 text-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
          No hay fondos configurados en la base de datos.
        </div>
      )}
    </div>
  )
}