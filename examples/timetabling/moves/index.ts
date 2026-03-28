/**
 * Move operators for timetabling example
 */

// General move operators
export { ChangeTimeSlot } from './ChangeTimeSlot.js';
export { ChangeRoom } from './ChangeRoom.js';
export { SwapClasses } from './SwapClasses.js'; // Low success rate but provides search diversity
export { ChangeTimeSlotAndRoom } from './ChangeTimeSlotAndRoom.js';

// Targeted move operators for specific violations
export { FixFridayPrayerConflict } from './FixFridayPrayerConflict.js';
export { FixFridayLecturerConflict } from './FixFridayLecturerConflict.js';
// Removed SwapFridayWithNonFriday - had 0-0.2% success rate, not worth the iteration cost
export { FixLecturerConflict } from './FixLecturerConflict.js';
export { FixRoomConflict } from './FixRoomConflict.js';
export { FixMaxDailyPeriods } from './FixMaxDailyPeriods.js';
export { FixRoomCapacity } from './FixRoomCapacity.js';
export { FixExclusiveRoom } from './FixExclusiveRoom.js';
