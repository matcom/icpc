---
year: 2012
letter: "D"
title: "Fibonacci Words"
source: "https://icpc.global/worldfinals/problems/2012-ICPC-World-Finals/icpc2012.pdf"
source_pages: 7-8
local_pdf: "problems_pdfs/2012/D.pdf"
---

# Fibonacci Words
Problem D
                                     Fibonacci Words
                                    Problem ID: fibonacci
The Fibonacci word sequence of bit strings is defined as:

                                                              if n = 0
                                    
                                     0
                          F (n) =       1                     if n = 1
                                        F (n − 1) + F (n − 2) if n ≥ 2
                                    

Here + denotes concatenation of strings. The first few elements are:
 n   F (n)
 0   0
 1   1
 2   10
 3   101
 4   10110
 5   10110101
 6   1011010110110
 7   101101011011010110101
 8   1011010110110101101011011010110110
 9   1011010110110101101011011010110110101101011011010110101
Given a bit pattern p and a number n, how often does p occur in F (n)?

Input

The first line of each test case contains the integer n (0 ≤ n ≤ 100). The second line contains the bit
pattern p. The pattern p is nonempty and has a length of at most 100 000 characters.

Output

For each test case, display its case number followed by the number of occurrences of the bit pattern p in
F (n). Occurrences may overlap. The number of occurrences will be less than 263 .

 Sample Input                                        Output for Sample Input
 6                                                   Case 1: 5
 10                                                  Case 2: 8
 7                                                   Case 3: 4
 10                                                  Case 4: 4
 6                                                   Case 5: 7540113804746346428
 01
 6
 101
 96
 10110101101101

ACM-ICPC World Finals 2012 Problem D: Fibonacci Words                                                  7
