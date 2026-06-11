Updates to do: (330 pilot run)
1. Can we open the PDF in some sort of local viewer within the app itself?
2. FDP Page:
    - Make "Report Hour" a selector, not boxes with times.
    - Make "Acclimatised" or "Unknown" (not "Unknown -1h EASA) - Make this take up a full row with space between options.
    - Make Duty Type Standard / Eastbound TA / Through The Night / Augmented / Heavy Crew (+2) - Style this to take up 2 full rows
    - Make the Result "EASA", "Working Conditions" and "Binding" open something like a modal if clicked:
        - EASA - Should explain where this is under EASA FTL.
        - Working Condition - Should pinpoint exactly where this is in the respective working conditions document.
3. Rest Checker page:
    - Scenarios should be a dropdown or similar with full names (not Pre-IC etc.)
4. Days Off page:
    - Destinations are:
        - JFK, Newark, Boston, Chicago, Miami, Orlando, Seattle, Denver, Las Vegas, San Francisco, Los Angeles, Cancun.
        - There's the potential for a charter, so try figure it out, if unknown, say you don't know, and suggest contact with union rep.
5. Standby Decoder page:
    - Standby start time should be a time selector
    - instead of "Duty Assigned" say "Have you been called?". If ticked, then provide a time selector "What time were you called?".
6. Delay Tool page
    - Rostered report hour should be a time selector.
    - Delay duration input should be a time selector.
    - Duty Type should be in full, i.e. Standard, Eastbound Transatlantic, Through The Night, Augmented, Heavy (+2 crew).
7. There should be the addition of a calculator for OWC (outside working conditions payment). This should use the added /data/pay/pay.json. You should take a pilot position "Cadet" (cadet), "Non Type Rated Copilot" (ntr), "Copilot"(fo), "Narrow Body Captain"(nbCapt) and "Captain", as well as a year (seniority) to get their basic pay, then calculate the value of an OWC payment.

8. The bottom tab navigation is hiding behind my phone buttons (android), this should sit ontop slightly so it doesn't overlap with phone controls.