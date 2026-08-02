import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { indexToLetter } from "./excelReader";

/**
 * Exporta un Excel con los datos originales + una columna nueva con
 * la fórmula real de Excel aplicada fila por fila (no valores calculados).
 *
 * formulaTemplate usa {ROW} como placeholder de número de fila,
 * ej: "=SI.ERROR(BUSCARV(A{ROW},Hoja2!A:C,3,FALSO),\"Sin coincidencia\")"
 */
export async function exportWithFormula({
  headers,
  rows,
  formulaTemplate,
  newColumnName,
  fileName = "resultado_analisis.xlsx",
  secondSheetHeaders,
  secondSheetRows,
  secondSheetName = "Hoja2",
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Dashboard de Obras";
  workbook.created = new Date();

  const sheet1 = workbook.addWorksheet("Hoja1");

  const allHeaders = [...headers, newColumnName];
  sheet1.addRow(allHeaders);
  sheet1.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet1.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F2540" },
  };

  rows.forEach((r, i) => {
    const excelRow = i + 2; // fila 1 es header
    const rowValues = headers.map((h) => r[h] ?? "");
    const formula = formulaTemplate.replace(/\{ROW\}/g, excelRow);
    const row = sheet1.addRow([...rowValues, { formula }]);
  });

  sheet1.columns.forEach((col) => {
    col.width = 18;
  });
  sheet1.autoFilter = {
    from: "A1",
    to: `${indexToLetter(allHeaders.length - 1)}1`,
  };
  sheet1.views = [{ state: "frozen", ySplit: 1 }];

  if (secondSheetHeaders && secondSheetRows) {
    const sheet2 = workbook.addWorksheet(secondSheetName);
    sheet2.addRow(secondSheetHeaders);
    sheet2.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet2.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8823A" },
    };
    secondSheetRows.forEach((r) => {
      sheet2.addRow(secondSheetHeaders.map((h) => r[h] ?? ""));
    });
    sheet2.columns.forEach((col) => {
      col.width = 18;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
}

/**
 * Exporta un Excel simple (sin fórmulas) a partir de headers + rows,
 * útil para exportar el dashboard filtrado tal cual se ve.
 */
export async function exportSimple({ headers, rows, fileName = "datos_exportados.xlsx" }) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Datos");
  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F2540" },
  };
  rows.forEach((r) => sheet.addRow(headers.map((h) => r[h] ?? "")));
  sheet.columns.forEach((c) => (c.width = 18));
  sheet.autoFilter = { from: "A1", to: `${indexToLetter(headers.length - 1)}1` };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
}
