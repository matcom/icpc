---
year: 1999
letter: "B"
title: "Bullet Hole"
source: "https://icpc.global/worldfinals/problems/1999-ICPC-World-Finals/1999WorldFinalProblemSet.pdf"
source_pages: 3-4
local_pdf: "problems_pdfs/1999/B.pdf"
---

# Bullet Hole
The 23rd Annual
   ACM International Collegiate
     Programming Contest
      WORLD FINALS

                                                 Problem B
                                                   Bullet Hole
                                                 Input: bullet.in
                                                z

                                                           (In this example, n = 3)

                                                 (d,d,d)
                          y                                            (x2,y2,z2)     (x1,y1,z1)

                                                                              x

                                           (0,0,0)

A cube is suspended in space. A Cartesian coordinate system is defined with its origin at one of the bottom corners of the
cube, as shown in the figure. The cube has side dimension G, so its opposite corners are at coordinates (0, 0, 0) and
(G, G, G). The positive ]-direction of the coordinate system is “up” with respect to gravity.

The interior of the cube contains partitions with uniform spacing in each dimension, so that the cube is partitioned into Q3
mini-cubes of equal size. The partitions are thin and watertight, and each mini-cube is filled with water. The total volume
of water in all the minicubes is G3.

A gun fires a bullet which may hit the cube. The muzzle of the gun is at the point ([1, \1, ]1). The point ([2, \2, ]2) is a
point on the bullet’s path that defines the direction of the bullet. The bullet does not shatter the cube, but wherever the
bullet touches a side or interior partition of the cube, it makes a small hole. Bullet holes may be made in the sides, edges,
or corners of the interior mini-cubes. Water, influenced by gravity, may leak through these small holes. All the water that
leaks out of the large cube is collected and measured.

,QSXW
The input data set consists of several trials. Each trial is described by eight integers. The first integer is Q (Q ≤ 50), as
described above. The second integer is G (G ≤ 100). The remaining six integers—[1, \1, ]1, [2, \2, ]2—represent the origin
and a point on the path of the bullet (-100 ≤ [1, \1, ]1, [2, \2, ]2 ≤ 100). The origin and the point on the path of the bullet
are not the same. After the last trial, the integer 0 terminates the data set.

2XWSXW
Your program must compute the total volume of water that leaks out of the large cube. For each trial, print the trial
number, the notation Volume =, and the total volume of water accurate to two digits to the right of the decimal point.
Print a blank line between trials.

1RWH
In this problem, two real numbers are considered equal if they are less than 10-6 apart.

          7KH$&03URJUDPPLQJ&RQWHVW:RUOG)LQDOVVSRQVRUHGE\,%0

6DPSOH,QSXW                                   2XWSXWIRUWKH6DPSOH,QSXW
 5   25      5 15     0    5 15 100            Trial 1, Volume = 2500.00
 3   30      0 -35    0    3 -25  3
10   16      8 17    11   12 19   6            Trial 2, Volume = 1950.00
 0
                                               Trial 3, Volume = 0.00
