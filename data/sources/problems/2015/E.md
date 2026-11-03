---
year: 2015
letter: "E"
title: "Evolution in Parallel"
source: "https://icpc.global/worldfinals/problems/2015-ICPC-World-Finals/icpc2015.pdf"
source_pages: 9-10
local_pdf: "problems_pdfs/2015/E.pdf"
---

# Evolution in Parallel
Problem E
                                    Evolution in Parallel
                                     Time limit: 2 seconds
It is 2178, and alien life has been discovered on a distant planet. There seems to be only one species on
the planet and they do not reproduce as animals on Earth do. Even more amazing, the genetic makeup
of every single organism is identical!
The genetic makeup of each organism is a single sequence of nucleotides. The nucleotides come in three
types, denoted by ‘A’ (Adenine), ‘C’ (Cytosine), and ‘M’ (Muamine). According to one hypothesis,
evolution on this planet occurs when a new nucleotide is inserted somewhere into the genetic sequence
of an existing organism. If this change is evolutionarily advantageous, then organisms with the new
sequence quickly replace ones with the old sequence.
It was originally thought that the current species evolved this way from a single, very simple organism
with a single-nucleotide genetic sequence, by way of mutations as described above. However, fossil
evidence suggests that this might not have been the case. Right now, the research team you are working
with is trying to validate the concept of “parallel evolution” – that there might actually have been two
evolutionary paths evolving in the fashion described above, and eventually both paths evolved to the
single species present on the planet today. Your task is to verify whether the parallel evolution hypothesis
is consistent with the genetic material found in the fossil samples gathered by your team.

Input

The input begins with a number n (1 ≤ n ≤ 4 000) denoting the number of nucleotide sequences found
in the fossils. The second line describes the nucleotide sequence of the species currently living on the
planet. Each of the next n lines describes one nucleotide sequence found in the fossils.
Each nucleotide sequence consists of a string of at least one but no more than 4 000 letters. The strings
contain only upper-case letters A, C, and M. All the nucleotide sequences, including that of the currently
live species, are distinct.

Output

Display an example of how the nucleotide sequences in the fossil record participate in two evolution-
ary paths. The example should begin with one line containing two integers s1 and s2 , the number of
nucleotide sequences in the fossil record that participate in the first path and second path, respectively.
This should be followed by s1 lines containing the sequences attributed to the first path, in chronological
order (from the earliest), and then s2 lines containing the sequences attributed to the second path, also
in chronological order. If there are multiple examples, display any one of them. If it is possible that a
sequence could appear in the genetic history of both species, your example should assign it to exactly
one of the evolutionary paths.
If it is impossible for all the fossil material to come from two evolutionary paths, display the word
impossible.

ACM-ICPC World Finals 2015 Problem E: Evolution in Parallel                                               9

Sample Input 1                                 Sample Output 1
5                                              1 4
AACCMMAA                                       MM
ACA                                            A
MM                                             AA
ACMAA                                          ACA
AA                                             ACMAA
A

Sample Input 2                                 Sample Output 2
3                                              impossible
ACMA
ACM
ACA
AMA

Sample Input 3                                 Sample Output 3
1                                              impossible
AM
MA

Sample Input 4                                 Sample Output 4
4                                              0 4
AAAAAA                                         A
AA                                             AA
AAA                                            AAA
A                                              AAAAA
AAAAA

ACM-ICPC World Finals 2015 Problem E: Evolution in Parallel      10
