/**
 * Utility functions for timetabling example
 */

export {
  timeToMinutes,
  minutesToTime,
  calculateEndTime,
  getPrayerTimeOverlap,
  isValidFridayStartTime,
  isStartingDuringPrayerTime,
} from './time.js';

export {
  isRoomAvailable,
  getAvailableRooms,
  canUseExclusiveRoom,
} from './room-availability.js';

export {
  hasClassOverlap,
} from './class-helper.js';

export {
  PRAYER_TIMES,
} from './prayer-times.js';

export {
  LAB_ROOMS,
  NON_LAB_ROOMS,
  EXCLUSIVE_ROOMS,
} from './room-constants.js';

export {
  DAYS,
  TIME_SLOTS_PAGI,
  TIME_SLOTS_SORE,
  TIME_SLOTS,
  initializeTimeSlots,
  setCustomTimeSlots,
} from './timeslot-generator.js';

export {
  getValidTimeSlots,
  getValidTimeSlotsWithPriority,
  getValidTimeSlotAndRoomCombinations,
  getValidTimeSlotAndRoomCombinationsWithPriority,
  isTimeSlotValid,
} from './slot-validator.js';
