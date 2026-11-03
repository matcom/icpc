---
year: 1999
letter: "G"
title: "The Letter Carrier’s Rounds"
source: "https://icpc.global/worldfinals/problems/1999-ICPC-World-Finals/1999WorldFinalProblemSet.pdf"
source_pages: 13-14
local_pdf: "problems_pdfs/1999/G.pdf"
---

# The Letter Carrier’s Rounds
The 23rd Annual
   ACM International Collegiate
     Programming Contest
      WORLD FINALS

                                              Problem G
                                The Letter Carrier’s Rounds
                                      Input: smtp.in
For an electronic mail application you are to describe the SMTP-based communication that takes place between pairs of
MTAs. The sender’s User Agent gives a formatted message to the sending Message Transfer Agent (MTA). The sending
MTA communicates with the receiving MTA using the Simple Mail Transfer Protocol (SMTP). The receiving MTA
delivers mail to the receiver’s User Agent. After a communication link is initialized, the sending MTA transmits
command lines, one at a time, to the receiving MTA, which returns a three-digit coded response after each command is
processed. The sender commands are shown below in the order sent for each message. There is more than one RCPT TO
line when the same message is sent to several users at the same MTA. A message to users at different MTAs requires
separate SMTP sessions.
     HELO P\QDPH                     Identifies the sender to the receiver (yes, there is only one L)
     MAIL FROM:<VHQGHr>              Identifies the message sender
     RCPT TO:<XVHr>                  Identifies one recipient of the message
     DATA                            Followed by an arbitrary number of lines of text comprising the message
                                     body, ending with a line containing a period in column one.
     QUIT                            Terminates the communication.

The following response codes are sent by the receiving MTA:
   221 Closing connection (after QUIT)
   250 Action was okay (after MAIL FROM and RCPT TO specifying an acceptable user, or completion of a message)
   354 Start sending mail (after DATA)
   550 Action not taken; no such user here (after RCPT TO with unknown user)

,QSXW
The input contains descriptions of MTAs followed by an arbitrary number of messages. Each MTA description begins
with the MTA designation and its name (1 to 15 alphanumeric characters). Following the MTA name is the number of
users that receive mail at that MTA and a list of the users (1 to 15 alphanumeric characters each). The MTA description
is terminated by an asterisk in column 1. Each message begins with the sending user’s name and is followed by a list of
recipient identifiers. Each identifier has the form XVHU@PWDQDPH. The message (each line containing no more than 72
characters) begins and terminates with an asterisk in column 1. A line with an asterisk in column 1 instead of a sender
and recipient list indicates the end of the entire input.

2XWSXW
For each message, show the communication between the sending and receiving MTAs. Every MTA mentioned in a
message is a valid MTA; however, message recipients may not exist at the destination MTA. The receiving MTA rejects
mail for those users by responding to the RCPT TO command with the 550 code. A rejection will not affect delivery to
authorized users at the same MTA. If there is not at least one authorized recipient at a particular MTA, the DATA is not
sent. Only one SMTP session is used to send a message to users at a particular MTA. For example, a message to 5 users
at the same MTA will have only one SMTP session. Also a message is addressed to the same user only once. The order
in which receiving MTAs are contacted by the sender is unspecified. As shown in the sample output , prefix the
communication with the communicating MTA names, and indent each communication line.

6DPSOH,QSXW
MTA London 4 Fiona Paul Heather Nevil
MTA SanFrancisco 3 Mario Luigi Shariff
MTA Paris 3 Jacque Suzanne Maurice
MTA HongKong 3 Chen Jeng Hee

        7KH$&03URJUDPPLQJ&RQWHVW:RUOG)LQDOVVSRQVRUHGE\,%0

MTA MexicoCity 4 Conrado Estella Eva Raul
MTA Cairo 3 Hamdy Tarik Misa
*
Hamdy@Cairo Conrado@MexicoCity Shariff@SanFrancisco Lisa@MexicoCity
*
Congratulations on your efforts !!
--Hamdy
*
Fiona@London Chen@HongKong Natasha@Paris
*
Thanks for the report! --Fiona
*
*

2XWSXWIRUWKH6DPSOH,QSXW
Connection between Cairo and MexicoCity
     HELO Cairo
     250
     MAIL FROM:<Hamdy@Cairo>
     250
     RCPT TO:<Conrado@MexicoCity>
     250
     RCPT TO:<Lisa@MexicoCity>
     550
     DATA
     354
     Congratulations on your efforts !!
     --Hamdy
     .
     250
     QUIT
     221
Connection between Cairo and SanFrancisco
     HELO Cairo
     250
     MAIL FROM:<Hamdy@Cairo>
     250
     RCPT TO:<Shariff@SanFrancisco>
     250
     DATA
     354
     Congratulations on your efforts !!
     --Hamdy
     .
     250
     QUIT
     221
Connection between London and HongKong
     HELO London
     250
     MAIL FROM:<Fiona@London>
     250
     RCPT TO:<Chen@HongKong>
     250
     DATA
     354
     Thanks for the report! --Fiona
     .
     250
     QUIT
     221
Connection between London and Paris
     HELO London
     250
     MAIL FROM:<Fiona@London>
     250
     RCPT TO:<Natasha@Paris>
     550
     QUIT
     221
