---
year: 2010
letter: "F"
title: "Contour Mapping"
source: "https://icpc.global/worldfinals/problems/2010-ICPC-World-Finals/2010WorldFinalProblemSet.pdf"
source_pages: 11-12
local_pdf: "problems_pdfs/2010/F.pdf"
---

# Contour Mapping
Problem F
                                        Contour Mapping
                                          Problem ID: contour
A contour map represents the topography of a given region. Lines on a contour map represent constant
elevations. For example, a contour map might contain a line that represents points with an elevation of 100
meters above mean sea level, another line representing 200 meters elevation, and so on.

The Association for Contour Mapping (ACM) needs a program to produce contour maps from data files
containing elevation measurements collected by a satellite. They are especially interested in the total length of
all contour lines on each map. The elevation data is in the form of sequences of integers that represent elevations
measured at regular intervals along scan lines that run from west to east. The spacing of the scan lines is such
that each elevation measurement in the interior of the data set has six nearest neighbors and is equidistant from
them (when elevation is ignored), as shown in Figure 5 and Figure 6.

                    Figure 5                                                    Figure 6

The policy of the ACM is to approximate the actual terrain by a set of triangles constructed by connecting each
elevation measurement to its nearest neighbors by straight line segments. Each of these triangles is then treated
as a planar surface, where the plane is determined by the coordinates, including elevation, of the vertices. If the
triangles are projected onto the zero-elevation plane, they form a set of equilateral triangles.

In the figures above, the black numbers represent elevation data and the red dashed lines and numbers represent
contour lines. Figure 5 contains a single contour line at elevation 5. Figure 6 contains multiple contour lines at
elevations 6 and 9. A contour line may pass through the interior of a triangle or run along an edge of a triangle.

Because of the way the data points are interlaced, even-numbered scan lines contain one more data point than
odd-numbered scan lines. In each figure, the first scan line is shown at the top.

Input
The input consists of several test cases, each containing a set of elevation data. Each test case begins with a line
containing four integers as follows:

•   s (2 ≤ s ≤ 100) is the number of scan lines of data in the test case.
•   p (1 ≤ p ≤ 100) is the number of elevation measurements on the odd numbered scan lines. The even-
    numbered scan lines contain p + 1 elevation measurements.
•   d (1 ≤ d ≤ 10) is the distance between each elevation measurement and its nearest neighbors when elevation
    is ignored (equals the side-length of the equilateral triangles in the figures.)
•   h (1 ≤ h ≤ 1000) is the elevation increment between contour lines in the desired map. The final contour map
    contains a contour line wherever the elevation is an exact multiple of h. Note that a map may contain
    multiple contour lines for a given elevation. Where a region is level, contour lines are shown only for the
    boundaries. (See for example the contour line of elevation 9 in Figure 6.)

The first line of each test case is followed by additional lines containing elevation data as a sequence of non-
negative integers no larger than 106. The first p integers represent the elevation measurements on the first scan
line, from left to right. The next p + 1 integers represent the elevation measurements on the second scan line,
reading from left to right. The data continues in order, providing p integers for each odd-numbered scan line and
p + 1 integers for each even-numbered scan line, until all the elevation data has been provided. Each test case
ends with an empty line.

The input is terminated with a line containing a single zero.

Output
For each test case, display its case number followed by the total length of all the contour lines on the contour
map, rounded to the nearest integer. Follow the format of the sample output.

Sample Input                                               Output for the Sample Input
3 2 5 5                                                    Case 1: 15
1 1                                                        Case 2: 54
1 9 1
1 1
4 4 5 3
5 7 7 5
5 9 9 9 5
9 9 9 9
7 9 9 9 7
0
