---
year: 2014
letter: "K"
title: "Surveillance"
source: "https://icpc.global/worldfinals/problems/2014-ICPC-World-Finals/icpc2014.pdf"
source_pages: 21-22
local_pdf: "problems_pdfs/2014/K.pdf"
---

# Surveillance
Problem K
                                         Surveillance
                                    Time Limit: 4 seconds
The International Corporation for Protection and Control (ICPC) develops efficient technology for, well,
protection and control. Naturally, they are keen to have their own headquarters protected and controlled.
Viewed from above, the headquarters building has the shape of a convex polygon. There are several
suitable places around it where cameras can be installed to monitor the building. Each camera covers a
certain range of the polygon sides (building walls), depending on its position. ICPC wants to minimize
the number of cameras needed to cover the whole building.

Input

The input consists of a single test case. Its first line contains two integers n and k (3 ≤ n ≤ 106 and
1 ≤ k ≤ 106 ), where n is the number of walls and k is the number of possible places for installing
cameras. Each of the remaining k lines contains two integers ai and bi (1 ≤ ai , bi ≤ n). These integers
specify which walls a camera at the ith place would cover. If ai ≤ bi then the camera covers each wall j
such that ai ≤ j ≤ bi . If ai > bi then the camera covers each wall j such that ai ≤ j ≤ n or 1 ≤ j ≤ bi .

Output

Display the minimal number of cameras that suffice to cover each wall of the building. The ranges
covered by two cameras may overlap. If the building cannot be covered, display impossible instead.

 Sample Input 1                                       Sample Output 1
 100 7                                                3
 1 50
 50 70
 70 90
 90 40
 20 60
 60 80
 80 20

 Sample Input 2                                       Sample Output 2
 8 2                                                  impossible
 8 3
 5 7

 Sample Input 3                                       Sample Output 3
 8 2                                                  2
 8 4
 5 7

ACM-ICPC World Finals 2014 Problem K: Surveillance                                                     21
