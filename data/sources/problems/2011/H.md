---
year: 2011
letter: "H"
title: "Mining Your Own Business"
source: "https://icpc.global/worldfinals/problems/2011-ICPC-World-Finals/2011WorldFinalProblemSet.pdf"
source_pages: 15-16
local_pdf: "problems_pdfs/2011/H.pdf"
---

# Mining Your Own Business
Problem H
                                  Mining Your Own Business
                                             Problem ID: mining
John Digger is the owner of a large illudium phosdex mine. The mine is made up of a series of tunnels that meet at
various large junctions. Unlike some owners, Digger actually cares about the welfare of his workers and has a concern
about the layout of the mine. Specifically, he worries that there may a junction which, in case of collapse, will cut off
workers in one section of the mine from other workers (illudium phosdex, as you know, is highly unstable). To counter
this, he wants to install special escape shafts from the junctions to the surface. He could install one escape shaft at
each junction, but Digger doesn’t care about his workers that much. Instead, he wants to install the minimum number
of escape shafts so that if any of the junctions collapses, all the workers who survive the junction collapse will have a
path to the surface.
Write a program to calculate the minimum number of escape shafts and the total number of ways in which this
minimum number of escape shafts can be installed.

Input

The input consists of several test cases. The first line of each case contains a positive integer N (N ≤ 5·104 ) indicating
the number of mine tunnels. Following this are N lines each containing two distinct integers s and t, where s and t
are junction numbers. Junctions are numbered consecutively starting at 1. Each pair of junctions is joined by at most
a single tunnel. Each set of mine tunnels forms one connected unit (that is, you can get from any one junction to any
other).
The last test case is followed by a line containing a single zero.

Output

For each test case, display its case number followed by the minimum number of escape shafts needed for the system
of mine tunnels and the total number of ways these escape shafts can be installed. You may assume that the result fits
in a signed 64-bit integer.
Follow the format of the sample output.

ICPC 2011 World Finals Problem H: Mining Your Own Business

 Sample input                                      Output for the Sample Input
 9                                                 Case 1: 2 4
 1 3                                               Case 2: 4 1
 4 1
 3 5
 1 2
 2 6
 1 5
 6 3
 1 6
 3 2
 6
 1 2
 1 3
 2 4
 2 5
 3 6
 3 7
 0

ICPC 2011 World Finals Problem H: Mining Your Own Business
