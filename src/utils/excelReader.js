import * as XLSX from "xlsx";

/**
 * Lee TODAS las hojas de un Excel. Devuelve headers/rows de la hoja con
 * más filas de datos por defecto (evita el bug de quedarse con la primera
 * hoja si esa no es la que tiene los datos reales), pero deja disponibles
 * todas las hojas para que el usuario pueda cambiar.
 */
export async function readExcelFile(file, forcedSheetName) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const sheetsParsed = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    const nonEmptyRows = raw.filter((r) => r.some((cell) => cell !== "" && cell !== undefined && cell !== null));
    return { name, raw, rowCount: nonEmptyRows.length };
  });

  // Elegir automáticamente la hoja con más filas de datos (no siempre es la primera)
  const bestSheet = forcedSheetName
    ? sheetsParsed.find((s) => s.name === forcedSheetName) || sheetsParsed[0]
    : sheetsParsed.reduce((best, s) => (s.rowCount > best.rowCount ? s : best), sheetsParsed[0]);

  const headers = (bestSheet.raw[0] || []).map((h, i) =>
    h === "" || h === undefined ? `Columna ${indexToLetter(i)}` : String(h).trim()
  );

  const rows = bestSheet.raw.slice(1)
    .filter((r) => r.some((cell) => cell !== "" && cell !== undefined && cell !== null))
    .map((r) => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = r[i] !== undefined ? r[i] : "";
      });
      return obj;
    });

  return {
    fileName: file.name,
    sheetName: bestSheet.name,
    sheetNames: workbook.SheetNames,
    sheetRowCounts: Object.fromEntries(sheetsParsed.map((s) => [s.name, s.rowCount])),
    headers,
    rows,
    raw: bestSheet.raw,
    _file: file, // se guarda para poder re-leer con otra hoja si el usuario la cambia
  };
}

export function indexToLetter(index) {
  let letter = "";
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

export function letterToIndex(letter) {
  let result = 0;
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + (letter.charCodeAt(i) - 64);
  }
  return result - 1;
}
