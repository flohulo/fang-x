# Game settings

The host sets the rules during game setup. Changes apply to the upcoming round and are sent to
all players immediately. The rules can no longer be changed during the round.

Under **Name of the settings** the host gives the round a name, for example "Saturday round".
The name appears in the file name when the settings are exported as a JSON file after the game.

## Overview

| Setting | Default | Details |
|---|---|---|
| Game duration | 30 minutes | [Game duration](Spieldauer.md) |
| Head start for X | 2 minutes | [Head start for X](Vorsprung-fuer-X.md) |
| Countdown before start | 10 seconds | Time to get ready after the start |
| First location report | 3 minutes | [Reveal interval](Reveal-Intervall.md#first-location-report) |
| Reveal interval | 3 minutes | [Reveal interval](Reveal-Intervall.md) |
| Reveal radius | 5 meters | [Reveal radius](Sichtradius.md) |
| Catch radius | 30 meters | [Catch radius](Fangradius.md) |
| Play area | 700 meters | [Play area](Spielgebiet.md) |
| Bonus mission for X | off | [Bonus mission for X](Bonusmission-fuer-X.md) |
| Emergency button for X | on | [Emergency button](Notfall-Knopf.md) |

## More settings

### X sees detectives

Determines whether X sees the detectives' locations: **always** (live location), **only at each
reveal** or **never**. Independently of this, the detectives only see X at the configured
reveals.

### Catch rule

- **Automatic catch within the catch radius:** As soon as a detective is close enough to X, the
  round ends.
- **Photo catch:** A detective reports the catch, X confirms it in the app. Photos are not
  uploaded.

### Transit budget

X can report bus and train stops if the budget is enabled. Each report informs the detectives and
uses up one stop. The bus and train budgets can be set separately.

### Means of transport

**Allow public transport for X** and **for detectives** permits using buses and trains. Without
this option only walking counts as a means of getting around.

### Live locations of the detectives

If **Detectives share their live location with each other during the game** is active, the
detectives see each other on the map. This makes coordination easier but also reveals more to X
if the "X sees detectives" rule is active.

### Play area boundary

The play area boundary limits the area around the starting point. If X leaves the area, the exact
location is shared live until X returns. The setting can be switched off if you want to play
without a fixed limit.

### Starting point

The host can set the current location as the starting point. The point is the center of the play
area and stays visible on the map during the round. If no starting point is set, X's first
position is used as the center.

## Recommended presets

| Mode | Duration | Head start | Interval | Reveal radius | Catch radius | Area |
|---|---|---|---|---|---|---|
| **Classic (default)** | 30 min. | 2 min. | 3 min. | 5 m | 30 m | 700 m |
| **Park sprint (fast)** | 15 min. | 1 min. | 2 min. | 5 m | 25 m | 350 m |
| **City stealth (large)** | 45 min. | 3 min. | 4 min. | 50 m | 35 m | 1200 m |

!!! tip "Try first, then fine-tune"
    Start with **Classic** and only adjust one or two values. A larger play area or a longer head
    start changes the round more than a few extra minutes of game duration.
