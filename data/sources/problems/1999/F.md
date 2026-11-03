---
year: 1999
letter: "F"
title: "Robot"
source: "https://icpc.global/worldfinals/problems/1999-ICPC-World-Finals/1999WorldFinalProblemSet.pdf"
source_pages: 11-12
local_pdf: "problems_pdfs/1999/F.pdf"
---

# Robot
The 23rd Annual
   ACM International Collegiate
     Programming Contest
      WORLD FINALS

                                                 Problem F
                                                     Robot
                                                 Input: robot.in
A robot arm used in an automated factory consists of 1 connected links: OLQN1 which is connected to OLQN2…, and OLQN1−1
which is connected to OLQN1 Each link is a straight rod of a specified length, OHQ1, OHQ2, …, OHQ1. Between each pair of
connected links is a servo, VHUYR2 (between OLQN1 and OLQN2), …, and VHUYR1 (between OLQN1−1 and OLQN1) that can be
activated to adjust the angle between the connected links. /LQN1 is also connected by a servo, VHUYR1, to the factory floor
(at the point [=0, \=0, ]=0 in a Cartesian coordinate system). At the free (unconnected) end of the last link (OLQN1) is a
“hand” that can be used to grasp objects.

In the initial setting of the robot arm, each servo is set to no rotation (0 degrees), and the links in the robot arm coincide
with the ]-axis. The [\ plane is horizontal (the factory floor), and the entire robot arm is initially pointing up, vertically.
From this initial setting, each servo can effect a rotation of up to 90 degrees in either of two directions. 6HUYR1 moves the
entire robot arm in the [] plane by rotation about the \-axis. 6HUYR2 moves the arm (except OLQN1) in the (perhaps rotated)
\] plane by rotation about the [-axis. In a similar manner, each odd-numbered servo can rotate the remaining part of the
arm in the (perhaps rotated) [] plane, and each even-numbered servo can rotate the remaining part of the arm in the
(perhaps rotated) \] plane. In effect, the servos rotate the links about the \ and [-axes of coordinate systems fixed to the
end of each link. Counterclockwise rotations about a coordinate axis are produced with positive rotation angles, if we are
looking along the positive half of the axis toward the coordinate origin. The sample data has been carefully chosen to
illustrate the effects of these rotations.

There are two restrictions on the final positioning of the robot’s arm. No part of the arm can be below the factory floor,
and the links in the robot’s arm cannot intersect with each other (except where they are connected by the servos).

You should check only the final position of the arm.

Given the number of links in a robot’s arm, their lengths, and the proposed settings of the servos, first determine if the
proposed positioning of the arm is allowable. If the arm can be positioned as proposed, then determine the coordinates of
the robot’s hand, accurate to three fractional digits. Otherwise identify the first (smallest numbered) servo that has an
inappropriate setting, and why that setting is inappropriate. Links are assumed to intersect if they come within 0.001
length units of each other.

,QSXW
The input data will contain multiple test cases. Each test case includes, in order, the number of links, 1, their lengths,
OHQ1, …, OHQ1, and the proposed angles to which the servos (starting with VHUYR1) are to be set. The lengths and servo
angles are real numbers, and the number of links is an integer. There will be no more than 10 links in any robot arm. The
last test case is followed by a negative integer.

2XWSXW
For each test case, display the test case number (starting with 1). Then, if the proposed setting is allowable, display the
position of the robot’s hand in the original (factory floor) coordinate system (with three fractional digits). Otherwise
display the identity of the first servo with an inappropriate setting and why that setting is inappropriate. An output format
similar to that shown below is acceptable.

       7KH$&03URJUDPPLQJ&RQWHVW:RUOG)LQDOVVSRQVRUHGE\,%0

6DPSOH,QSXW            2XWSXWIRUWKH6DPSOH,QSXW
2 25 15 0 90.0          Case 1: robot’s hand is at (0.000,-15.000,25.000)
1 1.0 45.0              Case 2: robot’s hand is at (0.707,0.000,0.707)
2 1 1 0 45              Case 3: robot’s hand is at (0.000,-0.707,1.707)
4 1 2 3 4 90 0 0 0      Case 4: robot’s hand is at (10.000,0.000,0.000)
3 1 1 1 0 90 90         Case 5: robot’s hand is at (1.000,-1.000,1.000)
2 1 1 45.0 45           Case 6: robot’s hand is at (1.207,-0.707,1.207)
4 1 1 1 2 0 90 0 90     Case 7: servo 4 attempts to move arm below floor
8 10 1 1 1 1 1 1 2      Case 8: servo 8 causes link collision
   0 0 90 0 90 0 90 0
-1
