---
year: 2004
letter: "A"
title: "Carl the Ant"
source: "https://icpc.global/worldfinals/problems/2004-ICPC-World-Finals/2004WorldFinalProblemSet.pdf"
source_pages: 1-2
local_pdf: "problems_pdfs/2004/A.pdf"
---

# Carl the Ant
The 2004 28th Annual       acm                  International Collegiate

                   Programming Contest World Finals
                           sponsored by IBM

                                             Problem A
                                               Carl the Ant
                                              Input File: carl.in
Ants leave small chemical trails on the ground in order to mark paths for other ants to follow. Ordinarily these
trails follow rather straight lines. But in one ant colony there is an ant named Carl, and Carl is not an ordinary
ant. Carl will often zigzag for no apparent reason, sometimes crossing his own path numerous times in the
process. When other ants come to an intersection, they always follow the path with the strongest scent, which is
the most recent path that leads away from the intersection point.
Ants are 1 centimeter long, move and burrow at 1 centimeter per second, and follow their paths exactly (bending
at right angles when moving around corners). Ants cannot cross or overlap each other. If two ants meet at the
exact same instant at an intersection point, the one that has been on Carl’s path the longest has the right of way;
otherwise, the ant that has been waiting the longest at an intersection will move first.
Carl burrows up from the ground to start at the origin at time 0. He then walks his path and burrows back down
into the ground at the endpoint. The rest of the ants follow at regular intervals. Given the description of Carl’s
path and when the other ants start the path, you are to determine how long it takes the entire set of ants to finish
burrowing back into the ground. All the ants are guaranteed to finish.

Input
Input consists of several test cases. The first line of the input file contains a single integer indicating the number
of test cases.
The input for each test case starts with a single line containing three positive integers n (1 ≤ n ≤ 50),
m (1 ≤ m ≤ 100), and d (1 ≤ d ≤ 100). Here, n is the number of line segments in Carl’s path, m is the number of
ants traveling the path (including Carl), and d is the time delay before each successive ant’s emergence. Carl
(who is numbered 0) starts at time 0. The next ant (ant number 1) will emerge at time d, the next at time 2d, and
so on. If the burrow is blocked, the ants will emerge as soon as possible in the correct order.
Each of the next n lines for the test case consists of a unique integer pair x y (-100 ≤ x, y ≤ 100), which is the
endpoint of a line segment of Carl’s path, in the order that Carl travels. The first line starts at the origin (0,0) and
the starting point of every subsequent line is the endpoint of the previous line.
For simplicity, Carl always travels on line segments parallel to the axes, and no endpoints lie on any segment
other than the ones which they serve as an endpoint.

Output
The output for each case is described as follows:

Case C:
Carl finished the path at time t1
The ants finished in the following order:
a1 a2 a3 ... am
The last ant finished the path at time t2
Here, C is the case number (starting at 1), a1, a2, a3, … am are the ant numbers in the order that they go
back underground, and t1 and t2 are the times (in seconds) at which Carl and the last ant finish going
underground. You should separate consecutive cases with a single blank line.

        The 2004 ACM Programming Contest World Finals sponsored by IBM

Sample Input       Output for the Sample Input
2                  Case 1:
4 7 4              Carl finished the path at time 13
0 4                The ants finished in the following order:
2 4                0 2 1 3 4 5 6
2 2                The last ant finished the path at time 29
-2 2
4 7 2              Case 2:
0 4                Carl finished the path at time 13
2 4                The ants finished in the following order:
2 2                0 4 1 5 2 6 3
-2 2               The last ant finished the path at time 19
