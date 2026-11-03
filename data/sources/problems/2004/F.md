---
year: 2004
letter: "F"
title: "Merging Maps"
source: "https://icpc.global/worldfinals/problems/2004-ICPC-World-Finals/2004WorldFinalProblemSet.pdf"
source_pages: 11-12
local_pdf: "problems_pdfs/2004/F.pdf"
---

# Merging Maps
The 2004 28th Annual      acm                  International Collegiate

                   Programming Contest World Finals
                           sponsored by IBM

                                            Problem F
                                            Merging Maps
                                            Input File: maps.in

Pictures taken from an airplane or satellite of an area to be mapped are often of sufficiently high resolution to
uniquely identify major features. Since a single picture can cover only a small portion of the earth, mapping
larger areas requires taking pictures of smaller overlapping areas, and then merging these to produce a map of a
larger area.
For this problem you are given several maps of rectangular areas, each represented as an array of single-
character cells. A cell contains an uppercase alphabetic character (‘A’ to ‘Z’) if its corresponding area contains
an identifiable major feature. Different letters correspond to different features, but the same major feature (such
as a road) may be identified in multiple cells. A cell contains a hyphen (‘-’) if no identifiable feature is located
in the cell area. Merging two maps means overlaying them so that one or more common major features are
aligned. A cell containing a major feature in one map can be overlaid with a cell not containing a major feature
in the other. However, different major features (with different letters) cannot be overlaid in the same cell.

            --A-C              C----           C----          ----D           -D--C
            ----D              D---F           -----          -E--B           ----G
            ----B              B----           B-A-C          -----           ----B
      Map #   1                  2               3              4               5

Consider the five 3-row, 5-column maps shown above. The rightmost column of map 1 perfectly matches the
leftmost column of map 2, so those maps could be overlaid to yield a 3-row, 9-column map. But map 1 could
also overlay map 3 as well, since the C and B features in the rightmost column of map 1 match those in the
leftmost column of map 3; the D does not perfectly match the ‘-’ in the center of the column, but there is no
conflict. In a similar manner, the top row of map 1 could also overlay the bottom row of map 3.
The “score” of a pair of maps indicates the extent to which the two maps match. The score of an overlay of a
pair of maps is the number of cells containing major features that coincide in the overlay that gives the best
match. The score for the map pair is the maximum score for the possible overlays of the maps. Thus, the score
for a pair of maps each having 3 rows and 5 columns must be in the range 0 to 15.
An “offset” is a pair of integers (r,c) that specifies how two maps, a and b, are overlaid. The value of r gives the
offset of rows in b relative to rows in a; similarly, c gives the offset of columns in b relative to columns in a. For
example, the overlay of map 1 and map 2 shown above has the offset (0,4) and a score of 3. The two overlays of
map 1 and map 3 yielding scores of 2 have offsets of (0,4) and (-2,0).
The following steps describe how to merge a sequence of maps:
    1. Merge the pair of maps in the sequence that yield the highest positive score (resolving ties by choosing
         pair that has the map with the lowest sequence number).
    2. Remove the maps that were merged from the sequence.
    3. Add the resulting merged map to the sequence, giving it the next larger sequence number.
In the example above, maps 1 and 2 would be merged to produce map 6, and maps 1 and 2 would be removed
from the sequence. Steps 1, 2 and 3 are repeated until only a single map remains in the sequence, or until none
of the maps in the sequence can be merged (that is, until the overlay score for each possible map pair is zero).
If two maps can be merged in several ways to yield the same score, then merge them using the smallest row
offset. If the result is still ambiguous, use the smallest row offset and the smallest column offset.

        The 2004 ACM Programming Contest World Finals sponsored by IBM

Input
The input will contain one or more sets of data, each containing between 2 and 10 maps. Each set of data begins
with an integer specifying the number of maps in the sequence. The maps follow, each beginning with a line
containing two integers NR and NC (1 ≤ NR, NC ≤ 10) that specify the number of rows and columns in the map
that immediately follows on the next NR lines. The first NC characters on each of these NR lines are the map
data, and any trailing characters on such lines are to be ignored.
Input for the last test case is followed by a line consisting of the number 0.

Output
For each set of data, display the input case number (1, 2, …) and the merged maps, each identified with its
sequence number and enclosed by a border. The output should be formatted as shown in the samples below. No
merged map will have more than 70 columns.

Sample Input                                                Output for the Sample Input
5                                                           Case 1
3 5                                                             MAP 9:
--A-C                                                           +-------------+
----D                                                           |-D--C--------|
----B                                                           |----G--------|
3 5                                                             |----B-A-C----|
C----                                                           |--------D---F|
D---F                                                           |-----E--B----|
B----                                                           |-------------|
3 5                                                             +-------------+
C----
-----                                                       Case 2
B-A-C                                                           MAP 1:
3 5                                                             +-----+
----D                                                           |----A|
-E--B                                                           |----B|
-----                                                           |----C|
3 5                                                             +-----+
-D--C
----G                                                             MAP 2:
----B                                                             +-----+
2                                                                 |A----|
3 5                                                               |B----|
----A                                                             |D----|
----B                                                             +-----+
----C
3 5
A----
B----
D----
0
