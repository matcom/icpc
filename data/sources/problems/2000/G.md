---
year: 2000
letter: "G"
title: "Queue and A"
source: "https://icpc.global/worldfinals/problems/2000-ICPC-World-Finals/2000WorldFinalProblemSet.pdf"
source_pages: 14-15
local_pdf: "problems_pdfs/2000/G.pdf"
---

# Queue and A
The 2000 24th Annual      acm                   International Collegiate

                     Programming Contest World Finals
                             sponsored by IBM

                                              Problem G
                                               Queue and A
                                              Input File: queue.in
The customer support group of Contest.com receives and responds to requests for technical support via e-mail.
Requests may begin arriving when the office opens at 8:00 a.m. and all requests must be serviced by the end of the
day.

As requests are received, they are classified according to a predetermined list of topics. Each member of the support
staff has responsibility for one or more of these topics and each topic has one or more support personnel assigned to
it. Because staff members have different levels of expertise, each staff member has a prioritized list of topics that he
or she can handle. Staff personnel are not permitted to handle requests outside their specified areas.

As staff members become available, they select from the pool of waiting requests according to their priority list of
topics. All requests arriving at time t are available for allocation at time t. If two staff members are simultaneously
available, scheduling preference is given to the one whose most recent job was scheduled earliest. If there is still a
tie, scheduling preference is given to the person whose id number appears earlier in the input list of staff people. At
the opening of business, all personnel are available to handle requests.

You have been asked to perform a preliminary analysis of the technical support environment based on a number of
different scenarios. For each scenario, information will be given about the mix of requests and the division of labor
among the staff. For each topic, you will given the average number of requests per day for that topic, the average
elapsed time before the first of these requests is received, the average time between requests for this topic, and the
average time needed to service the request. All times are given in minutes. You will also be given a list of support
personnel and, for each one, a list of the topics for which he or she has responsibility. (Since data are based on
estimates, factors such as coffee breaks, lunch, computer failures, etc., can be ignored.)

Input
Input consists of a number of scenarios. Each scenario begins with the number of request topics, a positive integer
no larger than 20. This is followed by a description of each topic. Each description consists of five integer values: a
unique topic identifier, the number of requests for that topic, the elapsed time before the first request for that topic is
received, the time needed to service a request, and the time between successive requests. All but the third of these
values are positive integers; the elapsed time until the first request could be zero. Following this, the number of
personnel is given. This will be a positive integer not to exceed 5. Finally, a description of each person is given in
the form of three or more positive integer values: a unique identifying number for the person, the number of topics
covered by this person, and a list of the topic identifiers arranged from highest priority to lowest priority for that
person. A zero follows the last scenario.

Output
For each scenario, the output consists of the scenario number followed by the statement, “All requests are serviced
within m minutes,” where m is the number of minutes from the start of the business day until the last request is
serviced.

      The 2000 ACM Programming Contest World Finals sponsored by IBM

Sample Input     Output for the Sample Input
3                Scenario 1: All requests are serviced within 195 minutes.
128 20 0 5 10
134 25 5 6 7
153 30 10 4 5
4
10 2 128 134
11 1 134
12 2 128 153
13 1 153
0
