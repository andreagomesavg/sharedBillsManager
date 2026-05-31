import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { LogOut, Home, Copy, Check } from 'lucide-react'

export default function Navbar({ session }) {
  const [nombreGrupo, setNombreGrupo] = useState('')
  const [codigoGrupo, setCodigoGrupo] = useState('')
  const [estadoCarga, setEstadoCarga] = useState('cargando...')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    const obtenerGrupo = async () => {
      if (!session?.user?.id) {
        setEstadoCarga('No hay sesión')
        return
      }

      try {
        // AQUÍ ESTÁ EL CAMBIO: Ahora pedimos "codigo_invitacion"
        const { data, error } = await supabase
          .from('miembros_grupo')
          .select(`grupos (nombre, codigo_invitacion)`)
          .eq('user_id', session.user.id)
          .limit(1)

        if (error) throw error
        
        if (data && data.length > 0 && data[0].grupos) {
          setNombreGrupo(data[0].grupos.nombre)
          // AQUÍ TAMBIÉN LEEMOS EL NOMBRE CORRECTO DE LA COLUMNA
          setCodigoGrupo(data[0].grupos.codigo_invitacion)
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

  const copiarCodigo = () => {
    if (!codigoGrupo) return
    navigator.clipboard.writeText(codigoGrupo)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
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
          
          <div className="mt-1 flex items-center gap-2">
            {estadoCarga === 'cargando...' && <span className="text-xs text-gray-400">Buscando grupo...</span>}
            
            {estadoCarga === 'sin_grupo' && (
               <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                 ❌ SIN GRUPO ASIGNADO
               </span>
            )}

            {estadoCarga === 'error' && (
               <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                 ⚠️ ERROR (Revisa la consola)
               </span>
            )}
            
            {estadoCarga === 'ok' && (
               <>
               <div className="gap-1 flex items-start flex-col justify-start sm:flex-row">
                 <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200 uppercase tracking-wide">
                   🏠 {nombreGrupo}
                 </span>
                 
                 {codigoGrupo && (
                   <button 
                     onClick={copiarCodigo}
                     className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-md border border-gray-200 transition-colors active:scale-95"
                     title="Copiar código de invitación"
                   >
                     <span className="text-gray-400">ID:</span> 
                     <span className="tracking-widest">{codigoGrupo}</span>
                     {copiado ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-gray-400" />}
                   </button>
                 )}</div>
               </>
            )}
          </div>

        </div>
      </div>

      <button 
        onClick={handleSignOut}
        className="flex items-center gap-2 text-gray-400 hover:text-red-500 p-2 rounded-xl transition-colors bg-gray-50 hover:bg-red-50"
        title="Cerrar sesión"
      >
        <LogOut size={18} />
      </button>
    </nav>
  )
}