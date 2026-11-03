---
year: 2007
letter: "C"
title: "Grand Prix"
source: "https://icpc.global/worldfinals/problems/2007-ICPC-World-Finals/2007WorldFinalProblemSet.pdf"
source_pages: 5-6
local_pdf: "problems_pdfs/2007/C.pdf"
---

# Grand Prix
Problem C
                                                 Grand Prix
                                                 Input File: gp.in

You are the chief designer of a road race that will be held in a hilly area. The racecourse consists of N connected
straight line segments; that is, the end of the kth segment coincides with the beginning of the (k+1)st segment.
During planning, these segments are laid out on a planar surface, so 2-dimensional Cartesian coordinates
identify the endpoints. The first segment begins at the origin. Figure 1 shows the planar view of a racecourse
with 6 segments.
                                                                           The actual race is run on the side of a
     +Y
                                                                           hill. For simplicity, assume the hill
                            (x3,y3)                                        makes an angle θ with the horizontal
                                                                           plane, as illustrated in Figure 2.
            (x1,y1)                                     (x6,y6)
                                                                           The plane of the hill and the
                                                                           horizontal plane intersect in the
(0,0)                                                             +X       y-axis. Each 2-dimensional Cartesian
                                                                           coordinate (xi, yi) corresponds to a
                                  (x4,y4)                                  3-dimensional form (xi', yi', zi'), with
                  (x2,y2)                   (x5,y5)                        zi' representing the height of the
                                                                           endpoint of the ith linear segment.
                                                                           The height of the origin is 0.

                                      Figure 1
This particular race is intended for novice drivers,
so the racecourse must not include any segments
that require downhill travel. That is, if the height
of the endpoint of segment k is zk', then the height
of the endpoint of each segment after segment k
must not be less than zk'. Formally we can write                                                   (x6',y6',z6')
zk' ≤ zm', for m ≥ k.
If a proposed racecourse includes downhill                          (x3',y3',z3')
segments, it might be possible to transform it into
a racecourse with no downhill segments by               (x1',y1',z1')
rotating the planar view of the entire course about
the origin, without changing the angle between                              (x4',y4',z4')    (x5',y5',z5')
consecutive pairs of segments. However there
may be proposed racecourses that cannot be made (0,0,0)
acceptable by such a rotation.                                    (x2',y2',z2')
In this problem you must determine if a proposed                                                                   the hillside
racecourse is acceptable (that is, if it does not
contain any downhill segments). If it is not                                                        the horizontal plane
acceptable, you must determine the minimum                             θ
angle through which the racecourse must be
rotated to make it acceptable, if that is possible.
                                                                                Figure 2

                                                       5 of 20

Input
The input consists of multiple test cases. Each test case is a description of a proposed racecourse and the slope
of the hillside on which it will be run. The first line of each description contains two integers N (1 ≤ N ≤ 10000)
and θ (0º ≤ θ ≤ 45º). N denotes the number of segments in the course and θ denotes the angle (in degrees) that
the hillside makes with the horizontal plane. Each of the next N lines contains a pair of integers (xi, yi),
(1 ≤ i ≤ N), which are the endpoints of the linear segments comprising the racecourse. The first segment begins
at the origin, and segment k+1 begins at the endpoint of segment k. No segment has zero length.
The last test case is followed by a line containing two zeroes.

Output
For each test case, print a line containing the test case number (beginning with 1). If the proposed course is
acceptable without rotation, print “Acceptable as proposed”. If the course is not acceptable as proposed, but can
be made acceptable by rotating it about the origin, print “Acceptable after clockwise rotation of X degrees” or
“Acceptable after counterclockwise rotation of X degrees”. The value X should be an unsigned number. For our
purposes, a clockwise rotation would rotate the positive y-axis toward the positive x-axis. If both a clockwise
and a counterclockwise rotation can make the course acceptable, choose the one with the smaller angle. If both
rotations have the same angle, then either a clockwise or counterclockwise rotation will be accepted. If the
course cannot be made acceptable by any rotation, print “Unacceptable”. Display the angles of rotation rounded
to two fractional digits.
Print a blank line after the output for each test case. Use an output format similar to that shown in the sample
output below.

Sample Input          Output for the Sample Input
2 45                  Case 1: Acceptable after clockwise rotation of 131.99 degrees
10 10
0 1                   Case 2: Acceptable as proposed
2 0
1 1                   Case 3: Unacceptable
2 0
3 45
10 10
1 10
5 6
0 0

                                                      6 of 20
