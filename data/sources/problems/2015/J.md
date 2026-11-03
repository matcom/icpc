---
year: 2015
letter: "J"
title: "Tile Cutting"
source: "https://icpc.global/worldfinals/problems/2015-ICPC-World-Finals/icpc2015.pdf"
source_pages: 19-20
local_pdf: "problems_pdfs/2015/J.pdf"
---

# Tile Cutting
Problem J
                                           Tile Cutting
                                    Time limit: 15 seconds
Youssef is a Moroccan tile installer who specializes in mosaics like the one
shown on the right. He has rectangular tiles of many dimensions at his
disposal, and the dimensions of all his tiles are integer numbers of centime-
ters. When Youssef needs parallelogram-shaped tiles, he cuts them from
his supply on hand. To make this work easier, he invented a tile cutting
machine that superimposes a centimeter grid on the cutting surface to guide
the cuts on the tiles. Due to machine limitations, aesthetic sensibilities, and
Youssef’s dislike of wasted tiles, the following rules determine the possible
cuts.

   1. The rectangular tile to be cut must be positioned in the bottom left corner of the cutting surface
      and the edges must be aligned with the grid lines.
   2. The cutting blade can cut along any line connecting two different grid points on the tile boundary
      as long as the points are on adjacent boundary edges.
   3. The four corners of the resulting parallelogram tile must lie on the four sides of the original
      rectangular tile.
   4. No edge of the parallelogram tile can lie along an edge of the rectangular tile.

Figure J.1 shows the eight different ways in which a parallelogram tile of area 4 square centimeters can
be cut out of a rectangular tile, subject to these restrictions.

               Figure J.1: The eight different ways for cutting a parallelogram of area 4.

Youssef needs to cut tiles of every area between alo and ahi . Now he wonders, for which area a in this
range can he cut the maximum number of different tiles?

ACM-ICPC World Finals 2015 Problem J: Tile Cutting                                                   19

Input

The input consists of multiple test cases. The first line of input contains an integer n (1 ≤ n ≤ 500), the
number of test cases. The next n lines each contain two integers alo , ahi (1 ≤ alo ≤ ahi ≤ 500 000), the
range of areas of the tiles.

Output

For each test case alo , ahi , display the value a between alo and ahi such that the number of possible ways
to cut a parallelogram of area a is maximized as well as the number of different ways w in which such
a parallelogram can be cut. If there are multiple possible values of a display the smallest one.

 Sample Input 1                                        Sample Output 1
 2                                                     4 8
 4 4                                                   6 20
 2 6

ACM-ICPC World Finals 2015 Problem J: Tile Cutting                                                       20
