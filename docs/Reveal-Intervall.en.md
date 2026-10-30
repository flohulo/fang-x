# Reveal interval

**Setting in Fang X:** Reveal interval (minutes)
**Rule parameter:** `reveal.intervalMinutes`
**Default value:** 3 minutes

The reveal interval determines how often X's whereabouts are automatically reported to the
detectives. Such a location report shows the detectives the last reveal on the map.

## Which value should I choose?

- **1–2 minutes** make the hunt more direct and help the detectives track X down faster.
- **3 minutes** is a balanced starting value.
- **4–5 minutes** give X more opportunity for changes of direction and false trails.

Regardless of the interval, leaving the play area can trigger a separate live location share.

## First location report

**Setting in Fang X:** First location report (minutes)
**Rule parameter:** `reveal.firstRevealAfterMinutes`
**Default value:** 3 minutes

The first location report follows after the head start ends. With a value of **0**, X is
reported for the first time immediately after the head start; after that the configured interval
applies.

A later first ping gives X time to break away without the detectives immediately having a clue.
An early first ping gets the hunt going faster.
