---
year: 2011
letter: "J"
title: "Pyramids"
source: "https://icpc.global/worldfinals/problems/2011-ICPC-World-Finals/2011WorldFinalProblemSet.pdf"
source_pages: 19-20
local_pdf: "problems_pdfs/2011/J.pdf"
---

# Pyramids
Problem J
                                                    Pyramids
                                           Problem ID: pyramids
It is not too hard to build a pyramid if you have a lot of identical cubes. On a flat foundation you lay, say, 10 × 10
cubes in a square. Centered on top of that square you lay a 9 × 9 square of cubes. Continuing this way you end up
with a single cube, which is the top of the pyramid. The height of such a pyramid equals the length of its base, which
in this case is 10. We call this a high pyramid.
If you think that a high pyramid is too steep, you can proceed as follows. On the 10 × 10 base square, lay an 8 × 8
square, then a 6 × 6 square, and so on, ending with a 2 × 2 top square (if you start with a base of odd length, you end
up with a single cube on top, of course). The height of this pyramid is about half the length of its base. We call this a
low pyramid.
Once upon a time (quite a long time ago, actually) there was a pharaoh who inherited a large number of stone cubes
from his father. He ordered his architect to use all of these cubes to build a pyramid, not leaving a single one unused.
The architect kindly explained that not every number of cubes can form a pyramid. With 10 cubes you can build a low
pyramid with base 3. With 5 cubes you can build a high pyramid of base 2. But no pyramid can be built using exactly
7 cubes.
The pharaoh was not amused, but after some thinking he came up with new restrictions.

   1. All cubes must be used.
   2. You may build more than one pyramid, but you must build as few pyramids as possible.
   3. All pyramids must be different.
   4. Each pyramid must have a height of at least 2.
   5. Satisfying the above, the largest of the pyramids must be as large as possible (i.e., containing the most cubes).
   6. Satisfying the above, the next-to-largest pyramid must be as large as possible.
   7. And so on...

Drawing figures and pictures in the sand, it took the architect quite some time to come up with the best solution.
Write a program that determines how to meet the restrictions of the pharaoh, given the number of cubes.

Input

The input consists of several test cases, each one on a single line. A test case is an integer c, where 1 ≤ c ≤ 106 ,
giving the number of cubes available.
The last test case is followed by a line containing a single zero.

ICPC 2011 World Finals Problem J: Pyramids

Output

For each test case, display its case number followed by the pyramids to be built. The pyramids should be ordered
with the largest first. Pyramids are specified by the length of their base followed by an L for low pyramids or an
H for high pyramids. If two differenct pyramids have the same number of cubes, list the high pyramid first. Print
“impossible” if it is not possible to meet the requirements of the pharaoh.
Follow the format of the sample output.

  Sample input                                          Output for the Sample Input
  29                                                    Case 1: 3H 3L 2H
  28                                                    Case 2: impossible
  0

ICPC 2011 World Finals Problem J: Pyramids
