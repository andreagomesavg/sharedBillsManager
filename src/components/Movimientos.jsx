import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Receipt } from 'lucide-react' // Importamos un icono para cuando no haya foto
import MovimientoModal from './MovimientoModal'

export default function Movimientos() {
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [movimientoSeleccionadoId, setMovimientoSeleccionadoId] = useState(null)  

  const cargarDatos = async () => {
    try {
      const { data, error } = await supabase
        .from('movement')
        .select('*')
        .order('fecha', { ascending: false })
      if (data) setMovimientos(data)
    } catch (error) {
      console.error(error)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    const obtenerMovimientos = async () => {
      try {
        const { data, error } = await supabase
          .from('movement')
          .select('*')
          .order('fecha', { ascending: false })

        if (error) throw error
        
        if (data) setMovimientos(data)
      } catch (error) {
        console.error("Error al obtener los movimientos:", error.message)
      } finally {
        setCargando(false)
      }
    }

    obtenerMovimientos()
  }, [])

  const formatearFecha = (fechaDate) => {
    if (!fechaDate) return '';
    const fecha = new Date(fechaDate);
    return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  if (cargando) {
    return <div className="p-4 text-center text-sm text-gray-500">Cargando movimientos...</div>
  }

  

  return (
   <> 
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {movimientos.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            Aún no hay movimientos registrados.
          </div>
        ) : (
          movimientos.map((mov, index) => (
            <div 
              key={mov.id} 
              onClick={() => setMovimientoSeleccionadoId(mov.id)}
              // Opcional: le agregué 'cursor-pointer hover:bg-gray-50' para que se note que es clickeable
              className={`p-4 flex justify-between items-center border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${index === movimientos.length - 1 ? 'border-b-0' : ''}`}
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

      {/* 2. AQUÍ AGREGAMOS EL MODAL */}
      <MovimientoModal 
        id={movimientoSeleccionadoId} 
        onClose={() => setMovimientoSeleccionadoId(null)} 
        onActualizado={cargarDatos}
      />
      
    {/* 3. Cerramos el fragmento */}
    </>
  )
}