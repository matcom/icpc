---
year: 2009
letter: "H"
title: "The Ministers’ Major Mess"
source: "https://icpc.global/worldfinals/problems/2009-ICPC-World-Finals/2009WorldFinalProblemSet.pdf"
source_pages: 15-16
local_pdf: "problems_pdfs/2009/H.pdf"
---

# The Ministers’ Major Mess
Problem H
                               The Ministers’ Major Mess
                                            Input file: major.in
The ministers of the remote country of Stanistan are having severe problems with their decision making. It all
started a few weeks ago when a new process for deciding which bills to pass was introduced. This process
works as follows. During each voting session, there are several bills to be voted on. Each minister expresses an
opinion by voting either “yes” or “no” for some of these bills. Because of limitations in the design of the
technical solution used to evaluate the actual voting, each minister may vote on only at most four distinct bills
(though this does not tend to be a problem, as most ministers only care about a handful of issues). Then, given
these votes, the bills that are accepted are chosen in such a way that each minister gets more than half of his or
her opinions satisfied.

As the astute reader has no doubt already realized, this process can lead to various problems. For instance, what
if there are several possible choices satisfying all the ministers, or even worse, what if it is impossible to satisfy
all the ministers? And even if the ministers’ opinions lead to a unique choice, how is that choice found?

Your job is to write a program to help the ministers with some of these issues. Given the ministers’ votes, the
program must find out whether all the ministers can be satisfied, and if so, determine the decision on those bills
for which, given the constraints, there is only one possible choice.

Input
Input consists of multiple test cases. Each test case starts with integers B (1 ≤ B ≤ 100), which is the number of
distinct bills to vote on, and M (1 ≤ M ≤ 500), which is the number of ministers. The next M lines give the votes
of the ministers. Each such line starts with an integer 1 ≤ k ≤ 4, indicating the number of bills that the minister
has voted on, followed by the k votes. Each vote is of the format <bill> <vote>, where <bill> is an integer
between 1 and B identifying the bill that is voted on, and <vote> is either y or n, indicating that the minister’s
opinion is “yes” or “no.” No minister votes on the same bill more than once. The last test case is followed by a
line containing two zeros.

Output
For each test case, print the test case number (starting with 1) followed by the result of the process. If it is
impossible to satisfy all ministers, the result should be impossible. Otherwise, the result should be a string
of length B, where the ith character is y, n, or ?, depending on whether the decision on the ith bill should be
“yes,” whether it should be “no,” or whether the given votes do not determine the decision on this bill.

 Sample Input                                                                    Output for the Sample Input
 5 2                                                                             Case 1: ?y??n
 4 2 y 5 n 3 n 4 n                                                               Case 2: impossible
 4 4 y 3 y 5 n 2 y
 4 2
 4 1 y 2 y 3 y 4 y
 3 1 n 2 n 3 n
 0 0
