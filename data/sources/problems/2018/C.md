---
year: 2018
letter: "C"
title: "Conquer The World"
source: "https://icpc.global/worldfinals/problems/2018-ICPC-World-Finals/icpc2018.pdf"
source_pages: 5-6
local_pdf: "problems_pdfs/2018/C.pdf"
---

# Conquer The World
Problem C
                                   Conquer The World
                                    Time limit: 8 seconds
Bwahahahahaha!!! Your nemesis, the dashingly handsome spy Waco Powers, has at last fallen to your
secret volcano base’s deathtraps (or so you assume, being a little too busy to witness it firsthand). At
long last, you are all set to C ONQUER T HE W ORLD!
Nothing will stand in your way! Well, nothing except a minor problem of logistics. Your evil armies
have announced that they will not continue carving their relentless path of destruction across the puny
nations of the world without being paid. And unfortunately you are running low on cash – a volcano
lair has many wonderful qualities, but “reasonably affordable” is not one of them. You have had to pull
funds from the travel budget to pay your ungrateful underlings. Now you are not sure how you will
actually get your armies into position to C ONQUER T HE W ORLD.
You have a map of the nations of the world and all your available transport routes between them. Each
route connects two nations and has a fixed cost per army that uses it. The routes are laid out such that
there is exactly one way to travel between any two nations. You know the current position of each of
your armies and how many you will need to place permanently in each nation in order to subjugate it.
How can you move the armies into place as cheaply as possible so you can C ONQUER T HE W ORLD?

Input

The first line of input contains an integer n (1 ≤ n ≤ 250 000), the number of nations. This is followed
by n − 1 lines, each containing three integers u, v, and c (1 ≤ u, v ≤ n, 1 ≤ c ≤ 106 ), indicating that
there is a bidirectional route connecting nations u and v, which costs c per army to use.
Finally, another n lines follow, the ith of which contains two non-negative integers xi and yi , indicating
that there are currently xi armies in nation i, and you need at least yi armies to end up in that nation in
the final configuration. The total number of armies (the sum of the xi values) is at least the sum of the
yi values, and no more than 106 .

Output

Display the minimum cost to move your armies such that there are at least yi armies in nation i for all i.

 Sample Input 1                                       Sample Output 1
 3                                                    15
 1 2 5
 3 1 5
 2 1
 5 0
 1 3

ACM-ICPC World Finals 2018 Problem C: Conquer The World                                                  5

Sample Input 2                               Sample Output 2
6                                            9
1 2 2
1 3 5
1 4 1
2 5 5
2 6 1
0 0
1 0
2 1
2 1
0 1
0 1

ACM-ICPC World Finals 2018 Problem C: Conquer The World        6
