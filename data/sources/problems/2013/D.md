---
year: 2013
letter: "D"
title: "Factors"
source: "https://icpc.global/worldfinals/problems/2013-ICPC-World-Finals/icpc2013.pdf"
source_pages: 7-8
local_pdf: "problems_pdfs/2013/D.pdf"
---

# Factors
ICPC 2013
                                      2013 World Finals
                                                                                                St. Petersburg
                                                                                                 HOSTED BY   ITMO

                                           Problem D
                                               Factors
                                     Time Limit: 2 seconds
The fundamental theorem of arithmetic states that every integer greater than 1 can be uniquely repre-
sented as a product of one or more primes. While unique, several arrangements of the prime factors may
be possible. For example:

                            10 = 2 · 5                            20 = 2 · 2 · 5
                               =5·2                                   =2·5·2
                                                                      =5·2·2

Let f (k) be the number of different arrangements of the prime factors of k. So f (10) = 2 and f (20) = 3.
Given a positive number n, there always exists at least one number k such that f (k) = n. We want to
know the smallest such k.

Input

The input consists of at most 1 000 test cases, each on a separate line. Each test case is a positive integer
n < 263 .

Output

For each test case, display its number n and the smallest number k > 1 such that f (k) = n. The
numbers in the input are chosen such that k < 263 .

 Sample Input 1                                        Sample Output 1
 1                                                     1 2
 2                                                     2 6
 3                                                     3 12
 105                                                   105 720

ACM-ICPC World Finals 2013 Problem D: Factors                                                                       7
