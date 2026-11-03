---
year: 2000
letter: "B"
title: "According to Bartjens"
source: "https://icpc.global/worldfinals/problems/2000-ICPC-World-Finals/2000WorldFinalProblemSet.pdf"
source_pages: 4-5
local_pdf: "problems_pdfs/2000/B.pdf"
---

# According to Bartjens
The 2000 24th Annual       acm               International Collegiate

                      Programming Contest World Finals
                              sponsored by IBM

                                               Problem B
                                       According to Bartjens
                                             Input File: bartjens.in

The wide dissemination of calculators and computers has its disadvantages. Even students in technical disciplines
tend to exhibit a surprising lack of calculating ability. Accustomed to the use of calculators and computers, many of
them are unable to make calculations like 7* 8 mentally or like 13 * 17 using pencil and paper. We all know, but
who cares?
Professor Bartjens1 cares. Professor Bartjens is a bit old fashioned. He decided to give his students some training in
calculating without electronic equipment by creating a collection of calculation problems, (like 2100 – 100 =…). To
simplify grading the problems, he constructed them so that almost all of them had 2000 as an answer. Not all of
them, of course. His students would be smart enough to recognize the pattern, and fill in 2000 everywhere without
further thinking.
Unfortunately Professor Bartjens' printer driver turned out to be even more old-fashioned than the professor himself,
and it could not interface with his new printer. Inspecting the printed problems, he soon recognized the pattern: none
of the operations was transmitted to the printer. A problem like:
         2100-100=
was printed as:
         2100100=
Fortunately, all the digits and the equal sign were still printed.
To make this bad situation much worse, Professor Bartjens’ source file had disappeared. So Professor Bartjens has
another problem: what were his original problems? Given the fact that the answer (most likely) should be 2000, the
line 2100100= could have been any one of the lines:
         2100-100=
         2*100*10+0=
         2*100*10-0=
         2*10*0100=
         2*-100*-10+0=
Professor Bartjens does remember a few things about how he wrote the problems:
    • He is sure that whenever he wrote down a number (other than 0), it would not start with a zero. So
        2*10*0100= could not have been one of his problems.
    • He also knows he never wrote the number zero as anything but 0. So he would not have a problem like
        2*1000+000=.
    • He used only binary operators, not the unary minus or plus, so 2*-100*-10+0= was not an option either.
    • He used the operators +, - and * only, avoiding the operator / (after all, they were first year students).
    • He knew all problems followed the usual precedence and associativity rules.
You are to help Professor Bartjens recover his problem set by writing a program that when given a row of digits,
insert one or more of the operators +, - and * in such a way that the value of the resulting expression equals 2000.

1
 Willem Bartjens (1569-1638) was the author of Cijferinge, a much used Dutch textbook on arithmetic. The phrase
“…according to Bartjens” (uttered following a calculation) made his name immortal.

         The 2000 ACM Programming Contest World Finals sponsored by IBM

Input
The input consists of one or more test cases. Each test case is a single line containing n digits ('0'…'9'), 1 ≤ n ≤ 9,
followed by an equal sign. There will not be any blanks embedded in the input, but there may be some after the
equal sign.
The last test case is followed by a line containing only the equal sign. This line should not be processed.

Output
For each test case, print the word Problem, then the number of the case, then all possible ways of inserting
operators in the row of digits such that the resulting expression has the value 2000, subject to Professor Bartjens’
memory of how he wrote the problems. Use the format shown below. If there is more than one possible problem,
they may be written in any order, but no problem may appear more than once in the list. Each possible problem
should be on a new line, indented 2 spaces. If there is no solution the answer IMPOSSIBLE should be printed,
indented 2 spaces.

 Sample Input                      Output for the Sample Input
 2100100=                          Problem 1
 77=                                 2100-100=
 =                                   2*100*10+0=
                                     2*100*10-0=
                                   Problem 2
                                     IMPOSSIBLE
