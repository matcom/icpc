---
year: 2021
letter: "K"
title: "Take On Meme"
source: "https://icpc.global/worldfinals/problems/2021-ICPC-World-Finals/icpc2021.pdf"
source_pages: 21-22
local_pdf: "problems_pdfs/2021/K.pdf"
---

# Take On Meme
Problem K
                                       Take On Meme
                                    Time limit: 4 seconds
The Internet can be so fickle. You work for a small ad agency, Mimi’s Mammoth Memes. Your ad
campaigns are very cheap, and rely on the hope of producing the next hit viral meme. Unfortunately,
the last four hundred or so memes have failed to take off, despite having been precisely engineered to
appeal to every single person on Earth. You’re not sure what exactly went wrong, but you’ve decided to
try a new approach: crowd sourcing!
According to your scientific meme theory, all memes can be rated from −∞ to ∞ on two scales: xan-
thochromism, and yellowishness, also known as (x, y) values. Obviously (you think), the best memes
are memorable for being particularly xanthochromic, yellowish, unxanthochromic, or unyellowish. You
feel that the “quality” of any meme is directly measurable as its squared Euclidean distance (x2 + y 2 )
from the Base Meme (0, 0), otherwise known as All Your Base.
To produce the ultimate viral meme, you’ll be taking your company’s last few failed memes and throwing
them into a tournament, decided by online voting. The tournament can be represented as a rooted tree.
Input memes come in at the leaves, and at each internal node, a vote will be held among its k child
memes (x1 , y1 ), . . . , (xk , yk ). After the vote, all the memes will be horrifically mangled and merged
into a brand new meme, specifically calculated to emphasize the winner and de-emphasize all the losers:
the resultant x value will be
                                                     Xk
                                                          wi · xi ,
                                               i=1

where wi  is 1 if the ith child won, and −1 otherwise.The y value is computed similarly. This new
meme will move on to the next vote in the tournament – or, if there is no parent, it will be declared the
champion and the ultimate meme!
You already have the structure of the tournament planned out, including all the input memes and the
internal voting nodes. What is the largest possible quality for any meme that the tournament could
produce?

Input

The first line of input contains an integer n (1 ≤ n ≤ 104 ), giving the total number of nodes in the
tournament tree. The next n lines each describe a single tree node indexed from 1 to n. The line for
node i starts with an integer ki (0 ≤ ki ≤ 100), the number of children of that node. If ki is 0, then node
i is an input meme and there will be two more integers xi and yi (−103 ≤ xi , yi ≤ 103 ) describing it. If
ki > 0, then ki different integers j (i < j ≤ n) will follow, giving the indices of the ki nodes entering
this voting step.
All input memes will eventually be merged into the final output meme at node 1. The complete tree will
have a height of no more than 10.

Output

Output the largest possible quality for the champion meme at node 1.

ICPC World Finals 2021 Problem K: Take On Meme                                                          21

Sample Input 1                               Sample Output 1
4                                            169
3 2 3 4
0 10 1
0 3 6
0 2 7

Sample Input 2                               Sample Output 2
8                                            314
3 4 2 5
2 3 8
0 -3 9
0 -5 -7
2 6 7
0 1 4
0 -3 -1
0 1 4

ICPC World Finals 2021 Problem K: Take On Meme                 22
