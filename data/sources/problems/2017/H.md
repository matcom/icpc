---
year: 2017
letter: "H"
title: "Scenery"
source: "https://icpc.global/worldfinals/problems/2017-ICPC-World-Finals/icpc2017.pdf"
source_pages: 15-16
local_pdf: "problems_pdfs/2017/H.pdf"
---

# Scenery
Rapid City

                                                                                                   event
                                                                                                   sponsor
                                                                                                             ICPC 2017

                                               Problem H
                                                     Scenery
                                       Time limit: 6 seconds

                                    Images by John Fowler, Carol Highsmith, and Richard Woodland

You have decided to spend a day of your trip to Rapid City taking photographs of the South Dakota Badlands,
which are renowned for their spectacular and unusual land formations. You are an amateur photographer,
yet very particular about lighting conditions.
After some careful research, you have located a beautiful location in the Badlands, surrounded by pic-
turesque landscapes. You have determined a variety of features that you wish to photograph from this
location. For each feature you have identified the earliest and latest time of day at which the position of
the sun is ideal. However, it will take quite a bit of time to take each photograph, given the need to repo-
sition the tripod and camera and your general perfectionism. So you are wondering if it will be possible to
successfully take photographs of all these features in one day.

Input

The first line of the input contains two integers n (1 ≤ n ≤ 104 ) and t (1 ≤ t ≤ 105 ), where n is the number
of desired photographs and t is the time you spend to take each photograph. Following that are n additional
lines, each describing the available time period for one of the photographs. Each such line contains two
nonnegative integers a and b, where a is the earliest time that you may begin working on that photograph,
and b is the time by which the photograph must be completed, with a + t ≤ b ≤ 109 .

Output

Display yes if it is possible to take all n photographs, and no otherwise.

ACM-ICPC World Finals 2017 Problem H: Scenery                                                                            15

                                                                               Rapid City

                                                                  event
                                                                  sponsor
                                                                            ICPC 2017

Sample Input 1                                  Sample Output 1
2 10                                            yes
0 15
5 20

Sample Input 2                                  Sample Output 2
2 10                                            no
1 15
0 20

Sample Input 3                                  Sample Output 3
2 10                                            yes
5 30
10 20

ACM-ICPC World Finals 2017 Problem H: Scenery                                           16
