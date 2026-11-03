---
year: 2001
letter: "B"
title: "Say Cheese"
source: "https://icpc.global/worldfinals/problems/2001-ICPC-World-Finals/2001WorldFinalProblemSet.pdf"
source_pages: 3-4
local_pdf: "problems_pdfs/2001/B.pdf"
---

# Say Cheese
The 2001 25th Annual         acm                    International Collegiate

                       Programming Contest World Finals
                               sponsored by IBM

                                                   Problem B
                                                    Say Cheese
                                                    Input: cheese.in
Once upon a time, in a giant piece of cheese, there lived a cheese mite named Amelia Cheese Mite. Amelia should
have been truly happy because she was surrounded by more delicious cheese than she could ever eat. Nevertheless,
she felt that something was missing from her life.

One morning, her dreams about cheese were interrupted by a noise she had never heard before. But she immediately
realized what it was — the sound of a male cheese mite, gnawing in the same piece of cheese! (Determining the
gender of a cheese mite just by the sound of its gnawing is by no means easy, but all cheese mites can do it. That’s
because their parents could.)

Nothing could stop Amelia now. She had to meet that other mite as soon as possible. Therefore she had to find the
fastest way to get to the other mite. Amelia can gnaw through one millimeter of cheese in ten seconds. But it turns
out that the direct way to the other mite might not be the fastest one. The cheese that Amelia lives in is full of holes.
These holes, which are bubbles of air trapped in the cheese, are spherical for the most part. But occasionally these
spherical holes overlap, creating compound holes of all kinds of shapes. Passing through a hole in the cheese takes
Amelia essentially zero time, since she can fly from one end to the other instantly. So it might be useful to travel
through holes to get to the other mite quickly.

For this problem, you have to write a program that, given the locations of both mites and the holes in the cheese,
determines the minimal time it takes Amelia to reach the other mite. For the purposes of this problem, you can
assume that the cheese is infinitely large. This is because the cheese is so large that it never pays for Amelia to leave
the cheese to reach the other mite (especially since cheese-mite eaters might eat her). You can also assume that the
other mite is eagerly anticipating Amelia’s arrival and will not move while Amelia is underway.

Input
The input file contains descriptions of several cheese mite test cases. Each test case starts with a line containing a
single integer n (0 ≤ n ≤ 100), the number of holes in the cheese. This is followed by n lines containing four integers
xi , yi , zi , ri each. These describe the centers (xi , yi , zi ) and radii ri (ri > 0) of the holes. All values here (and in the
following) are given in millimeters.

The description concludes with two lines containing three integers each. The first line contains the values xA , yA , zA ,
giving Amelia’s position in the cheese, the second line containing xO , yO , zO , gives the position of the other mite.

The input file is terminated by a line containing the number –1.

Output
For each test case, print one line of output, following the format of the sample output. First print the number of the
test case (starting with 1). Then print the minimum time in seconds it takes Amelia to reach the other mite, rounded
to the closest integer. The input will be such that the rounding is unambiguous.

      The 2001 ACM Programming Contest World Finals sponsored by IBM

Sample Input                         Output for the Sample Input
1                                    Cheese 1: Travel time = 100 sec
20 20 20 1                           Cheese 2: Travel time = 20 sec
0 0 0
0 0 10
1
5 0 0 4
0 0 0
10 0 0
-1
