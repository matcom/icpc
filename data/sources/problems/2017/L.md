---
year: 2017
letter: "L"
title: "Visual Python++"
source: "https://icpc.global/worldfinals/problems/2017-ICPC-World-Finals/icpc2017.pdf"
source_pages: 23-24
local_pdf: "problems_pdfs/2017/L.pdf"
---

# Visual Python++
Rapid City

                                                                                    event
                                                                                    sponsor
                                                                                                   ICPC 2017

                                             Problem L
                                        Visual Python++
                                       Time limit: 5 seconds
In the recently proposed Visual Python++ programming language, a block of statements is represented as
a rectangle of characters with top-left corner in row r1 and column c1 , and bottom-right corner in row r2
and column c2 . All characters at locations (r, c) with r1 ≤ r ≤ r2 and c1 ≤ c ≤ c2 are then considered to
belong to that block. Among these locations, the ones with r = r1 or r = r2 or c = c1 or c = c2 are called
a border.
Statement blocks can be nested (rectangles contained in other rectangles) to an arbitrary level. In a syntac-
tically correct program, every two statement blocks are either nested (one contained in the other) or disjoint
(not overlapping). In both cases, their borders may not overlap.
Programmers are not expected to draw the many rectangles contained in a typical program – this takes too
long, and Visual Python++ would not have a chance to become the next ICPC programming language. So a
programmer only has to put one character ‘p’ in the top-left corner of the rectangle and one character ‘y’ in
the bottom-right corner. The parser will automatically match up the appropriate corners to obtain the nesting
structure of the program.
Your team has just been awarded a five-hour contract to develop this part of the parser.

Input

The first line of the input contains an integer n (1 ≤ n ≤ 105 ), the number of corner pairs. Each of the next
n lines contains two integers r and c (1 ≤ r, c ≤ 109 ), specifying that there is a top-left corner in row r and
column c of the program you are parsing. Following that are n lines specifying the bottom-right corners in
the same way. All corner locations are distinct.

Output

Display n lines, each containing one integer. A number j in line i means that the ith top-left corner and the
j th bottom-right corner form one rectangle. Top-left and bottom-right corners are each numbered from 1 to
n in the order they appear in the input. The output must be a permutation of the numbers from 1 to n such
that the matching results in properly nested rectangles. If there is more than one valid matching, any one
will be accepted. If no such matching exists, display syntax error.

 Sample Input 1                                          Sample Output 1
 2                                                       2
 4 7                                                     1
 9 8
 14 17
 19 18

ACM-ICPC World Finals 2017 Problem L: Visual Python++                                                           23

                                                                              Rapid City

                                                                 event
                                                                 sponsor
                                                                           ICPC 2017

Sample Input 2                                 Sample Output 2
2                                              1
4 7                                            2
14 17
9 8
19 18

Sample Input 3                                 Sample Output 3
2                                              syntax error
4 8
9 7
14 18
19 17

Sample Input 4                                 Sample Output 4
3                                              syntax error
1 1
4 8
8 4
10 6
6 10
10 10

ACM-ICPC World Finals 2017 Problem L: Visual Python++                                  24
