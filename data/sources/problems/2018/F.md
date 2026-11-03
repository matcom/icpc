---
year: 2018
letter: "F"
title: "Go with the Flow"
source: "https://icpc.global/worldfinals/problems/2018-ICPC-World-Finals/icpc2018.pdf"
source_pages: 11-12
local_pdf: "problems_pdfs/2018/F.pdf"
---

# Go with the Flow
Problem F
                                       Go with the Flow
                                    Time limit: 12 seconds
In typesetting, a “river” is a string of spaces formed by gaps between words that extends down sev-
eral lines of text. For instance, Figure F.1 shows several examples of rivers highlighted in red (text is
intentionally blurred to make the rivers more visible).

                              Figure F.1: Examples of rivers in typeset text.

Celebrated river authority Flo Ng wants her new book on rivers of the world to include the longest
typographic rivers possible. She plans to set the text in a mono-spaced font (all letters and spaces have
equal width) in a left-aligned column of some fixed width, with exactly one space separating words on
each line (the text is not aligned on the right). For Flo, a “river” is defined as a sequence of spaces lying
in consecutive lines in which the position of each space in the sequence (except the first) differs by at
most 1 from the position of the space in the line above it. Trailing white space cannot appear in a river.
Words must be packed as tightly as possible on lines; no words may be split across lines. The line width
used must be at least as long as the longest word in the text. For instance, Figure F.2 shows the same
text set with two different line widths.

                 Line width 14: River of length 4      Line width 15: River of length 5
                 The Yangtze is|                       The Yangtze is |
                 the third          |                  the third           |
                 longest river |                       longest*river |
                 in*Asia and        |                  in Asia*and the|
                 the*longest in|                       longest*in the |
                 the*world to |                        world to*flow |
                 flow*entirely |                       entirely*in one|
                 in one country|                       country             |

                       Figure F.2: Longest rivers (*) for two different line widths.

Given a text, you have been tasked with determining the line width that produces the longest river of
spaces for that text.

Input

The first line of input contains an integer n (2 ≤ n ≤ 2 500) specifying the number of words in the
text. The following lines of input contain the words of text. Each word consists only of lowercase and
uppercase letters, and words on the same line are separated by a single space. No word exceeds 80
characters.

ACM-ICPC World Finals 2018 Problem F: Go with the Flow                                                    11

Output

Display the line width for which the input text contains the longest possible river, followed by the length
of the longest river. If more than one line width yields this maximum, display the shortest such line
width.

 Sample Input 1                                       Sample Output 1
 21                                                   15 5
 The Yangtze is the third longest
 river in Asia and the longest in
 the world to flow
 entirely in one country

 Sample Input 2                                       Sample Output 2
 25                                                   21 6
 When two or more rivers meet at
 a confluence other than the sea
 the resulting merged river takes
 the name of one of those rivers

ACM-ICPC World Finals 2018 Problem F: Go with the Flow                                                  12
