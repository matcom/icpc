---
year: 2004
letter: "C"
title: "Image Is Everything"
source: "https://icpc.global/worldfinals/problems/2004-ICPC-World-Finals/2004WorldFinalProblemSet.pdf"
source_pages: 5-6
local_pdf: "problems_pdfs/2004/C.pdf"
---

# Image Is Everything
The 2004 28th Annual      acm                  International Collegiate

                   Programming Contest World Finals
                           sponsored by IBM

                                            Problem C
                                      Image Is Everything
                                           Input File: image.in

Your new company is building a robot that can hold small lightweight objects. The robot will have the
intelligence to determine if an object is light enough to hold. It does this by taking pictures of the object from
the 6 cardinal directions, and then inferring an upper limit on the object’s weight based on those images. You
must write a program to do that for the robot.
You can assume that each object is formed from an N×N×N lattice of cubes, some of which may be missing.
Each 1×1×1 cube weighs 1 gram, and each cube is painted a single solid color. The object is not necessarily
connected.

Input
The input for this problem consists of several test cases representing different objects. Every case begins with a
line containing N, which is the size of the object (1 ≤ N ≤10). The next N lines are the different N×N views of
the object, in the order front, left, back, right, top, bottom. Each view will be separated by a single space from
the view that follows it. The bottom edge of the top view corresponds to the top edge of the front view.
Similarly, the top edge of the bottom view corresponds to the bottom edge of the front view. In each view,
colors are represented by single, unique capital letters, while a period (.) indicates that the object can be seen
through at that location.
Input for the last test case is followed by a line consisting of the number 0.

Output
For each test case, print a line containing the maximum possible weight of the object, using the format shown
below.

Sample Input                                                Output for the Sample Input
3                                                           Maximum weight: 11 gram(s)
.R. YYR .Y. RYY .Y. .R.                                     Maximum weight: 8 gram(s)
GRB YGR BYG RBY GYB GRB
.R. YRR .Y. RRY .R. .Y.
2
ZZ ZZ ZZ ZZ ZZ ZZ
ZZ ZZ ZZ ZZ ZZ ZZ
0

The 2004 ACM Programming Contest World Finals sponsored by IBM
