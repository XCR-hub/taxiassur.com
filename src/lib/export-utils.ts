export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: unknown) => string;
}

export class DataExporter {
  static toCSV<T extends Record<string, unknown>>(
    data: T[],
    columns: ExportColumn[],
    filename: string = 'export.csv'
  ): void {
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    const headers = columns.map(col => col.label);
    const rows = data.map(item =>
      columns.map(col => {
        const value = item[col.key];
        const formatted = col.format ? col.format(value) : value;
        const escaped = String(formatted ?? '').replace(/"/g, '""');
        return `"${escaped}"`;
      })
    );

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, filename);
  }

  static toExcel<T extends Record<string, unknown>>(
    data: T[],
    columns: ExportColumn[],
    filename: string = 'export.xlsx',
    sheetName: string = 'Sheet1'
  ): void {
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    const headers = columns.map(col => col.label);
    const rows = data.map(item =>
      columns.map(col => {
        const value = item[col.key];
        return col.format ? col.format(value) : value ?? '';
      })
    );

    const worksheet = this.createWorksheet([headers, ...rows]);
    const workbook = this.createWorkbook({ [sheetName]: worksheet });
    const excelBuffer = this.workbookToArrayBuffer(workbook);

    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    this.downloadBlob(blob, filename);
  }

  static toJSON<T>(data: T[], filename: string = 'export.json'): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    this.downloadBlob(blob, filename);
  }

  static toPDF<T extends Record<string, any>>(
    data: T[],
    columns: ExportColumn[],
    options: {
      title?: string;
      filename?: string;
      orientation?: 'portrait' | 'landscape';
    } = {}
  ): void {
    const {
      title = 'Export',
      filename = 'export.pdf',
      orientation = 'portrait'
    } = options;

    const html = this.createPDFHTML(data, columns, title);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Could not open print window');
    }

    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  private static createPDFHTML<T extends Record<string, any>>(
    data: T[],
    columns: ExportColumn[],
    title: string
  ): string {
    const headers = columns.map(col => `<th class="border p-2 bg-gray-100">${col.label}</th>`).join('');
    const rows = data.map(item => {
      const cells = columns.map(col => {
        const value = item[col.key];
        const formatted = col.format ? col.format(value) : value ?? '';
        return `<td class="border p-2">${formatted}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; }
            @media print {
              body { padding: 0; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <table>
            <thead><tr>${headers}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;
  }

  private static createWorksheet(data: unknown[][]): { data: unknown[][]; cols: Array<{ wch: number }> } {
    return {
      data,
      cols: data[0]?.map(() => ({ wch: 15 })) ?? []
    };
  }

  private static createWorkbook(sheets: Record<string, { data: unknown[][]; cols: Array<{ wch: number }> }>): { SheetNames: string[]; Sheets: typeof sheets } {
    return {
      SheetNames: Object.keys(sheets),
      Sheets: sheets
    };
  }

  private static workbookToArrayBuffer(workbook: { SheetNames: string[]; Sheets: Record<string, { data: unknown[][] }> }): ArrayBuffer {
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

    const workbookXML = `${xmlHeader}
      <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <sheets>
          ${workbook.SheetNames.map((name: string, i: number) =>
            `<sheet name="${name}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
          ).join('')}
        </sheets>
      </workbook>`;

    const worksheetXMLs = workbook.SheetNames.map((name: string) => {
      const sheet = workbook.Sheets[name];
      const rows = sheet.data.map((row: unknown[], rowIndex: number) => {
        const cells = row.map((cell: unknown, colIndex: number) => {
          const cellRef = this.getCellRef(rowIndex, colIndex);
          const value = String(cell ?? '').replace(/[<>&'"]/g, c => {
            const entities: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' };
            return entities[c] || c;
          });
          return `<c r="${cellRef}" t="inlineStr"><is><t>${value}</t></is></c>`;
        }).join('');
        return `<row r="${rowIndex + 1}">${cells}</row>`;
      }).join('');

      return `${xmlHeader}
        <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
          <sheetData>${rows}</sheetData>
        </worksheet>`;
    });

    const zip = this.createZip({
      '[Content_Types].xml': this.getContentTypesXML(workbook.SheetNames.length),
      '_rels/.rels': this.getRelsXML(),
      'xl/workbook.xml': workbookXML,
      'xl/_rels/workbook.xml.rels': this.getWorkbookRelsXML(workbook.SheetNames.length),
      ...Object.fromEntries(
        worksheetXMLs.map((xml: string, i: number) => [`xl/worksheets/sheet${i + 1}.xml`, xml])
      )
    });

    return zip;
  }

  private static getCellRef(row: number, col: number): string {
    let colName = '';
    let colNum = col;
    while (colNum >= 0) {
      colName = String.fromCharCode(65 + (colNum % 26)) + colName;
      colNum = Math.floor(colNum / 26) - 1;
    }
    return `${colName}${row + 1}`;
  }

  private static getContentTypesXML(sheetCount: number): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
        ${Array.from({ length: sheetCount }, (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
        ).join('')}
      </Types>`;
  }

  private static getRelsXML(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
      </Relationships>`;
  }

  private static getWorkbookRelsXML(sheetCount: number): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        ${Array.from({ length: sheetCount }, (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
        ).join('')}
      </Relationships>`;
  }

  private static createZip(files: Record<string, string>): ArrayBuffer {
    const encoder = new TextEncoder();
    const fileData: Array<{ name: string; data: Uint8Array }> = [];
    let centralDirectory = '';
    let offset = 0;

    Object.entries(files).forEach(([filename, content]) => {
      const data = encoder.encode(content);
      const crc = this.crc32(data);

      const localHeader = this.createLocalFileHeader(filename, data.length, crc);
      fileData.push({ name: filename, data: new Uint8Array([...localHeader, ...data]) });

      centralDirectory += this.createCentralDirectoryHeader(filename, data.length, crc, offset);
      offset += localHeader.length + data.length;
    });

    const centralDirData = encoder.encode(centralDirectory);
    const endOfCentralDir = this.createEndOfCentralDirectory(fileData.length, centralDirData.length, offset);

    const totalSize = offset + centralDirData.length + endOfCentralDir.length;
    const result = new Uint8Array(totalSize);

    let position = 0;
    fileData.forEach(file => {
      result.set(file.data, position);
      position += file.data.length;
    });
    result.set(centralDirData, position);
    result.set(endOfCentralDir, position + centralDirData.length);

    return result.buffer;
  }

  private static createLocalFileHeader(filename: string, size: number, crc: number): Uint8Array {
    const encoder = new TextEncoder();
    const filenameBytes = encoder.encode(filename);
    const header = new Uint8Array(30 + filenameBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(8, 0, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, size, true);
    view.setUint32(22, size, true);
    view.setUint16(26, filenameBytes.length, true);
    header.set(filenameBytes, 30);

    return header;
  }

  private static createCentralDirectoryHeader(filename: string, size: number, crc: number, offset: number): string {
    const encoder = new TextEncoder();
    const filenameBytes = encoder.encode(filename);
    const header = new Uint8Array(46 + filenameBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint32(16, crc, true);
    view.setUint32(20, size, true);
    view.setUint32(24, size, true);
    view.setUint16(28, filenameBytes.length, true);
    view.setUint32(42, offset, true);
    header.set(filenameBytes, 46);

    return String.fromCharCode(...header);
  }

  private static createEndOfCentralDirectory(fileCount: number, centralDirSize: number, centralDirOffset: number): Uint8Array {
    const header = new Uint8Array(22);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x06054b50, true);
    view.setUint16(8, fileCount, true);
    view.setUint16(10, fileCount, true);
    view.setUint32(12, centralDirSize, true);
    view.setUint32(16, centralDirOffset, true);

    return header;
  }

  private static crc32(data: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  private static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
