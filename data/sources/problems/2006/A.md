---
year: 2006
letter: "A"
title: "Low Cost Air Travel"
source: "https://icpc.global/worldfinals/problems/2006-ICPC-World-Finals/2006WorldFinalProblemSet.pdf"
source_pages: 1-2
local_pdf: "problems_pdfs/2006/A.pdf"
---

# Low Cost Air Travel
Problem A
                                         Low Cost Air Travel
                                                  Input File: air.in
Air fares are crazy! The cost of a ticket is determined by numerous factors, and is usually not directly related to the
distance traveled. Many travelers try to be creative, sometimes using only parts of tickets with stops in various cities
to achieve lower-cost travel. However, the airlines are aware of this behavior, and usually require that the travel
covered by a ticket be completed in order and without intervening travel. For example, if you have a ticket for travel
from City-1 to City-2 then to City-3, you are not allowed to use only the portion of the ticket for travel from City-2
to City-3. You must always start at the first city on the ticket. In addition, you are not allowed to travel from City-1
to City-2, fly elsewhere and return, and then continue your journey from City-2 to City-3.

Let’s consider an example. Suppose you are allowed to purchase three types of tickets:
          Ticket #1:        City-1 to City-3 to City-4          $225.00
          Ticket #2:        City-1 to City-2                    $200.00
          Ticket #3:        City-2 to City-3                    $50.00
Suppose you wanted to travel from City-1 to City-3. There are two ways to get there using only the available ticket
choices:
          Purchase Ticket #1 for $225.00 and use only the first leg of the ticket.
          Purchase Ticket #2 for $200.00 and Ticket #3 for $50.
The first choice is the cheapest.

Given a set of airline ticket offers, and one or more trip itineraries, you must determine how to purchase tickets in
order to minimize the cost of travel. Each trip will be possible.

Input
Input consists of multiple test cases, each describing a set of ticket offers and a set of trip itineraries.

Each case begins with a line containing NT, the number of ticket offers, followed by NT offer descriptions, one to a
line. Each description consists of a positive integer specifying the price of the ticket, the number of cities in the
ticket’s route, and then that many cities. Each city in a case has an arbitrary, but unique, integer identification
number. Note that several tickets may be purchased from the same offer.

The next line contains NI, the number of trips that are to have their cost minimized. NI lines follow, giving the
itineraries for each trip. Each line consists of the number of cities in the itinerary (including the starting city),
followed by that many city identification numbers, given in the order they are to be visited.

There will be no more than 20 ticket offers or 20 itineraries in a test case. Each offer and itinerary lists from 2 to 10
cities. No ticket price exceeds $10,000. Adjacent cities in a route or itinerary will be distinct. Tickets and trips are
numbered sequentially in each set, starting with 1.

The last case is followed by a line containing a zero.

Output
For each trip, output two lines containing the case number, the trip number, the minimum cost of the trip, and the
numbers of the tickets used for the trip, in the order they will be used. Follow the output format shown below. The
output will always be unique.

Sample Input   Output for the Sample Input
3              Case 1, Trip 1: Cost = 225
225 3 1 3 4      Tickets used: 1
200 2 1 2      Case 2, Trip 1: Cost = 100
50 2 2 3         Tickets used: 2
1              Case 2, Trip 2: Cost = 300
2 1 3            Tickets used: 3 1
3
100 2 2 4
100 3 1 4 3
200 3 1 2 3
2
3 1 4 3
3 1 2 4
0
