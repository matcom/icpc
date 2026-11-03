---
year: 2001
letter: "F"
title: "A Major Problem"
source: "https://icpc.global/worldfinals/problems/2001-ICPC-World-Finals/2001WorldFinalProblemSet.pdf"
source_pages: 11-12
local_pdf: "problems_pdfs/2001/F.pdf"
---

# A Major Problem
The 2001 25th Annual      acm                  International Collegiate

                     Programming Contest World Finals
                             sponsored by IBM

                                               Problem F
                                            A Major Problem
                                              Input File: major.in
In western music, the 12 notes used in musical notation are identified with the capital letters A through G, possibly
followed by a sharp '#' or flat 'b' character, and are arranged cyclically as shown below. A slash is used to identify
alternate notations of the same note.

C/B# C#/Db D D#/Eb E/Fb F/E# F#/Gb G G#/Ab A A#/Bb B/Cb C/B# …

Any two adjacent notes in the above list are known as a semitone. Any two notes that have exactly one note
separating them in the above list are known as a tone. A major scale is composed of eight notes; it begins on one of
the above notes and follows the progression tone-tone-semitone-tone-tone-tone-semitone. For example, the major
scales starting on C and Db, respectively, are made up of the following notes:

CDEFGABC
Db Eb F Gb Ab Bb C Db

The following rules also apply to major scales:

1.   The scale will contain each letter from A to G once and only once, with the exception of the first letter of the
     scale, which is repeated as the last letter of the scale.
2.   The scale may not contain a combination of both flat and sharp notes.

The note that begins a major scale is referred to as the key of the scale. For example, the scales above are the scales
for the major keys of C and Db, respectively. Transposing notes from one scale to another is a simple matter of
replacing a note in one scale with the note in the corresponding position of another scale. For example, the note F in
the major key of C would transpose to the note Gb in the major key of Db since both notes occupy the same position
in their respective scales.

You must write a program to transpose notes from one major scale to another.

Input

The input consists of multiple test cases, with one test case per line. Each line starts with a source key, followed by a
target key, and then followed by a list of notes to be transposed from the major scale of the source key to the major
scale of the target key. Each list is terminated by a single asterisk character. All notes on a line and the terminating
asterisk are delimited by a single space.

The final line of the input contains only a single asterisk which is not to be processed as a test case .

Output

Each test case produces one or more lines of output. If the source and target keys are valid, then the first output line
for each input line should read “Transposing from X to Y:” where X is the source key and Y is the target
key. If either the source or target key is not valid a line which reads “Key of X/Y is not a valid major
key”, where X/Y is the key that is not valid, should be output and the remainder of the input for that line skipped. If
both the source and target key are not valid, report only the source key.

         The 2001 ACM Programming Contest World Finals sponsored by IBM

For test cases that contain valid source and target keys, the first output line will be followed by one output line for
each note to be transposed. If the note is a valid note in the major scale of the source key then the output line should
read “M transposes to N” where M is the note in the source key and N is the corresponding note in the target
key. If the input note is not a valid note in the major scale of the source key then the output line should read “M is
not a valid note in the X major scale” where M is the input note and X is the source key. For
either valid or non-valid notes, the output line should be indented in a consistent manner.

The output data for each input line should be delimited by a single blank line. The format of your output should be
similar to the output shown below.

Sample Input                             Output for the Sample Input
C Db F *                                 Transposing from C to Db:
Db C Gb *                                  F transposes to Gb
C B# A B *
C D A A# B Bb C *                        Transposing from Db to C:
A# Bb C *                                  Gb transposes to F
*
                                         Key of B# is not a valid major key

                                         Transposing from C to D:
                                           A transposes to B
                                           A# is not a valid note in the C major scale
                                           B transposes to C#
                                           Bb is not a valid note in the C major scale
                                           C transposes to D

                                         Key of A# is not a valid major key
