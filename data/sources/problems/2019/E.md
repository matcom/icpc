---
year: 2019
letter: "E"
title: "Dead-End Detector"
source: "https://icpc.global/worldfinals/problems/2019-ICPC-World-Finals/icpc2019.pdf"
source_pages: 9-10
local_pdf: "problems_pdfs/2019/E.pdf"
---

# Dead-End Detector
Problem E
                                        Dead-End Detector
                                        Time limit: 5 seconds
The council of your home town has decided to improve road sign placement,
especially for dead ends. They have given you a road map, and you must
determine where to put up signs to mark the dead ends. They want you to
use as few signs as possible.
The road map is a collection of locations connected by two-way streets. The
following rule describes how to obtain a complete placement of dead-end
signs. Consider a street S connecting a location x with another location. The
x-entrance of S gets a dead-end sign if, after entering S from x, it is not
                                                                                                          A dead-end sign.
possible to come back to x without making a U-turn. A U-turn is a 180-                        Source: Wikimedia Commons
degree turn immediately reversing the direction.
To save costs, you have decided not to install redundant dead-end signs, as specified by the following
rule. Consider a street S with a dead-end sign at its x-entrance and another street T with a dead-end
sign at its y-entrance. If, after entering S from x, it is possible to go to y and enter T without making a
U-turn, the dead-end sign at the y-entrance of T is redundant. See Figure E.1 for examples.

                                                                     5                         8
             1                3

                                                                                     6
                                  5                                      1
                    2                                                                              7

                          4               6                      2               3                 4

                   (a) Sample Input 1                                    (b) Sample Input 2

        Figure E.1: Illustration of sample inputs, indicating where non-redundant dead-end signs
        are placed.

Input

The first line of input contains two integers n and m, where n (1 ≤ n ≤ 5 · 105 ) is the number of
locations and m (0 ≤ m ≤ 5 · 105 ) is the number of streets. Each of the following m lines contains two
integers v and w (1 ≤ v < w ≤ n) indicating that there is a two-way street connecting locations v and
w. All location pairs in the input are distinct.

Output

On the first line, output k, the number of dead-end signs installed. On each of the next k lines, output two
integers v and w marking that a dead-end sign should be installed at the v-entrance of a street connecting
locations v and w. The lines describing dead-end signs must be sorted in ascending order of v-locations,
breaking ties in ascending order of w-locations.

ICPC World Finals 2019 Problem E: Dead-End Detector                                                                    9

Sample Input 1                                Sample Output 1
6 5                                           2
1 2                                           4 5
1 3                                           6 5
2 3
4 5
5 6

Sample Input 2                                Sample Output 2
8 8                                           3
1 2                                           1 5
1 3                                           1 6
2 3                                           3 4
3 4
1 5
1 6
6 7
6 8

ICPC World Finals 2019 Problem E: Dead-End Detector             10
