# Catch radius

| **Setting** | Catch radius (meters) |
|---|---|
| **Rule parameter** | `catch.radiusMeters` |
| **Default** | 30 meters |

The catch radius is the maximum GPS distance at which a catch attempt can succeed. For this the
server compares the most recently reported locations of X and the detectives.

## Which value should I choose?

Smartphone GPS is not always exact. Buildings, trees and reception can affect the position
measurement. A larger radius compensates for such fluctuations but makes catching easier.

- **30 meters** is a practical starting value for most rounds.
- A smaller value demands more precise GPS measurements.
- With poor reception a larger value can avoid frustration caused by GPS deviations.

Choose the radius so that a catch also feels fair and comprehensible on site. With the
**photo catch**, a detective reports the catch and X confirms it in the app; photos are not
uploaded.
