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

Feedback is kept in its own Durable Object with SQLite (`FeedbackStore`). To read it, set a secret:

```bash
npx wrangler secret put FEEDBACK_ADMIN_TOKEN
```

Then `GET /api/feedback` with the header `Authorization: Bearer <token>` returns the count per star
rating, the average and the latest 100 entries as JSON. Without the token set, reading is disabled.
Sending is limited per IP address (10 per minute).
