# Emergency button

| **Setting** | Emergency button for X: give up the game and share location |
|---|---|
| **Rule parameter** | `catch.xCanSurrender` |
| **Default** | On |

The emergency button is visible to X during the head start and the running round at the bottom of
the map controls. It ends the round immediately and shares X's exact location with the
detectives.

## How it works

1. X taps **Emergency**.
2. The app asks: **"Emergency: give up the game?"**
3. With **Give up** the round ends. **Keep playing** or Escape cancels.

After the confirmation the detectives win. X's location at the time of giving up is transmitted
once to the detectives. No location history is created.

## What the detectives see

- A message **"X gave up"** in the result view.
- The map with X's exact location.
- A link to open the point in OpenStreetMap.
- If the alert is enabled, a system notification as well.

If no current location was available, the round still ends. The notice then says that no
location could be shared.

## When is the button useful?

- Someone has to call off the round for health or safety reasons.
- The group wants to end the hunt fairly instead of letting X keep running.
- X wants to show the detectives their own location so the group can find each other again.

## Switching it off

The host can switch off the emergency button in the [game settings](Spieleinstellungen.md). Then
the server rejects giving up and the round continues.

!!! tip ":material-shield-check: Recommended as a safety net"
    For rounds with children or in confusing terrain you should leave the button switched on.
