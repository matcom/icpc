---
year: 2008
letter: "D"
title: "The Hare and the Hounds"
source: "https://icpc.global/worldfinals/problems/2008-ICPC-World-Finals/2008WorldFinalsProblemSet.pdf"
source_pages: 7-8
local_pdf: "problems_pdfs/2008/D.pdf"
---

# The Hare and the Hounds
Problem D
                                  The Hare and the Hounds
                                             Input file: hounds.in
A hare and hounds road rally requires contestants (the “hounds”) to identify a route of one or more roads selected by
the organizer (the “hare”). Both parties move over roads that meet at various intersections. Upon entering any
intersection (except special ones to be described shortly), both the hound and the hare select routes using the main
road rule. The main road rule is always “straight as possible,” meaning make the smallest turn (perhaps none)
necessary to continue. If there are two such choices possible (such as at some “Y” intersections), the main road rule
dictates the rightmost (from the point of view of the hound) of the two acceptable alternatives should be selected.

At certain intersections, the hare may violate the main road rule by taking a random road away from the intersection
(though never the original road used to reach the intersection). These intersections are marked by the hare as choice
points (usually by a colored mark on the pavement in the intersection). When reaching a choice point, the hound
must try each road leaving the intersection and travel that road (potentially traveling through other intersections) until
reaching a confirmation marker (usually some flour dumped by the hare on the road) confirming the correct route
selection. An incorrect route selection is indicated by one of the following:
     • The hound travels a specified maximum distance from the choice point before reaching a confirmation
        marker.
     • The hound reaches a “dead end” (an “intersection” with only one road to it) before reaching the confirmation
        marker.
     • The hound reaches a choice point before reaching the confirmation marker. (The hare always places a
        confirmation marker on the route following a choice point. Also, the hare never returns to a previous choice
        point.)
After detecting an incorrect route, the hound must trace back along the route taken to the choice point and select a
different route alternative. If the hound encounters the endpoint while looking for a confirmation marker, he ignores
it.

When selecting routes from a choice point, the hound uses the main road rule in a slightly different way. The first
road selected is the same as if the intersection were not a choice point. But if the hound must return to the choice
point (i.e., the first road taken from the choice point was not part of the hare’s route), then the hound chooses the
second road using the main road rule from the direction with which he returns to the choice point (ignoring any
direction that he has already tried as well as the direction that he originally arrived from). This process repeats each
time the hound returns to the choice point until he finds the proper route. This multiple use of the main road rule
occurs only at choice points. For the purposes of this problem, the hound will not remember the result of traveling
down any road, even if he returns to it multiple times while exploring one choice point.

For this problem you will be given a road map (a configuration of roads and intersections), the list of choice point
intersections, the placement of confirmation markers, the maximum distance from a choice point to a confirmation
marker, the starting and ending intersections (neither of which will be choice points), and the direction to be used in
leaving the starting intersection. Using this information, you will simulate the hound’s search for the hare’s route.
You may assume that the hound, using the strategy described, will always discover and trace the hare’s route.

Input

There may be multiple input test cases. The data for each case begins with a line containing 7 integers: ncp (number
of choice point intersections), nroad (number of roads, never larger than 150), ncm (number of confirmation markers,
never more than 100), confdist (maximum distance from a choice point intersection to the confirmation marker, at
most 2000), startisect (starting intersection number), endisect (ending intersection number), and startdir (the
direction of the starting road). Intersections are identified using integers between 1 and 100.

The starting line for each case is immediately followed by a line containing ncp integers giving the identifying
numbers of the choice point intersections.

Next there are nroad lines. Roads are identified using sequential integers starting with 1, matching the order in which
their specification lines appear in the input. Each such line contains 5 integers: the identifying numbers of the two
intersections connected by the road, the compass directions (from 0 to 359 degrees, 0 is north, 90 is east) with which
the road leaves the intersections, and the length of the road. Each road can be traveled in both directions and no two
roads will enter an intersection at the same angle.

Finally there are ncm lines that identify the placement of the confirmation markers. Each of these lines contains three
integers giving the identifying number of an intersection, the identifying number of a road leaving that intersection,
and the distance from the intersection to the confirmation marker. Confirmation markers will not be placed at
intersections. Confirmation markers also will not be dropped along roads that start/end in the same intersection.

Input for the last case is followed by a line containing 7 zeroes.

Output

For each test case, print the case number (starting with 1), the length of the hare’s route, the length of the hound’s
search (including all incorrect paths taken at choice points), and the road numbers in the hare’s route in the order the
hare traveled them, using the format shown in the sample data. Print a blank line after the output for each case.

 Sample Input                                   Output for the Sample Input
 1 5 1 3 3 1 180                                Case 1:
 2                                                 Length of hare's route is 19
 2 4 180 0 5                                       Length of hound's search is 31
 1 4 180 90 6                                      Route: 4 3 2
 4 2 270 270 5
 3 2 180 0 8
 1 2 270 90 3
 4 3 3
 0 0 0 0 0 0 0
