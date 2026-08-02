// Palabras que sugieren columnas de "estado" de trabajo (finalizado, pendiente, etc.)
const STATUS_HINTS = [
  "estado", "status", "finaliz", "pendient", "cierre", "cerrad",
  "avance", "situacion", "situación", "etapa", "fase",
];

const CATEGORY_HINTS = [
  "sector", "telegest", "zona", "responsable", "region", "región",
  "tipo", "categoria", "categoría", "area", "área", "grupo",
];

function isDateLike(value) {
  if (value instanceof Date) return true;
  if (typeof value === "string") {
    return /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/.test(value.trim());
  }
  return false;
}

function isNumericLike(value) {
  if (typeof value === "number") return true;
  if (typeof value === "string" && value.trim() !== "") {
    return !isNaN(Number(value.replace(/,/g, "")));
  }
  return false;
}

/**
 * Analiza headers + una muestra de filas y clasifica cada columna:
 * 'category' | 'status' | 'date' | 'numeric' | 'text' | 'empty'
 */
export function detectColumnTypes(headers, rows) {
  const sample = rows.slice(0, Math.min(200, rows.length));

  return headers.map((header) => {
    const values = sample.map((r) => r[header]).filter((v) => v !== "" && v !== undefined && v !== null);
    const headerLower = header.toLowerCase();

    if (values.length === 0) {
      return { name: header, type: "empty", uniqueValues: [] };
    }

    const uniqueVals = [...new Set(values.map((v) => String(v).trim()))];
    const uniqueRatio = uniqueVals.length / values.length;

    let type = "text";

    const matchesStatusHint = STATUS_HINTS.some((h) => headerLower.includes(h));
    const matchesCategoryHint = CATEGORY_HINTS.some((h) => headerLower.includes(h));

    const dateCount = values.filter(isDateLike).length;
    const numCount = values.filter(isNumericLike).length;

    if (dateCount / values.length > 0.7) {
      type = "date";
    } else if (numCount / values.length > 0.8 && uniqueRatio > 0.3) {
      type = "numeric";
    } else if (matchesStatusHint || (uniqueVals.length <= 8 && uniqueRatio < 0.5)) {
      // Pocas categorías repetidas => probablemente estado (finalizado/pendiente/etc.)
      type = matchesStatusHint ? "status" : (matchesCategoryHint ? "category" : "status");
    } else if (matchesCategoryHint || (uniqueRatio < 0.6 && uniqueVals.length <= 40)) {
      type = "category";
    }

    return {
      name: header,
      type,
      uniqueValues: uniqueVals.slice(0, 50),
      uniqueCount: uniqueVals.length,
      sampleSize: values.length,
    };
  });
}

/** Devuelve conteos {valor: cantidad} para una columna dada */
export function countByColumn(rows, columnName) {
  const counts = {};
  rows.forEach((r) => {
    const v = String(r[columnName] ?? "").trim() || "(vacío)";
    counts[v] = (counts[v] || 0) + 1;
  });
  return counts;
}

/** Cruce de dos columnas categóricas: tabla de contingencia */
export function crossTab(rows, colA, colB) {
  const table = {};
  rows.forEach((r) => {
    const a = String(r[colA] ?? "").trim() || "(vacío)";
    const b = String(r[colB] ?? "").trim() || "(vacío)";
    if (!table[a]) table[a] = {};
    table[a][b] = (table[a][b] || 0) + 1;
  });
  return table;
}
