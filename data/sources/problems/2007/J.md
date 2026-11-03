---
year: 2007
letter: "J"
title: "Tunnels"
source: "https://icpc.global/worldfinals/problems/2007-ICPC-World-Finals/2007WorldFinalProblemSet.pdf"
source_pages: 19-20
local_pdf: "problems_pdfs/2007/J.pdf"
---

# Tunnels
Problem J
                                                 Tunnels
                                         Input File: tunnels.in

Curses! A handsome spy has somehow escaped from your elaborate deathtrap, overpowered your guards, and
stolen your secret world domination plans. Now he is running loose in your volcano base, risking your entire
evil operation. He must be stopped before he escapes!
Fortunately, you are watching the spy's progress from your secret control room, and you have planned for just
such an eventuality. Your base consists of a complicated network of rooms connected by non-intersecting
tunnels. Every room has a closed-circuit camera in it (allowing you to track the spy wherever he goes), and
every tunnel has a small explosive charge in it, powerful enough to permanently collapse it. The spy is too quick
to be caught in a collapse, so you'll have to strategically collapse tunnels to prevent him from traveling from his
initial room to the outside of your base.
Damage to your base will be expensive to repair, so you'd like to ruin as few tunnels as possible. Find a strategy
that minimizes the number of tunnels you'll need to collapse, no matter how clever the spy is. To be safe, you’ll
have to assume that the spy knows all about your tunnel system. Your main advantage is the fact that you can
collapse tunnels whenever you like, based on your observations as the spy moves through the tunnels.

Input
The input consists of several test cases. Each test case begins with a line containing integers R (1 ≤ R ≤ 50) and
T (1 ≤ T ≤ 1000), which are the number of rooms and tunnels in your base respectively. Rooms are numbered
from 1 to R. T lines follow, each with two integers x, y (0 ≤ x,y ≤ R), which are the room numbers on either end
of a tunnel; a 0 indicates that the tunnel connects to the outside. More than one tunnel may connect a pair of
rooms.
The spy always starts out in room 1. Input is terminated by a line containing two zeros.

Output
For each test case, print a line containing the test case number (beginning with 1) followed by the minimum
number of tunnels that must be collapsed, in the worst case. Use the sample output format and print a blank line
after each test case.

Sample Input                                               Output for the Sample Input
4 6                                                        Case 1: 2
1 2
1 3                                                        Case 2: 2
2 4
3 4
4 0
4 0
4 6
1 2
1 3
1 4
2 0
3 0
4 0
0 0

                                                     19 of 20
