
import './App.css'
import { useState, useEffect } from 'react'
import Resumen from './components/Resumen'
import Movimientos from './components/Movimientos'
import { Wallet, ListOrdered, Plus, LogOut } from 'lucide-react'
import NuevoMovimiento from './components/NuevoMovimiento'
import LoginPage from './components/Pages/LoginPage'
import { supabase } from './supabase'
import Navbar from './components/Navbar'
import ActualizarPassword from './components/Pages/ActualizarPassword'

function App() {
  const [activeTab, setActiveTab] = useState('resumen')
  const [session, setSession] = useState(null)
  
  // 1. NUEVO: Estado para saber si venimos del correo
  const [recuperandoPass, setRecuperandoPass] = useState(false)
useEffect(() => {
    // 1. ¡EL TRUCO DETECTIVE! Miramos la URL nada más cargar la app
    const urlHash = window.location.hash
    if (urlHash && urlHash.includes('type=recovery')) {
      setRecuperandoPass(true)
    }

    // 2. Ver si ya estamos logueados al abrir la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // 3. Escuchar cambios 
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      
      if (event === 'PASSWORD_RECOVERY') {
        setRecuperandoPass(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // 3. NUEVO: Si estamos recuperando la contraseña, mostramos SOLO esta pantalla
  if (recuperandoPass) {
    return <ActualizarPassword onTerminado={() => setRecuperandoPass(false)} />
  }

  // Si no hay sesión (y no estamos recuperando pass), mostramos el Login
  if (!session) {
    return <LoginPage />
  }

  return (
   <div className="bg-gray-50 min-h-screen pb-20 font-sans text-gray-800">
    <Navbar session={session} />
      {/* Header */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-center">
          {activeTab === 'resumen' ? 'Resumen de Fondos' : 'Registro'}
        </h1>
      </header>

      {/* Contenido Principal */}
      <main className="p-4">
        {activeTab === 'resumen' && <Resumen />}
        {activeTab === 'movimientos' && <Movimientos />}
        {activeTab === 'nuevo' && <NuevoMovimiento onSuccess={() => setActiveTab('resumen')} />}
      </main>

      {/* Menú de Navegación Inferior (Mobile) */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around p-3 pb-safe z-10">
        <button 
          onClick={() => setActiveTab('movimientos')}
          className={`flex flex-col items-center p-2 ${activeTab === 'movimientos' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <ListOrdered size={24} />
          <span className="text-xs mt-1 font-medium">Movimientos</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('nuevo')}
          className="bg-blue-600 text-white px-12 rounded-full shadow-lg -mt-8 hover:bg-blue-700 transition-colors transform active:scale-95"
        >
          <Plus size={28} />
        </button>
        
        <button 
          onClick={() => setActiveTab('resumen')}
          className={`flex flex-col items-center p-2 ${activeTab === 'resumen' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <Wallet size={24} />
          <span className="text-xs mt-1 font-medium">Resumen</span>
        </button>
      </nav>
    </div>
  )
}

export default App