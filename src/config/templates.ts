import { ConcreteTemplateId, TimesheetTemplateProfile } from "../types/timesheet";

export const TIMESHEET_TEMPLATES: Record<ConcreteTemplateId, TimesheetTemplateProfile> = {
  form_p5_standard: {
    id: "form_p5_standard",
    name: "Типова форма № П-5 (Стандарт)",
    shortName: "П-5 Стандарт",
    description: "Обрізка лівої колонки ПІБ (15%), шапки організації (15%) та підписів (15%)",
    roiCrop: { left: 0.15, top: 0.15, width: 0.85, height: 0.70 },
    aspectRatio: 1.414,
  },
  form_p5_extended: {
    id: "form_p5_extended",
    name: "Форма № П-5 (Розширена шапка/ПІБ)",
    shortName: "П-5 Розширена",
    description: "Розширена шапка філії (20%) та широка колонка табельних номерів і ПІБ (22%)",
    roiCrop: { left: 0.22, top: 0.20, width: 0.78, height: 0.68 },
    aspectRatio: 1.414,
  },
  form_uz_shift: {
    id: "form_uz_shift",
    name: "Цехова відомість змінного графіка",
    shortName: "Цехова",
    description: "Скорочена шапка (10%) та вузька колонка ПІБ (12%)",
    roiCrop: { left: 0.12, top: 0.10, width: 0.88, height: 0.80 },
    aspectRatio: 1.414,
  },
};

export const TEMPLATE_ORDER: ConcreteTemplateId[] = [
  "form_p5_standard",
  "form_p5_extended",
  "form_uz_shift",
];

const ABSENCE_COLUMN_MAP: Array<{ col: number; codes: string[] }> = [
  { col: 31, codes: ["В", "Щ", "Д", "8", "9", "10"] },
  { col: 32, codes: ["Н", "ВЧ", "11", "12", "13", "14", "15", "17", "22"] },
  { col: 33, codes: ["НА", "БЗ", "18", "19"] },
  { col: 34, codes: ["НД", "20"] },
  { col: 35, codes: ["П", "23"] },
  { col: 36, codes: ["ПР", "24"] },
  { col: 37, codes: ["С", "25"] },
  { col: 38, codes: ["ТН", "Л", "26", "27"] },
];

export const getCodesForCol = (col: number): string[] => {
  const entry = ABSENCE_COLUMN_MAP.find((item) => item.col === col);
  return entry ? entry.codes : [];
};

export const resolveAbsenceColumn = (code: string): number => {
  const normalized = code.trim().toUpperCase();
  const entry = ABSENCE_COLUMN_MAP.find((item) => item.codes.includes(normalized));
  return entry ? entry.col : 39;
};
