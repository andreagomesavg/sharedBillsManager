import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Camera, Loader2, CheckCircle } from 'lucide-react'

export default function NuevoMovimiento({ onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState(null)
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0], // Hoy por defecto
    concepto: '',
    cantidad: '',
    categoria: '', // Por defecto
    pagado_por:  'Fondo correspondiente',
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

  // 1. Manejar la selección del archivo
  const handleFileChange = async (e) => {
   if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile) // Lo guardamos para la UI (mostrar un tick, etc)
      await scanTicket(selectedFile) // ¡Lanzamos la IA instantáneamente!
    }
  }
  
  useEffect(() => {
  const traerFondos = async () => {
    const { data } = await supabase.from('fondos').select('categoria');
    if (data) {
      setFondos(data);
      // Ponemos el primero por defecto si el estado está vacío
      if (data.length > 0) setFormData(prev => ({...prev, categoria: data[0].categoria}));
    }
  };
  traerFondos();
}, []);

  // 2. La magia: Subir imagen y leer con Groq
 const scanTicket = async (fileToScan) => {
    if (!fileToScan) return alert("Selecciona un ticket primero")
    setLoading(true)

    try {
      // A. Subir a Supabase Storage
      const fileExt = fileToScan.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `registro_Images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('tickets')
        .upload(filePath, fileToScan)

      if (uploadError) throw uploadError

      // B. Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('tickets')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, url_ticket: publicUrl }))

      // C. ¡NUEVO! Llamar a TU propia API en Supabase (Edge Function)
      const { data: parsedData, error: functionError } = await supabase.functions.invoke('scan-ticket', {
        body: { imageUrl: publicUrl }
      })

      if (functionError) throw functionError

      let categoriaDetectada = 'Comida'; // Comida por defecto
      const tienda = parsedData.supermercado.toLowerCase();
      
      if (tienda.includes('miscota') || tienda.includes('kiwoko')) {
        categoriaDetectada = 'Gata';
      } else if (tienda.includes('iberdrola') || tienda.includes('endesa')) {
        categoriaDetectada = 'Luz'; // Por si en el futuro escaneas facturas de luz
      }

      // D. Autocompletar el formulario con lo que devuelve tu función
      setFormData(prev => ({
        ...prev,
        concepto: parsedData.supermercado,
        cantidad: parsedData.total,
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

  // 3. Guardar en Base de Datos
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('movement')
        .insert([{
          fecha: formData.fecha,
          concepto: formData.concepto,
          cantidad: parseFloat(formData.cantidad),
          categoria: formData.categoria,
          pagado_por: formData.pagado_por,
          notas: formData.notas,
          url_ticket: formData.url_ticket
        }])

      if (error) throw error
      
      alert("¡Guardado correctamente!")
      if(onSuccess) onSuccess() // Para volver al resumen o lista

    } catch (error) {
      console.error("Error al guardar:", error)
      alert("Error al guardar el movimiento")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      
      {/* Escáner IA */}

        
       <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100 flex flex-col items-center gap-3">
        {loading ? (
          <div className="flex flex-col items-center text-blue-700 gap-2">
            <Loader2 className="animate-spin" size={28} />
            <span className="text-sm font-medium">Analizando ticket mágicamente...</span>
          </div>
        ) : (
          <label className="cursor-pointer bg-blue-600 text-white px-4 py-3 w-full rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-sm font-bold">
            <Camera size={22} />
            {file ? '¡Hacer otra foto!' : 'Hacer foto al ticket'}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
          </label>
        )}
      </div>
      
      {/* Formulario Manual */}
     <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        {/* Concepto */}
        <div>
          <label className="text-xs text-gray-500 font-bold uppercase flex justify-between">
            Concepto 
            {autoFilled.concepto && <span className="text-emerald-600 text-[10px]">✨ AUTOCOMPLETADO</span>}
          </label>
          <input 
            type="text" required placeholder="Ej: Mercadona"
            value={formData.concepto} 
            onChange={e => {
              setFormData({...formData, concepto: e.target.value});
              setAutoFilled({...autoFilled, concepto: false}); // Apaga luz si editas
            }} 
            className={`w-full mt-1 border-b py-2 outline-none transition-colors rounded-t-sm px-2 ${autoFilled.concepto ? 'bg-emerald-50 border-emerald-400 text-emerald-900' : 'border-gray-300 focus:border-blue-600 bg-transparent'}`} 
          />
        </div>

        <div className="flex gap-4">
          {/* Cantidad */}
          <div className="w-1/2">
            <label className="text-xs text-gray-500 font-bold uppercase flex justify-between">
              Cantidad (€)
              {autoFilled.cantidad && <span className="text-emerald-600 text-[10px]">✨ AUTOCOMPLETADO</span>}
            </label>
            <input 
              type="number" step="0.01" required placeholder="-25.00"
              value={formData.cantidad} 
              onChange={e => {
                setFormData({...formData, cantidad: e.target.value});
                setAutoFilled({...autoFilled, cantidad: false});
              }} 
              className={`w-full mt-1 border-b py-2 outline-none font-bold transition-colors rounded-t-sm px-2 ${parseFloat(formData.cantidad) < 0 && !autoFilled.cantidad ? 'text-red-500' : ''} ${autoFilled.cantidad ? 'bg-emerald-50 border-emerald-400 text-emerald-900' : 'border-gray-300 focus:border-blue-600 bg-transparent'}`} 
            />
          </div>

          {/* Fecha */}
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
          {/* Categoría */}
          <div className="w-1/2">
            <label className="text-xs text-gray-500 font-bold uppercase flex justify-between">
              Categoría
              {autoFilled.categoria && <span className="text-emerald-600 text-[10px]">✨ AUTOCOMPLETADO</span>}
            </label>
            <select 
              value={formData.categoria} 
              onChange={e => setFormData({...formData, categoria: e.target.value})} 
              className="..."
            >
              {fondos.map(f => (
                <option key={f.categoria} value={f.categoria}>{f.categoria}</option>
              ))}
            </select>
          </div>

          {/* Pagado Por (Este no lo toca la IA, se queda normal) */}
          <div className="w-1/2">
            <label className="text-xs text-gray-500 font-bold uppercase">Pagado Por</label>
            <select 
              value={formData.pagado_por} 
              onChange={e => setFormData({...formData, pagado_por: e.target.value})} 
              className="w-full mt-1 border-b border-gray-300 py-2 bg-transparent outline-none px-2"
            >
              {/* Importante: el value debe coincidir con el estado inicial */}
              <option value="Fondo correspondiente">Fondo</option>
              <option value="Valentina">Valentina</option>
              <option value="Alex">Alex</option>
            </select>
          </div>
        </div>

        <button type="submit" disabled={loading} className="mt-4 w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition shadow-lg active:scale-95">
          {loading ? 'Guardando...' : 'Guardar Movimiento'}
        </button>
      </form>
    </div>
  )
}