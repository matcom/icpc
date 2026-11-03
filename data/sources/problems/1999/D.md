---
year: 1999
letter: "D"
title: "The Fortified Forest"
source: "https://icpc.global/worldfinals/problems/1999-ICPC-World-Finals/1999WorldFinalProblemSet.pdf"
source_pages: 7-8
local_pdf: "problems_pdfs/1999/D.pdf"
---

# The Fortified Forest
The 23rd Annual
        ACM International Collegiate
          Programming Contest
           WORLD FINALS

                                                   Problem D
                                             The Fortified Forest
                                               Input: forest.in
Once upon a time, in a faraway land, there lived a king. This king owned a small collection of rare and valuable trees,
which had been gathered by his ancestors on their travels. To protect his trees from thieves, the king ordered that a high
fence be built around them. His wizard was put in charge of the operation.

Alas, the wizard quickly noticed that the only suitable material available to build the fence was the wood from the trees
themselves. In other words, it was necessary to cut down some trees in order to build a fence around the remaining trees.
Of course, to prevent his head from being chopped off, the wizard wanted to minimize the value of the trees that had to
be cut. The wizard went to his tower and stayed there until he had found the best possible solution to the problem. The
fence was then built and everyone lived happily ever after.

You are to write a program that solves the problem the wizard faced.

,QSXW
The input contains several test cases, each of which describes a hypothetical forest. Each test case begins with a line
containing a single integer Q, 2 ≤ Q ≤ 15, the number of trees in the forest. The trees are identified by consecutive integers
1 to Q. Each of the subsequent Q lines contains 4 integers [i, \i, Yi, Oi that describe a single tree. ([i, \i) is the position of the
tree in the plane, Yi is its value, and Oi is the length of fence that can be built using the wood of the tree. Yi and Oi are
between 0 and 10,000.

The input ends with an empty test case (Q = 0).

2XWSXW
(QTGCEJVGUVECUGEQORWVGCUWDUGVQHVJGVTGGUUWEJVJCVWUKPIVJGYQQFHTQOVJCVUWDUGVVJGTGOCKPKPIVTGGUECPDG
GPENQUGFKPCUKPINGHGPEG(KPFVJGUWDUGVYKVJOKPKOWOXCNWG+HOQTGVJCPQPGUWEJOKPKOWOXCNWGUWDUGVGZKUVU
EJQQUGQPGYKVJVJGUOCNNGUVPWODGTQHVTGGU(QTUKORNKEKV[TGICTFVJGVTGGUCUJCXKPI\GTQFKCOGVGT

Display, as shown below, the test case numbers (1, 2, …), the identity of each tree to be cut, and the length of the excess
fencing (accurate to two fractional digits).

Display a blank line between test cases.

6DPSOH,QSXW                                                      2XWSXWIRUWKH6DPSOH,QSXW
6                                                                 Forest 1
    0    0   8   3                                                Cut these trees: 2 4 5
    1    4   3   2                                                Extra wood: 3.16
    2    1   7   1
    4    1   2   3                                                Forest 2
    3    5   4   6                                                Cut these trees: 2
    2    3   9   8                                                Extra wood: 15.00
3
    3 0 10 2
    5 5 20 25
    7 –3 30 32
0

7KH$&03URJUDPPLQJ&RQWHVW:RUOG)LQDOVVSRQVRUHGE\,%0
