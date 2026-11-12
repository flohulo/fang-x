# Ping trick

| **Setting** | Ping trick for X: fake or skip one reveal per round |
|---|---|
| **Rule parameter** | `reveal.xCanTrick` |
| **Default** | On |

With the ping trick, X can mislead the detectives once per round. There is **one shared allowance**:
either a fake ping or a skipped ping, not both.

## How it works

1. X taps **Actions** at the top of the map and chooses **Ping trick**.
2. X chooses **Fake ping** or **Skip ping**.
3. The trick applies to the **next** reveal. Until then it can be cancelled with **Take back**, and
   it is not used up.

| Trick | What the detectives see |
|---|---|
| Fake ping | A normal reveal, but at a wrong place. It is 150 to 300 metres away from X, at least two reveal radii, and inside the play area. In small play areas the distance is shorter. |
| Skip ping | No reveal. The countdown continues and the next reveal comes at the normal pace. |

The detectives do not learn whether a reveal was fake or missing. After a skipped ping, the next
reveal counts as the next number, so there is no gap.

If the app finds no suitable place for the fake ping, it reports the real position and tells X. The
trick is then not used up.

## Who is it for?

The trick adds tension for groups that want to give X a few more options. If you want pure hiding
without deception, turn it off in the [game settings](Spieleinstellungen.md). The server then
rejects the trick.

!!! tip ":material-scale-balance: Balance"
    Combined with high jitter (see [Reveal radius](Sichtradius.md)) it becomes very hard for the
    detectives. Use only one of the two if the group is small.
