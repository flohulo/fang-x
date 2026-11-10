# Play area

| **Setting** | Play area (radius, meters) |
|---|---|
| **Rule parameter** | `map.playAreaRadiusMeters` |
| **Default** | 700 meters |

By default the play area is a circle around the shared starting point. Its radius determines how
far X may move away from this point.

## Draw the play area on the map

Instead of the circle, the host can define a custom shape in the lobby via "Draw play area on the
map": tapping the map sets the corner points (3 to 50), "Undo last point" and "Clear all" correct
mistakes, and "Apply" saves the area. A drawn play area replaces the circle; the radius is then no
longer used. "Use circle again" switches back to the radius. The play area can only be changed in
the lobby.

## When X leaves the area

If the corresponding rule is active, X's exact live location is transmitted to the detectives for
as long as X stays outside the area. When X returns, this live share ends. X sees a notice in the
app while the location is being shared.

## Which value should I choose?

Choose a radius that suits the terrain and the group. The area should cover public, safe paths
and must not require dangerous or inaccessible areas. Set the
[starting point](Spieleinstellungen.md#starting-point) together and discuss the boundaries before
you start.

The play area boundary can also be switched off entirely in the settings if you want to play
without a fixed limit.
