const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

function getApiKey() {
  return localStorage.getItem("anthropic_api_key") || "";
}

export function setApiKey(key) {
  localStorage.setItem("anthropic_api_key", key);
}

export function hasApiKey() {
  return !!getApiKey();
}

async function callClaude(systemPrompt, userPrompt, maxTokens = 1500) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("NO_API_KEY");
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API_ERROR: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const textBlock = data.content.find((b) => b.type === "text");
  return textBlock ? textBlock.text : "";
}

/**
 * Le pide a Claude que decida qué fórmula de Excel usar para un cruce
 * en lenguaje natural, y devuelva JSON estructurado.
 */
export async function suggestFormula({ instruction, fileAHeaders, fileBHeaders, fileAName, fileBName, sampleA, sampleB }) {
  const systemPrompt = `Sos un experto en Microsoft Excel con dominio completo de funciones: BUSCARV, BUSCARH, BUSCARX (XLOOKUP), INDICE/COINCIDIR, SI, SI.ERROR, SUMAR.SI, SUMAR.SI.CONJUNTO, CONTAR.SI, CONTAR.SI.CONJUNTO, PROMEDIO.SI, CONCATENAR/TEXTJOIN, y tablas dinámicas.

Tu tarea: dado un pedido en lenguaje natural (en español, casual) sobre cruzar/analizar datos de una o dos tablas Excel, devolvés SOLO un JSON (sin markdown, sin backticks, sin texto extra) con esta estructura exacta:

{
  "explicacion": "explicación breve y natural en español de qué vas a hacer y por qué, como si se lo explicaras a un colega, sin sonar robótico",
  "formula_elegida": "nombre de la función principal, ej: BUSCARV",
  "por_que_esta_formula": "por qué elegiste esta función y no otra alternativa (ej: por qué BUSCARV y no INDICE/COINCIDIR)",
  "formula_excel": "la fórmula real de Excel lista para pegar, usando notación de celda genérica (ej: =SI.ERROR(BUSCARV(A2,Hoja2!A:C,3,FALSO),\\"Sin coincidencia\\"))",
  "columna_resultado_nombre": "nombre sugerido para la columna nueva",
  "sugerencia_limpieza": "si hay riesgo de que la fórmula falle por formato de celda, espacios, texto vs número, etc, explicá qué limpiar antes. Si no hay riesgo, decí null",
  "alternativa_mejor": "si existe una función más moderna o robusta para este caso (ej BUSCARX en vez de BUSCARV), sugerila acá con una frase. Si no aplica, null"
}

Sé natural y directo en las explicaciones, como un colega que sabe mucho de Excel, no como un manual técnico.`;

  const userPrompt = `Pedido del usuario: "${instruction}"

Archivo A: "${fileAName}"
Columnas del Archivo A: ${JSON.stringify(fileAHeaders)}
Muestra de filas del Archivo A: ${JSON.stringify(sampleA?.slice(0, 3) || [])}

${fileBName ? `Archivo B: "${fileBName}"
Columnas del Archivo B: ${JSON.stringify(fileBHeaders)}
Muestra de filas del Archivo B: ${JSON.stringify(sampleB?.slice(0, 3) || [])}` : "No hay un segundo archivo, el cruce es dentro del mismo archivo."}

Devolvé el JSON con la fórmula correcta para este pedido.`;

  const raw = await callClaude(systemPrompt, userPrompt, 1200);
  const cleaned = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error("No pude interpretar la respuesta de la IA. Intentá reformular el pedido.");
  }
}

/**
 * Le pide a Claude que sugiera qué tarjetas KPI y gráficos armar
 * según las columnas detectadas de un archivo nuevo (analizador dinámico).
 */
export async function suggestDashboardLayout({ fileName, columnTypes, rowCount }) {
  const systemPrompt = `Sos un experto en UX/BI que diseña dashboards ejecutivos para presentar a directivas. Dado un listado de columnas de un Excel con su tipo detectado (category, status, date, numeric, text), devolvés SOLO un JSON (sin markdown) con esta estructura:

{
  "kpis": [ { "titulo": "...", "columna": "...", "tipo_calculo": "conteo_unicos | conteo_total | suma | promedio" } ],
  "graficos_sugeridos": [ { "tipo": "barras | dona | linea | cruce", "titulo": "...", "columnas": ["col1","col2"], "por_que": "explicación breve" } ]
}

Elegí máximo 4 KPIs y máximo 5 gráficos, los más relevantes para una presentación ejecutiva rápida. Priorizá columnas de tipo category y status para cruces.`;

  const userPrompt = `Archivo: "${fileName}", ${rowCount} filas.
Columnas detectadas: ${JSON.stringify(columnTypes.map((c) => ({ nombre: c.name, tipo: c.type, valores_unicos: c.uniqueCount })))}`;

  const raw = await callClaude(systemPrompt, userPrompt, 1200);
  const cleaned = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    return null;
  }
}
