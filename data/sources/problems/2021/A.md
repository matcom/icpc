---
year: 2021
letter: "A"
title: "Crystal Crosswind"
source: "https://icpc.global/worldfinals/problems/2021-ICPC-World-Finals/icpc2021.pdf"
source_pages: 1-2
local_pdf: "problems_pdfs/2021/A.pdf"
---

# Crystal Crosswind
Problem A
                                     Crystal Crosswind
                                    Time limit: 5 seconds
You are part of a scientific team developing a new technique to image crystal structures at the molecular
level. The technique involves blowing a very fine wind over the surface of the crystal at various angles to
detect boundaries (indicated by molecules that are exposed to the wind). This is repeated with different
wind directions and the boundaries observed for each direction are recorded. Your team has already
collected the data, but – as is often the case with applied science – now the real work, analysis, must
begin.
For a given crystal, you will receive the directions in which wind blew over the surface, and the locations
of all boundaries encountered by each of these winds. For a wind blowing in direction (wx , wy ), a
boundary is defined as a location (x, y) such that a molecule exists at (x, y) and no molecule exists at
(x − wx , y − wy ). Note that for technical reasons wx and wy are not necessarily relatively prime.
The data might not uniquely determine the structure of the crystal. You must find the two unique struc-
tures with the minimal and maximal number of molecules consistent with the observations.
For example, in the first sample input, nine different molecules are directly encountered by the given
winds. There must be a molecule at location (3, 3) because otherwise (4, 2) would be a boundary for
the third wind. For similar reasons, there must be molecules at (4, 4) and (5, 5). There cannot be any
further molecules as they would result in additional observations for some of the winds.

Input

The first line of input contains three integers dx , dy , and k, where dx and dy (1 ≤ dx , dy ≤ 103 ) are
the maximum dimensions of the crystal structure, and k (1 ≤ k ≤ 10) is the number of times wind was
blown over the crystal.
Each of the remaining k lines specifies the data for one wind. These lines each start with two integers
wx and wy (−dx ≤ wx ≤ dx and −dy ≤ wy ≤ dy , but not both zero) denoting the direction of the wind.
Then comes an integer b (0 ≤ b ≤ 105 ) giving the number of boundaries encountered by this wind. The
line finishes with b distinct pairs of integers x, y (1 ≤ x ≤ dx and 1 ≤ y ≤ dy ) listing each observed
boundary.
You may assume the input is consistent with at least one crystal and that no molecules exist outside the
specified dimensions.

Output

Output two textual representations of the crystal structure separated by an empty line. Each structure
has dy rows of dx characters, with the top-left corner corresponding to location (1, 1). The first is
the structure with the minimal number of molecules consistent with the observations, the second is the
maximal one. Use ‘#’ for a location where a molecule exists and ‘.’ for a location where no molecule
exists.

ICPC World Finals 2021 Problem A: Crystal Crosswind                                                      1

Sample Input 1                                 Sample Output 1
6 6 3                                          ..#...
1 1 3 3 1 1 3 2 2                              .#.#..
0 2 6 3 1 1 3 2 2 6 4 5 3 4 2                  #.#.#.
1 -1 4 1 3 2 4 3 5 4 6                         .#.#.#
                                               ..#.#.
                                               ...#..

                                               ..#...
                                               .#.#..
                                               #.#.#.
                                               .#.#.#
                                               ..#.#.
                                               ...#..

Sample Input 2                                   Sample Output 2
5 4 2                                            #..#.
1 0 6 1 1 4 1 2 2 5 2 2 3 3 4                    .#..#
0 -1 7 1 1 4 1 5 2 2 3 3 4 4 4 5 4               .#...
                                                 ..###

                                                 ##.##
                                                 .##.#
                                                 .###.
                                                 ..###

ICPC World Finals 2021 Problem A: Crystal Crosswind                2
