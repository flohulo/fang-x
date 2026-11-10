# Everyone safe and radio silence

Two aids make sure nobody gets lost on the way. Both are always on and need no setting.

## Radio silence warning

If no position arrives from a connected person for a while, **everyone** sees a notice with their
name. The person concerned sees a notice to check GPS and connection.

The threshold depends on the [reveal interval](Reveal-Intervall.md):

| Reveal schedule | Warning after |
|---|---|
| Fixed interval | two intervals, at least 5 and at most 30 minutes |
| Decreasing | two intervals of the smallest value, at least 5 and at most 30 minutes |
| Random | 10 minutes |

The warning appears only once per silence. As soon as a position arrives again, the person is back
in the game and can be reported again after a new silence. Only the arrival of positions is counted,
no locations are stored for it. Dropped connections are not reported, they already show as
disconnected in the player list.

## Is everyone safe?

After the game ends, the app asks on the result screen: **Is everyone safe?** Everyone taps **I am
safe**. All players see live who has confirmed and who is still open. The group notices right away
if someone does not respond and can ask before everyone goes home.

Confirmations only apply to the finished round and are cleared at the next start.
