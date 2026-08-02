import * as XLSX from "xlsx";

/**
 * Lee un archivo Excel y devuelve un objeto con:
 * - headers: nombres de columnas (fila 1)
 * - rows: array de objetos { columna: valor }
 * - sheetName: nombre de la hoja usada
 * - raw: matriz cruda (para casos donde headers no están en fila 1)
 */
export async function readExcelFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const headers = (raw[0] || []).map((h, i) =>
    h === "" || h === undefined ? `Columna ${indexToLetter(i)}` : String(h).trim()
  );

  const rows = raw.slice(1)
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
    sheetName,
    sheetNames: workbook.SheetNames,
    headers,
    rows,
    raw,
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
