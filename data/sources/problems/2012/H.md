---
year: 2012
letter: "H"
title: "Room Service"
source: "https://icpc.global/worldfinals/problems/2012-ICPC-World-Finals/icpc2012.pdf"
source_pages: 15-16
local_pdf: "problems_pdfs/2012/H.pdf"
---

# Room Service
Problem H
                                         Room Service
                                        Problem ID: room
You are working for a company designing cute, funny robot vacuum cleaners. At a high level, the robots’
behavior is divided into three modes:

   1. Exploration
   2. Vacuuming
   3. Rampant Killing

Unfortunately, while consumer testing shows that the last two modes are working perfectly, the explo-
ration mode still has bugs. You’ve been put in charge of debugging.
At the beginning of the exploration mode, the robot is placed into a convex polygonal room. It has
sensors that should tell it where all the walls are. Your job is to write a program that verifies that these
readings are correct. To do this, the robot needs to physically touch every wall in the room.
Your problem is this: given the shape of a convex polygonal room with N walls and a starting point P
inside it, determine the shortest route that touches each wall and then returns to P . Touching a corner
counts as touching both incident walls.

Input

Each test case starts with a line containing the number of vertices N of the polygon (3 ≤ N ≤ 100) and
the integer coordinates Px and Py of the robot’s starting point (−10 000 ≤ Px , Py ≤ 10 000). This is
followed by N lines, each containing two integers x, y (−10 000 ≤ x, y ≤ 10 000) defining a vertex of
the polygon. Vertices are given in counterclockwise order, all interior angles are less than 180 degrees,
the polygon does not self-intersect, and the robot’s starting point is strictly inside the polygon.

Output

For each test case, display the case number and the length of the desired route, accurate to two decimal
places.

 Sample Input                                          Output for Sample Input
 4 0 0                                                 Case 1: 5.66
 -1 -1                                                 Case 2: 36.73
 1 -1
 1 1
 -1 1
 3 10 1
 0 0
 30 0
 0 20

ACM-ICPC World Finals 2012 Problem H: Room Service                                                       15
