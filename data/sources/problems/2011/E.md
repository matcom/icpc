---
year: 2011
letter: "E"
title: "Coffee Central"
source: "https://icpc.global/worldfinals/problems/2011-ICPC-World-Finals/2011WorldFinalProblemSet.pdf"
source_pages: 9-10
local_pdf: "problems_pdfs/2011/E.pdf"
---

# Coffee Central
Problem E
                                               Coffee Central
                                              Problem ID: coffee
Is it just a fad or is it here to stay? You’re not sure, but the steadily increasing number of coffee shops that are opening
in your hometown has certainly become quite a draw. Apparently, people have become so addicted to coffee that
apartments that are close to many coffee shops will actually fetch higher rents.
This has come to the attention of a local real-estate company. They are interested in identifying the most valuable
locations in the city in terms of their proximity to large numbers of coffee shops. They have given you a map of the
city, marked with the locations of coffee shops. Assuming that the average person is willing to walk only a fixed
number of blocks for their morning coffee, you have to find the location from which one can reach the largest number
of coffee shops. As you are probably aware, your hometown is built on a square grid layout, with blocks aligned on
north-south and east-west axes. Since you have to walk along streets, the distance between intersections (a, b) and
(c, d) is |a − c| + |b − d|.

Input

The input contains several test cases. Each test case describes a city. The first line of each test case contains four
integers dx, dy, n, and q. These are the dimensions of the city grid dx × dy (1 ≤ dx, dy ≤ 1000), the number of
coffee shops n (0 ≤ n ≤ 5 · 105 ), and the number of queries q (1 ≤ q ≤ 20). Each of the next n lines contains two
integers xi and yi (1 ≤ xi ≤ dx, 1 ≤ yi ≤ dy); these specify the location of the ith coffee shop. There will be at most
one coffee shop per intersection. Each of the next q lines contains a single integer m (0 ≤ m ≤ 106 ), the maximal
distance that a person is willing to walk for a cup of coffee.
The last test case is followed by a line containing four zeros.

Output

For each test case in the input, display its case number. Then display one line per query in the test case. Each line
displays the maximum number of coffee shops reachable for the given query distance m followed by the optimal
location. For example, the sample output shows that 3 coffee shops are within query distance 1 of the optimal location
(3, 4), 4 shops are within query distance 2 of optimal location (2, 2), and 5 shops are within query distance 4 of optimal
location (3, 1). If there are multiple optimal locations, pick the location that is furthest south (minimal positive integer
y-coordinate). If there is still a tie, pick the location furthest west (minimal positive integer x-coordinate).
Follow the format of the sample output.

ICPC 2011 World Finals Problem E: Coffee Central

 Sample input                                      Output for the Sample Input
 4 4 5 3                                           Case 1:
 1 1                                               3 (3,4)
 1 2                                               4 (2,2)
 3 3                                               5 (3,1)
 4 4
 2 4
 1
 2
 4
 0 0 0 0

ICPC 2011 World Finals Problem E: Coffee Central
