import ExcelJS from 'exceljs';

export type XlsxColumn<T> = {
  header: string;
  key: keyof T & string;
  width?: number;
  format?: string; // Excel number format, e.g. '#,##0.00' or 'dd/mm/yyyy'
};

export type BuildXlsxOpts<T> = {
  sheetName: string;
  columns: XlsxColumn<T>[];
  rows: T[];
  title?: string;
  subtitle?: string;
};

/**
 * Builds an XLSX workbook and returns a NextResponse-compatible Buffer with
 * appropriate MIME headers. Works in Node runtime (Next.js route handlers).
 */
export async function buildXlsx<T extends Record<string, unknown>>(
  opts: BuildXlsxOpts<T>,
): Promise<{ body: Buffer; mime: string; filename: string }> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'UpCore HR';
  wb.created = new Date();
  const ws = wb.addWorksheet(opts.sheetName, {
    views: [{ state: 'frozen', ySplit: opts.title ? 3 : 1 }],
  });

  let rowOffset = 1;
  if (opts.title) {
    ws.mergeCells(1, 1, 1, opts.columns.length);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = opts.title;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'left' };
    rowOffset++;
  }
  if (opts.subtitle) {
    ws.mergeCells(rowOffset, 1, rowOffset, opts.columns.length);
    const sub = ws.getCell(rowOffset, 1);
    sub.value = opts.subtitle;
    sub.font = { italic: true, size: 10, color: { argb: 'FF737373' } };
    rowOffset++;
  }

  // Header row
  const header = ws.getRow(rowOffset);
  opts.columns.forEach((col, i) => {
    const cell = header.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5F5F5' },
    };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    };
  });
  header.height = 20;

  opts.columns.forEach((col, i) => {
    if (col.width) ws.getColumn(i + 1).width = col.width;
    else ws.getColumn(i + 1).width = Math.max(12, col.header.length + 2);
  });

  // Data rows
  opts.rows.forEach((r, idx) => {
    const row = ws.getRow(rowOffset + 1 + idx);
    opts.columns.forEach((col, i) => {
      const cell = row.getCell(i + 1);
      const v = r[col.key];
      if (v instanceof Date) cell.value = v;
      else if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean')
        cell.value = v;
      else if (v == null) cell.value = null;
      else cell.value = String(v);
      if (col.format) cell.numFmt = col.format;
    });
  });

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return {
    body: Buffer.from(arrayBuffer),
    mime:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `${opts.sheetName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.xlsx`,
  };
}
