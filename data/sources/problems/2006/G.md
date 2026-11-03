---
year: 2006
letter: "G"
title: "Pilgrimage"
source: "https://icpc.global/worldfinals/problems/2006-ICPC-World-Finals/2006WorldFinalProblemSet.pdf"
source_pages: 13-14
local_pdf: "problems_pdfs/2006/G.pdf"
---

# Pilgrimage
Problem G
                                                  Pilgrimage
                                          Input File: pilgrimage.in
Jack is making a long distance walk with some friends along the old pilgrim road from Vézelay to Santiago de
Compostela. Jack administers money for the group. His administration is quite simple. Whenever an amount (€ 60,
say) has to be paid for the common good he will pay it, and write in his booklet: PAY 60.

When needed, Jack will ask every member of the group, including himself, to pay an amount (€ 50, say) to the
collective purse, and write in his booklet: COLLECT 50. If the group size is 7, he collects € 350 in total.

Unfortunately some of the group members cannot participate in the full walk. So sometimes the group will grow,
sometimes it will shrink. How does Jack handle these comings and goings of group members in terms of collective
money? Suppose, for example, the group size is 7, and that Jack has € 140 in cash, which is € 20 for every group
member. If two group members leave, each will receive € 20, and Jack will write in his booklet: OUT 2. If under
the same circumstances three new group members arrive, they will each have to pay € 20, and Jack will write:
IN 3.

In these cases the amount in cash could easily be divided, without fractions. As a strange coincidence, this happened
during the whole trip. Jack never had to make calculations with fractional numbers of euros.

Near the end of the trip, Jack was joined by all his fellow travelers. Nobody was willing to miss the glorious finale
of the trip. It was then that Jack tried to remember what the group size had been during each part of the trip. He
could not remember.

Given a page of Jack's booklet, could you figure out the size of the group at the beginning of that page?

Input
The input file contains several test cases. Each test case is a sequence of lines in Jack’s booklet. The first line of
each test case will give the number N (0 < N ≤ 50) of lines to follow. The next N lines have the format:
<keyword> <num>, where
         <keyword> = PAY | COLLECT | IN | OUT
and <num> is a positive integer, with the following restrictions:
         IN k               k ≤ 20
         OUT k              k ≤ 20
         COLLECT k          k ≤ 200
         PAY k              k ≤ 2000

The last case is followed by a line containing a single zero.

Output
For each test case, print a single line describing the size of the group at the beginning of the part of the trip described
in the test case. This line contains:
• The word IMPOSSIBLE, if the data are inconsistent.
• A single number giving the size of the group just prior to the sequence of lines in Jack’s booklet, if this size is
     uniquely determined by the data.
• Several numbers, in increasing order, separated by spaces, giving the possible sizes of the group, in case the
     number of solutions is finite, but the solution is not unique.

•   A statement in the format: SIZE >= N, giving a lower bound for the size of the group, in case the number of
    solutions is infinite. Observe that the inequality SIZE >= 1 always applies, since at least Jack himself did the
    whole trip.

Sample Input                                               Output for the Sample Input
5                                                          IMPOSSIBLE
IN 1                                                       2
PAY 7                                                      3 7
IN 1                                                       SIZE >= 6
PAY 7
IN 1
7
IN 1
COLLECT 20
PAY 30
PAY 12
IN 2
PAY 30
OUT 3
3
IN 1
PAY 8
OUT 3
1
OUT 5
0
