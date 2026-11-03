---
year: 2007
letter: "I"
title: "Water Tanks"
source: "https://icpc.global/worldfinals/problems/2007-ICPC-World-Finals/2007WorldFinalProblemSet.pdf"
source_pages: 17-18
local_pdf: "problems_pdfs/2007/I.pdf"
---

# Water Tanks
Problem I
                                   Problem: Water Tanks
                                               Input: tanks.in

The Aqua Container Management company manages water storage facilities. They are considering a system of
storing water in a series of connected vertical tanks. Each tank has a horizontal cross-sectional area of one
square meter, but the tanks have different heights. The base of each tank is at ground level. Each tank is
connected by a pipe to the previous tank in the series and by another pipe to the next tank in the series. The
pipes connecting the tanks are level and are at increasing heights (that is, the pipe connecting tank i to tank i+1
is at a higher level than the pipe connecting tank i to tank i-1.) Tank 1 is open so that air and water can flow into
it freely at the top. All the other tanks are closed so that air and water can flow in and out only through the
connecting pipes. The connecting pipes are large enough that water and air can flow through them freely and
simultaneously but small enough that their dimensions can be ignored in this problem.
The series of tanks is filled by pouring water slowly into the top of tank 1, continuing until the water level
reaches the top of tank 1. As the water level rises above the connecting pipes, water flows among the tanks.
Aqua Container Management needs a program to compute the cubic meters of water that can be poured into the
series of tanks before the water level reaches the top of tank 1.
The figure below illustrates a simple case involving only two tanks. After the filling procedure is completed, the
air in the upper part of the second tank is compressed (its air pressure is greater than one atmosphere), so the
water level in the second tank is lower than the water level in the first tank.

                        Tanks before filling                               Tanks after filling

The following physical principles are helpful in solving this problem (some of these are approximations that are
acceptable for the purposes of this problem):
    •    Water flows downhill.
    •    In an open space, the air pressure is equal to one atmosphere.
    •    Air is compressible (the volume occupied by a given amount of air depends on pressure). Water is not
         compressible (the volume occupied by a given amount of water is constant, independent of pressure).
    •    Air pressure is the same everywhere within a closed space. If the volume of the closed space changes,
         the product of the volume and the air pressure within the space remains constant. For example, suppose
         an enclosed airspace has an initial volume V1 and pressure P1. If the volume of the airspace changes to
         V2, then the new pressure P2 satisfies P1V1 = P2V2.
    •    In a column of water below an airspace, the water pressure at a level D meters below the water surface
         is equal to the air pressure at the surface plus 0.097·D atmospheres. This is true regardless of whether
         the airspace is open or enclosed.
    •    In a connected body of water (for example, when two or more tanks are connected by pipes below the
         water line), the water pressure is constant at any given level.

                                                      17 of 20

Input
The input consists of several test cases representing different series of water tanks. Each test case has three lines
of data. The first line contains an integer N (2 ≤ N ≤ 10) which is the number of tanks in the test case. The
second line contains N positive floating point numbers that are the heights, in meters, of tanks 1 through N. The
third line contains N-1 floating point numbers. On this line, the kth number represents the height above the
ground of the pipe that connects tank k and tank k+1. The numbers on the third line are increasing (each number
is greater than the preceding number).
The last test case is followed by a line containing the integer zero.

Output
For each test case, print a line containing the test case number (beginning with 1) followed by the amount of
water, in cubic meters, that can be poured into tank 1 before the water level reaches the top of tank 1. Print the
results with three digits to the right of the decimal point.
Print a blank line after the output for each test case. Use the format of the sample output.

Sample Input                                           Output for Sample Input
2                                                      Case 1: 15.260
10.0 8.0
4.0
0

                                                      18 of 20
