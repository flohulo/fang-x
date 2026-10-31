# Fangradius

| **Einstellung** | Fangradius (Meter) |
|---|---|
| **Regelparameter** | `catch.radiusMeters` |
| **Standardwert** | 30 Meter |

Der Fangradius ist der maximale GPS-Abstand, bei dem ein Fangversuch erfolgreich sein kann. Der
Server vergleicht dazu die zuletzt gemeldeten Standorte von X und den Detektiven.

## Welchen Wert sollte ich wählen?

Smartphone-GPS ist nicht immer exakt. Gebäude, Bäume und Empfang können die Positionsmessung
beeinflussen. Ein größerer Radius gleicht solche Schwankungen aus, macht das Fangen aber leichter.

- **30 Meter** sind ein praktischer Startwert für die meisten Runden.
- Ein kleinerer Wert verlangt genauere GPS-Messungen.
- Bei ungenauem Empfang kann ein größerer Wert Frust durch GPS-Abweichungen vermeiden.

Wählt den Radius so, dass ein Fang auch vor Ort fair und nachvollziehbar wirkt. Beim
**Foto-Fang** meldet ein Detektiv den Fang und X bestätigt ihn in der App; Fotos werden nicht
hochgeladen.
