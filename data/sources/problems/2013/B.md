---
year: 2013
letter: "B"
title: "Hey, Better Bettor"
source: "https://icpc.global/worldfinals/problems/2013-ICPC-World-Finals/icpc2013.pdf"
source_pages: 3-4
local_pdf: "problems_pdfs/2013/B.pdf"
---

# Hey, Better Bettor
ICPC 2013
                                     2013 World Finals
                                                                                              St. Petersburg
                                                                                              HOSTED BY   ITMO

                                          Problem B
                                     Hey, Better Bettor
                                    Time Limit: 4 seconds

      “In the casino, the cardinal rule is to keep them playing and to keep them coming back. The
      longer they play, the more they lose, and in the end, we get it all.”

                                                                      (from the 1995 film Casino)

Recent recessions have not been kind to entertainment venues, including the gambling industry. Com-
petition is fierce among casinos to attract players with lots of money, and some have begun to offer
especially sweet deals. One casino is offering the following: you can gamble as much as you want at the
casino. After you are finished, if you are down by any amount from when you started, the casino will
refund x% of your losses to you. Obviously, if you are ahead, you can keep all of your winnings. There
is no time limit or money limit on this offer, but you can redeem it only once.
For simplicity, assume all bets cost 1 dollar and pay out 2 dollars. Now suppose x is 20. If you make 10
bets in total before quitting and only 3 of them pay out, your total loss is 3.2 dollars. If 6 of them pay
out, you have gained 2 dollars.
Given x and the percentage probability p of winning any individual bet, write a program to determine
the maximum expected profit you can make from betting at this casino, using any gambling strategy.

Input

The input consists of a single test case. A test case consists of the refund percentage x (0 ≤ x < 100)
followed by the winning probability percentage p (0 ≤ p < 50). Both x and p have at most two digits
after the decimal point.

Output

Display the maximum expected profit with an absolute error of at most 10−3 .

 Sample Input 1                                       Sample Output 1
 0 49.9                                               0.0

 Sample Input 2                                       Sample Output 2
 50 49.85                                             7.10178453

ACM-ICPC World Finals 2013 Problem B: Hey, Better Bettor                                                         3
