
import './App.css'
import { useState } from 'react'
import Resumen from './components/Resumen'
import Movimientos from './components/Movimientos'
import { Wallet, ListOrdered, Plus } from 'lucide-react'
import NuevoMovimiento from './components/NuevoMovimiento'

function App() {
  const [activeTab, setActiveTab] = useState('resumen')


  return (
   <div className="bg-gray-50 min-h-screen pb-20 font-sans text-gray-800">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-center">
          {activeTab === 'resumen' ? 'Resumen de Fondos' : 'Registro'}
        </h1>
      </header>

      {/* Contenido Principal */}
      <main className="p-4">
        {activeTab === 'nuevo' && <NuevoMovimiento onSuccess={() => setActiveTab('resumen')} />}
        {activeTab === 'resumen' ? <Resumen /> : <Movimientos />}
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
          className="bg-blue-600 text-white px-12 rounded-full  shadow-lg -mt-8 hover:bg-blue-700 transition-colors transform active:scale-95"
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
