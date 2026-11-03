---
year: 2008
letter: "B"
title: "Always an Integer"
source: "https://icpc.global/worldfinals/problems/2008-ICPC-World-Finals/2008WorldFinalsProblemSet.pdf"
source_pages: 3-4
local_pdf: "problems_pdfs/2008/B.pdf"
---

# Always an Integer
Problem B
                                          Always an Integer
                                             Input file: always.in
Combinatorics is a branch of mathematics chiefly concerned with counting discrete objects. For instance, how many
ways can you pick two people out of a crowd of n people? Into how many regions can you divide a circular disk by
connecting n points on its boundary with one another? How many cubes are in a pyramid with square layers ranging
from 1 × 1 to n × n cubes?

                          Figure 1: If we connect six points on the boundary of a circle, at
                          T          T

                          most 31 regions are created.

Many questions like these have answers that can be reduced to simple polynomials in n. The answer to the first
question above is n(n-1)/2, or (n^2-n)/2. The answer to the second is (n^4-6n^3+23n^2-18n+24)/24. The answer to
the third is n(n+1)(2n+1)/6, or (2n^3+3n^2+n)/6. We write these polynomials in a standard form, as a polynomial
with integer coefficients divided by a positive integer denominator.

These polynomials are answers to questions that can have integer answers only. But since they have fractional
coefficients, they look as if they could produce non-integer results! Of course, evaluating these particular
polynomials on a positive integer always results in an integer. For other polynomials of similar form, this is not
necessarily true. It can be hard to tell the two cases apart. So that, naturally, is your task.

Input

The input consists of multiple test cases, each on a separate line. Each test case is an expression in the form (P)/D,
where P is a polynomial with integer coefficients and D is a positive integer denominator. P is a sum of terms of the
form Cn^E, where the coefficient C and the exponent E satisfy the following conditions:

    1.   E is an integer satisfying 0 ≤ E ≤ 100. If E is 0, then Cn^E is expressed as C. If E is 1, then Cn^E is
         expressed as Cn, unless C is 1 or -1. In those instances, Cn^E is expressed as n or -n.
    2.   C is an integer. If C is 1 or -1 and E is not 0 or 1, then the Cn^E will appear as n^E or -n^E.
    3.   Only non-negative C values that are not part of the first term in the polynomial are preceded by +.
    4.   Exponents in consecutive terms are strictly decreasing.
    5.   C and D fit in a 32-bit signed integer.

See the sample input for details.

Input is terminated by a line containing a single period.

Output

For each test case, print the case number (starting with 1). Then print Always an integer if the test case
                                                                        T                      T

polynomial evaluates to an integer for every positive integer n. Print Not always an integer otherwise. Print
                                                                    T                               T

the output for separate test cases on separate lines. Your output should follow the same format as the sample output.

Sample Input                                        Output for the Sample Input
(n^2-n)/2                                           Case 1: Always an integer
(2n^3+3n^2+n)/6                                     Case 2: Always an integer
(-n^14-11n+1)/3                                     Case 3: Not always an integer
.
