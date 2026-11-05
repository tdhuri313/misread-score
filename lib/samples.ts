import type { ChartSpec } from "./chartSpec";
import { defaultPanels } from "./chartSpec";

/**
 * The four sample charts. Quarterly revenue and Regional sales use the values from the
 * prompt; Product growth and Ops dashboard are illustrative values made up for the demo
 * and are labelled as such in the UI (`illustrative: true`).
 */

export const quarterlyRevenue: ChartSpec = {
  id: "quarterly-revenue",
  name: "Quarterly revenue",
  title: "Revenue by product",
  type: "bar",
  categories: ["A", "B"],
  series: [{ name: "Revenue", values: [52, 56] }],
  settings: {
    axisStart: 50,
    showLegend: false,
    directLabels: false,
    colorMapping: "conventional",
    panels: [],
  },
  illustrative: true,
  source: "sample",
};

export const regionalSales: ChartSpec = {
  id: "regional-sales",
  name: "Regional sales",
  title: "Sales by region and quarter",
  type: "heatmap",
  categories: ["Q1", "Q2", "Q3", "Q4"],
  series: [
    { name: "NE", values: [340, 520, 610, 890] },
    { name: "SE", values: [220, 480, 530, 690] },
    { name: "MW", values: [120, 310, 460, 580] },
    { name: "West", values: [410, 620, 740, 810] },
  ],
  settings: {
    axisStart: 0,
    showLegend: false,
    directLabels: false,
    colorMapping: "reversed", // lighter means more
    panels: [],
  },
  illustrative: true,
  source: "sample",
};

export const productGrowth: ChartSpec = {
  id: "product-growth",
  name: "Product growth",
  title: "Active accounts by product",
  type: "line",
  categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  series: [
    { name: "Atlas", values: [12, 15, 19, 24, 28, 33] },
    { name: "Beacon", values: [18, 20, 22, 25, 27, 30] },
    { name: "Cobalt", values: [10, 11, 14, 16, 21, 27] },
  ],
  unit: "k",
  settings: {
    axisStart: 0,
    showLegend: true,
    directLabels: false,
    colorMapping: "conventional",
    panels: [],
  },
  illustrative: true,
  source: "sample",
};

const opsSeries = [
  { name: "Traffic (k req)", values: [42, 51, 68, 91, 74, 55] },
  { name: "Latency (ms)", values: [180, 195, 245, 410, 300, 220] },
  { name: "Errors (/min)", values: [3, 4, 6, 12, 7, 4] },
  { name: "CPU (%)", values: [38, 44, 57, 79, 63, 47] },
  { name: "Memory (%)", values: [61, 62, 64, 66, 65, 63] },
  { name: "Queue depth", values: [8, 10, 15, 34, 21, 12] },
];

export const opsDashboard: ChartSpec = {
  id: "ops-dashboard",
  name: "Ops dashboard",
  title: "System performance overview",
  type: "multipanel",
  categories: ["09:00", "11:00", "13:00", "15:00", "17:00", "19:00"],
  series: opsSeries,
  settings: {
    axisStart: 0,
    showLegend: false,
    directLabels: true,
    colorMapping: "conventional",
    panels: defaultPanels(opsSeries),
  },
  illustrative: true,
  source: "sample",
};

export const SAMPLES: ChartSpec[] = [quarterlyRevenue, regionalSales, productGrowth, opsDashboard];
