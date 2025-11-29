/**
 * PDF Generator for Class Timetables
 * Generates individual PDF timetables for each class from the solution
 */

import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import type { ScheduleEntry } from "../types/index.js";

interface TimetableData {
  class: string;
  prodi: string;
  entries: ScheduleEntry[];
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_PERIODS = [
  { period: 1, time: "07:30 - 08:20" },
  { period: 2, time: "08:20 - 09:10" },
  { period: 3, time: "09:10 - 10:00" },
  { period: 4, time: "10:00 - 10:50" },
  { period: 5, time: "10:50 - 11:40" },
  { period: 6, time: "Istirahat 11:40 - 12:30" },
  { period: 7, time: "12:30 - 13:20" },
  { period: 8, time: "13:20 - 14:10" },
  { period: 9, time: "14:10 - 15:00" },
  { period: 10, time: "15:00 - 15:30" },
  { period: 11, time: "15:30 - 16:20" },
  { period: 12, time: "Istirahat 16:20 - 18:30" },
  { period: 13, time: "18:30 - 19:20" },
  { period: 14, time: "19:20 - 20:10" },
];

const COLORS = [
  "#90EE90", // Light Green
  "#FFB6C1", // Light Pink
  "#87CEEB", // Sky Blue
  "#FFD700", // Gold
  "#FFA07A", // Light Salmon
  "#98FB98", // Pale Green
  "#DDA0DD", // Plum
  "#F0E68C", // Khaki
  "#B0C4DE", // Light Steel Blue
  "#FFDAB9", // Peach Puff
];

/**
 * Parse combined class names into individual class components
 * Examples:
 *   "IF-1A dan IF-1B" -> ["IF-1A", "IF-1B"]
 *   "MR-3A/MR-5A/MR-7A" -> ["MR-3A", "MR-5A", "MR-7A"]
 *   "TL-1A, TL-1B" -> ["TL-1A", "TL-1B"]
 */
function parseClassNames(classString: string): string[] {
  const delimiters = /\s+dan\s+|\/|,\s*|_\s*/gi;
  return classString
    .split(delimiters)
    .map(name => name.trim())
    .filter(name => name.length > 0);
}

/**
 * Check if a class name contains combined class delimiters
 */
function isCombinedClassName(className: string): boolean {
  return /\s+dan\s+|\/|,|_/i.test(className);
}

function getColorForCourse(courseName: string): string {
  // Generate consistent color based on course name
  let hash = 0;
  for (let i = 0; i < courseName.length; i++) {
    hash = courseName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length]!;
}

function groupByClass(schedule: ScheduleEntry[]): Map<string, TimetableData> {
  const grouped = new Map<string, TimetableData>();

  for (const entry of schedule) {
    // Parse the class field into individual class names
    const classNames = Array.isArray(entry.class) ? entry.class : parseClassNames(entry.class);

    // Add this entry to ALL individual component classes
    for (const className of classNames) {
      if (!grouped.has(className)) {
        grouped.set(className, {
          class: className,
          prodi: entry.prodi,
          entries: [],
        });
      }
      grouped.get(className)!.entries.push(entry);
    }
  }

  return grouped;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function generatePDF(data: TimetableData, outputPath: string): void {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margins: { top: 30, bottom: 25, left: 30, right: 30 },
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Title
  doc.fontSize(14).font("Helvetica-Bold");
  doc.text(`Jadwal Kuliah Semester Gasal T.A. 2025/2026`, { align: "center" });
  doc.fontSize(16);
  doc.text(data.class, { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(9).font("Helvetica");
  doc.text(data.prodi, { align: "center" });
  doc.moveDown(0.5);

  // Table dimensions
  const pageWidth = 842; // A4 landscape width
  const pageHeight = 595; // A4 landscape height
  const marginLeft = 30;
  const marginTop = 100;
  const marginRight = 30;

  const tableWidth = pageWidth - marginLeft - marginRight;
  const dayColumnWidth = 60;
  const cellWidth = (tableWidth - dayColumnWidth) / DAYS.length;
  const rowHeight = 28;

  // Draw table header (Days)
  let x = marginLeft;
  let y = marginTop;

  doc.fontSize(9).font("Helvetica-Bold");

  // Empty top-left cell
  doc.rect(x, y, dayColumnWidth, rowHeight).stroke();
  doc.text("UISI", x + 5, y + 12, { width: dayColumnWidth - 10 });

  x += dayColumnWidth;

  // Day headers
  for (const day of DAYS) {
    doc.rect(x, y, cellWidth, rowHeight).stroke();
    doc.text(day.substring(0, 2), x + 5, y + 12, {
      width: cellWidth - 10,
      align: "center",
    });
    x += cellWidth;
  }

  y += rowHeight;

  // Draw time periods and schedule
  doc.fontSize(7).font("Helvetica");

  for (const period of TIME_PERIODS) {
    x = marginLeft;

    // Time column
    const isBreak = period.time.includes("Istirahat");
    if (isBreak) {
      doc.fillColor("#E0E0E0");
    } else {
      doc.fillColor("#FFFFFF");
    }

    doc
      .rect(x, y, dayColumnWidth, rowHeight)
      .fillAndStroke("#FFFFFF", "#000000");
    doc.fillColor("#000000");

    const timeText = period.time.replace("Istirahat ", "");
    const lines = timeText.split(" ");
    const startY = y + (rowHeight - lines.length * 8) / 2;

    lines.forEach((line, idx) => {
      doc.text(line, x + 2, startY + idx * 8, {
        width: dayColumnWidth - 4,
        align: "center",
      });
    });

    x += dayColumnWidth;

    // Schedule cells for each day
    for (const day of DAYS) {
      if (isBreak) {
        // Break cell
        doc.rect(x, y, cellWidth, rowHeight).fillAndStroke("#E0E0E0", "#000000");
      } else {
        // Find entries for this day and period
        const entries = data.entries.filter((entry) => {
          if (entry.timeSlot.day !== day) return false;

          const entryStart = timeToMinutes(entry.timeSlot.startTime);
          const entryEnd = timeToMinutes(entry.timeSlot.endTime);
          const periodStart = timeToMinutes(period.time.split(" - ")[0]!);
          const periodEnd = timeToMinutes(period.time.split(" - ")[1]!);

          // Check if this period overlaps with the entry
          return entryStart < periodEnd && entryEnd > periodStart;
        });

        if (entries.length > 0) {
          const entry = entries[0]!;
          const color = getColorForCourse(entry.className);

          doc.rect(x, y, cellWidth, rowHeight).fillAndStroke(color, "#000000");
          doc.fillColor("#000000");

          // Draw text
          const textY = y + 2;

          // Check if this is a combined class entry
          const isCombinedEntry = entry.class !== data.class;
          const classNamePrefix = isCombinedEntry ? "* " : "";

          doc.fontSize(6).font("Helvetica-Bold");
          doc.text(classNamePrefix + entry.className.substring(0, 23), x + 2, textY, {
            width: cellWidth - 4,
            lineBreak: false,
            ellipsis: true,
          });

          doc.fontSize(5.5).font("Helvetica");
          doc.text(entry.classId, x + 2, textY + 8, { width: cellWidth - 4 });
          doc.text(entry.room, x + 2, textY + 14, { width: cellWidth - 4 });

          // Lecturers
          const lecturersText = entry.lecturers.join(", ");
          doc.text(lecturersText.substring(0, 15), x + 2, textY + 20, {
            width: cellWidth - 4,
            lineBreak: false,
            ellipsis: true,
          });
        } else {
          // Empty cell
          doc.rect(x, y, cellWidth, rowHeight).stroke();
        }
      }
      x += cellWidth;
    }

    y += rowHeight;
  }

  // Footer
  doc.fontSize(8).font("Helvetica");
  const footerY = pageHeight - 30;
  doc.text(`Timetable generated ${new Date().toLocaleDateString()}`, marginLeft, footerY, {
    width: tableWidth,
    align: "left",
  });
  doc.text("a3c Timetables", marginLeft, footerY, {
    width: tableWidth,
    align: "right",
  });

  doc.end();
}

export function generateTimetablePDFs(
  solutionPath: string,
  outputDir: string,
  singleFile: boolean = false
): void {
  console.log("📄 Generating timetable PDFs...\n");

  // Read solution
  const solutionData = JSON.parse(fs.readFileSync(solutionPath, "utf8"));
  const schedule: ScheduleEntry[] = solutionData.schedule;

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Group by class
  const grouped = groupByClass(schedule);

  // Filter out combined class names (only keep individual class PDFs)
  const filteredGrouped = new Map<string, TimetableData>();
  for (const [classKey, data] of grouped) {
    if (!isCombinedClassName(classKey)) {
      filteredGrouped.set(classKey, data);
    }
  }

  console.log(`Found ${grouped.size} total classes (${filteredGrouped.size} individual classes after filtering)\n`);

  if (singleFile) {
    // Generate single PDF with all timetables
    const filename = "all-timetables.pdf";
    const outputPath = path.join(outputDir, filename);
    generateSinglePDF(Array.from(filteredGrouped.values()), outputPath);
    console.log(`\n🎉 Successfully generated single PDF with ${filteredGrouped.size} timetables!`);
    console.log(`📁 File: ${outputPath}`);
  } else {
    // Generate separate PDFs
    let count = 0;
    for (const [classKey, data] of filteredGrouped) {
      const filename = `${classKey.replace(/\//g, "-").replace(/,/g, "_")}.pdf`;
      const outputPath = path.join(outputDir, filename);

      generatePDF(data, outputPath);
      count++;

      console.log(`✅ Generated: ${filename} (${data.entries.length} classes)`);
    }

    console.log(`\n🎉 Successfully generated ${count} PDF timetables!`);
    console.log(`📁 Output directory: ${outputDir}`);
  }
}

function generateSinglePDF(allData: TimetableData[], outputPath: string): void {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margins: { top: 40, bottom: 40, left: 30, right: 30 },
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  allData.forEach((data, index) => {
    if (index > 0) {
      doc.addPage();
    }
    drawTimetablePage(doc, data);
  });

  doc.end();
}

function drawTimetablePage(doc: PDFKit.PDFDocument, data: TimetableData): void {
  // Title
  doc.fontSize(14).font("Helvetica-Bold");
  doc.text(`Jadwal Kuliah Semester Gasal T.A. 2025/2026`, { align: "center" });
  doc.fontSize(16);
  doc.text(data.class, { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(9).font("Helvetica");
  doc.text(data.prodi, { align: "center" });
  doc.moveDown(0.5);

  // Table dimensions
  const pageWidth = 842; // A4 landscape width
  const pageHeight = 595; // A4 landscape height
  const marginLeft = 30;
  const marginTop = 100;
  const marginRight = 30;

  const tableWidth = pageWidth - marginLeft - marginRight;
  const dayColumnWidth = 60;
  const cellWidth = (tableWidth - dayColumnWidth) / DAYS.length;
  const rowHeight = 28;

  // Draw table header (Days)
  let x = marginLeft;
  let y = marginTop;

  doc.fontSize(9).font("Helvetica-Bold");

  // Empty top-left cell
  doc.rect(x, y, dayColumnWidth, rowHeight).stroke();
  doc.text("UISI", x + 5, y + 12, { width: dayColumnWidth - 10 });

  x += dayColumnWidth;

  // Day headers
  for (const day of DAYS) {
    doc.rect(x, y, cellWidth, rowHeight).stroke();
    doc.text(day.substring(0, 2), x + 5, y + 12, {
      width: cellWidth - 10,
      align: "center",
    });
    x += cellWidth;
  }

  y += rowHeight;

  // Draw time periods and schedule
  doc.fontSize(7).font("Helvetica");

  for (const period of TIME_PERIODS) {
    x = marginLeft;

    // Time column
    const isBreak = period.time.includes("Istirahat");
    if (isBreak) {
      doc.fillColor("#E0E0E0");
    } else {
      doc.fillColor("#FFFFFF");
    }

    doc
      .rect(x, y, dayColumnWidth, rowHeight)
      .fillAndStroke("#FFFFFF", "#000000");
    doc.fillColor("#000000");

    const timeText = period.time.replace("Istirahat ", "");
    const lines = timeText.split(" ");
    const startY = y + (rowHeight - lines.length * 8) / 2;

    lines.forEach((line, idx) => {
      doc.text(line, x + 2, startY + idx * 8, {
        width: dayColumnWidth - 4,
        align: "center",
      });
    });

    x += dayColumnWidth;

    // Schedule cells for each day
    for (const day of DAYS) {
      if (isBreak) {
        // Break cell
        doc.rect(x, y, cellWidth, rowHeight).fillAndStroke("#E0E0E0", "#000000");
      } else {
        // Find entries for this day and period
        const entries = data.entries.filter((entry) => {
          if (entry.timeSlot.day !== day) return false;

          const entryStart = timeToMinutes(entry.timeSlot.startTime);
          const entryEnd = timeToMinutes(entry.timeSlot.endTime);
          const periodStart = timeToMinutes(period.time.split(" - ")[0]!);
          const periodEnd = timeToMinutes(period.time.split(" - ")[1]!);

          // Check if this period overlaps with the entry
          return entryStart < periodEnd && entryEnd > periodStart;
        });

        if (entries.length > 0) {
          const entry = entries[0]!;
          const color = getColorForCourse(entry.className);

          doc.rect(x, y, cellWidth, rowHeight).fillAndStroke(color, "#000000");
          doc.fillColor("#000000");

          // Draw text
          const textY = y + 2;

          // Check if this is a combined class entry
          const isCombinedEntry = entry.class !== data.class;
          const classNamePrefix = isCombinedEntry ? "* " : "";

          doc.fontSize(6).font("Helvetica-Bold");
          doc.text(classNamePrefix + entry.className.substring(0, 23), x + 2, textY, {
            width: cellWidth - 4,
            lineBreak: false,
            ellipsis: true,
          });

          doc.fontSize(5.5).font("Helvetica");
          doc.text(entry.classId, x + 2, textY + 8, { width: cellWidth - 4 });
          doc.text(entry.room, x + 2, textY + 14, { width: cellWidth - 4 });

          // Lecturers
          const lecturersText = entry.lecturers.join(", ");
          doc.text(lecturersText.substring(0, 15), x + 2, textY + 20, {
            width: cellWidth - 4,
            lineBreak: false,
            ellipsis: true,
          });
        } else {
          // Empty cell
          doc.rect(x, y, cellWidth, rowHeight).stroke();
        }
      }
      x += cellWidth;
    }

    y += rowHeight;
  }

  // Footer
  doc.fontSize(8).font("Helvetica");
  const footerY = pageHeight - 30;
  doc.text(`Timetable generated ${new Date().toLocaleDateString()}`, marginLeft, footerY, {
    width: tableWidth,
    align: "left",
  });
  doc.text("a3c Timetables", marginLeft, footerY, {
    width: tableWidth,
    align: "right",
  });
}
