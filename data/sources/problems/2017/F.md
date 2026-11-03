---
year: 2017
letter: "F"
title: "Posterize"
source: "https://icpc.global/worldfinals/problems/2017-ICPC-World-Finals/icpc2017.pdf"
source_pages: 11-12
local_pdf: "problems_pdfs/2017/F.pdf"
---

# Posterize
Rapid City

                                                                                          event
                                                                                          sponsor
                                                                                                           ICPC 2017

                                                Problem F
                                                   Posterize
                                          Time limit: 2 seconds

Pixels in a digital picture can be represented with three integers in the range 0 to 255 that indicate the
intensity of the red, green, and blue colors. To compress an image or to create an artistic effect, many
photo-editing tools include a “posterize” operation which works as follows. Each color channel is examined
separately; this problem focuses only on the red channel. Rather than allow all integers from 0 to 255 for the
red channel, a posterized image allows at most k integers from this range. Each pixel’s original red intensity
is replaced with the nearest of the allowed integers. The photo-editing tool selects a set of k integers that
minimizes the sum of the squared errors introduced across all pixels in the original image. If there are n
pixels that have original red values r1 , . . . , rn , and k allowed integers v1 , . . . , vk , the sum of squared errors
is defined as

                                                n
                                                X
                                                      min (ri − vj )2 .
                                                      1≤j≤k
                                                i=1

Your task is to compute the minimum achievable sum of squared errors, given parameter k and a description
of the red intensities of an image’s pixels.

Input

The first line of the input contains two integers d (1 ≤ d ≤ 256), the number of distinct red values that occur
in the original image, and k (1 ≤ k ≤ d), the number of distinct red values allowed in the posterized image.
The remaining d lines indicate the number of pixels of the image having various red values. Each such line
contains two integers r (0 ≤ r ≤ 255) and p (1 ≤ p ≤ 226 ), where r is a red intensity value and p is the
number of pixels having red intensity r. Those d lines are given in increasing order of red value.

Output

Display the sum of the squared errors for an optimally chosen set of k allowed integer values.

ACM-ICPC World Finals 2017 Problem F: Posterize                                                                         11

                                                                                 Rapid City

                                                                    event
                                                                    sponsor
                                                                              ICPC 2017

Sample Input 1                                    Sample Output 1
2 1                                               66670000
50 20000
150 10000

Sample Input 2                                    Sample Output 2
2 2                                               0
50 20000
150 10000

Sample Input 3                                    Sample Output 3
4 2                                               37500000
0 30000
25 30000
50 30000
255 30000

ACM-ICPC World Finals 2017 Problem F: Posterize                                           12
