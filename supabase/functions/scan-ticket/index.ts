// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageUrl } = await req.json()
    console.log("URL de imagen recibida:", imageUrl) // <- CHIVATO 1

    const prompt = `
      Analiza este ticket de compra. Devuelve ÚNICAMENTE un objeto JSON válido con estas tres claves:
      - "supermercado": Detecta si es 'Mercadona', 'ECONOMY CASH', 'Aldi', 'Miscota'. Si no es ninguno, pon 'Frutería'.
      - "total": El importe total de la compra. Debe ser un número negativo (ej: -26.99).
      - "fecha": Extrae la fecha del ticket en formato "YYYY-MM-DD" (ejemplo: "2026-04-19"). Si no encuentras ninguna fecha en el ticket, devuelve null.
      No añadas texto extra ni formato markdown, solo el JSON puro.
    `

    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) throw new Error("No se encontró la API KEY de Groq en las variables de entorno.") // <- CHIVATO 2

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        temperature: 0,
      })
    })

    const groqData = await groqRes.json()

    // CHIVATO 3: Si Groq da error, paramos aquí y lanzamos el error real
    if (!groqRes.ok) {
      console.error("Fallo en Groq:", groqData)
      throw new Error(`Error de Groq: ${JSON.stringify(groqData.error || groqData)}`)
    }

    let content = groqData.choices[0].message.content.trim()
    if (content.startsWith('```json')) {
      content = content.replace(/```json/g, '').replace(/```/g, '').trim()
    }

    return new Response(content, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("Error interno en la función:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})