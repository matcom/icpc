---
year: 2009
letter: "A"
title: "A Careful Approach"
source: "https://icpc.global/worldfinals/problems/2009-ICPC-World-Finals/2009WorldFinalProblemSet.pdf"
source_pages: 1-2
local_pdf: "problems_pdfs/2009/A.pdf"
---

# A Careful Approach
Problem A
                                     A Careful Approach
                                           Input: approach.in
If you think participating in a programming contest is stressful, imagine being an air traffic controller. With
human lives at stake, an air traffic controller has to focus on tasks while working under constantly changing
conditions as well as dealing with unforeseen events.

Consider the task of scheduling the airplanes that are landing at an airport. Incoming airplanes report their
positions, directions, and speeds, and then the controller has to devise a landing schedule that brings all
airplanes safely to the ground. Generally, the more time there is between successive landings, the “safer” a
landing schedule is. This extra time gives pilots the opportunity to react to changing weather and other surprises.

Luckily, part of this scheduling task can be automated – this is where you come in. You will be given scenarios
of airplane landings. Each airplane has a time window during which it can safely land. You must compute an
order for landing all airplanes that respects these time windows. Furthermore, the airplane landings should be
stretched out as much as possible so that the minimum time gap between successive landings is as large as
possible. For example, if three airplanes land at 10:00am, 10:05am, and 10:15am, then the smallest gap is five
minutes, which occurs between the first two airplanes. Not all gaps have to be the same, but the smallest gap
should be as large as possible.

Input
The input file contains several test cases consisting of descriptions of landing scenarios. Each test case starts
with a line containing a single integer n (2 ≤ n ≤ 8), which is the number of airplanes in the scenario. This is
followed by n lines, each containing two integers ai, bi, which give the beginning and end of the closed interval
[ai, bi] during which the ith plane can land safely. The numbers ai and bi are specified in minutes and satisfy
0 ≤ ai ≤ bi ≤ 1440.

The input is terminated with a line containing the single integer zero.

Output
For each test case in the input, print its case number (starting with 1) followed by the minimum achievable time
gap between successive landings. Print the time split into minutes and seconds, rounded to the closest second.
Follow the format of the sample output.

Sample Input                                            Output for the Sample Input
3                                                       Case 1: 7:30
0 10                                                    Case 2: 20:00
5 15
10 15
2
0 10
10 20
0
