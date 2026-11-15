# Voice radio

| **Feature** | Push-to-talk voice radio between detectives only |
|---|---|
| **Rule parameter** | `radio.enabled` |
| **Default** | Off |
| **Available** | During the head start and the running round |

With the voice radio, detectives talk to each other without X hearing anything. The chat is not
affected: it is still visible to everyone.

How to behave on the radio is described in [Radio discipline and radio language](Funkdisziplin.md).

## Turning it on

The host turns the voice radio on in the lobby: **Enable voice radio for detectives**. It is off by
default. The setting applies to the whole round and cannot be changed during the game.

## Permissions

The voice radio needs access to the **microphone**. When it is enabled, every detective sees a card
**Microphone for the voice radio** in the lobby and an entry in the checklist. **Allow microphone**
makes the browser ask right away, so nobody is interrupted in the middle of the game.

- If the microphone was blocked, the app shows how to allow it again in the site settings.
- On devices without a microphone or without WebRTC support, the app says the voice radio is not
  available. You can still play and write in the chat.
- X does not need the microphone and does not see the voice radio.

## How it works in the game

1. Tap the **microphone icon** next to the chat on the map.
2. Tap **Turn voice radio on**.
3. Hold the large button while you want to talk. When you let go, you listen again.
4. Everyone sees who is currently speaking.

The voice radio ends automatically when the game ends.

## Which speaker does the audio come out of?

The app does not choose the output itself. Audio plays through the output your device and browser
are currently using: normally the loudspeaker, or headphones and Bluetooth devices when connected.
On some phones the audio switches to the earpiece while the microphone is active and sounds
quieter. In that case, select the loudspeaker in the system settings or use headphones. For
rounds outdoors, headphones are usually the better choice.

## Privacy

- Audio goes directly between the detectives' devices (WebRTC). It is not recorded and does not
  pass through the game server. The server only helps to set up the connection.
- While connecting, the devices see each other's IP addresses. They also ask a STUN server for
  their public address. By default this is `stun.cloudflare.com`.
- The microphone is only open while you hold the button.

## For operators

Without further setup, the voice radio uses Cloudflare's public STUN server. In some mobile
networks that is not enough for a direct connection. A TURN server helps then. Add the variable
`ICE_SERVERS` to the worker as a JSON list, for example:

```json
[
  { "urls": "stun:stun.cloudflare.com:3478" },
  { "urls": "turn:turn.example.org:3478", "username": "name", "credential": "secret" }
]
```

Because it can contain credentials, set it as a secret (`wrangler secret put ICE_SERVERS`). The
list is sent to all players in a room.
