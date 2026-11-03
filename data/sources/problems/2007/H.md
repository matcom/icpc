---
year: 2007
letter: "H"
title: "Raising the Roof"
source: "https://icpc.global/worldfinals/problems/2007-ICPC-World-Finals/2007WorldFinalProblemSet.pdf"
source_pages: 15-16
local_pdf: "problems_pdfs/2007/H.pdf"
---

# Raising the Roof
Problem H
                                          Raising the Roof
                                             Input File: roof.in

You have agreed to help a roofer estimate the amount of material required to protect the surface of a roof from
sun damage by computing the surface area of the roof that can be seen when viewed from directly above.
The geometry of a roof is defined by the vertices of the triangles that enclose the plane surfaces of the roof. The
x and y coordinates of a vertex are determined from an aerial view of the roof, and the z coordinate is the height
of the vertex above the ground, assuming that the ground is level (which we do). For example, a line segment
with vertices (10,10,10) and (10,20,10) is parallel to the ground, and is 10 units long. A line segment with
vertices (10,10,10) and (10,18,16) slopes from 10 units to 16 units above the ground; in the aerial view of the
roof it is 8 units long, but the actual length is 10 units.
In an aerial view of a roof, one region of the roof can sometimes obscure a lower region. Only visible portions
of the roof should be included in the total. For example, suppose you view a two-story building with a second
floor that is smaller than the first floor. Obviously the area of the second floor’s roof must be included in the
total, but the visible surface area of the first floor’s roof will not include the area directly underneath the second
floor’s roof.
Input
The input consists of several test cases corresponding to roof descriptions. A test case begins with a line
containing integers V (1 ≤ V ≤ 300), which is the number of vertices, and T (1 ≤ T ≤ 1000), which is the number
of triangles. Each of the next V lines contains the coordinates x, y, z of a vertex. The test case concludes with T
triangle descriptions, each consisting of the three vertex indices describing the vertices of a roof triangle.
Vertices are numbered sequentially in the order they appear in the input, starting with 1.
All coordinates are positive integers no greater than 100. No roof triangles are degenerate, and all pairs of roof
triangles have disjoint interiors – that is, they may touch but they will not overlap or intersect.
The last test case is followed by a line containing two zeroes.
Output
For each test case, print a line containing the test case number (beginning with 1) followed by the total visible
surface area of the roof, accurate to two fractional digits. Use the sample output format and print a blank line
after each case.

Sample Input                                                   Output for the Sample Input
6 2                                                            Case 1: 75.00
10 10 10
10 20 10                                                       Case 2: 50.00
20 10 10
10 10 20
10 20 20
20 20 20
1 2 3
4 5 6
3 1
10 10 10
10 18 16
20 10 10
1 2 3
0 0

                                                       15 of 20
