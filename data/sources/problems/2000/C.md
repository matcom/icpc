---
year: 2000
letter: "C"
title: "Cutting Chains"
source: "https://icpc.global/worldfinals/problems/2000-ICPC-World-Finals/2000WorldFinalProblemSet.pdf"
source_pages: 6-7
local_pdf: "problems_pdfs/2000/C.pdf"
---

# Cutting Chains
The 2000 24th Annual      acm                  International Collegiate

                     Programming Contest World Finals
                             sponsored by IBM

                                              Problem C
                                             Cutting Chains
                                             Input File: chains.in

What a find! Anna Locke has just bought several links of chain some of which may be connected. They are made
from zorkium, a material that was frequently used to manufacture jewelry in the last century, but is not used for that
purpose anymore. It has its very own shine, incomparable to gold or silver, and impossible to describe to anyone
who has not seen it first hand.
Anna wants the pieces joined into a single end-to-end strand of chain. She takes the links to a jeweler who tells her
that the cost of joining them depends on the number of chain links that must be opened and closed. In order to
minimize the cost, she carefully calculates the minimum number of links that have to be opened to rejoin all the
links into a single sequence. This turns out to be more difficult than she at first thought. You must solve this
problem for her.

Input
The input consists of descriptions of sets of chain links, one set per line. Each set is a list of integers delimited by
one or more spaces. Every description starts with an integer n, which is the number of chain links in the set, where
1 ≤ n ≤ 15. We will label the links 1, 2,…, n. The integers following n describe which links are connected to each
other. Every connection is specified by a pair of integers i,j where 1 ≤ i,j ≤ n and i ≠ j, indicating that chain links i
and j are connected, i.e., one passes through the other. The description for each set is terminated by the pair -1 -1,
which should not be processed.
The input is terminated by a description starting with n = 0. This description should not be processed and will not
contain data for connected links.

Output
For each set of chain links in the input, output a single line which reads
Set N: Minimum links to open is M
where N is the set number and M is the minimal number of links that have to be opened and closed such that all links
can be joined into one single chain.

 Sample Input                                                         Output for the Sample Input
 5    1 2    2 3     4 5 -1 -1                                        Set 1: Minimum links to open is 1
 7    1 2    2 3     3 1 4 5 5 6             6 7     7 4 -1 -1        Set 2: Minimum links to open is 2
 4    1 2    1 3     1 4 -1 -1                                        Set 3: Minimum links to open is 1
 3    1 2    2 3     3 1 -1 -1                                        Set 4: Minimum links to open is 1
 3    1 2    2 1     -1 -1                                            Set 5: Minimum links to open is 1
 0

The 2000 ACM Programming Contest World Finals sponsored by IBM
