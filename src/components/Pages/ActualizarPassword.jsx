import { useState } from 'react'
import { supabase } from '../../supabase'
import { KeyRound } from 'lucide-react'

export default function ActualizarPassword({ onTerminado }) {
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  const handleActualizar = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError(null)

    try {
      // Esta es la función mágica que actualiza la contraseña del usuario activo
      const { error } = await supabase.auth.updateUser({ password: password })
      
      if (error) throw error

      alert("¡Contraseña actualizada con éxito!")
      window.history.replaceState(null, '', window.location.pathname);
      onTerminado() // Le avisa a App.jsx que ya hemos terminado para que nos deje ver el Resumen
      
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-xl border border-gray-100">
        
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="bg-blue-100 p-4 rounded-full text-blue-600 mb-4">
            <KeyRound size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Nueva Contraseña</h1>
          <p className="text-gray-500 text-sm">Casi hemos terminado. Escribe tu nueva contraseña para proteger tu cuenta.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleActualizar} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nueva Contraseña</label>
            <input 
              type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border-b-2 border-gray-200 py-2 focus:border-blue-600 outline-none transition-colors bg-transparent"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={cargando} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition shadow-lg mt-6 active:scale-95">
            {cargando ? 'Guardando...' : 'Actualizar y Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}