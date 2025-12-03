/**
 * Script to compare initial solution and final result
 */

const fs = require('fs');

console.log('='.repeat(70));
console.log('  COMPARING INITIAL vs FINAL SOLUTIONS');
console.log('='.repeat(70));

// Load both files
const initial = JSON.parse(fs.readFileSync('initial-solution.json', 'utf-8'));
const final = JSON.parse(fs.readFileSync('timetable-result.json', 'utf-8'));

console.log('\n📊 METRICS COMPARISON:');
console.log(`   Initial classes: ${initial.length}`);
console.log(`   Final classes: ${final.schedule.length}`);
console.log(`   Final fitness: ${final.fitness.toFixed(2)}`);
console.log(`   Hard violations: ${final.hardViolations}`);
console.log(`   Soft violations: ${final.softViolations}`);

// Compare first 10 classes
console.log('\n🔍 COMPARING FIRST 10 CLASSES:');
let changedCount = 0;
for (let i = 0; i < Math.min(10, initial.length); i++) {
  const init = initial[i];
  const fin = final.schedule.find(s => s.classId === init.classId);

  if (!fin) {
    console.log(`   ⚠️  Class ${init.classId} not found in final solution`);
    continue;
  }

  const timeChanged = init.timeSlot.day !== fin.timeSlot.day ||
                     init.timeSlot.startTime !== fin.timeSlot.startTime;
  const roomChanged = init.room !== fin.room;

  if (timeChanged || roomChanged) {
    changedCount++;
    console.log(`   ✓ ${init.classId}:`);
    if (timeChanged) {
      console.log(`      Time: ${init.timeSlot.day} ${init.timeSlot.startTime} → ${fin.timeSlot.day} ${fin.timeSlot.startTime}`);
    }
    if (roomChanged) {
      console.log(`      Room: ${init.room} → ${fin.room}`);
    }
  }
}

// Compare all classes
let totalChanged = 0;
for (const init of initial) {
  const fin = final.schedule.find(s => s.classId === init.classId);
  if (!fin) continue;

  const timeChanged = init.timeSlot.day !== fin.timeSlot.day ||
                     init.timeSlot.startTime !== fin.timeSlot.startTime;
  const roomChanged = init.room !== fin.room;

  if (timeChanged || roomChanged) {
    totalChanged++;
  }
}

console.log(`\n📈 SUMMARY:`);
console.log(`   Total classes changed: ${totalChanged}/${initial.length} (${(totalChanged/initial.length*100).toFixed(1)}%)`);
console.log(`   Classes unchanged: ${initial.length - totalChanged}/${initial.length} (${((initial.length - totalChanged)/initial.length*100).toFixed(1)}%)`);

if (totalChanged === 0) {
  console.log('\n⚠️  WARNING: No changes detected! SA algorithm might not be working properly.');
} else if (totalChanged < initial.length * 0.1) {
  console.log('\n⚠️  WARNING: Very few changes detected (< 10%). SA might need better parameters.');
} else {
  console.log('\n✅ Good! SA algorithm made significant changes to the schedule.');
}

console.log('\n' + '='.repeat(70));
