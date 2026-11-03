---
year: 2024
letter: "F"
title: "Friendly Rivalry"
source: "https://icpc.global/worldfinals/problems/2024-ICPC-World-Finals/icpc2024.pdf"
source_pages: 11-12
local_pdf: "problems_pdfs/2024/F.pdf"
---

# Friendly Rivalry
Problem F
                                       Friendly Rivalry
                                    Time limit: 2 seconds
The leaders of the International Coalition for Planetary Change (ICPC), a non-profit fighting for envi-
ronmental awareness, are worried that their regional chapters are not doing enough to make a real impact
on climate change. Inspired by the latest studies that competition is one of the best motivators, they have
decided to start a competition between their chapters.
At the same time, the ICPC does not want to slow the spread of ideas. To encourage chapters to share
effective climate change methods, the ICPC has decided to assign their 2n chapters into two teams, the
green team and the blue team. For balance, each team should consist of exactly n chapters.
To ensure the teams are not getting in each other’s way, the ICPC wants the two teams to be as far
apart as possible. Specifically, the Euclidean distance between the closest pair of chapters belonging to
different teams should be as large as possible.
Help the ICPC set up the teams according to these rules.

Input

The first line contains an integer n (1 ≤ n ≤ 500), the size of each team. Chapters are numbered from
1 to 2n. Each of the remaining 2n lines contains two integers xi and yi (−109 ≤ xi , yi ≤ 109 ), the
Cartesian coordinates of the location of the ith chapter. All chapters are at distinct locations.

Output

Output n + 1 numbers. The first number is the distance between the two closest chapters belonging to
different teams. The next n numbers are the chapters belonging to the blue team. If there are multiple
ways to divide the teams with the same minimal distance, output any of them. The distance should have
an absolute or relative error of at most 10−6 .

 Sample Input 1                                       Sample Output 1
 2                                                    1.000000
 0 1                                                  1
 1 0                                                  2
 1 1
 0 0

 Sample Input 2                                       Sample Output 2
 2                                                    2.236068
 0 1                                                  4
 -1 -1                                                2
 1 0
 2 2

48th ICPC World Championship Problem F: Friendly Rivalry © ICPC Foundation                              11

Sample Input 3                                Sample Output 3
3                                             1.414214
0 0                                           1
1 1                                           2
2 2                                           3
3 3
4 4
5 5

48th ICPC World Championship Problem F: Friendly Rivalry © ICPC Foundation   12
