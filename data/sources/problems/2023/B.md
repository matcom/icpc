---
year: 2023
letter: "B"
title: "Schedule"
source: "https://icpc.global/worldfinals/problems/2023-ICPC-World-Finals/icpc2023.pdf"
source_pages: 3-4
local_pdf: "problems_pdfs/2023/B.pdf"
---

# Schedule
World Finals | ICPC 2023 Luxor
     47th Annual                                                                             hosted by
     ICPC World
   Championship                                                                              AASTMT

                                          Problem B
                                            Schedule
                                    Time limit: 2 seconds
The Institute for Creative Product Combinations (ICPC) tries to find unusual and innovative ways to
unite seemingly unrelated products or technologies, opening up new markets and creating new jobs. (For
instance, their most recent success was the “hairbachi,” a hair-dryer with a hibachi grill top attachment
for preparing on-the-go hot meals.) The company employs n teams of size 2 to research individual
products, then members of the different teams get together to explore ways of combining products.
During the pandemic, the ICPC management organized everyone’s schedule in such a way that there
were never more than n people in the office at the same time, and things ran so smoothly that they
continued the process once things began to return to normal. Here is the scheme they used. Label the
teams with integers 1 through n and the two people on the ith team as (i, 1) and (i, 2) for each i from 1
to n. Each week, exactly one person from each team is allowed in the office, while the other has to stay
away. The employees (i, 1) and (i, 2) know each other well and collaborate productively regardless of
being isolated from each other, so members of the same team do not need to meet in person in the office.
However, isolation between members from different teams is still a concern.
Each pair of teams i and j for i 6= j has to collaborate occasionally. For a given number w of weeks and
for fixed team members (i, a) and (j, b), let w1 < w2 < . . . < wk be the weeks in which these two team
members meet in the office. The isolation of those two people is the maximum of

                        {w1 , w2 − w1 , w3 − w2 , . . . , wk − wk−1 , w + 1 − wk },

or infinity if those two people never meet. The isolation of the whole company is the maximum isolation
across all choices of i, j, a, and b.
You have been tasked to find a weekly schedule that minimizes the isolation of the whole company over
a given number w of weeks.

Input

The input consists of a single line containing two integers n (2 ≤ n ≤ 104 ) and w (1 ≤ w ≤ 52), where
n is the number of teams and w is the number of weeks that need to be scheduled.

Output

Output a line containing either an integer representing the minimum isolation achievable for n teams
or the word infinity if no schedule guarantees that every pair of individuals on different teams
can meet. If the isolation is finite, it is followed by w lines representing a schedule that achieves this
isolation. The j th line of the schedule is a string of length n containing only the symbols 1 and 2, where
the ith symbol indicates which of the two members from team i comes into the office on week j.

47th ICPC World Championship Problem B: Schedule © ICPC Foundation                                       3

                                 World Finals | ICPC 2023 Luxor
   47th Annual                                                       hosted by
    ICPC World
  Championship                                                       AASTMT

Sample Input 1                               Sample Output 1
2 6                                          4
                                             11
                                             12
                                             21
                                             22
                                             11
                                             12

Sample Input 2                               Sample Output 2
2 1                                          infinity

47th ICPC World Championship Problem B: Schedule © ICPC Foundation               4
