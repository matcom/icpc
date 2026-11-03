---
year: 2020
letter: "C"
title: "Domes"
source: "https://icpc.global/worldfinals/problems/2020-ICPC-World-Finals/icpc2020.pdf"
source_pages: 5-6
local_pdf: "problems_pdfs/2020/C.pdf"
---

# Domes
Problem C
                                               Domes
                                    Time limit: 2 seconds
Saint Basil’s Cathedral is the best-known landmark of Moscow and maybe even of all of Russia. Built
under Ivan the Terrible in the 16th century, the cathedral is known for its colorful domes. No visit to the
city is complete without taking a photo of the former church in Red Square.

                           Figure C.1: Two views of Saint Basil’s Cathedral.

The Moscow Tourism Board (MTB) wants to make it as safe as possible for tourists to take the perfect
shot of the cathedral. Depending on where you stand when you take a picture, the relative positions of the
domes will be different (see Figure C.1). The MTB is concerned that for some desired configurations of
domes the region in Red Square where such a photo is possible will be so small as to lead to a dangerous
overcrowding of photographers. Wanting to avoid the inevitable pushing, shoving, injury, and Covid
that this could cause, the MTB would like to find the area of the region where a photo is possible for any
desired ordering of the domes.
For simplicity, assume that cameras have a 180-degree viewing angle. As
an illustration consider Figure C.2, which shows the location of the domes
(labeled 1–5) and the photographer (green dot) in the plane. If the pho-                  1
                                                                                              2
tographer shoots a picture aiming the camera straight towards the left (di-           5
rectly at dome 5), then everything in the shaded area will be visible in the
photograph. Note that in this photograph, the domes will appear in order                      3
                                                                                          4
4, 3, 5, 2, 1 from the left to the right.
Given the location of the domes within Red Square and a desired left-to-
right order of the domes in the photograph, MTB wants to know the area of Figure C.2: Illustration of
the region within Red Square from which such a photograph can be taken. the sample inputs.
You can assume that the domes are points, so that they do not block each
other unless they are in a straight line from the photographer’s view.

ICPC World Finals 2020 Problem C: Domes                                                                  5

Input

The first line of input contains three integers dx , dy , and n, where dx and dy (2 ≤ dx , dy ≤ 105 ) are the
dimensions of Red Square, and n (1 ≤ n ≤ 100) is the number of domes. The bottom-left corner of
Red Square is at the origin (0, 0) and the top-right corner is at coordinate (dx , dy ).
Each of the next n lines contains two integers xi and yi (0 < xi < dx , 0 < yi < dy ), giving the locations
(xi , yi ) of the domes. The ith line describes dome number i. No two domes are in the same location.
The last line contains a permutation of the numbers {1, . . . , n} specifying the desired left-to-right view-
ing order of the domes in the picture.

Output

Output the area of the region within Red Square from which one can take a photo that shows the domes
in the requested order. Note that the area may be 0 if there is no position from which to take the requested
photo. Your answer should have an absolute or relative error of at most 10−3 .

 Sample Input 1                                        Sample Output 1
 100 100 5                                             450.000000
 30 70
 50 60
 50 40
 30 30
 20 50
 4 3 5 2 1

 Sample Input 2                                        Sample Output 2
 100 100 5                                             0.000000
 30 70
 50 60
 50 40
 30 30
 20 50
 1 2 5 4 3

ICPC World Finals 2020 Problem C: Domes                                                                    6
