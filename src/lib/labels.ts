import type { DocumentType } from "@prisma/client";

/** Human-readable names for the enums that appear in more than one screen. */
export const DOC_TYPE_LABEL: Record<DocumentType, string> = {
  MINUTES: "Meeting minutes",
  ATTENDANCE: "Attendance record",
  REPORT: "Report",
  TEMPLATE: "Template",
  GUIDELINE: "Guideline",
  CONSTITUTION: "Constitution",
  FINANCE: "Finance",
  OTHER: "Other",
};

export const DOC_TYPES = Object.keys(DOC_TYPE_LABEL) as DocumentType[];
