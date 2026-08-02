# Analizador de Obras — Dashboard Dinámico

App web para subir cualquier Excel de control de obras, ver un dashboard
interactivo con KPIs y gráficos generados dinámicamente, y pedir cruces
entre columnas/archivos en lenguaje natural que se resuelven con fórmulas
reales de Excel (BUSCARV, SI.ERROR, SUMAR.SI, etc.), descargables en un
.xlsx editable.

## Cómo correrla en tu compu (para probar antes de publicar)

1. Necesitás tener Node.js instalado (version 18 o más) - nodejs.org
2. Abrí una terminal en esta carpeta y corré:
   npm install
   npm run dev
3. Se abre en http://localhost:5173 . Ahí subís tu Excel y probás todo.
4. La primera vez que uses la pestaña "Cruces con fórmulas (IA)" te va a pedir
   tu API key de Anthropic (la generás gratis en
   console.anthropic.com/settings/keys). Se guarda solo en tu navegador.

## Cómo publicarla con un link propio (Vercel, gratis)

### Paso 1: Subir el código a GitHub
1. Creá una cuenta gratis en github.com si no tenés.
2. Creá un repositorio nuevo (botón verde "New").
3. Subís esta carpeta completa (podés arrastrar los archivos desde la web
   de GitHub, o usar git si lo conocés).

### Paso 2: Conectar con Vercel
1. Creá una cuenta gratis en vercel.com (podés entrar directo con
   tu cuenta de GitHub).
2. Click en "Add New Project".
3. Elegí el repositorio que acabás de subir.
4. Vercel detecta automáticamente que es un proyecto Vite, no toques
   ninguna configuración, solo click en "Deploy".
5. En 1-2 minutos te da un link tipo tu-proyecto.vercel.app que ya
   podés compartir con quien quieras. Cada vez que subas cambios al
   repositorio de GitHub, Vercel actualiza la app sola.

## Notas importantes

- No hay servidor propio ni base de datos. Todo corre en el navegador
  de quien usa la app: lectura de Excel, gráficos, exportación. Es rápido
  y no hay costos de hosting.
- La API key de Anthropic la pone cada usuario, no queda en el código.
  Si vos sos el único que la va a usar, simplemente la cargás vos una vez
  en tu navegador y ahí queda guardada.
- Estructura del proyecto:
  - src/utils/excelReader.js - lee los .xlsx/.csv que subís.
  - src/utils/columnDetector.js - detecta automáticamente qué columnas
    son categorías, estados, fechas o números.
  - src/utils/claudeApi.js - se comunica con la API de Claude para
    sugerir fórmulas y armar el dashboard.
  - src/utils/excelExporter.js - genera el .xlsx final con fórmulas
    reales (no valores calculados).
  - src/components/ - Dashboard, chat de cruces, carga de archivos, etc.
