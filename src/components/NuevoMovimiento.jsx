import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Camera, Loader2 } from 'lucide-react'

export default function NuevoMovimiento({ onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState(null)
  
  const [tipoMovimiento, setTipoMovimiento] = useState('gasto') // 'gasto' o 'ingreso'

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    concepto: '',
    cantidad: '',
    categoria: '', 
    pagado_por: 'Fondo correspondiente',
    notas: '',
    url_ticket: ''
  })

  const [fondos, setFondos] = useState([]);

  const [autoFilled, setAutoFilled] = useState({
    concepto: false,
    cantidad: false,
    fecha: false,
    categoria: false
  })

  const handleFileChange = async (e) => {
   if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile) 
      await scanTicket(selectedFile) 
    }
  }
  
  useEffect(() => {
    const traerDatos = async () => {
      // 1. Identificar quién está usando la app
      const { data: { user } } = await supabase.auth.getUser()
      const nombreUsuarioActual = user ? user.email.split('@')[0].toLowerCase() : ''

      // 2. Traer los fondos y sus miembros
      const { data: dataFondos } = await supabase.from('fondos').select('categoria, miembros').order('categoria')
      
      if (dataFondos) {
        // 3. Filtramos para mostrar solo los fondos donde el usuario actual esté incluido
        const misFondos = dataFondos.filter(f => 
          f.miembros && f.miembros.map(m => m.toLowerCase()).includes(nombreUsuarioActual)
        )
        
        setFondos(misFondos)
        if (misFondos.length > 0) {
          setFormData(prev => ({...prev, categoria: misFondos[0].categoria}))
        }
      }
    }
    traerDatos()
  }, [])

  const scanTicket = async (fileToScan) => {
    if (!fileToScan) return alert("Selecciona un ticket primero")
    setLoading(true)

    try {
      const fileExt = fileToScan.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `registro_Images/${fileName}`

      const { error: uploadError } = await supabase.storage.from('tickets').upload(filePath, fileToScan)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('tickets').getPublicUrl(filePath)
      setFormData(prev => ({ ...prev, url_ticket: publicUrl }))

      const { data: parsedData, error: functionError } = await supabase.functions.invoke('scan-ticket', {
        body: { imageUrl: publicUrl }
      })

      if (functionError) throw functionError

      let categoriaDetectada = fondos.length > 0 ? fondos[0].categoria : 'Comida' 
      const tienda = parsedData.supermercado?.toLowerCase() || ''
      
      if (tienda.includes('miscota') || tienda.includes('kiwoko')) {
        categoriaDetectada = 'Gata'
      } else if (tienda.includes('iberdrola') || tienda.includes('endesa') || tienda.includes('agua')) {
        categoriaDetectada = 'Facturas Piso'
      }

      setFormData(prev => ({
        ...prev,
        concepto: parsedData.supermercado || '',
        cantidad: parsedData.total || '',
        categoria: categoriaDetectada,
        fecha: parsedData.fecha ? parsedData.fecha : new Date().toISOString().split('T')[0]
      }))

      setAutoFilled({
        concepto: !!parsedData.supermercado,
        cantidad: !!parsedData.total,
        categoria: true, 
        fecha: !!parsedData.fecha
      })

    } catch (error) {
      console.error("Error escaneando:", error)
      alert("Hubo un error al leer el ticket. Revisa la consola para más detalles.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      let cantidadFinal = Math.abs(parseFloat(formData.cantidad.toString().replace(',', '.')))
      if (tipoMovimiento === 'gasto') {
        cantidadFinal = -cantidadFinal 
      }

      const { error } = await supabase
        .from('movement')
        .insert([{
          fecha: formData.fecha,
          concepto: formData.concepto,
          cantidad: cantidadFinal,
          categoria: formData.categoria,
          pagado_por: formData.pagado_por,
          notas: formData.notas,
          url_ticket: formData.url_ticket
        }])

      if (error) throw error
      
      alert("¡Guardado correctamente!")
      if(onSuccess) onSuccess() 

    } catch (error) {
      console.error("Error al guardar:", error)
      alert("Error al guardar el movimiento")
    } finally {
      setLoading(false)
    }
  }

  // --- LÓGICA DINÁMICA DE MIEMBROS ---
  // Buscamos el fondo que está seleccionado ahora mismo en el formulario
  const fondoSeleccionadoObj = fondos.find(f => f.categoria === formData.categoria)
  // Extraemos la lista de miembros de ese fondo en concreto
  const miembrosDelFondo = fondoSeleccionadoObj?.miembros || []

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      
      <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100 flex flex-col items-center gap-3">
        {loading ? (
          <div className="flex flex-col items-center text-blue-700 gap-2">
            <Loader2 className="animate-spin" size={28} />
            <span className="text-sm font-medium">Procesando...</span>
          </div>
        ) : (
          <label className="cursor-pointer bg-blue-600 text-white px-4 py-3 w-full rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-sm font-bold">
            <Camera size={22} />
            {file ? '¡Hacer otra foto!' : 'Hacer foto al comprobante'}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
          </label>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        <div className="flex bg-gray-100 rounded-xl p-1 relative">
          <button
            type="button"
            onClick={() => setTipoMovimiento('gasto')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all z-10 ${tipoMovimiento === 'gasto' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            📉 Gasto
          </button>
          <button
            type="button"
            onClick={() => setTipoMovimiento('ingreso')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all z-10 ${tipoMovimiento === 'ingreso' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            📈 Ingreso
          </button>
        </div>

        <div>
          <label className="text-xs text-gray-500 font-bold uppercase flex justify-between">
            Concepto 
            {autoFilled.concepto && <span className="text-emerald-600 text-[10px]">✨ AUTOCOMPLETADO</span>}
          </label>
          <input 
            type="text" required placeholder="Ej: Mercadona o Bizum"
            value={formData.concepto} 
            onChange={e => {
              setFormData({...formData, concepto: e.target.value});
              setAutoFilled({...autoFilled, concepto: false});
            }} 
            className={`w-full mt-1 border-b py-2 outline-none transition-colors rounded-t-sm px-2 ${autoFilled.concepto ? 'bg-emerald-50 border-emerald-400 text-emerald-900' : 'border-gray-300 focus:border-blue-600 bg-transparent'}`} 
          />
        </div>

        <div className="flex gap-4">
          <div className="w-1/2">
            <label className="text-xs text-gray-500 font-bold uppercase flex justify-between">
              Cantidad (€)
              {autoFilled.cantidad && <span className="text-emerald-600 text-[10px]">✨ AUTOCOMPLETADO</span>}
            </label>
            <input 
              type="number" step="0.01" required placeholder="25.00"
              value={Math.abs(formData.cantidad) || ''} 
              onChange={e => {
                setFormData({...formData, cantidad: e.target.value});
                setAutoFilled({...autoFilled, cantidad: false});
              }} 
              className={`w-full mt-1 border-b py-2 outline-none font-bold transition-colors rounded-t-sm px-2 ${tipoMovimiento === 'gasto' ? 'text-red-600' : 'text-emerald-600'} ${autoFilled.cantidad ? 'bg-emerald-50 border-emerald-400' : 'border-gray-300 focus:border-blue-600 bg-transparent'}`} 
            />
          </div>

          <div className="w-1/2">
            <label className="text-xs text-gray-500 font-bold uppercase flex justify-between">
              Fecha
              {autoFilled.fecha && <span className="text-emerald-600 text-[10px]">✨ AUTOCOMPLETADO</span>}
            </label>
            <input 
              type="date" required 
              value={formData.fecha} 
              onChange={e => {
                setFormData({...formData, fecha: e.target.value});
                setAutoFilled({...autoFilled, fecha: false});
              }} 
              className={`w-full mt-1 border-b py-2 outline-none transition-colors rounded-t-sm px-2 ${autoFilled.fecha ? 'bg-emerald-50 border-emerald-400 text-emerald-900' : 'border-gray-300 focus:border-blue-600 bg-transparent'}`} 
            />
          </div>
        </div>

        <div className="flex gap-4">
          <div className="w-1/2">
            <label className="text-xs text-gray-500 font-bold uppercase flex justify-between">
              Fondo (Categoría)
              {autoFilled.categoria && <span className="text-emerald-600 text-[10px]">✨ IA</span>}
            </label>
            <select 
              value={formData.categoria} 
              onChange={e => {
                // Al cambiar de fondo, reseteamos quién paga por si el usuario anterior no está en el nuevo fondo
                setFormData({...formData, categoria: e.target.value, pagado_por: 'Fondo correspondiente'})
                setAutoFilled({...autoFilled, categoria: false})
              }} 
              className={`w-full mt-1 border-b border-gray-300 py-2 outline-none transition-colors px-2 ${autoFilled.categoria ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold' : 'focus:border-blue-600 bg-transparent'}`}
            >
              {fondos.length === 0 && <option value="">Sin fondos...</option>}
              {fondos.map(f => (
                <option key={f.categoria} value={f.categoria}>{f.categoria}</option>
              ))}
            </select>
          </div>

          <div className="w-1/2">
            <label className="text-xs text-gray-500 font-bold uppercase">Pagado Por</label>
            <select 
              value={formData.pagado_por} 
              onChange={e => setFormData({...formData, pagado_por: e.target.value})} 
              className="w-full mt-1 border-b border-gray-300 py-2 bg-transparent outline-none px-2 focus:border-blue-600 transition-colors"
            >
              <option value="Fondo correspondiente" className="font-bold text-blue-600">💰 Del Bote</option>
              
              <optgroup label="Dinero personal:">
                {miembrosDelFondo.map(miembro => (
                  <option key={miembro} value={miembro} className="capitalize">
                    👤 {miembro}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          className={`mt-4 w-full text-white font-bold py-4 rounded-xl transition shadow-lg active:scale-95 ${tipoMovimiento === 'gasto' ? 'bg-gray-900 hover:bg-gray-800' : 'bg-emerald-600 hover:bg-emerald-700'}`}
        >
          {loading ? 'Guardando...' : `Guardar ${tipoMovimiento === 'gasto' ? 'Gasto' : 'Ingreso'}`}
        </button>
      </form>
    </div>
  )
}