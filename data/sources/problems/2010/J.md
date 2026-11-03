---
year: 2010
letter: "J"
title: "Sharing Chocolate"
source: "https://icpc.global/worldfinals/problems/2010-ICPC-World-Finals/2010WorldFinalProblemSet.pdf"
source_pages: 19-20
local_pdf: "problems_pdfs/2010/J.pdf"
---

# Sharing Chocolate
Prob
                                                  blem J
                                          S
                                          Sharing Chocolate
                                           Problem ID: choco
                                                           olate
Chocolate in its many forrms is enjoyed by millions off people around
                                                                    d the world eveery day. It is a truly universall
candy, avaailable in virtuaally every counntry around thee world.

                                                                         i with friends. Unfortunately
You find thhat the only thiing better than eating chocolaate is to share it                          y, your friends
are very piicky and have different
                          d         appetites: some wouuld like more anda others less of the chocolate that you offe
                                                                                                                   fer
them. You have found it increasingly diifficult to deterrmine whetherr their demandss can be met. Itt is time to writte
a program that solves thee problem oncee and for all!

Your chocoolate comes ass a rectangular bar. The bar coonsists of samee-sized rectanggular pieces. Too share the
chocolate, you may breakk one bar into twot pieces alonng a division between
                                                                           b         rows oor columns of the
                                                                                                          t bar. You
may then repeatedly
          r           breaak the resulting
                                         g pieces in the ssame manner. Each of your ffriends insists on   o a getting a
single rectaangular portion
                          n of the chocollate that has a sspecified numbber of pieces. Y  You are a little bit insistent ass
well: you will
           w break up your
                         y     bar only iff all of it can bee distributed too your friends, with none left over.

For exampple, Figure 9 shhows one way thatt a chocolatee bar consisting of 3 × 4 pieeces can be spliit into 4 parts
that containn 6, 3, 2, and 1 pieces respectively, by breaaking it 3 timess. (This correspponds to the firrst sample
input.)

                                                          F
                                                          Figure 9
Input
The input consists
            c        of mulltiple test casess, each describing a chocolatee bar to share. Each descriptiion starts with a
line containning a single innteger n (1 ≤ n ≤ 15), the nummber of parts innto which the bbar is supposedd to be split.
This is folllowed by a linee containing twwo integers x annd y (1 ≤ x, y ≤ 100), the dimmensions of the chocolate bar.
The next liine contains n positive
                            p        integeers, giving the nnumber of piecces that are suppposed to be inn each of the n
parts.

The input is
          i terminated by
                       b a line containing the integeer zero.

Output
For each teest case, first display its case number. Then display whethher it is possiblee to break the chocolate
                                                                                                        c          in thhe
desired waay: display “Ye  es” if it is posssible, and “No”” otherwise. Foollow the formaat of the samplle output.

Sample In
        nput                                                  Output forr the Sample
                                                                                   e Input
4                                                             Case 1: Yes
3 4                                                           Case 2: No
6 3 2 1
2
2 3
1 5
0
