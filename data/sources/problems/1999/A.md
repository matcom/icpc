---
year: 1999
letter: "A"
title: "Bee Breeding"
source: "https://icpc.global/worldfinals/problems/1999-ICPC-World-Finals/1999WorldFinalProblemSet.pdf"
source_pages: 1-2
local_pdf: "problems_pdfs/1999/A.pdf"
---

# Bee Breeding
The 23rd Annual
   ACM International Collegiate
     Programming Contest
      WORLD FINALS

                                                Problem A
                                                Bee Breeding
                                                Input: bees.in
Professor B. Heif is conducting experiments with a species of South American bees that he found during an expedition to
the Brazilian rain forest. The honey produced by these bees is of superior quality compared to the honey from European
and North American honey bees. Unfortunately, the bees do not breed well in captivity. Professor Heif thinks the reason
is that the placement of the different maggots (for workers, queens, etc.) within the honeycomb depends on
environmental conditions, which are different in his laboratory and the rain forest.

As a first step to validate his theory, Professor Heif wants to quantify the difference in maggot placement. For this he
measures the distance between the cells of the comb into which the maggots are placed. To this end, the professor has
labeled the cells by marking an arbitrary cell as number 1, and then labeling the remaining cells in a clockwise fashion, as
shown in the following figure.

                         __    __    __    __
                      __/ \__/ \__/ \__/ \__
                   __/ \__/ \__/53\__/ \__/ \__
                  / \__/ \__/52\__/54\__/ \__/ \
                  \__/ \__/51\__/31\__/55\__/ \__/
                  / \__/50\__/30\__/32\__/56\__/ \
                  \__/49\__/29\__/15\__/33\__/57\__/
                  / \__/28\__/14\__/16\__/34\__/ \
                  \__/48\__/13\__/ 5\__/17\__/58\__/
                  /..\__/27\__/ 4\__/ 6\__/35\__/ \
                  \__/47\__/12\__/ 1\__/18\__/59\__/
                  /..\__/26\__/ 3\__/ 7\__/36\__/ \
                  \__/46\__/11\__/ 2\__/19\__/60\__/
                  /..\__/25\__/10\__/ 8\__/37\__/ \
                  \__/45\__/24\__/ 9\__/20\__/61\__/
                  /..\__/44\__/23\__/21\__/38\__/ \
                  \__/70\__/43\__/22\__/39\__/62\__/
                  / \__/69\__/42\__/40\__/63\__/ \
                  \__/ \__/68\__/41\__/64\__/ \__/
                  / \__/ \__/67\__/65\__/ \__/ \
                  \__/ \__/ \__/66\__/ \__/ \__/
                     \__/ \__/ \__/ \__/ \__/
                        \__/ \__/ \__/ \__/

For example, two maggots in cells 19 and 30 are 5 cells apart. One of the shortest paths connecting the two cells is via
the cells 19 - 7 - 6 - 5 - 15 - 30, so you must move five times to adjacent cells to get from 19 to 30.

Professor Heif needs your help to write a program that computes the distance, defined as the number of cells in a shortest
path, between any pair of cells.

,QSXW
The input consists of several lines, each containing two integers D and E (D,E ≤ 10000), denoting numbers of cells. The
integers are always positive, except in the last line where D=E=0 holds. This last line terminates the input and should not
be processed.

            7KH$&03URJUDPPLQJ&RQWHVW:RUOG)LQDOVVSRQVRUHGE\,%0

2XWSXW
For each pair of numbers (D,E) in the input file, output the distance between the cells labeled D and E. The distance is the
minimum number of moves to get from D to E.

6DPSOH,QSXW                               2XWSXWIRUWKH6DPSOH,QSXW
19 30                                      The distance between cells 19 and 30 is 5.
0 0
