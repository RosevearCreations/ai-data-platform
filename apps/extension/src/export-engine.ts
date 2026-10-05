import type { PreparedExport } from "./types";

function safeText(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function sanitizeFilename(value: string) {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);

  return cleaned || "ai-data-export";
}

export function exportFilenameBase(recipeName: string, generatedAt: string) {
  const date = generatedAt.slice(0, 10);
  return sanitizeFilename(`${recipeName} ${date}`);
}

function csvCell(value: unknown) {
  const raw = safeText(value);
  const safe =
    typeof value === "string" && /^[=+\-@]/.test(raw)
      ? `'${raw}`
      : raw;
  const text = safe.replace(/"/g, '""');
  return `"${text}"`;
}

export function buildCsv(exportData: PreparedExport) {
  const headers = exportData.columns.map((column) => csvCell(column.label));
  const lines = [headers.join(",")];

  for (const record of exportData.records) {
    lines.push(
      exportData.columns
        .map((column) => csvCell(record.values[column.key]))
        .join(",")
    );
  }

  return new Blob(["\uFEFF", lines.join("\r\n")], {
    type: "text/csv;charset=utf-8"
  });
}

export function buildJson(exportData: PreparedExport) {
  return new Blob(
    [
      JSON.stringify(
        {
          version: 1,
          generatedAt: exportData.generatedAt,
          recipeName: exportData.recipeName,
          sourceUrl: exportData.sourceUrl,
          valueView: exportData.valueView,
          columns: exportData.columns.filter(
            (column) => !column.key.startsWith("__")
          ),
          records: exportData.records.map((record) => ({
            sourceIndex: record.sourceIndex,
            included: record.included,
            values: Object.fromEntries(
              Object.entries(record.values).filter(
                ([key]) => !key.startsWith("__")
              )
            ),
            ...(exportData.includeWarnings
              ? { warnings: record.warnings }
              : {}),
            ...(exportData.includeSourceEvidence
              ? {
                  sourceEvidence: {
                    sourceUrl: record.sourceUrl,
                    page: record.page,
                    detailUrl: record.detailUrl,
                    detailPageIndex: record.detailPageIndex,
                    detailStatus: record.detailStatus,
                    detailReused: record.detailReused,
                    detailError: record.detailError
                  }
                }
              : {})
          }))
        },
        null,
        2
      )
    ],
    {
      type: "application/json;charset=utf-8"
    }
  );
}

function xmlEscape(value: unknown) {
  return safeText(value)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnName(index: number) {
  let value = index + 1;
  let name = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }

  return name;
}

function worksheetCell(
  reference: string,
  value: string | number | null,
  style = 0
) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${reference}" s="${style}"><v>${value}</v></c>`;
  }

  const text = xmlEscape(value);
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
}

function buildWorksheet(exportData: PreparedExport) {
  const rows: string[] = [];
  const headerCells = exportData.columns
    .map((column, index) =>
      worksheetCell(`${columnName(index)}1`, column.label, 1)
    )
    .join("");

  rows.push(`<row r="1">${headerCells}</row>`);

  exportData.records.forEach((record, rowIndex) => {
    const excelRow = rowIndex + 2;
    const cells = exportData.columns
      .map((column, columnIndex) =>
        worksheetCell(
          `${columnName(columnIndex)}${excelRow}`,
          record.values[column.key]
        )
      )
      .join("");

    rows.push(`<row r="${excelRow}">${cells}</row>`);
  });

  const finalColumn = columnName(Math.max(0, exportData.columns.length - 1));
  const finalRow = Math.max(1, exportData.records.length + 1);
  const dimension =
    exportData.columns.length > 0 ? `A1:${finalColumn}${finalRow}` : "A1";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="${dimension}"/>
  <sheetViews><sheetView workbookViewId="0" tabSelected="1"/></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <sheetData>${rows.join("")}</sheetData>
  ${exportData.columns.length ? `<autoFilter ref="A1:${finalColumn}${finalRow}"/>` : ""}
</worksheet>`;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value =
        value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  return table;
})();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function uint16(value: number) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

function uint32(value: number) {
  return new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff
  ]);
}

function concatBytes(parts: Uint8Array[]) {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

function dosDateTime(date: Date) {
  const year = Math.max(1980, date.getFullYear());

  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2),
    date:
      ((year - 1980) << 9) |
      ((date.getMonth() + 1) << 5) |
      date.getDate()
  };
}

function zipStore(files: Array<{ name: string; content: string }>) {
  const encoder = new TextEncoder();
  const now = dosDateTime(new Date());
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const content = encoder.encode(file.content);
    const checksum = crc32(content);

    const local = concatBytes([
      uint32(0x04034b50),
      uint16(20),
      uint16(0x0800),
      uint16(0),
      uint16(now.time),
      uint16(now.date),
      uint32(checksum),
      uint32(content.length),
      uint32(content.length),
      uint16(name.length),
      uint16(0),
      name,
      content
    ]);

    const central = concatBytes([
      uint32(0x02014b50),
      uint16(20),
      uint16(20),
      uint16(0x0800),
      uint16(0),
      uint16(now.time),
      uint16(now.date),
      uint32(checksum),
      uint32(content.length),
      uint32(content.length),
      uint16(name.length),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(offset),
      name
    ]);

    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }

  const localData = concatBytes(locals);
  const centralData = concatBytes(centrals);
  const end = concatBytes([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(files.length),
    uint16(files.length),
    uint32(centralData.length),
    uint32(localData.length),
    uint16(0)
  ]);

  return concatBytes([localData, centralData, end]);
}

export function buildXlsx(exportData: PreparedExport) {
  const worksheet = buildWorksheet(exportData);
  const files = [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets>
</workbook>`
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
    },
    {
      name: "xl/worksheets/sheet1.xml",
      content: worksheet
    },
    {
      name: "xl/styles.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Aptos"/></font>
    <font><b/><sz val="11"/><name val="Aptos"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`
    },
    {
      name: "docProps/core.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${xmlEscape(exportData.recipeName)}</dc:title>
  <dc:creator>AI Data Platform</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">${xmlEscape(exportData.generatedAt)}</dcterms:created>
</cp:coreProperties>`
    },
    {
      name: "docProps/app.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>AI Data Platform</Application>
</Properties>`
    }
  ];

  const bytes = zipStore(files);

  return new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
