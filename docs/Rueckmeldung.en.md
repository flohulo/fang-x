# Round feedback

After every round you can tell the app how you liked it. Feedback is optional and needs no
setting.

## How it works

1. On the result screen you give 1 to 5 stars.
2. With 1 to 3 stars the app asks what you did not like and what should get better. With 4 or 5
   stars it asks what you liked most.
3. You write a sentence or two (up to 500 characters) and send it. The text is optional, the stars
   alone are fine. "Skip" hides the section.

## Privacy

Only the stars, your text, your role in the round (X or detective) and the time are stored. Your
name, the game code, your IP address and locations are **not** stored. Please do not put personal
data in the text.

## For operators

Every piece of feedback is sent to GlitchTip as an event, in the same project as the error reports
(secret `GLITCHTIP_DSN`). Look for the tag `kind = round-feedback`; events carry the tags `rating`
(1 to 5) and `role`, and the text is under "Additional Data" as `reason`. Feedback with the same
star rating is grouped into one issue, so GlitchTip counts them there. Without `GLITCHTIP_DSN`,
feedback is discarded. Sending is limited per IP address (10 per minute).
