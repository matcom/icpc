---
year: 1999
letter: "E"
title: "Trade on Verweggistan"
source: "https://icpc.global/worldfinals/problems/1999-ICPC-World-Finals/1999WorldFinalProblemSet.pdf"
source_pages: 9-10
local_pdf: "problems_pdfs/1999/E.pdf"
---

# Trade on Verweggistan
The 23rd Annual
   ACM International Collegiate
     Programming Contest
      WORLD FINALS

                                                 Problem E
                                       Trade on Verweggistan
                                            Input: prul.in
Since the days of Peter Stuyvesant and Abel Tasman, Dutch merchants have been traveling all over the world to buy and
sell goods. Once there was some trade on Verweggistan, but it ended after a short time. After reading this story you will
understand why.

At that time Verweggistan was quite popular, because it was the only place in the world where people knew how to make
a ‘prul’. The end of the trade on Verweggistan meant the end of the trade in pruls (or ‘prullen’, as the Dutch plural said),
and very few people nowadays know what a prul actually is.

Pruls were manufactured in workyards. Whenever a prul was finished it was packed in a box, which was then placed on
top of the pile of previously produced pruls. On the side of each box the price was written. The price depended on the
time it took to manufacture the prul. If all went well, a prul would cost one or two florins, but on a bad day the price
could easily rise to 15 florins or more. This had nothing to do with quality; all pruls had the same value.

In those days pruls sold for 10 florins each in Holland. Transportation costs were negligible since the pruls were taken as
extra on ships that would sail anyway. When a Dutch merchant went to Verweggistan, he had a clear purpose: buy pruls,
sell them in Holland, and maximize his profits. Unfortunately, the Verweggistan way of trading pruls made this more
complicated than one would think.

One would expect that merchants would simply buy the cheapest pruls, and the pruls that cost more than 10 florins would
remain unsold. Unfortunately, all workyards on Verweggistan sold their pruls in a particular order. The box on top of the
pile was sold first, then the second one from the top, and so on. So even if the fifth box from the top was the cheapest
one, a merchant would have to buy the other four boxes above to obtain it.

As you can imagine, this made it quite difficult for the merchants to maximize their profits by buying the right set of
pruls. Not having computers to help with optimization, they quickly lost interest in trading pruls at all.

In this problem, you are given the description of several workyard piles. You have to calculate the maximum profit a
merchant can obtain by buying pruls from the piles according to the restrictions given above. In addition, you have to
determine the number of pruls he has to buy to achieve this profit.

,QSXW
The input describes several test cases. The first line of input for each test case contains a single integer Z, the number of
workyards in the test case (1 ≤ Z ≤ 50).

This is followed by Z lines, each describing a pile of pruls. The first number in each line is the number E of boxes in the
pile (0 ≤ E ≤ 20). Following it are E positive integers, indicating the prices (in florins) of the pruls in the stack, given from
top to bottom.

The input is terminated by a description starting with Z = 0. This description should not be processed.

2XWSXW
For each test case, print the case number (1, 2, …). Then print two lines, the first containing the maximum profit the
merchant can achieve. The second line should specify the number of pruls the merchant has to buy to obtain this profit. If
this number is not uniquely determined, print the possible values in increasing order. If there are more than ten possible
values, print only the 10 smallest.

           7KH$&03URJUDPPLQJ&RQWHVW:RUOG)LQDOVVSRQVRUHGE\,%0

Display a blank line between test cases.

6DPSOH,QSXW                               2XWSXWIRUWKH6DPSOH,QSXW
1                                          Workyards 1
6 12 3 10 7 16 5                           Maximum profit is 8.
2                                          Number of pruls to buy: 4
5 7 3 11 9 10
9 1 2 3 4 10 16 10 4 16                    Workyards 2
0                                          Maximum profit is 40.
                                           Number of pruls to buy: 6 7 8 9 10 12 13
