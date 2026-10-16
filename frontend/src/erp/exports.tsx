import { createElement, useEffect, useRef, useState } from "react";
import { ChevronDown, FileSpreadsheet, FileText } from "lucide-react";
import { today } from "./model";
import { toast } from "./toast";
import { enterpriseCloudLogoUrl } from "./brand-logo";

export type ExportValue = string | number | boolean | null | undefined;

export type ExportProfile =
  | "dashboard"
  | "report"
  | "document"
  | "quote"
  | "account"
  | "kardex"
  | "catalog";

export type ExportSummary = {
  label: string;
  value: ExportValue;
};

export type ExportMeta = {
  label: string;
  value: ExportValue;
};

export type ExportCompany = {
  name: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
};

export type ExportSection = {
  title: string;
  description?: string;
  items: { label: string; value: ExportValue; detail?: string }[];
};

export type ExportChart = {
  type: "donut" | "bars";
  title: string;
  data: { label: string; value: number }[];
};

export type ExportData = {
  name: string;
  title: string;
  headers: string[];
  rows: ExportValue[][];
  profile?: ExportProfile;
  subtitle?: string;
  summary?: ExportSummary[];
  sections?: ExportSection[];
  charts?: ExportChart[];
  meta?: ExportMeta[];
  company?: ExportCompany;
  documentType?: string;
  documentNumber?: string;
  notes?: string;
  terms?: string;
};

const cleanName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const downloadBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const displayValue = (value: ExportValue) =>
  value === null || value === undefined ? "" : String(value);

const readImageAsDataUri = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("No se pudo cargar el logo.");
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo preparar el logo."));
    reader.readAsDataURL(blob);
  });
};

const defaultCompany: ExportCompany = {
  name: "EnterpriseCloud S.A.C.",
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "EC";

const escapeXml = (value: string) =>
  value.replace(
    /[<>&'\"]/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[character] ?? character,
  );

const createChartImage = async (
  rows: ExportValue[][],
  charts?: ExportChart[],
) => {
  const chart = charts?.[0];
  const numeric = chart?.data?.length
    ? chart.data.slice(0, 6)
    : rows
        .map((row) => {
          const value = row.find(
            (cell) => typeof cell === "number" && Number.isFinite(cell),
          );
          return {
            label: displayValue(row[1] ?? row[0]) || "Registro",
            value: typeof value === "number" ? value : null,
          };
        })
        .filter(
          (item): item is { label: string; value: number } => item.value !== null,
        )
        .slice(0, 6);
  if (numeric.length < 2) return null;
  const width = 640;
  const rowHeight = 34;
  const height = 70 + numeric.length * rowHeight;
  const max = Math.max(...numeric.map((item) => Math.abs(item.value)), 1);
  const bars = numeric
    .map((item, index) => {
      const y = 46 + index * rowHeight;
      const barWidth = Math.max(4, (Math.abs(item.value) / max) * 360);
      return `<text x="16" y="${y + 15}" font-family="Arial" font-size="14" fill="#4E595C">${escapeXml(item.label.slice(0, 34))}</text><rect x="240" y="${y}" width="${barWidth}" height="20" rx="4" fill="#263238"/><text x="${250 + barWidth}" y="${y + 15}" font-family="Arial" font-size="13" fill="#141313">${escapeXml(String(item.value))}</text>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#FFFFFF"/><text x="16" y="25" font-family="Arial" font-size="16" font-weight="700" fill="#263238">${escapeXml(chart?.title ?? "Resumen visual")}</text>${bars}</svg>`;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const image = new window.Image();
  const objectUrl = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("No se pudo generar el gráfico."));
      image.src = objectUrl;
    });
    context.drawImage(image, 0, 0);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const profileConfig: Record<
  ExportProfile,
  { accent: string; soft: string; orientation: "portrait" | "landscape" }
> = {
  dashboard: {
    accent: "263238",
    soft: "F3F5F5",
    orientation: "portrait",
  },
  report: {
    accent: "263238",
    soft: "F3F5F5",
    orientation: "landscape",
  },
  document: {
    accent: "263238",
    soft: "F3F5F5",
    orientation: "portrait",
  },
  quote: {
    accent: "263238",
    soft: "F3F5F5",
    orientation: "portrait",
  },
  account: {
    accent: "263238",
    soft: "F3F5F5",
    orientation: "landscape",
  },
  kardex: {
    accent: "263238",
    soft: "F3F5F5",
    orientation: "landscape",
  },
  catalog: {
    accent: "263238",
    soft: "F3F5F5",
    orientation: "landscape",
  },
};

const getConfig = (profile: ExportProfile = "catalog") =>
  profileConfig[profile];

const addExcelSummary = (
  worksheet: any,
  summary: ExportSummary[] | undefined,
  startRow: number,
  accent: string,
  soft: string,
) => {
  if (!summary?.length) return startRow;
  worksheet.getCell(`A${startRow}`).value = "Indicadores del reporte";
  worksheet.getCell(`A${startRow}`).font = {
    bold: true,
    color: { argb: "FF" + accent },
  };
  worksheet.getCell(`A${startRow}`).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF" + soft },
  };
  worksheet.mergeCells(startRow, 1, startRow, 2);
  summary.forEach((item, index) => {
    const row = startRow + 1 + index;
    worksheet.getCell(`A${row}`).value = item.label;
    worksheet.getCell(`B${row}`).value = item.value ?? "";
    worksheet.getCell(`A${row}`).font = {
      bold: true,
      color: { argb: "FF687174" },
    };
    worksheet.getCell(`A${row}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF7F9FA" },
    };
  });
  return startRow + 1 + summary.length + 1;
};

const addExcelMeta = (
  worksheet: any,
  meta: ExportMeta[] | undefined,
  startRow: number,
) => {
  if (!meta?.length) return startRow;
  meta.forEach((item, index) => {
    const row = startRow + index;
    worksheet.getCell(`D${row}`).value = item.label;
    worksheet.getCell(`E${row}`).value = item.value ?? "";
    worksheet.getCell(`D${row}`).font = {
      bold: true,
      color: { argb: "FF687174" },
    };
  });
  return startRow + meta.length;
};

export async function exportExcel(data: ExportData) {
  const { name, title, headers, rows, profile = "catalog" } = data;
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "EnterpriseCloud ERP";
  workbook.created = new Date();
  workbook.modified = new Date();
  const config = getConfig(profile);
  const worksheetName =
    title
      .replace(/[\\/*?:[\]]/g, " ")
      .trim()
      .slice(0, 24) || "Reporte";
  const worksheet = workbook.addWorksheet(worksheetName);
  const safeHeaders = headers.map(
    (header, index) => header || `Columna ${index + 1}`,
  );

  worksheet.mergeCells(1, 1, 1, Math.max(2, safeHeaders.length));
  worksheet.getCell("A1").value = title;
  worksheet.getCell("A1").font = {
    bold: true,
    size: 16,
    color: { argb: "FF" + config.accent },
  };
  worksheet.getCell("A1").alignment = { vertical: "middle" };
  worksheet.getRow(1).height = 28;
  worksheet.mergeCells(2, 1, 2, Math.max(2, safeHeaders.length));
  worksheet.getCell("A2").value =
    data.subtitle || "Exportación analítica de EnterpriseCloud ERP";
  worksheet.getCell("A2").font = { italic: true, color: { argb: "FF687174" } };
  worksheet.mergeCells(3, 1, 3, Math.max(2, safeHeaders.length));
  worksheet.getCell("A3").value =
    `Generado el ${new Date().toLocaleString("es-PE")}`;
  worksheet.getCell("A3").font = { size: 9, color: { argb: "FF687174" } };

  const summaryEnd = addExcelSummary(
    worksheet,
    data.summary,
    5,
    config.accent,
    config.soft,
  );
  const metaEnd = addExcelMeta(worksheet, data.meta, 5);
  const tableStart = Math.max(5, summaryEnd, metaEnd) + 1;

  const header = worksheet.getRow(tableStart);
  safeHeaders.forEach((headerName, index) => {
    header.getCell(index + 1).value = headerName;
  });
  const headerRow = tableStart;
  rows.forEach((row) => worksheet.addRow(row.map((value) => value ?? "")));
  worksheet.views = [{ state: "frozen", ySplit: headerRow }];
  worksheet.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: {
      row: Math.max(headerRow, rows.length + headerRow),
      column: safeHeaders.length,
    },
  };

  header.height = 24;
  header.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF" + config.accent },
  };
  header.alignment = { vertical: "middle", horizontal: "left" };
  header.eachCell((cell) => {
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF444748" } },
    };
  });

  safeHeaders.forEach((headerName, index) => {
    const values = rows.map((row) => displayValue(row[index]));
    const width = Math.min(
      38,
      Math.max(
        12,
        headerName.length + 2,
        ...values.slice(0, 100).map((value) => Math.min(34, value.length + 2)),
      ),
    );
    worksheet.getColumn(index + 1).width = width;
    if (
      /importe|total|saldo|pagado|precio|costo|monto|cantidad|valor|crédito|unidades/i.test(
        headerName,
      )
    ) {
      worksheet.getColumn(index + 1).numFmt = "#,##0.00";
    }
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > headerRow && (rowNumber - headerRow) % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF" + config.soft },
        };
      });
    }
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", wrapText: true };
    });
  });

  worksheet.pageSetup = {
    orientation: config.orientation,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    horizontalDpi: 300,
    verticalDpi: 300,
  };
  worksheet.headerFooter.oddFooter = "&LEnterpriseCloud ERP&C&P de &N";

  try {
    const logoData = await readImageAsDataUri(enterpriseCloudLogoUrl);
    const logoId = workbook.addImage({
      base64: logoData,
      extension: "png",
    });
    worksheet.addImage(logoId, {
      tl: { col: Math.max(0, safeHeaders.length + 1), row: 0 },
      ext: { width: 150, height: 82 },
    });
  } catch {
    // El contenido del Excel sigue siendo válido aunque el logo no cargue.
  }

  if (["dashboard", "report", "account"].includes(profile)) {
    let chartData: string | null = null;
    try {
      chartData = await createChartImage(rows, data.charts);
    } catch {
      chartData = null;
    }
    if (chartData) {
      const imageId = workbook.addImage({
        base64: chartData,
        extension: "png",
      });
      worksheet.addImage(imageId, {
        tl: { col: Math.max(0, safeHeaders.length + 1), row: 4 },
        ext: { width: 480, height: 230 },
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `enterprisecloud-${cleanName(name)}-${today()}.xlsx`,
  );
}

async function exportPdfLegacy(data: ExportData) {
  const renderer = await import("@react-pdf/renderer");
  const profile = data.profile ?? "catalog";
  const config = getConfig(profile);
  const isDocument = profile === "document" || profile === "quote";
  const styles = renderer.StyleSheet.create({
    page: {
      padding: 28,
      fontFamily: "Helvetica",
      color: "#141313",
      fontSize: 8,
    },
    heading: {
      marginBottom: 16,
      paddingBottom: 10,
      borderBottom: `1 solid #${config.accent}`,
    },
    title: {
      fontSize: isDocument ? 20 : 18,
      fontFamily: "Helvetica-Bold",
      marginBottom: 5,
    },
    subtitle: { fontSize: 9, color: "#4E595C", marginBottom: 5 },
    generated: { fontSize: 8, color: "#687174" },
    metaGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
    metaItem: { width: "50%", paddingRight: 12, marginBottom: 6 },
    metaLabel: { fontSize: 7, color: "#687174", marginBottom: 2 },
    metaValue: { fontFamily: "Helvetica-Bold", fontSize: 9 },
    summary: { flexDirection: "row", marginBottom: 14 },
    summaryCard: {
      flexGrow: 1,
      flexBasis: 0,
      backgroundColor: `#${config.soft}`,
      padding: 8,
      marginRight: 6,
      minHeight: 38,
    },
    summaryLabel: { fontSize: 7, color: "#687174", marginBottom: 3 },
    summaryValue: { fontFamily: "Helvetica-Bold", fontSize: 11 },
    table: { width: "100%" },
    header: {
      flexDirection: "row",
      backgroundColor: `#${config.accent}`,
      color: "#ffffff",
      minHeight: 24,
      alignItems: "center",
    },
    row: {
      flexDirection: "row",
      minHeight: 22,
      alignItems: "center",
      borderBottom: "0.5 solid #d9ddde",
    },
    striped: { backgroundColor: "#f5f7f8" },
    cell: { padding: 5, flexGrow: 1, flexBasis: 0 },
    headerCell: {
      fontFamily: "Helvetica-Bold",
      padding: 5,
      flexGrow: 1,
      flexBasis: 0,
    },
    footer: { marginTop: 14, color: "#687174", fontSize: 7 },
    totalBox: {
      alignSelf: "flex-end",
      marginTop: 14,
      padding: 9,
      backgroundColor: `#${config.soft}`,
      minWidth: 150,
    },
    totalLabel: { color: "#687174", fontSize: 8, marginBottom: 3 },
    totalValue: { fontFamily: "Helvetica-Bold", fontSize: 13 },
  });
  const width = `${100 / Math.max(1, data.headers.length)}%`;
  const { Document, Page, Text, View } = renderer;
  const table = createElement(
    View,
    { style: styles.table },
    createElement(
      View,
      { style: styles.header, fixed: true },
      data.headers.map((header, index) =>
        createElement(
          Text,
          { key: `header-${index}`, style: { ...styles.headerCell, width } },
          header || `Columna ${index + 1}`,
        ),
      ),
    ),
    data.rows.map((row, rowIndex) =>
      createElement(
        View,
        {
          key: `row-${rowIndex}`,
          style: { ...styles.row, ...(rowIndex % 2 ? styles.striped : {}) },
          wrap: false,
        },
        data.headers.map((_, columnIndex) =>
          createElement(
            Text,
            {
              key: `cell-${rowIndex}-${columnIndex}`,
              style: { ...styles.cell, width },
            },
            displayValue(row[columnIndex]),
          ),
        ),
      ),
    ),
  );
  const document = createElement(
    Document,
    { title: data.title, author: "EnterpriseCloud ERP" },
    createElement(
      Page,
      {
        size: "A4",
        orientation: config.orientation,
        style: styles.page,
        wrap: true,
      },
      createElement(
        View,
        { style: styles.heading },
        createElement(Text, { style: styles.title }, data.title),
        data.subtitle &&
          createElement(Text, { style: styles.subtitle }, data.subtitle),
        createElement(
          Text,
          { style: styles.generated },
          `Generado el ${new Date().toLocaleString("es-PE")}`,
        ),
      ),
      data.meta?.length &&
        createElement(
          View,
          { style: styles.metaGrid },
          data.meta.map((item) =>
            createElement(
              View,
              { key: item.label, style: styles.metaItem },
              createElement(Text, { style: styles.metaLabel }, item.label),
              createElement(
                Text,
                { style: styles.metaValue },
                displayValue(item.value),
              ),
            ),
          ),
        ),
      data.summary?.length &&
        createElement(
          View,
          { style: styles.summary },
          data.summary.map((item) =>
            createElement(
              View,
              { key: item.label, style: styles.summaryCard },
              createElement(Text, { style: styles.summaryLabel }, item.label),
              createElement(
                Text,
                { style: styles.summaryValue },
                displayValue(item.value),
              ),
            ),
          ),
        ),
      table,
      isDocument && data.summary?.length
        ? createElement(
            View,
            { style: styles.totalBox },
            createElement(
              Text,
              { style: styles.totalLabel },
              "Resumen del documento",
            ),
            createElement(
              Text,
              { style: styles.totalValue },
              displayValue(data.summary[data.summary.length - 1]?.value),
            ),
          )
        : null,
      createElement(
        Text,
        { style: styles.footer, fixed: true },
        "EnterpriseCloud ERP · Documento generado desde el sistema",
      ),
    ),
  );
  const blob = await renderer.pdf(document).toBlob();
  downloadBlob(blob, `enterprisecloud-${cleanName(data.name)}-${today()}.pdf`);
}

export async function exportPdf(data: ExportData) {
  const renderer = await import("@react-pdf/renderer");
  const profile = data.profile ?? "catalog";
  const config = getConfig(profile);
  const company = data.company ?? defaultCompany;
  const commercial = profile === "document" || profile === "quote";
  const { Document, Page, Text, View, Image, Svg, Circle } = renderer;
  const styles = renderer.StyleSheet.create({
    page: {
      padding: 34,
      fontFamily: "Helvetica",
      fontSize: 8.5,
      color: "#141313",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingBottom: 14,
      marginBottom: 18,
      borderBottom: `1.5 solid #${config.accent}`,
    },
    brand: { flexDirection: "row", alignItems: "center", maxWidth: "62%" },
    logo: { width: 42, height: 42, marginRight: 10, objectFit: "contain" },
    logoFallback: {
      width: 42,
      height: 42,
      marginRight: 10,
      backgroundColor: `#${config.accent}`,
      color: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Helvetica-Bold",
      fontSize: 13,
    },
    companyName: {
      fontFamily: "Helvetica-Bold",
      fontSize: 14,
      marginBottom: 3,
    },
    companyDetails: { color: "#687174", fontSize: 7.5, lineHeight: 1.35 },
    documentBox: {
      minWidth: 155,
      border: `1 solid #${config.accent}`,
      padding: 9,
      alignItems: "center",
    },
    documentLabel: {
      color: `#${config.accent}`,
      fontFamily: "Helvetica-Bold",
      fontSize: 9,
      textAlign: "center",
      marginBottom: 4,
    },
    documentNumber: { fontFamily: "Helvetica-Bold", fontSize: 12 },
    documentDate: { color: "#687174", fontSize: 7.5, marginTop: 4 },
    heading: { marginBottom: 14 },
    title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
    subtitle: { fontSize: 9, color: "#4E595C", marginBottom: 5 },
    generated: { fontSize: 7.5, color: "#687174" },
    section: {
      fontFamily: "Helvetica-Bold",
      fontSize: 9,
      color: `#${config.accent}`,
      marginBottom: 7,
      marginTop: 4,
    },
    infoPanel: {
      flexDirection: "row",
      flexWrap: "wrap",
      border: "1 solid #D9DDDE",
      padding: 10,
      marginBottom: 16,
    },
    infoItem: { width: "50%", paddingRight: 12, marginBottom: 8 },
    infoLabel: { fontSize: 7, color: "#687174", marginBottom: 2 },
    infoValue: { fontFamily: "Helvetica-Bold", fontSize: 8.5 },
    summary: { flexDirection: "row", marginBottom: 16 },
    summaryCard: {
      flexGrow: 1,
      flexBasis: 0,
      backgroundColor: `#${config.soft}`,
      padding: 9,
      marginRight: 7,
      minHeight: 46,
    },
    summaryLabel: { fontSize: 7, color: "#687174", marginBottom: 4 },
    summaryValue: { fontFamily: "Helvetica-Bold", fontSize: 11 },
    executiveSummary: { marginBottom: 16 },
    executiveRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 8,
      borderBottom: "0.5 solid #D9DDDE",
    },
    executiveLabel: { color: "#4E595C", fontSize: 9 },
    executiveValue: { fontFamily: "Helvetica-Bold", fontSize: 9 },
    narrative: {
      marginBottom: 18,
      paddingLeft: 10,
      borderLeft: `2 solid #${config.accent}`,
    },
    executiveSections: { marginTop: 2 },
    executiveSection: { marginBottom: 16 },
    executiveHeading: {
      fontFamily: "Helvetica-Bold",
      fontSize: 10,
      marginBottom: 3,
    },
    executiveDescription: {
      color: "#687174",
      fontSize: 7.5,
      marginBottom: 5,
    },
    executiveItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderBottom: "0.5 solid #D9DDDE",
      paddingVertical: 6,
    },
    executiveItemLabel: { fontSize: 8.5, maxWidth: "46%" },
    executiveItemValue: { fontFamily: "Helvetica-Bold", fontSize: 8.5 },
    executiveItemDetail: {
      color: "#687174",
      fontSize: 7,
      marginTop: 2,
      maxWidth: "62%",
    },
    chartRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 11,
    },
    chartPanel: {
      width: "31.5%",
      minHeight: 126,
      paddingBottom: 6,
      borderBottom: "0.75 solid #D9DDDE",
    },
    chartTitle: {
      fontFamily: "Helvetica-Bold",
      fontSize: 8,
      marginBottom: 6,
      color: `#${config.accent}`,
    },
    donutLayout: { flexDirection: "row", alignItems: "center" },
    donutLegend: { marginLeft: 4, flexGrow: 1 },
    legendRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
    legendSwatch: { width: 6, height: 6, marginRight: 4 },
    legendText: { fontSize: 6.5, color: "#4E595C" },
    barRow: { marginBottom: 8 },
    barMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 3,
    },
    barLabel: { fontSize: 7, color: "#4E595C" },
    barValue: { fontSize: 7, fontFamily: "Helvetica-Bold" },
    barTrack: { height: 7, backgroundColor: "#E4E8E9" },
    barFill: { height: 7, backgroundColor: `#${config.accent}` },
    dashboardSectionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    dashboardSection: { width: "48.5%", marginBottom: 8 },
    dashboardHeading: { fontSize: 8.5, marginBottom: 3 },
    dashboardItem: { paddingVertical: 3.5 },
    dashboardItemLabel: { fontSize: 7.5, maxWidth: "58%" },
    dashboardItemValue: { fontSize: 7.5 },
    dashboardItemDetail: { fontSize: 6.5, maxWidth: "68%" },
    table: { width: "100%" },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: `#${config.accent}`,
      color: "#FFFFFF",
      minHeight: 25,
      alignItems: "center",
    },
    tableRow: {
      flexDirection: "row",
      minHeight: 24,
      alignItems: "center",
      borderBottom: "0.5 solid #D9DDDE",
    },
    striped: { backgroundColor: "#F7F9FA" },
    cell: { padding: 6, flexGrow: 1, flexBasis: 0 },
    headerCell: {
      padding: 6,
      flexGrow: 1,
      flexBasis: 0,
      fontFamily: "Helvetica-Bold",
      fontSize: 7.5,
    },
    totals: {
      alignSelf: "flex-end",
      width: "44%",
      marginTop: 14,
      borderTop: `1 solid #${config.accent}`,
      paddingTop: 7,
    },
    totalLine: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 5,
    },
    totalLabel: { color: "#687174" },
    grandTotal: {
      flexDirection: "row",
      justifyContent: "space-between",
      backgroundColor: `#${config.soft}`,
      padding: 8,
      marginTop: 4,
      fontFamily: "Helvetica-Bold",
      fontSize: 11,
    },
    note: {
      marginTop: 16,
      padding: 9,
      backgroundColor: "#F7F9FA",
      borderLeft: `3 solid #${config.accent}`,
    },
    noteTitle: { fontFamily: "Helvetica-Bold", marginBottom: 4 },
    noteText: { color: "#4E595C", lineHeight: 1.35 },
    legal: {
      marginTop: 18,
      paddingTop: 8,
      borderTop: "0.5 solid #D9DDDE",
      color: "#687174",
      fontSize: 7,
      lineHeight: 1.3,
    },
    footer: { marginTop: 16, color: "#687174", fontSize: 7 },
  });

  const details = [
    company.taxId && `RUC ${company.taxId}`,
    company.address,
    [company.phone, company.email].filter(Boolean).join(" · "),
    company.website,
  ]
    .filter(Boolean)
    .join(" · ");
  const documentLabel =
    data.documentType ??
    (profile === "account"
      ? "ESTADO DE CUENTA"
      : profile === "report"
        ? "REPORTE EMPRESARIAL"
        : data.title.toUpperCase());
  const logo = createElement(Image, {
    src: company.logoUrl || enterpriseCloudLogoUrl,
    style: styles.logo,
  });
  const companyHeader = createElement(
    View,
    { style: styles.header },
    createElement(
      View,
      { style: styles.brand },
      logo,
      createElement(
        View,
        null,
        createElement(Text, { style: styles.companyName }, company.name),
        details &&
          createElement(Text, { style: styles.companyDetails }, details),
      ),
    ),
    createElement(
      View,
      { style: styles.documentBox },
      createElement(Text, { style: styles.documentLabel }, documentLabel),
      data.documentNumber &&
        createElement(
          Text,
          { style: styles.documentNumber },
          data.documentNumber,
        ),
      createElement(
        Text,
        { style: styles.documentDate },
        `Emisión: ${new Date().toLocaleDateString("es-PE")}`,
      ),
    ),
  );

  const infoPanel = data.meta?.length
    ? createElement(
        View,
        { style: styles.infoPanel },
        data.meta.map((item) =>
          createElement(
            View,
            { key: item.label, style: styles.infoItem },
            createElement(Text, { style: styles.infoLabel }, item.label),
            createElement(
              Text,
              { style: styles.infoValue },
              displayValue(item.value),
            ),
          ),
        ),
      )
    : null;
  const summary = null;
  const narrative =
    profile === "dashboard"
      ? createElement(
          View,
          { style: styles.narrative },
          createElement(Text, { style: styles.section }, "Lectura ejecutiva"),
          createElement(
            Text,
            { style: styles.noteText },
            "Vista consolidada de la operación comercial, cartera e inventario registrada al momento de emitir este informe.",
          ),
        )
      : null;
  const chartValue = (value: number) =>
    value.toLocaleString("es-PE", {
      maximumFractionDigits: 0,
    });
  const chartColors = ["#263238", "#687174", "#AEB7BA", "#D9DDDE"];
  const renderDonut = (chart: ExportChart) => {
    const values = chart.data.map((item) => Math.max(0, item.value));
    const total = values.reduce((sum, value) => sum + value, 0);
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    return createElement(
      View,
      { style: styles.donutLayout },
      createElement(
        Svg,
        { width: 68, height: 68, viewBox: "0 0 68 68" },
        createElement(Circle, {
          cx: 34,
          cy: 34,
          r: radius,
          fill: "none",
          stroke: "#E4E8E9",
          strokeWidth: 10,
        }),
        ...chart.data.map((item, index) => {
          const length = total ? (values[index] / total) * circumference : 0;
          const segmentOffset = offset;
          offset += length;
          return createElement(Circle as any, {
            key: `${chart.title}-${item.label}`,
            cx: 34,
            cy: 34,
            r: radius,
            fill: "none",
            stroke: chartColors[index % chartColors.length],
            strokeWidth: 10,
            strokeDasharray: `${length} ${circumference - length}`,
            strokeDashoffset: -segmentOffset,
            transform: "rotate(-90 34 34)",
          });
        }),
      ),
      createElement(
        View,
        { style: styles.donutLegend },
        chart.data.map((item, index) => {
          const percentage = total ? (values[index] / total) * 100 : 0;
          return createElement(
            View,
            {
              key: `${chart.title}-legend-${item.label}`,
              style: styles.legendRow,
            },
            createElement(View, {
              style: {
                ...styles.legendSwatch,
                backgroundColor: chartColors[index % chartColors.length],
              },
            }),
            createElement(
              Text,
              { style: styles.legendText },
              `${item.label} ${percentage.toFixed(0)}%`,
            ),
          );
        }),
      ),
    );
  };
  const renderBars = (chart: ExportChart) => {
    const max = Math.max(
      ...chart.data.map((item) => Math.max(0, item.value)),
      1,
    );
    return chart.data.map((item) => {
      const value = Math.max(0, item.value);
      return createElement(
        View,
        { key: `${chart.title}-${item.label}`, style: styles.barRow },
        createElement(
          View,
          { style: styles.barMeta },
          createElement(Text, { style: styles.barLabel }, item.label),
          createElement(Text, { style: styles.barValue }, chartValue(value)),
        ),
        createElement(
          View,
          { style: styles.barTrack },
          createElement(View, {
            style: { ...styles.barFill, width: `${(value / max) * 100}%` },
          }),
        ),
      );
    });
  };
  const charts =
    (profile === "dashboard" || profile === "report") && data.charts?.length
      ? createElement(
          View,
          { style: styles.chartRow },
          data.charts.map((chart) =>
            createElement(
              View,
              { key: chart.title, style: styles.chartPanel },
              createElement(Text, { style: styles.chartTitle }, chart.title),
              chart.type === "donut" ? renderDonut(chart) : renderBars(chart),
            ),
          ),
        )
      : null;
  const executiveSections =
    profile === "dashboard" && data.sections?.length
      ? createElement(
          View,
          {
            style:
              profile === "dashboard"
                ? styles.dashboardSectionGrid
                : styles.executiveSections,
          },
          data.sections.map((section) =>
            createElement(
              View,
              {
                key: section.title,
                style:
                  profile === "dashboard"
                    ? styles.dashboardSection
                    : styles.executiveSection,
              },
              createElement(
                Text,
                {
                  style:
                    profile === "dashboard"
                      ? styles.dashboardHeading
                      : styles.executiveHeading,
                },
                section.title,
              ),
              section.description &&
                createElement(
                  Text,
                  { style: styles.executiveDescription },
                  section.description,
                ),
              section.items.map((item) =>
                createElement(
                  View,
                  {
                    key: item.label,
                    style:
                      profile === "dashboard"
                        ? styles.dashboardItem
                        : styles.executiveItem,
                  },
                  createElement(
                    View,
                    {
                      style:
                        profile === "dashboard"
                          ? styles.dashboardItemLabel
                          : styles.executiveItemLabel,
                    },
                    createElement(Text, null, item.label),
                    item.detail &&
                      createElement(
                        Text,
                        {
                          style:
                            profile === "dashboard"
                              ? styles.dashboardItemDetail
                              : styles.executiveItemDetail,
                        },
                        item.detail,
                      ),
                  ),
                  createElement(
                    Text,
                    {
                      style:
                        profile === "dashboard"
                          ? styles.dashboardItemValue
                          : styles.executiveItemValue,
                    },
                    displayValue(item.value),
                  ),
                ),
              ),
            ),
          ),
        )
      : null;
  const widths =
    commercial && data.headers.length === 4
      ? ["42%", "14%", "20%", "24%"]
      : data.headers.map(() => `${100 / Math.max(1, data.headers.length)}%`);
  const table =
    profile === "dashboard"
      ? null
      : createElement(
          View,
          { style: styles.table },
          createElement(
            View,
            { style: styles.tableHeader, fixed: true },
            data.headers.map((header, index) =>
              createElement(
                Text,
                {
                  key: `header-${index}`,
                  style: {
                    ...styles.headerCell,
                    width: widths[index],
                    flexBasis: widths[index],
                    flexGrow: 0,
                  },
                },
                header || `Columna ${index + 1}`,
              ),
            ),
          ),
          data.rows.length
            ? data.rows.map((row, rowIndex) =>
                createElement(
                  View,
                  {
                    key: `row-${rowIndex}`,
                    style: {
                      ...styles.tableRow,
                      ...(rowIndex % 2 ? styles.striped : {}),
                    },
                    wrap: false,
                  },
                  data.headers.map((_, columnIndex) =>
                    createElement(
                      Text,
                      {
                        key: `cell-${rowIndex}-${columnIndex}`,
                        style: {
                          ...styles.cell,
                          width: widths[columnIndex],
                          flexBasis: widths[columnIndex],
                          flexGrow: 0,
                        },
                      },
                      displayValue(row[columnIndex]),
                    ),
                  ),
                ),
              )
            : createElement(
                Text,
                { style: styles.noteText },
                "Sin registros para el período seleccionado.",
              ),
        );
  const totals =
    commercial && data.summary?.length
      ? createElement(
          View,
          { style: styles.totals },
          data.summary
            .slice(0, -1)
            .map((item) =>
              createElement(
                View,
                { key: item.label, style: styles.totalLine },
                createElement(Text, { style: styles.totalLabel }, item.label),
                createElement(Text, null, displayValue(item.value)),
              ),
            ),
          createElement(
            View,
            { style: styles.grandTotal },
            createElement(
              Text,
              null,
              data.summary[data.summary.length - 1]?.label ?? "Total",
            ),
            createElement(
              Text,
              null,
              displayValue(data.summary[data.summary.length - 1]?.value),
            ),
          ),
        )
      : null;
  const notes =
    data.notes || data.terms
      ? createElement(
          View,
          { style: styles.note },
          data.terms &&
            createElement(Text, { style: styles.noteTitle }, "Condiciones"),
          data.terms &&
            createElement(Text, { style: styles.noteText }, data.terms),
          data.notes &&
            createElement(Text, { style: styles.noteText }, data.notes),
        )
      : null;
  const legal = commercial
    ? "Representación visual generada por EnterpriseCloud ERP. La validez tributaria depende de la emisión y autorización del comprobante electrónico por el sistema correspondiente."
    : "Documento generado desde EnterpriseCloud ERP para control y comunicación empresarial.";
  const document = createElement(
    Document,
    { title: data.title, author: company.name },
    createElement(
      Page,
      {
        size: "A4",
        orientation: config.orientation,
        style: styles.page,
        wrap: profile !== "dashboard",
      },
      companyHeader,
      commercial
        ? createElement(
            Text,
            { style: styles.section },
            "Información comercial",
          )
        : createElement(
            View,
            { style: styles.heading },
            createElement(Text, { style: styles.title }, data.title),
            data.subtitle &&
              createElement(Text, { style: styles.subtitle }, data.subtitle),
            createElement(
              Text,
              { style: styles.generated },
              `Generado el ${new Date().toLocaleString("es-PE")}`,
            ),
          ),
      infoPanel,
      summary,
      narrative,
      charts,
      executiveSections,
      profile !== "dashboard" &&
        createElement(
          Text,
          { style: styles.section },
          commercial
            ? "Detalle de productos y servicios"
            : profile === "account"
              ? "Actividad de la cuenta"
              : profile === "kardex"
                ? "Movimientos de inventario"
                : "Detalle del reporte",
        ),
      profile !== "dashboard" && table,
      totals,
      notes,
      createElement(Text, { style: styles.legal }, legal),
      createElement(
        Text,
        { style: styles.footer, fixed: true },
        `${company.name} · ${data.title} · Página`,
      ),
    ),
  );
  const blob = await renderer.pdf(document).toBlob();
  downloadBlob(blob, `enterprisecloud-${cleanName(data.name)}-${today()}.pdf`);
}

export function ExportMenu({ data }: { data: ExportData }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"excel" | "pdf" | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const run = async (format: "excel" | "pdf") => {
    setBusy(format);
    setOpen(false);
    try {
      if (format === "excel") await exportExcel(data);
      else await exportPdf(data);
      toast.success(
        `${format === "excel" ? "Excel" : "PDF"} exportado correctamente.`,
      );
    } catch (error) {
      console.error(error);
      toast.error(`No se pudo exportar el archivo ${format.toUpperCase()}.`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="export-menu" ref={root}>
      <button
        className="export-menu-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        disabled={busy !== null}
      >
        {busy ? "Exportando…" : "Exportar"}
        <ChevronDown className="export-menu-chevron" size={14} />
      </button>
      {open && (
        <div className="export-menu-panel" role="menu">
          <button type="button" role="menuitem" onClick={() => run("excel")}>
            <FileSpreadsheet size={15} />
            Exportar Excel
          </button>
          <button type="button" role="menuitem" onClick={() => run("pdf")}>
            <FileText size={15} />
            Exportar PDF
          </button>
        </div>
      )}
    </div>
  );
}
