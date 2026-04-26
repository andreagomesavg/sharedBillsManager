import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { LogOut, Home } from 'lucide-react'

export default function Navbar({ session }) {
  const [nombreGrupo, setNombreGrupo] = useState('')
  const [estadoCarga, setEstadoCarga] = useState('cargando...')

  useEffect(() => {
    const obtenerGrupo = async () => {
      if (!session?.user?.id) {
        setEstadoCarga('No hay sesión')
        return
      }

      try {
        const { data, error } = await supabase
          .from('miembros_grupo')
          .select(`grupos (nombre)`)
          .eq('user_id', session.user.id)
          .limit(1)

        if (error) throw error
        
        if (data && data.length > 0 && data[0].grupos) {
          setNombreGrupo(data[0].grupos.nombre)
          setEstadoCarga('ok')
        } else {
          setEstadoCarga('sin_grupo')
        }
      } catch (error) {
        console.error('Error al obtener el grupo:', error.message)
        setEstadoCarga('error')
      }
    }

    obtenerGrupo()
  }, [session])
  
  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <nav className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md">
          <Home size={22} />
        </div>
        
        <div className="flex flex-col">
          <span className="font-extrabold text-xl text-gray-900 tracking-tight leading-none">
            SharedBills
          </span>
          
          {/* AQUÍ ESTÁ EL TEXTO DEL GRUPO EN GRANDE */}
          <div className="mt-1">
            {estadoCarga === 'cargando...' && <span className="text-xs text-gray-400">Buscando grupo...</span>}
            
            {estadoCarga === 'sin_grupo' && (
               <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                 ❌ SIN GRUPO ASIGNADO
               </span>
            )}
            
            {estadoCarga === 'ok' && (
               <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200 uppercase tracking-wide">
                 🏠 CASA: {nombreGrupo}
               </span>
            )}
          </div>

        </div>
      </div>

      <button 
        onClick={handleSignOut}
        className="flex items-center gap-2 text-gray-500 hover:text-red-600 p-2 rounded-xl"
      >
        <LogOut size={20} />
      </button>
    </nav>
  )
}