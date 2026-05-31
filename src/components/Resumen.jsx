import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Trash2, Plus, Users, Edit2, X } from 'lucide-react'

export default function Resumen() {
  const [fondos, setFondos] = useState([])
  const [cargando, setCargando] = useState(true) 
  
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [creando, setCreando] = useState(false)

  // Estados para gestionar quién pertenece a cada fondo
  const [miembrosDisponibles, setMiembrosDisponibles] = useState([])
  const [miembrosSeleccionados, setMiembrosSeleccionados] = useState([])

  // --- ESTADOS PARA LA EDICIÓN DE FONDOS ---
  const [fondoEditando, setFondoEditando] = useState(null)
  const [editCategoria, setEditCategoria] = useState('')
  const [editMiembros, setEditMiembros] = useState([])
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)

  const cargarDatos = async () => {
    // 1. Obtener usuario de Auth
    const { data: { user } } = await supabase.auth.getUser()
    let miNombre = user ? user.email.split('@')[0].toLowerCase() : ''

    // 2. Buscamos tu nombre real en la BD por si lo cambiaste (ej: de andreagomes.avg a valen)
    if (user) {
      const { data: perfil } = await supabase
        .from('miembros_grupo')
        .select('nombre')
        .eq('user_id', user.id)
        .single()
      
      if (perfil && perfil.nombre) {
        miNombre = perfil.nombre.toLowerCase()
      }
    }

    // 3. Cargamos TODOS los fondos
    const { data: dataFondos, error: errFondos } = await supabase
      .from('fondos')
      .select('*')
      .order('categoria', { ascending: true })
    
    let misFondos = []
    if (!errFondos && dataFondos) {
      // ✨ LA MAGIA: Filtramos para que SOLO veas los fondos donde tú estás metida
      misFondos = dataFondos.filter(f => 
        f.miembros && f.miembros.map(m => m.toLowerCase()).includes(miNombre)
      )
    }
    setFondos(misFondos)

    // 4. Cargamos los miembros de la casa
    const { data: dataMiembros } = await supabase.rpc('get_nombres_mi_grupo')
    
    const listaNombres = dataMiembros && dataMiembros.length > 0 
      ? dataMiembros.map(m => m.nombre.toLowerCase()) 
      : ['valen', 'alex', 'ander']
      
    setMiembrosDisponibles(listaNombres)

    // Autoseleccionarnos a nosotros mismos al crear un fondo
    if (miembrosSeleccionados.length === 0 && listaNombres.includes(miNombre)) {
      setMiembrosSeleccionados([miNombre])
    }

    setCargando(false)
  }

  useEffect(() => {
    cargarDatos()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleMiembro = (nombre) => {
    if (miembrosSeleccionados.includes(nombre)) {
      setMiembrosSeleccionados(miembrosSeleccionados.filter(m => m !== nombre))
    } else {
      setMiembrosSeleccionados([...miembrosSeleccionados, nombre])
    }
  }

  const toggleMiembroEdicion = (nombre) => {
    if (editMiembros.includes(nombre)) {
      setEditMiembros(editMiembros.filter(m => m !== nombre))
    } else {
      setEditMiembros([...editMiembros, nombre])
    }
  }

  const agregarFondo = async (e) => {
    e.preventDefault()
    if (!nuevaCategoria.trim()) return
    if (miembrosSeleccionados.length === 0) return alert('Debes seleccionar al menos a una persona para este fondo.')

    setCreando(true)
    const { error } = await supabase.from('fondos').insert([
      { 
        categoria: nuevaCategoria.trim(), 
        saldo_total: 0,
        miembros: miembrosSeleccionados 
      }
    ])

    if (error) {
      console.error('Error al crear fondo:', error.message)
      alert("Error al crear la categoría")
    } else {
      setNuevaCategoria('')
      cargarDatos() 
    }
    setCreando(false)
  }

  const iniciarEdicion = (fondo) => {
    setFondoEditando(fondo)
    setEditCategoria(fondo.categoria)
    setEditMiembros(fondo.miembros || [])
  }

  const guardarCambiosFondo = async (e) => {
    e.preventDefault()
    if (!editCategoria.trim() || !fondoEditando) return
    if (editMiembros.length === 0) return alert('El fondo debe tener al menos un participante.')

    setGuardandoEdicion(true)
    
    const { error } = await supabase
      .from('fondos')
      .update({
        categoria: editCategoria.trim(),
        miembros: editMiembros
      })
      .eq('id', fondoEditando.id)

    if (!error) {
      setFondoEditando(null)
      cargarDatos()
    } else {
      console.error('Error al editar fondo:', error.message)
      alert('Error al guardar los cambios')
    }
    setGuardandoEdicion(false)
  }

  const eliminarFondo = async (id, categoria) => {
    const confirmar = window.confirm(`¿Seguro que quieres borrar el fondo de ${categoria}?`)
    if (!confirmar) return

    const { error } = await supabase.from('fondos').delete().eq('id', id)
    
    if (error) {
      console.error('Error al borrar:', error.message)
      alert("Error al borrar el fondo")
    } else {
      cargarDatos()
    }
  }

  if (cargando && fondos.length === 0) return <p className="text-center p-4 text-gray-500">Cargando fondos...</p>

  return (
    <div className="space-y-6 mt-4">
      
      {/* CREAR NUEVO FONDO */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">Crear nueva categoría</h2>
        <form onSubmit={agregarFondo} className="flex flex-col gap-3">
          
          <div className="flex gap-2">
            <input
              type="text"
              value={nuevaCategoria}
              onChange={(e) => setNuevaCategoria(e.target.value)}
              placeholder="Ej: Facturas Piso, Mascotas..."
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
          </div>

          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
              <Users size={14} /> ¿Quién participa en este fondo?
            </label>
            <div className="flex flex-wrap gap-2">
              {miembrosDisponibles.map(miembro => (
                <label key={miembro} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={miembrosSeleccionados.includes(miembro)}
                    onChange={() => toggleMiembro(miembro)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-bold capitalize text-gray-700">{miembro}</span>
                </label>
              ))}
            </div>
          </div>

        </form>
      </div>

      {/* LISTA DE FONDOS */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 px-1 mb-3">Tus Fondos</h2>
        
        {fondos.length === 0 ? (
          <p className="text-center text-gray-500 py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            No tienes fondos asignados. ¡Añade el primero arriba!
          </p>
        ) : (
          <div className="space-y-3">
            {fondos.map(fondo => (
              <div key={fondo.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between gap-3 group">
                
                {/* LADO IZQUIERDO: Nombre y Etiquetas (Con Flex-1 para que no aplaste al resto) */}
                <div className="flex flex-col flex-1 min-w-0 pr-2">
                  <span className="font-bold text-gray-800 text-lg truncate">{fondo.categoria}</span>
                  
                  {fondo.miembros && fondo.miembros.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {fondo.miembros.map(m => (
                        <span key={m} className="text-[10px] bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold capitalize tracking-wider flex items-center gap-1">
                          <Users size={10} className="shrink-0" /> {m}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Fondo General</span>
                  )}
                </div>

                {/* LADO DERECHO: Dinero y Botones (Con Shrink-0 para que nunca se encojan) */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right flex flex-col items-end mr-1">
                    <span className="text-[10px] text-gray-400 font-medium uppercase">Acumulado</span>
                    <span className="text-lg font-extrabold text-blue-600 leading-none">
                      {Number(fondo.saldo_total).toFixed(2).replace('.', ',')} €
                    </span>
                  </div>
                  
                  <button 
                    onClick={() => iniciarEdicion(fondo)}
                    className="text-gray-400 hover:text-blue-500 transition-colors p-1.5 bg-gray-50 hover:bg-blue-50 rounded-lg"
                    title="Editar fondo"
                  >
                    <Edit2 size={16} />
                  </button>

                  <button 
                    onClick={() => eliminarFondo(fondo.id, fondo.categoria)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1.5 bg-gray-50 hover:bg-red-50 rounded-lg"
                    title="Borrar fondo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE EDICIÓN DE FONDOS */}
      {fondoEditando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Editar Fondo ✏️</h3>
              <button 
                onClick={() => setFondoEditando(null)} 
                className="text-gray-400 hover:text-gray-600 p-1 bg-gray-50 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={guardarCambiosFondo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre de la Categoría</label>
                <input 
                  type="text" 
                  value={editCategoria} 
                  onChange={(e) => setEditCategoria(e.target.value)} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-blue-500 font-bold text-gray-800" 
                  required 
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <label className="text-xs font-bold text-gray-600 uppercase mb-2 flex items-center gap-1">
                  <Users size={14} /> Gestionar Participantes
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {miembrosDisponibles.map(miembro => (
                    <label key={miembro} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={editMiembros.includes(miembro)}
                        onChange={() => toggleMiembroEdicion(miembro)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-bold capitalize text-gray-700">{miembro}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setFondoEditando(null)} 
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={guardandoEdicion} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  {guardandoEdicion ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
      
    </div>
  )
}