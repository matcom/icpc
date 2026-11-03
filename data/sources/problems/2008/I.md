---
year: 2008
letter: "I"
title: "Password Suspects"
source: "https://icpc.global/worldfinals/problems/2008-ICPC-World-Finals/2008WorldFinalsProblemSet.pdf"
source_pages: 17-18
local_pdf: "problems_pdfs/2008/I.pdf"
---

# Password Suspects
Problem I
                                        Password Suspects
                                           Input file: password.in
You are the computer whiz for the secret organization known as the Sneaky Underground Smug Perpetrators of Evil
Crimes and Thefts. The target for SUSPECT’s latest evil crime is their greatest foe, the Indescribably Clever
Policemen’s Club, and everything is prepared. Everything, except for one small thing: the secret password for
ICPC’s main computer system.

The password is known to consist only of lowercase letters 'a'-'z'. Furthermore, through various sneaky observations,
you have been able to determine the length of the password, as well as a few (possibly overlapping) substrings of the
password, though you do not know exactly where in the password they occur.

For instance, say that you know that the password is 10 characters long, and that you have observed the substrings
"hello" and "world". Then the password must be either "helloworld" or "worldhello".
 T       T     T       T                                      T                     T   T       T

The question is whether this information is enough to reduce the number of possible passwords to a reasonable
amount. To answer this, your task is to write a program that determines the number of possible passwords and, if
there are at most 42 of them, prints them all.

Input

The input file contains several test cases. Each test case begins with a line containing two integers N and M
 (1 ≤ N ≤ 25, 0 ≤ M ≤ 10), giving the length of the password and the number of known substrings respectively. This is
followed by M lines, each containing a known substring. Each known substring consists of between 1 and 10
lowercase letters 'a'-'z'.

The last test case is followed by a line containing two zeroes.

Output

For each test case, print the case number (beginning with 1) followed by Y suspects, where Y is the number of
                                                                                T           T

possible passwords for this case. If the number of passwords is at most 42, then output all possible passwords in
alphabetical order, one per line.

The input will be such that the number of possible passwords at most 1015.
                                                                        P   P

Sample Input                                               Output for the Sample Input
10 2                                                       Case 1: 2 suspects
hello                                                      helloworld
world                                                      worldhello
10 0                                                       Case 2: 141167095653376 suspects
4 1                                                        Case 3: 1 suspects
icpc                                                       icpc
0 0
