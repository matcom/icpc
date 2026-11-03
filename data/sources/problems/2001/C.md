---
year: 2001
letter: "C"
title: "Crossword Puzzle"
source: "https://icpc.global/worldfinals/problems/2001-ICPC-World-Finals/2001WorldFinalProblemSet.pdf"
source_pages: 5-6
local_pdf: "problems_pdfs/2001/C.pdf"
---

# Crossword Puzzle
The 2001 25th Annual       acm                  International Collegiate

                     Programming Contest World Finals
                             sponsored by IBM

                                              Problem C
                                          Crossword Puzzle
                                             Input: crossword.in
Your brilliant but absent-minded uncle believes he has solved a difficult crossword puzzle but has misplaced the
solution. He needs your help to reconstruct the solution from a list that contains all the words in the solution, plus
one extra word that is not part of the solution. Your program must solve the puzzle and print the extra word.

The crossword puzzle is represented by a grid with ten squares on each side. Figure 1 shows the top left corner of a
puzzle. The puzzle has a certain number of “slots” where a word can be placed. Each slot is represented by the row
and column number of the square where the slot begins, and the direction in which the slot extends from its initial
square (“across” or “down”). The length of each slot is not specified. The puzzle has a list of candidate words, all
but one of which is used in solving the puzzle.

                                   1     2     3     4     5    ...
                            1                                          Candidate Words
                            2                                                 SLOW
                            3                                                 AGAIN
                                                                              BOY
                            4                                                 TAIL
                                                                              BEAR
                            5
                            ..
                             .
                                         Figure 1: Corner of Example Puzzle

Figure 2 shows a solution to the example puzzle in Figure 1. In a valid solution, each slot is filled with a candidate
word. Every maximal horizontal or vertical sequence of two or more letters must be a word in the input. Any
candidate word can be used in any slot as long as the word fits in the puzzle and does not conflict with any other
word. In the example, all the candidate words are used except the word “BOY”.

                                   1     2     3     4     5    ...
                            1      B
                            2      E           T                         Extra word:

                                               A     I                        BOY
                            3      A     G                 N
                            4      R           I
                            5            S     L     O     W
                            ..
                             .
                                         Figure 2: Example Solution

         The 2001 ACM Programming Contest World Finals sponsored by IBM

Input
The input data consist of one or more test cases each describing a puzzle trial. The first input line in each test case
contains a positive integer N that represents the number of slots in the puzzle. This line is followed by N lines, each
containing the row number and column number of a square where a slot begins, followed by the letter ‘A’ (if the slot
is “Across”) or ‘D’ (if the slot is “Down”). The next N + 1 input lines contain candidate words that can be used in
the puzzle solution.

The final test case is followed by a line containing the number zero.

Output
For each trial, print the trial number followed by the word that is not used in the puzzle solution, using the format in
the example output. Observe the following rules:
1) Print a blank line after each trial.
2) If your uncle has made a mistake and the puzzle has no solution using the given words, print the word
     “Impossible”. For example, if Trial 2 has no solution, you should print “Trial 2: Impossible”.
3) If the puzzle can be solved in more than one way, print each word that can be omitted from a valid solution. The
     words can be printed in any order but each word must be printed only once. For example, if Trial 3 has a
     solution that omits the word DOG and two solutions that omit the word CAT, you should print “Trial 3:
     DOG CAT” or “Trial 3: CAT DOG”.

Sample Input                                                  Output for the Sample Input
4                                                             Trial 1: BOY
1    1      D
2    3      D
3    1      A
5    2      A
SLOW
AGAIN
BOY
TAIL
BEAR
0
