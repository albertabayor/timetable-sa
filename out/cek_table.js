import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, "timetable_result_v3.json");
const classData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

/**
 * Memfilter data kelas berdasarkan Room dan Day (opsional)
 * @param {Array<Object>} data - Array dari objek kelas
 * @param {string} room - Nama ruangan (case-insensitive)
 * @param {string|null} day - Nama hari (case-insensitive), optional
 * @returns {Array<Object>} Array kelas yang sesuai filter
 */
function filterByRoomAndDay(data, room, day = null) {
  return data.filter((classItem) => {
    const roomMatch = classItem.Room.toLowerCase() === room.toLowerCase();
    const dayMatch = day === null || classItem.Day.toLowerCase() === day.toLowerCase();
    return roomMatch && dayMatch;
  });
}

// Ambil argument dari command line
const roomArg = process.argv[2];
const dayArg = process.argv[3];

// Validasi input
if (!roomArg) {
  console.error("❌ Error: Silakan berikan Room sebagai argument");
  console.error("Penggunaan: node cek_table.js <room> [day]");
  console.error('Contoh 1: node cek_table.js "CM-201"');
  console.error('Contoh 2: node cek_table.js "CM-201" "Monday"');
  process.exit(1);
}

// Filter data
const filteredData = filterByRoomAndDay(classData, roomArg, dayArg);

// Tampilkan hasil
if (filteredData.length === 0) {
  const dayInfo = dayArg ? ` dan Day: ${dayArg}` : "";
  console.log(`\n⚠️  Tidak ada data untuk Room: ${roomArg}${dayInfo}\n`);
} else {
  const dayInfo = dayArg ? ` dan Day: ${dayArg}` : "";
  console.log(`\n✅ Ditemukan ${filteredData.length} kelas untuk Room: ${roomArg}${dayInfo}\n`);
  console.log("=".repeat(100));

  // also filter based on start time
  filteredData.sort((a, b) => {
    const timeA = a["Start Time"].split(":").map(Number);
    const timeB = b["Start Time"].split(":").map(Number);
    return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
  });

  //filter data but display based on first day like Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  filteredData.sort((a, b) => {
    return dayOrder.indexOf(a.Day) - dayOrder.indexOf(b.Day);
  });

  filteredData.forEach((classItem, index) => {
    console.log(`\n📚 Kelas ${index + 1}:`);
    console.log(`  Class ID       : ${classItem["Class ID"]}`);
    console.log(`  Class Name     : ${classItem["Class Name"]}`);
    console.log(`  Class          : ${classItem["Class"]}`);
    console.log(`  Program        : ${classItem["Program"]}`);
    console.log(`  Lecturers      : ${classItem["Lecturers"]}`);
    console.log(`  Room           : ${classItem["Room"]}`);
    console.log(`  Day            : ${classItem["Day"]}`);
    console.log(`  Start Time     : ${classItem["Start Time"]}`);
    console.log(`  End Time       : ${classItem["End Time"]}`);
    console.log(`  Participants   : ${classItem["Participants"]}`);
    console.log(`  SKS            : ${classItem["SKS"]}`);
    console.log(`  Class Type     : ${classItem["Class Type"]}`);
  });

  console.log("\n" + "=".repeat(100) + "\n");
}
