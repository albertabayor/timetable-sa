import { describe, expect, it } from '@jest/globals';
import { FixExclusiveRoom } from '../../examples/timetabling/moves/FixExclusiveRoom.js';
import { canUseExclusiveRoom } from '../../examples/timetabling/utils/room-availability.js';
import type { TimetableState } from '../../examples/timetabling/types/index.js';

describe('FixExclusiveRoom move operator', () => {
  it('should be applicable when exclusive room is used by non-allowed class', () => {
    const move = new FixExclusiveRoom();

    const state: TimetableState = {
      schedule: [
        {
          classId: 'C1',
          className: 'Linear Algebra',
          class: 'IF-1A',
          prodi: 'INFORMATIKA',
          lecturers: ['L1'],
          room: 'G5-LabAudioVisual',
          timeSlot: { day: 'Monday', startTime: '07:30', endTime: '09:10', period: 1 },
          sks: 2,
          needsLab: false,
          participants: 20,
          classType: 'pagi',
          prayerTimeAdded: 0,
        },
      ],
      availableTimeSlots: [
        { day: 'Monday', startTime: '07:30', endTime: '09:10', period: 1 },
      ],
      rooms: [
        { Code: 'G5-LabAudioVisual', Name: 'Exclusive AV', Type: 'Lab', Capacity: 30 },
        { Code: 'CM-201', Name: 'Regular Room', Type: 'Classroom', Capacity: 40 },
      ],
      lecturers: [],
    };

    expect(canUseExclusiveRoom('G5-LabAudioVisual', 'Linear Algebra', 'INFORMATIKA')).toBe(false);
    expect(move.canApply(state)).toBe(true);
  });

  it('should move class to non-exclusive valid room when possible', () => {
    const move = new FixExclusiveRoom();

    const state: TimetableState = {
      schedule: [
        {
          classId: 'C1',
          className: 'Linear Algebra',
          class: 'IF-1A',
          prodi: 'INFORMATIKA',
          lecturers: ['L1'],
          room: 'G5-LabAudioVisual',
          timeSlot: { day: 'Monday', startTime: '07:30', endTime: '09:10', period: 1 },
          sks: 2,
          needsLab: false,
          participants: 20,
          classType: 'pagi',
          prayerTimeAdded: 0,
        },
      ],
      availableTimeSlots: [
        { day: 'Monday', startTime: '07:30', endTime: '09:10', period: 1 },
      ],
      rooms: [
        { Code: 'G5-LabAudioVisual', Name: 'Exclusive AV', Type: 'Lab', Capacity: 30 },
        { Code: 'CM-201', Name: 'Regular Room', Type: 'Classroom', Capacity: 40 },
      ],
      lecturers: [],
    };

    const updated = move.generate(state, 100);
    const entry = updated.schedule[0]!;

    expect(entry.room).toBe('CM-201');
    expect(canUseExclusiveRoom(entry.room, entry.className, entry.prodi)).toBe(true);
  });
});
