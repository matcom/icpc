---
year: 2013
letter: "A"
title: "Self-Assembly"
source: "https://icpc.global/worldfinals/problems/2013-ICPC-World-Finals/icpc2013.pdf"
source_pages: 1-2
local_pdf: "problems_pdfs/2013/A.pdf"
---

# Self-Assembly
ICPC 2013
                                      2013 World Finals
                                                                                                St. Petersburg
                                                                                                 HOSTED BY   ITMO

                                           Problem A
                                         Self-Assembly
                                     Time Limit: 3 seconds
Automatic Chemical Manufacturing is experimenting with a process called self-assembly. In this pro-
cess, molecules with natural affinity for each other are mixed together in a solution and allowed to spon-
taneously assemble themselves into larger structures. But there is one problem: sometimes molecules
assemble themselves into a structure of unbounded size, which gums up the machinery.
You must write a program to decide whether a given collection of molecules can be assembled into a
structure of unbounded size. You should make two simplifying assumptions: 1) the problem is restricted
to two dimensions, and 2) each molecule in the collection is represented as a square. The four edges of
the square represent the surfaces on which the molecule can connect to other compatible molecules.
In each test case, you will be given a set of molecule descriptions. Each type of molecule is described
by four two-character connector labels that indicate how its edges can connect to the edges of other
molecules. There are two types of connector labels:

   • An uppercase letter (A, . . . , Z) followed by + or −. Two edges are compatible if their labels have
     the same letter but different signs. For example, A+ is compatible with A− but is not compatible
     with A+ or B−.

   • Two zero digits 00. An edge with this label is not compatible with any edge (not even with another
     edge labeled 00).

Assume there is an unlimited supply of molecules of each type, which may be rotated and reflected. As
the molecules assemble themselves into larger structures, the edges of two molecules may be adjacent
to each other only if they are compatible. It is permitted for an edge, regardless of its connector label, to
be connected to nothing (no adjacent molecule on that edge).
Figure A.1 shows an example of three molecule types and a structure of bounded size that can be assem-
bled from them (other bounded structures are also possible with this set of molecules).

                                Figure A.1: Illustration of Sample Input 1.

ACM-ICPC World Finals 2013 Problem A: Self-Assembly                                                                 1

                                                                                                     ICPC 2013
                                     2013 World Finals
                                                                                                St. Petersburg
                                                                                                HOSTED BY   ITMO

Input

The input consists of a single test case. A test case consists of two lines. The first contains an integer n
(1 ≤ n ≤ 40 000) indicating the number of molecule types. The second line contains n eight-character
strings, each describing a single type of molecule, separated by single spaces. Each string consists of
four two-character connector labels representing the four edges of the molecule in clockwise order.

Output

Display the word unbounded if the set of molecule types can generate a structure of unbounded size.
Otherwise, display the word bounded.

 Sample Input 1                                        Sample Output 1
 3                                                     bounded
 A+00A+A+ 00B+D+A- B-C+00C+

 Sample Input 2                                        Sample Output 2
 1                                                     unbounded
 K+K-Q+Q-

ACM-ICPC World Finals 2013 Problem A: Self-Assembly                                                                2
