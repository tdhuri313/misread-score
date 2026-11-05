import { defaultPanels, type ChartSpec } from "./chartSpec";

/**
 * CSV -> ChartSpec.
 *
 * Expected shape:
 *   category,Series 1,Series 2
 *   Q1,10,12
 *   Q2,14,15
 *
 * - First row is the header. First column holds categories; every other column is a
 *   numeric series.
 * - Quoted fields ("a, b") and doubled quotes ("say ""hi""") are supported.
 * - One series becomes a bar chart; several become a multi-line chart. The user can
 *   change the type afterwards.
 */

export type CsvResult = { ok: true; spec: ChartSpec } | { ok: false; error: string };

/** Split CSV text into rows of raw string cells. Throws on an unterminated quote. */
export function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let line = 1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === "\n") line++;
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      line++;
    } else {
      cell += ch;
    }
  }
  if (inQuotes) throw new Error(`Unclosed quote starting before line ${line}.`);
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function parseNumber(raw: string): number | null {
  const t = raw.trim().replace(/,/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function parseCsv(text: string, fileName = "Uploaded chart"): CsvResult {
  const clean = text.replace(/^﻿/, "");
  if (clean.trim() === "") return { ok: false, error: "The file is empty." };

  let rows: string[][];
  try {
    rows = splitCsv(clean);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  // Ignore fully blank lines.
  rows = rows.filter((r) => r.some((c) => c.trim() !== ""));

  const header = rows[0].map((h) => h.trim());
  if (header.length < 2) {
    return {
      ok: false,
      error: "Need at least two columns: one for categories and one or more numeric series.",
    };
  }
  const emptyHeader = header.findIndex((h, i) => i > 0 && h === "");
  if (emptyHeader !== -1) {
    return { ok: false, error: `Header column ${emptyHeader + 1} has no name.` };
  }
  if (rows.length < 2) return { ok: false, error: "The file has a header but no data rows." };

  const categories: string[] = [];
  const series = header.slice(1).map((name) => ({ name, values: [] as number[] }));

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const lineNo = r + 1;
    if (row.length !== header.length) {
      return {
        ok: false,
        error: `Row ${lineNo} has ${row.length} cells, but the header has ${header.length}.`,
      };
    }
    const category = row[0].trim();
    if (category === "") return { ok: false, error: `Row ${lineNo} is missing a category in column 1.` };
    categories.push(category);
    for (let c = 1; c < row.length; c++) {
      const n = parseNumber(row[c]);
      if (n === null) {
        const shown = row[c].trim() === "" ? "an empty cell" : `"${row[c].trim()}"`;
        return {
          ok: false,
          error: `Row ${lineNo}, column "${header[c]}" has ${shown}, which is not a number.`,
        };
      }
      series[c - 1].values.push(n);
    }
  }

  const name = fileName.replace(/\.csv$/i, "") || "Uploaded chart";
  const multi = series.length > 1;
  return {
    ok: true,
    spec: {
      id: `csv-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`,
      name,
      title: name,
      type: multi ? "line" : "bar",
      categories,
      series,
      settings: {
        axisStart: 0,
        showLegend: multi,
        directLabels: false,
        colorMapping: "conventional",
        panels: defaultPanels(series),
      },
      illustrative: false,
      source: "csv",
    },
  };
}
