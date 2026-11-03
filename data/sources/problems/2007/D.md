---
year: 2007
letter: "D"
title: "Jacquard Circuits"
source: "https://icpc.global/worldfinals/problems/2007-ICPC-World-Finals/2007WorldFinalProblemSet.pdf"
source_pages: 7-8
local_pdf: "problems_pdfs/2007/D.pdf"
---

# Jacquard Circuits
Problem D
                                         Jacquard Circuits
                                             Input: jacquard.in

The eccentric sculptor Albrecht Caravaggio Mondrian has been inspired by the history of the computer to create
works of art that he calls “Jacquard circuits.” Each of his works of art consists of a series of polygonal circuit
boards (defined below), all having the same shape but at different scales, joined together with wire or string into
a three-dimensional tiered structure. Figure 1 below shows an example with two levels and a pentagonal shape.

                                                      Figure 1

A.C.M. (as he is known to his friends) bases his art upon the punched hole cards of the Jacquard loom (that were
later adapted by Charles Babbage for his analytical engine) and upon the regular grid layout approach often used
in circuit interfacing (for instance, Pin Grid Arrays).
The circuit boards used in the sculptures are in the shapes of lattice polygons. A lattice polygon is defined as any
closed, non-self-intersecting cycle of straight line segments that join points with integer coordinates, with no
two consecutive line segments parallel. For any given lattice polygon P, there is a smallest lattice polygon with
the same shape and orientation as P – call this the origin. Smaller polygons of the same shape and orientation as
P are called its predecessors and polygons larger than P are its successors. (See Figure 2 on the following page.)
To build one of his sculptures, A.C.M. begins by randomly selecting N lattice points and then drawing a pattern
by connecting these points. (Note that not all of the N points are necessarily vertices of a lattice polygon. This
may happen, for example, if three or more consecutive points are collinear.) Let P be the lattice polygon
determined by the pattern. Then he determines the origin corresponding to P, selects the number of levels, M, he
wishes to use, and constructs the first M polygonal circuit boards in the series (that is, the origin and its first M-1
successors). Each lattice point lying strictly within the boundary of any of these polygons is a hole where strings
or wires meet.
The hard part of creating the sculpture is tying together all the strings or wires that meet at a given hole.
Furthermore, some of A.C.M.’s famous miniaturized sculptures, built using nano-engineering techniques,
involve hundreds of thousands of levels. Mondrian would like a way to determine, given a polygonal shape and
the number of levels, how many holes there will be in the final sculpture. You must write a program to help him.
(For example, the sculpture in Figure 1 above has 15 holes.) Assume holes have zero diameter.

                                                       7 of 20

                      Pattern polygon “P”                           P’s immediate successor
          (0,8)                              (8,8)

                                                                (12,4)
                         Origin

             (0,0)                         (8,0)           P’s immediate predecessor

                                                     Figure 2
Input
The input consists of one or more test cases. Each case begins with a line containing two positive integers
N (3 ≤ N ≤ 1000) and M (1 ≤ M ≤ 1000000). N is the number of lattice points Mondrian selected and M is the
number of levels in the completed sculpture. Each of the next N lines contains two integers x, y (|x|, |y| ≤
1000000) which denote the coordinates of one of Mondrian’s points. Points are listed in either clockwise or
counterclockwise order.
The last test case is followed by a line containing two zeroes.

Output
For each test case, print a line containing the test case number (beginning with 1) followed by the number of
holes in an M-level sculpture starting from the origin polygon of the given pattern. In no case will this value
exceed the maximum possible value of a 64-bit signed integer.

Sample Input                                               Output for the Sample Input
5 2                                                        Case 1: 15
0 0                                                        Case 2: 2
8 0
12 4
8 8
0 8
3 2
-1 -1
3 1
5 -1
0 0

                                                      8 of 20
