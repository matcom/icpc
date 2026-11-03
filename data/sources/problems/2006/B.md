---
year: 2006
letter: "B"
title: "Remember the A La Mode!"
source: "https://icpc.global/worldfinals/problems/2006-ICPC-World-Finals/2006WorldFinalProblemSet.pdf"
source_pages: 3-4
local_pdf: "problems_pdfs/2006/B.pdf"
---

# Remember the A La Mode!
Problem B
                                Remember the A La Mode!
                                           Input File: alamode.in
Hugh Samston owns the “You Want It, Hugh Got It” catering service, which has been asked to supply desserts for
the participants in this year’s ICPC World Finals. Hugh will provide pie slices topped with ice cream at the various
social functions scheduled throughout the week. As with any other dedicated entrepreneur, Hugh would like to offer
the best service possible, so he has ordered a wide variety of pies and ice creams to satisfy even the most eclectic
tastes.

Hugh plans to serve each pie slice with a single scoop of ice cream, leaving the exact combination up to the whim of
the customer. But of course, as with any other dedicated entrepreneur, Hugh would also like to make as much profit
as possible from this enterprise. He knows ahead of time how much profit he can make on each combination of pie
slice and ice cream scoop, as well as which combinations of pie and ice cream should never be put together
(example: Peppermint Banana Chunk ice cream on Key Lime pie).

Given this information, along with the number of slices and scoops he has of each variety of pie and ice cream,
Hugh figures he can determine both the minimum and maximum profits he can expect. Since he hopes to be the
caterer at subsequent World Finals, he would like a general program to solve this and future problems.

Input
Input will consist of multiple problem instances. Each problem instance will start with a line containing two integers
P (P ≤ 50) and I (I ≤ 50), indicating the number of types of pie and ice cream, respectively. The next line will
contain P integers indicating the number of slices available for each of the pie types. The line after that will contain I
integers indicating the number of scoops available for each of the ice cream types. The total number of pie slices
will always equal the total number of ice cream scoops available, and it is assumed that all pie slices and ice cream
scoops will be used.

Each problem instance will end with P lines each containing I floating point numbers indicating the profit for each
pie/ice cream combination: the first value indicates the profit if a slice of pie type 0 is topped with a scoop of ice
cream type 0; the next value indicates the profit if a slice of pie type 0 is topped with a scoop of ice cream type 1,
and so on. A profit value of -1 indicates that no combinations of that pie type and ice cream type should ever be
sold. All other integers (number of slices for each type of pie and number of scoops for each type of ice cream) will
be less than or equal to 100 and the profit on each one of the pie/ice cream combinations (other than -1) will be
larger than 0 and less than or equal to 10, with at most two digits after the decimal point.

The last problem instance is followed by a line containing two zeroes.

Output
For each problem instance, output the problem number (starting at 1) followed by the minimum and maximum
profits, using the format shown in the sample output. Display all numbers with two fractional digits. All problem
instances are guaranteed to have at least one solution using all of the pie slices and ice cream scoops.

Sample Input     Output for the Sample Input
2 3              Problem 1: 91.70 to 105.87
40 50            Problem 2: 40.40 to 40.40
27 30 33
1.11 1.27 0.70
-1 2 0.34
4 4
10 10 10 10
10 10 10 10
1.01 -1 -1 -1
-1 1.01 -1 -1
-1 -1 1.01 -1
-1 -1 -1 1.01
0 0
