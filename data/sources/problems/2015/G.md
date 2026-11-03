---
year: 2015
letter: "G"
title: "Pipe Stream"
source: "https://icpc.global/worldfinals/problems/2015-ICPC-World-Finals/icpc2015.pdf"
source_pages: 13-14
local_pdf: "problems_pdfs/2015/G.pdf"
---

# Pipe Stream
Problem G
                                           Pipe Stream
                                     Time limit: 2 seconds
Your hometown has hired some contractors – including you! – to man-
age its municipal pipe network. They built the network, at great ex-
pense, to supply Flubber to every home in town. Unfortunately, no-
body has found a use for Flubber yet, but never mind. It was a Flubber
network or a fire department, and honestly, houses burn down so rarely,
a fire department hardly seems necessary.
In the possible event that somebody somewhere decides they want
some Flubber, they would like to know how quickly it will flow
through the pipes. Measuring its rate of flow is your job.
You have access to one of the pipes connected to the network. The
pipe is l meters long, and you can start the flow of Flubber through this
pipe at a time of your choosing. You know that it flows with a constant
real-valued speed, which is at least v1 meters/second and at most v2
                                                                                     Picture by Nevit via Wikimedia Commons
meters/second. You want to estimate this speed with an absolute error
of at most 2t meters/second.
Unfortunately, the pipe is opaque, so the only thing you can do is to knock on the pipe at any point along
its length, that is, in the closed real-valued range [0, l]. Listening to the sound of the knock will tell you
whether or not the Flubber has reached that point. You are not infinitely fast. Your first knock must be
at least s seconds after starting the flow, and there must be at least s seconds between knocks.
Determine a strategy that will require the fewest knocks, in the worst case, to estimate how fast the
Flubber is flowing. Note that in some cases the desired estimation might be impossible (for example, if
the Flubber reaches the end of the pipe too quickly).

Input

The input consists of multiple test cases. The first line of input contains an integer c (1 ≤ c ≤ 100), the
number of test cases. Each of the next c lines describes one test case. Each test case contains the five
integers l, v1 , v2 , t and s (1 ≤ l, v1 , v2 , t, s ≤ 109 and v1 < v2 ), which are described above.

Output

For each test case, display the minimal number of knocks required to estimate the flow speed in the worst
case. If it might be impossible to measure the flow speed accurately enough, display impossible
instead.

ACM-ICPC World Finals 2015 Problem G: Pipe Stream                                                                     13

Sample Input 1                               Sample Output 1
3                                            5
1000 1 30 1 1                                3
60 2 10 2 5                                  impossible
59 2 10 2 5

ACM-ICPC World Finals 2015 Problem G: Pipe Stream              14
