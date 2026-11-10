# Round summary

At the end of every round the app shows a short summary next to the result. It is the same for
everyone and needs no setting.

## What is shown

| Figure | Meaning |
|---|---|
| Play time | Length of the running phase, without countdown and head start |
| Reveals | How often X's position was reported |
| Closest approach | The smallest distance between X and a detective during the round |
| Walked the farthest | Who covered the longest distance |
| Distance per person | The distance each person walked, X is marked |

## Privacy

The summary consists only of totals and one extreme value. When a position arrives, the server adds
the distance to the running total and remembers the smallest gap. **No route history** is created and
no locations are stored for the summary.

Small GPS jitter below 5 metres and jumps above 400 metres are ignored. The distance is therefore an
estimate, not an exact measurement.

Once the game has ended, the summary stays available like the result until the room is closed.
Reloading the page still shows it.
