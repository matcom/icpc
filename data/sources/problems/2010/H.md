---
year: 2010
letter: "H"
title: "Rain"
source: "https://icpc.global/worldfinals/problems/2010-ICPC-World-Finals/2010WorldFinalProblemSet.pdf"
source_pages: 15-16
local_pdf: "problems_pdfs/2010/H.pdf"
---

# Rain
Problem H
                                                     Rain
                                             Problem ID: rain
In recent years, hurricanes and tsunamis have shown the destructive power of water. That destructive power is
not restricted to the sea, however. Heavy rain may cause floods, destroying people’s houses and fields. Using
intricate models, scientists try to predict where the water will accumulate as a result of significant rain.

One of the ways to model a hilly landscape is triangulation, which approximates a surface using triangles.
Triangle sides are entirely shared between two adjacent triangles, with the exception of triangles at the region
boundary, which may have some sides not shared.

Imagine you have a triangulation model of a landscape. Now the rain starts pouring down – some water flows to
the sea, and the rest gets trapped by the landscape to form lakes. Your task is to write a program that determines
how many lakes are formed and the water level in each of them. Assume that the rain is heavy enough to fill all
lakes up to their maximal levels.

For any lake, it is possible to sail between any two points on its surface (except the boundaries) with a boat
whose size is arbitrarily small, but not zero. Therefore, if two lakes share only points (or one point) having a
zero depth, they are considered different lakes.

Input
The input contains several test cases. Each test case starts with a line containing two integers, p ≥ 3, which is the
number of points, and s ≥ 3, which is the number of sides of the triangulation. Each of the next p lines describes
a triangulation point.

The description of each point starts with a two-letter code that is unique for the test case. The code is followed
by three integers that describe the point in the format x y h. Here x and y (-10000 ≤ x,y ≤ 10000) are two-
dimensional coordinates and h (0 ≤ h ≤ 8848) is the height of the point above sea level.

Each of the next s lines contains the description of one side of a triangle. The description of a side consists of
two different two-letter codes that specify the endpoints of the side. The projection of the lines to the xy-plane
satisfies the following conditions:
      • No side intersects any other side except at its endpoints.
      • The points and sides together form a triangulation of a single connected region.
      • There are no “holes” inside the region (that is, the boundary forms a single closed polygonal curve).

You may consider all points outside the triangulated region to have lower heights than the closest point of the
region boundary. In other words, if the water gets to a boundary of the region, it flows out freely.

The last line of the input contains two zeroes.

Output
For each test case, display the case number and the levels of all different lakes located inside the given region,
each on a separate line. The levels are heights above sea level and should be printed in non-decreasing order. If
no lakes are formed display a single 0. Follow the format of the sample output.

Sample Input   Output for the Sample Input
3 3            Case 1:
AA 0 0 0         0
BB 0 1 0       Case 2:
CC 1 0 0         10
AA BB            10
AA CC
BB CC
7 12
aa 1 1 5
bb 1 3 5
xX 0 2 10
XY 0 4 15
XZ 3 4 11
xy 0 0 15
xz 3 0 15
xX XZ
XY XZ
xX XY
xX xy
xX xz
xz xy
aa xX
aa xy
aa xz
bb xX
bb XY
bb XZ
0 0
