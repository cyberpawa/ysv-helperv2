import { ConcreteTemplateId, TemplateROICrop } from "../types/timesheet";

const ANALYSIS_WIDTH = 200;
const ANALYSIS_HEIGHT = 140;
const MAX_OUTPUT_SIZE = 3000;

/**
 * Classifies the paper timesheet blank layout by analyzing vertical and horizontal
 * table separator projections on a downsampled grayscale image.
 */
export function detectTimesheetTemplateFromCanvas(
  sourceCanvas: HTMLCanvasElement
): ConcreteTemplateId {
  if (!sourceCanvas || sourceCanvas.width === 0 || sourceCanvas.height === 0) {
    return "form_p5_standard";
  }

  const analysisCanvas = document.createElement("canvas");
  analysisCanvas.width = ANALYSIS_WIDTH;
  analysisCanvas.height = ANALYSIS_HEIGHT;
  const ctx = analysisCanvas.getContext("2d");
  if (!ctx) {
    return "form_p5_standard";
  }

  ctx.drawImage(sourceCanvas, 0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);
  const { data } = ctx.getImageData(0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);

  const luminanceAt = (x: number, y: number): number => {
    const idx = (y * ANALYSIS_WIDTH + x) * 4;
    return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  };

  // Scan vertical grid separator between PII/name column and day "01" column (10%..26% width)
  const xMin = Math.floor(ANALYSIS_WIDTH * 0.10);
  const xMax = Math.ceil(ANALYSIS_WIDTH * 0.26);
  const yBandStart = Math.floor(ANALYSIS_HEIGHT * 0.20);
  const yBandEnd = Math.floor(ANALYSIS_HEIGHT * 0.85);
  const yBandLen = Math.max(1, yBandEnd - yBandStart);

  let bestX = Math.floor(ANALYSIS_WIDTH * 0.15);
  let bestXDarkness = -1;
  let totalXDarkness = 0;
  let xCount = 0;

  for (let x = xMin; x <= xMax; x++) {
    let darknessSum = 0;
    for (let y = yBandStart; y < yBandEnd; y++) {
      darknessSum += 255 - luminanceAt(x, y);
    }
    const avgDarkness = darknessSum / yBandLen;
    totalXDarkness += avgDarkness;
    xCount++;
    if (avgDarkness > bestXDarkness) {
      bestXDarkness = avgDarkness;
      bestX = x;
    }
  }

  // Scan horizontal separator below organization header (8%..24% height)
  const yMin = Math.floor(ANALYSIS_HEIGHT * 0.08);
  const yMax = Math.ceil(ANALYSIS_HEIGHT * 0.24);
  const xBandStart = Math.floor(ANALYSIS_WIDTH * 0.15);
  const xBandEnd = Math.floor(ANALYSIS_WIDTH * 0.90);
  const xBandLen = Math.max(1, xBandEnd - xBandStart);

  let bestY = Math.floor(ANALYSIS_HEIGHT * 0.15);
  let bestYDarkness = -1;
  let totalYDarkness = 0;
  let yCount = 0;

  for (let y = yMin; y <= yMax; y++) {
    let darknessSum = 0;
    for (let x = xBandStart; x < xBandEnd; x++) {
      darknessSum += 255 - luminanceAt(x, y);
    }
    const avgDarkness = darknessSum / xBandLen;
    totalYDarkness += avgDarkness;
    yCount++;
    if (avgDarkness > bestYDarkness) {
      bestYDarkness = avgDarkness;
      bestY = y;
    }
  }

  const meanXDarkness = totalXDarkness / Math.max(1, xCount);
  const meanYDarkness = totalYDarkness / Math.max(1, yCount);

  // Require a measurable contrast peak over local mean to avoid misclassifying flat/noisy frames
  const hasClearVerticalPeak = bestXDarkness - meanXDarkness >= 4;
  const hasClearHorizontalPeak = bestYDarkness - meanYDarkness >= 4;
  if (!hasClearVerticalPeak || !hasClearHorizontalPeak) {
    return "form_p5_standard";
  }

  const xRatio = bestX / ANALYSIS_WIDTH;
  const yRatio = bestY / ANALYSIS_HEIGHT;

  if (xRatio >= 0.20 && yRatio >= 0.18) {
    return "form_p5_extended";
  }
  if (xRatio <= 0.13 && yRatio <= 0.12) {
    return "form_uz_shift";
  }
  return "form_p5_standard";
}

/**
 * Extracts only the anonymized timesheet grid according to the template's ROI crop,
 * stripping employee names, organization headers, and signature footers before upload.
 */
export function cropCanvasByTemplateROI(
  sourceCanvas: HTMLCanvasElement,
  cropRect: { x: number; y: number; w: number; h: number },
  roi: TemplateROICrop
): string {
  const finalX = cropRect.x + cropRect.w * roi.left;
  const finalY = cropRect.y + cropRect.h * roi.top;
  const finalW = cropRect.w * roi.width;
  const finalH = cropRect.h * roi.height;

  let targetW = finalW;
  let targetH = finalH;
  if (finalW > MAX_OUTPUT_SIZE || finalH > MAX_OUTPUT_SIZE) {
    const resizeRatio = Math.min(MAX_OUTPUT_SIZE / finalW, MAX_OUTPUT_SIZE / finalH);
    targetW = finalW * resizeRatio;
    targetH = finalH * resizeRatio;
  }

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = Math.max(1, Math.round(targetW));
  outputCanvas.height = Math.max(1, Math.round(targetH));

  const ctx = outputCanvas.getContext("2d");
  if (!ctx) {
    return "";
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "medium";
  ctx.filter = "contrast(112%)";
  ctx.drawImage(
    sourceCanvas,
    finalX,
    finalY,
    finalW,
    finalH,
    0,
    0,
    outputCanvas.width,
    outputCanvas.height
  );
  ctx.filter = "none";

  return outputCanvas.toDataURL("image/jpeg", 0.95);
}
