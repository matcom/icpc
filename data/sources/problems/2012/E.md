---
year: 2012
letter: "E"
title: "Infiltration"
source: "https://icpc.global/worldfinals/problems/2012-ICPC-World-Finals/icpc2012.pdf"
source_pages: 9-10
local_pdf: "problems_pdfs/2012/E.pdf"
---

# Infiltration
Problem E
                                               Infiltration
                                      Problem ID: infiltration
Good morning, agent W-12. Your mission, should you choose to accept it, is as follows.
We are infiltrating the ever so insidious Association of Chaos and Mischief (ACM) in order to take
down their command structure. Unfortunately, they appear to be prepared for such an eventuality, and
have given their command structure an annoyingly complex design which makes our infiltration quite
difficult.
The ACM command structure is divided into several cells. For each pair of cells A and B, either A
controls B or B controls A. But this “control” relation can be cyclic, so it could happen that A controls
B and B controls C and C controls A.
We can send in agents to infiltrate any particular cell, which gives us control over that cell and the cells
that it controls, but not any other cells. So in the example above, infiltrating A would give us control
over A and B, but not C.
For a successful infiltration of the ACM, we must obtain control over all of its cells, otherwise the cells
that are out of our control will discover us and start causing some of their trademark chaos and mischief.
As you know, we’re on a tight spending leash from higher authority these days, so we need to execute
this mission as efficiently as possible. Your mission is to figure out the minimum number of cells we
need to infiltrate in order to succeed.
This mission briefing will self-destruct in five hours. Good luck!

Input

The first line of a test case contains the number n of cells the ACM has (1 ≤ n ≤ 75). Each of the next
n lines contains a binary string of length n where the ith character of the j th line is 1 if cell j controls
cell i, and 0 otherwise (1 ≤ i, j ≤ n).
The ith character of the ith line is 0 and for i 6= j, either the ith character of the j th line is 1 or the j th
character of the ith line is 1, but not both.

Output

For each test case, display its case number followed by the minimum number m of cells that must be
infiltrated to obtain complete control of the ACM. Then display m numbers c1 , . . . , cm in any order,
indicating the list of cells to infiltrate (cells are numbered from 1 to n). If more than one set of m cells
gives complete control, any one will be accepted.

ACM-ICPC World Finals 2012 Problem E: Infiltration                                                             9

Sample Input                                    Output for Sample Input
2                                               Case 1: 1 2
00                                              Case 2: 2 1 2
10                                              Case 3: 2 2 3
3
010
001
100
5
01000
00011
11001
10100
10010

ACM-ICPC World Finals 2012 Problem E: Infiltration                        10
