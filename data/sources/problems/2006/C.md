---
year: 2006
letter: "C"
title: "Ars Longa"
source: "https://icpc.global/worldfinals/problems/2006-ICPC-World-Finals/2006WorldFinalProblemSet.pdf"
source_pages: 5-6
local_pdf: "problems_pdfs/2006/C.pdf"
---

# Ars Longa
Problem C
                                                   Ars Longa
                                                Input File: ars.in
You have been struck with inspiration, and are designing a beautiful new art sculpture for the foyer of your local
museum. For highly important artistic reasons, you are designing it using very specific materials. However, you are
not sure if physics is on your side. Will your sculpture actually stand up?

The sculpture will be composed of various ball joints weighing 1 kilogram each, and various rods (of negligible
weight) connecting the joints. Rods cannot be stretched or compressed, and they can never detach from a joint.
However, they are free to rotate around the joints in any direction. The joints that lie on the ground are glued in
place; all others are free to move. For simplicity, you may ignore the effects of intersections of rods; each rod exerts
force only on the 2 joints connected to it. Also, any joint that is in the air will have at least one rod coming out that is
not parallel to the ground. This prevents the degenerate case where a ball is supported only horizontally by a rigid
structure. In real life, it would sag just a little.

Write a program to determine whether your structure is static (that is, will not immediately move from the effects of
gravity). Note that each rod can transmit an arbitrarily large tensional force along its length, and that “being static”
means that the tensional forces at each joint balance the weight of the joint.

If the structure is static, you must also determine whether it is stable (that is, will not move if perturbed slightly by
pulling its joints).

Input
The input contains several sculpture descriptions. Every description begins with a line containing integers J and R,
the number of joints and rods in the structure, respectively. Joints are numbered from 1 to J. The description
continues with J lines, one per joint, each containing 3 floating point numbers giving the x, y, z coordinates of that
joint. Following are R lines, one per rod, with 2 distinct integers indicating the joints connected by that rod.

Each rod is exactly the right length to connect its joints. The z coordinates will always be non-negative; a z
coordinate of 0 indicates that the joint is on the ground and fixed in place. There are at most 100 joints and 100 rods.

The last description is followed by a line containing two zeroes.

Output
For each sculpture description, output NON-STATIC, UNSTABLE, or STABLE, as shown in the sample output.

Sample Input    Output for the Sample Input
4 3             Sculpture 1: NON-STATIC
0 0 0           Sculpture 2: UNSTABLE
-1.0 -0.5 1.0   Sculpture 3: STABLE
1.0 -0.5 1.0
0 1.0 1.0
1 2
1 3
1 4
4 6
0 0 0
-1.0 -0.5 1.0
1.0 -0.5 1.0
0 1.0 1.0
1 2
1 3
1 4
2 3
2 4
3 4
7 9
0 0 0
-1.0 -0.5 1.0
1.0 -0.5 1.0
0 1.0 1.0
-1.0 -0.5 0
1.0 0.5 0
0 1.0 0
1 2
1 3
1 4
2 3
2 4
3 4
2 5
3 6
4 7
0 0
