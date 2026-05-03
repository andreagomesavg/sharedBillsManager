import { useState } from 'react'
import { supabase } from '../../supabase'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [modoRegistro, setModoRegistro] = useState('nuevo') // 'nuevo' o 'unirse'
  const [isRecuperando, setIsRecuperando] = useState(false) // <-- NUEVO ESTADO
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombreGrupo, setNombreGrupo] = useState('')
  const [codigoInvitacion, setCodigoInvitacion] = useState('')
  
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError(null)

    try {
      // --- LÓGICA DE RECUPERAR CONTRASEÑA ---
      if (isRecuperando) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email)
        if (resetError) throw resetError
        
        alert("¡Revisa tu bandeja de entrada! Te hemos enviado un enlace para recuperar tu contraseña.")
        setIsRecuperando(false) // Volvemos a la pantalla de login
        
      } else if (isLogin) {
        // --- LÓGICA DE INICIAR SESIÓN ---
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError

      } else {
        // --- LÓGICA DE REGISTRO ---
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpError) throw signUpError

        const userId = authData.user.id

        if (modoRegistro === 'nuevo') {
          // 1. Crear nueva Casa
          const { data: grupo, error: errorGrupo } = await supabase
            .from('grupos')
            .insert({ nombre: nombreGrupo })
            .select('id')
            .single()
          if (errorGrupo) throw errorGrupo

          // 2. Unir al usuario creador a esa casa
          const { error: errorMiembro } = await supabase
            .from('miembros_grupo')
            .insert({ user_id: userId, grupo_id: grupo.id })
          if (errorMiembro) throw errorMiembro

        } else if (modoRegistro === 'unirse') {
          // 1. Buscar la casa por el código
          const { data: grupo, error: errorBusqueda } = await supabase
            .from('grupos')
            .select('id')
            .ilike('codigo_invitacion', codigoInvitacion.trim()) 
            .single()
            
          if (errorBusqueda || !grupo) throw new Error('Código de invitación no válido o no encontrado')

          // 2. Unir al usuario a la casa existente
          const { error: errorMiembro } = await supabase
            .from('miembros_grupo')
            .insert({ user_id: userId, grupo_id: grupo.id })
          if (errorMiembro) throw errorMiembro
        }
      }
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  // Textos dinámicos para el título
  let titulo = 'Comienza a compartir'
  let subtitulo = 'Crea tu cuenta para gestionar gastos'
  if (isRecuperando) {
    titulo = 'Recuperar contraseña 🔐'
    subtitulo = 'Te enviaremos un enlace mágico a tu email'
  } else if (isLogin) {
    titulo = '¡Hola de nuevo! 👋'
    subtitulo = 'Inicia sesión en tu casa'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-xl border border-gray-100">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{titulo}</h1>
          <p className="text-gray-500">{subtitulo}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
            <input 
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border-b-2 border-gray-200 py-2 focus:border-blue-600 outline-none transition-colors bg-transparent"
              placeholder="tu@email.com"
            />
          </div>
          
          {/* Ocultamos la contraseña si estamos recuperando la cuenta */}
          {!isRecuperando && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
              <input 
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full border-b-2 border-gray-200 py-2 focus:border-blue-600 outline-none transition-colors bg-transparent"
                placeholder="••••••••"
              />
              
              {isLogin && (
                <div className="flex justify-end mt-2">
                  <button type="button" onClick={() => setIsRecuperando(true)} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Ocultamos opciones de grupo si estamos iniciando sesión o recuperando */}
          {!isLogin && !isRecuperando && (
            <div className="pt-4 border-t border-gray-100">
              <label className="block text-sm font-bold text-gray-700 mb-3">¿Qué quieres hacer?</label>
              <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                <button type="button" onClick={() => setModoRegistro('nuevo')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${modoRegistro === 'nuevo' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                  Crear Casa
                </button>
                <button type="button" onClick={() => setModoRegistro('unirse')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${modoRegistro === 'unirse' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                  Tengo código
                </button>
              </div>

              {modoRegistro === 'nuevo' ? (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre de la Casa/Grupo</label>
                  <input 
                    type="text" required={!isLogin && modoRegistro === 'nuevo'} value={nombreGrupo} onChange={(e) => setNombreGrupo(e.target.value)}
                    className="w-full border-b-2 border-gray-200 py-2 focus:border-blue-600 outline-none bg-transparent"
                    placeholder="Ej: Pisito Madrid"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Código de Invitación</label>
                  <input 
                    type="text" required={!isLogin && modoRegistro === 'unirse'} value={codigoInvitacion} onChange={(e) => setCodigoInvitacion(e.target.value)}
                    className="w-full border-b-2 border-gray-200 py-2 focus:border-blue-600 outline-none bg-transparent uppercase tracking-widest font-mono"
                    placeholder="A4F8D2"
                  />
                </div>
              )}
            </div>
          )}

          <button type="submit" disabled={cargando} className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition shadow-lg mt-6 active:scale-95">
            {cargando ? 'Cargando...' : (isRecuperando ? 'Enviar enlace' : (isLogin ? 'Entrar' : 'Registrarme'))}
          </button>
        </form>

        <div className="mt-8 text-center space-y-3 flex flex-col">
          {isRecuperando ? (
             <button onClick={() => setIsRecuperando(false)} className="text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors">
               Volver al inicio de sesión
             </button>
          ) : (
             <button onClick={() => setIsLogin(!isLogin)} className="text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors">
               {isLogin ? '¿No tienes cuenta? Crea una aquí' : '¿Ya tienes cuenta? Inicia sesión'}
             </button>
          )}
        </div>
      </div>
    </div>
  )
}