# University Course Timetabling Problem (UCTP) Powered By Simulated Annealing

This project is an implementation of a solution to the University Course Timetabling Problem (UCTP) using the Simulated Annealing algorithm. The UCTP involves scheduling classes, rooms, and timeslots while satisfying various constraints.

## List of hard constraints
1. No two classes can be scheduled in the same room at the same time.
2. A lecturer cannot be scheduled to teach more than one class at the same time.
3. A class must be scheduled in a room that can accommodate all enrolled students.
4. Classes must be scheduled within the available timeslots.

## List of soft constraints
1. Minimize the number of gaps in a student's schedule.
2. Prefer scheduling classes in preferred rooms or timeslots.
3. Balance the distribution of classes throughout the week.
4. Minimize the number of consecutive classes for students and lecturers.

## Task for developer
- i'm gonna create this as package by laveraging typescript for type safety and esbuild for bundling so people can use this in their project easily by installing via npm
- for now on only support .xlsx file for input data source, but in the future in want to support .json either by the api or by file 

## Todlist
- [] fix typescript error on build
- [] make this project more modular so it's easy to maintain and extend
- [] have proper api package so people can use this in their project easily

## My Daily Notes while developing this project
1.after the algorithm has run, please optimize the schedule, like the gap, also if that day could be withdrawn in very very period of time, so it be, but make sure this is just optional feature, because every lecturer could be hatred if it is placed on very period of day.

2.Check the algorithm in case on friday, if friday still has subject and it's not effecient, just change the day. This is only work and i guess very good if first optimization is done, so there is no gap.

for example : 
📚 Kelas 9:
  Class ID       : GS13EL03
  Class Name     : Bahasa Inggris
  Class          : MR-1A
  Program        : Manajemen Rekayasa
  Lecturers      : MAF
  Room           : CM-103
  Day            : Friday
  Start Time     : 07:30
  End Time       : 10:00
  Participants   : 40
  SKS            : 3
  Class Type     : pagi

📚 Kelas 10:
  Class ID       : DT13MD13
  Class Name     : Matematika Diskret
  Class          : IF-1A
  Program        : INFORMATIKA
  Lecturers      : NGT
  Room           : CM-103
  Day            : Friday
  Start Time     : 10:50
  End Time       : 14:10
  Participants   : 30
  SKS            : 3
  Class Type     : pagi

📚 Kelas 11:
  Class ID       : VD13JN14
  Class Name     : DKV III Jenama
  Class          : DKV-5A
  Program        : DESAIN KOMUNIKASI VISUAL
  Lecturers      : TAN
  Room           : CM-103
  Day            : Friday
  Start Time     : 14:10
  End Time       : 18:00
  Participants   : 40
  SKS            : 4
  Class Type     : pagi

my personal opinion that Matematika Diskret would be great if it's started on 13.00, and the other just be moved out of this day it it's possible

oh yeah make sure check the others day of the room, there is probability that there is a place for them.