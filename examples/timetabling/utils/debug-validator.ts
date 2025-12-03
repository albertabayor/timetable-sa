/**
 * Debug tool to test why validator returns empty slots
 */

import { loadDataFromExcel } from '../data/index.js';
import { generateInitialSolution } from '../utils/initial-solution.js';
import { getValidTimeSlots, getValidTimeSlotsWithPriority } from './slot-validator.js';

// Load data
const data = loadDataFromExcel('./data_uisi.xlsx');
const state = generateInitialSolution(data);

// Find the problematic class
const problematicClass = state.schedule.find(
  entry => entry.classId === 'IF13IT23' || entry.className.includes('Internet of Things')
);

if (problematicClass) {
  console.log('\n=== PROBLEMATIC CLASS ===');
  console.log(`Class: ${problematicClass.classId} - ${problematicClass.className}`);
  console.log(`Current time: ${problematicClass.timeSlot.day} ${problematicClass.timeSlot.startTime}-${problematicClass.timeSlot.endTime}`);
  console.log(`Class type: ${problematicClass.classType}`);
  console.log(`SKS: ${problematicClass.sks}`);
  console.log(`Lecturers: ${problematicClass.lecturers.join(', ')}`);
  console.log(`Room: ${problematicClass.room}`);

  // Try to get valid slots
  console.log('\n=== TESTING VALIDATOR ===');
  const { preferred, acceptable, all } = getValidTimeSlotsWithPriority(state, problematicClass);

  console.log(`\nPreferred slots (non-Friday): ${preferred.length}`);
  console.log(`Acceptable slots (Friday): ${acceptable.length}`);
  console.log(`Total valid slots: ${all.length}`);

  if (all.length > 0) {
    console.log('\nFirst 5 valid slots:');
    all.slice(0, 5).forEach(slot => {
      console.log(`  - ${slot.day} ${slot.startTime}-${slot.endTime}`);
    });
  } else {
    console.log('\n⚠️ NO VALID SLOTS FOUND!');
    console.log('This is the BUG - validator is too strict!');
  }

  // Test specific slot: Friday 13:20
  console.log('\n=== TESTING SPECIFIC SLOT: Friday 13:20 ===');
  const testSlot = all.find(slot => slot.day === 'Friday' && slot.startTime === '13:20');
  if (testSlot) {
    console.log('✅ Friday 13:20 IS in valid slots!');
  } else {
    console.log('❌ Friday 13:20 NOT in valid slots!');
    console.log('Need to debug why this slot is being filtered out...');
  }
}

export {};
