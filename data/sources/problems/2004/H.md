---
year: 2004
letter: "H"
title: "Tree-Lined Streets"
source: "https://icpc.global/worldfinals/problems/2004-ICPC-World-Finals/2004WorldFinalProblemSet.pdf"
source_pages: 15-16
local_pdf: "problems_pdfs/2004/H.pdf"
---

# Tree-Lined Streets
The 2004 28th Annual     acm                   International Collegiate

                   Programming Contest World Finals
                           sponsored by IBM

                                           Problem H
                                       Tree-Lined Streets
                                          Input File: streets.in

The city council of Greenville recently voted to improve the appearance of inner city streets. To provide more
greenery in the scenery, the city council has decided to plant trees along all major streets and avenues. To get an
idea of how expensive this urban improvement project will be, the city council wants to determine how many
trees will be planted. The planting of trees is limited in two ways:
     • Along a street, trees have to be planted at least 50 meters apart. This is to provide adequate growing
          space, and to keep the cost of the project within reasonable limits.
     • Due to safety concerns, no tree should be planted closer than 25 meters along a street to the nearest
          intersection. This is to ensure that traffic participants can easily see each other approaching an
          intersection. Traffic safety should not be compromised by reducing visibility.
All streets considered in this project are straight. They have no turns or bends.
The city council needs to know the maximum number of trees that can be planted under these two restrictions.

Input
The input consists of descriptions of several street maps. The first line of each description contains an integer n
(1 ≤ n ≤ 100), which is the number of streets in the map. Each of the following n lines describes a street as a line
segment in the Cartesian plane. An input line describing a street contains four integers x1, y1, x2, and y2. This
means that this street goes from point (x1, y1) to point (x2, y2). The coordinates x1, y1, x2, and y2 are given in
meters, (0 ≤ x1, y1, x2, y2 ≤ 100000). Every street has a positive length. Each end point lies on exactly one street.

For each street, the distances between neighboring intersections and/or the end points of the street are not exact
multiples of 25 meters. More precisely, the difference of such a distance to the nearest multiple of 25 meters will
be at least 0.001 meters. At each intersection, exactly two streets meet.
Input for the last street map description is followed by a line consisting of the number 0.

Output
For each street map described in the input, first print its number in the sequence. Then print the maximum
number of trees that can be planted under the restrictions specified above. Follow the format in the sample
output given below.

     The 2004 ACM Programming Contest World Finals sponsored by IBM

Sample Input                        Output for the Sample Input
3                                   Map 1
0 40 200 40                         Trees = 13
40 0 40 200                         Map 2
0 200 200 0                         Trees = 20
4                                   Map 3
0 30 230 30                         Trees = 7
0 200 230 200
30 0 30 230
200 0 200 230
3
0 1 121 1
0 0 121 4
0 4 121 0
0
