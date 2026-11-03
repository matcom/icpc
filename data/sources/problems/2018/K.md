---
year: 2018
letter: "K"
title: "Wireless is the New Fiber"
source: "https://icpc.global/worldfinals/problems/2018-ICPC-World-Finals/icpc2018.pdf"
source_pages: 21-22
local_pdf: "problems_pdfs/2018/K.pdf"
---

# Wireless is the New Fiber
Problem K
                                   Wireless is the New Fiber
                                           Time limit: 2 seconds
A new type of unbounded-bandwidth wireless communication has just been tested and proved to be a
suitable replacement for the existing, fiber-based communications network, which is struggling to keep
up with traffic growth. You have been charged with deciding the layout of the new communications
network. The current communications network consists of a set of nodes (which route messages), and
links of fiber, each of which connects two different nodes. For each pair of nodes, there exists at least
one way (but possibly more, for bandwidth purposes) to travel along the fiber between the two.
The new communications network will not have any fiber. Instead, it will have wireless links, each
connecting two nodes. These links have unbounded bandwidth but are expensive, so it has been decided
that as few of these links will be built as possible to provide connectivity; for each pair of nodes there
should be exactly one way to travel between them along the wireless links. Moreover, you discovered
that the nodes have each been built with a particular number of connections in mind. For each node, if it
will be connected to a different number of links than it is today, it will have to be reorganized, and that
is costly.
Your task is to design the new network so that it has precisely one path between each pair of nodes while
minimizing the number of nodes that do not have the same number of connections as in the original
network. Figure K.1 shows the original network and a solution for Sample Input 1.

                               0                                                    0

                       6               2                                    6               2

                                   4                                                    4
                           3                                                    3
         5                                        1          5                                          1

               (a) The original fiber network.             (b) One possible solution. The number of links has
                                                           changed for three nodes: 1, 2, and 5.

                                   Figure K.1: Illustration of Sample Input 1.

Input

The input begins with a line containing two integers n (2 ≤ n ≤ 104 ) and m (1 ≤ m ≤ 105 ), denoting
the number of nodes and the number of fiber links in the existing network. The nodes are numbered
from 0 to n − 1. Each of the next m lines contains two distinct integers ai and bi , denoting the fact that
the ith fiber link connects nodes numbered ai and bi . It is guaranteed that for each pair of nodes there
exists at least one path connecting the two nodes. Any pair of nodes may have more than one fiber link
connecting them.

ACM-ICPC World Finals 2018 Problem K: Wireless is the New Fiber                                                 21

Output

Display the smallest number of nodes for which the number of connected links needs to change. Starting
on the next line, display a system of connections in the same format as the input. That is, display a line
containing the number of nodes (this will be the same as in the input) and the number of wireless links,
and then on subsequent lines descriptions of the links. If more than one layout is possible, any valid
layout will be accepted.

 Sample Input 1                                       Sample Output 1
 7 11                                                 3
 0 1                                                  7 6
 0 2                                                  0 1
 0 5                                                  0 2
 0 6                                                  0 5
 1 3                                                  0 6
 2 4                                                  3 6
 1 2                                                  4 6
 1 2
 1 5
 2 6
 5 6

 Sample Input 2                                       Sample Output 2
 4 3                                                  0
 0 1                                                  4 3
 2 1                                                  2 1
 2 3                                                  1 3
                                                      0 2

ACM-ICPC World Finals 2018 Problem K: Wireless is the New Fiber                                        22
