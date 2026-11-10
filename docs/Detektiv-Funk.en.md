# Detective radio

| **Feature** | Push-to-talk voice radio between detectives only |
|---|---|
| **Available** | During the head start and the running round |
| **Setting** | None, everyone turns the radio on themselves |

With the radio, detectives talk to each other without X hearing anything. The chat is not
affected: it is still visible to everyone.

## How it works

1. Tap the **microphone icon** next to the chat on the map.
2. Tap **Turn radio on** and allow microphone access.
3. Hold the large button while you want to talk. When you let go, you listen again.
4. Everyone sees who is currently speaking.

The radio is only visible to detectives. X neither sees the icon nor hears anything. It ends
automatically when the game ends.

## Privacy

- Audio goes directly between the detectives' devices (WebRTC). It is not recorded and does not
  pass through the game server. The server only helps to set up the connection.
- While connecting, the devices see each other's IP addresses. They also ask a STUN server for
  their public address. By default this is `stun.cloudflare.com`.
- The microphone is only open while you hold the button.

## For operators

Without further setup, the radio uses Cloudflare's public STUN server. In some mobile networks
that is not enough for a direct connection. A TURN server helps then. Add the variable
`ICE_SERVERS` to the worker as a JSON list, for example:

```json
[
  { "urls": "stun:stun.cloudflare.com:3478" },
  { "urls": "turn:turn.example.org:3478", "username": "name", "credential": "secret" }
]
```

Because it can contain credentials, set it as a secret (`wrangler secret put ICE_SERVERS`). The
list is sent to all players in a room.
