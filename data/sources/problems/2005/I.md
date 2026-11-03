---
year: 2005
letter: "I"
title: "Workshops"
source: "https://icpc.global/worldfinals/problems/2005-ICPC-World-Finals/2005WorldFinalProblemSet.pdf"
source_pages: 15-16
local_pdf: "problems_pdfs/2005/I.pdf"
---

# Workshops
Problem I
                                                  Workshops
                                          Input File: workshops.in
The first Californian Conference on Holism took place back in 1979 in San Francisco. The term "Californian" was a
slight exaggeration, as all 23 participants actually lived in San Francisco. Several years later, in 1987, the conference
was truly Californian, with 337 participants from all over the state. Since then, the number of participants has been
growing like the size of memory chips. In 1993 the conference was renamed the American Conference on Holism
(2549 participants), and a second renaming (World Conference on Holism) followed in 1997, when the number of
participants from all over the world had grown to 9973. The conference obtained its present name (Galactic
Conference on Holism) in 2003 after some discussion as to whether or not the word Galactic was intended to
exclude extragalactic life forms. Still the next year, all registered participants were terrestrial—though a few
participants positively reported to have sensed extraterrestrial presence.

The number of workshops grew with the number of participants. For the upcoming conference, the organization has
to face some down to earth but very nasty scheduling problems. For the 2005 conference the board has decided to
have no more than 1000 workshops concurrently. Nevertheless they had to rent every hall or classroom they could
lay their hands on. Some of these rooms are available for a restricted time only.

In the morning of the first day the opening meeting takes place in a football stadium, and in the afternoon the
participants attend workshops. Before lunch each participant has to indicate which workshop he or she wants to join
that afternoon. The organizing staff then has a list of all workshops, including the duration and the number of
participants for each workshop. They also have a list of all available rooms, with the capacity of each room, and the
time this specific room must be cleared. With this information the staff must schedule each workshop in a room of
sufficient capacity and sufficient availability in time. As this problem is not necessarily solvable, some overflow
capacity is supplied by tents in the football stadium. These tents have plenty of capacity, but they are unpleasantly
warm and noisy. So the organizing staff wants the schedule to minimize the number of tent workshops—that is,
workshops that are not assigned to a room. If there are multiple solutions that minimize the number of tent
workshops, the staff wants to minimize the number of participants attending tent workshops.

We ask you to supply such a schedule (preferably before lunch is over).

Input
The input file contains several trials. Each trial consists of two parts: the list of workshops, and the list of rented
rooms.

The list of workshops starts with a line containing the number of workshops w (0 < w ≤ 1000). Each of the next w
lines contains two numbers, describing a workshop. The first number is the number p of participants (0 < p ≤ 100),
and the second number is the duration d of the workshop in minutes (0 < d ≤ 300). For your convenience, other
details of the workshops are omitted. All workshops start at 14:00.

The list of rented rooms starts with a line containing the number of rented rooms r (0 < r ≤ 1000). Each of the
following r lines contains the description of a rented room. A line describing a rented room contains the number s of
seats in the room (0 < s ≤ 100), followed by the time when the room must be cleared, in the format hh:mm where hh
represents the hour and mm represents the minute, using a 24-hour clock. All the rooms are available starting at
14:00. All times when rooms must be cleared are between 14:01 and 23:59, inclusive.

The input is terminated by a line consisting of the integer zero.

Output
For each trial in the input file the output must contain a line consisting of the trial number, the number of tent
workshops, and the number of participants attending tent workshops. Follow the format shown in the sample output.

Sample Input   Output for the Sample Input
1              Trial 1:   0 0
20 60
1              Trial 2:   2 70
30 16:00
2
20 60
50 30
1
30 14:50
0
