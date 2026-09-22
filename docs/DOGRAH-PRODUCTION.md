# Dograh production webhook

## Production URL

- App: https://skyos-two.vercel.app
- Webhook: https://skyos-two.vercel.app/api/webhooks/dograh

## Checklist

1. [x] `NEXT_PUBLIC_APP_URL` on Vercel equals `https://skyos-two.vercel.app` (no trailing slash).
2. [x] Dograh workflow webhook URL points at `https://skyos-two.vercel.app/api/webhooks/dograh`.
3. [x] Dograh webhook secret matches Vercel `DOGRAH_WEBHOOK_SECRET` (`x-dograh-webhook-secret` or Bearer).
4. [x] `DOGRAH_ALLOWED_TEST_NUMBERS` set on Vercel (consenting E.164 only).
5. [x] Old ngrok / tunnel webhook URLs removed from Dograh.
6. [ ] Spoken agent / Start Call greeting uses **SkyOS** (not legacy company names).
7. [ ] Test call from Live Mode qualify → webhook completes or fails cleanly with Retry.

## Webhook payload

Use Dograh template variables (not `{{transcript}}` — that field is not in the webhook context):

```json
{
  "workflow_run_id": "{{workflow_run_id}}",
  "skyos_record_id": "{{initial_context.skyos_record_id}}",
  "transcript_url": "{{transcript_url}}",
  "transcript_public_url": "{{transcript_public_url}}",
  "public_access_token": "{{public_access_token}}",
  "recording_url": "{{recording_url}}",
  "recording_public_url": "{{recording_public_url}}",
  "gathered_context": {
    "consultation_accepted": "{{gathered_context.consultation_accepted}}",
    "consultation_preference": "{{gathered_context.consultation_preference}}",
    "callback_requested": "{{gathered_context.callback_requested}}",
    "callback_time": "{{gathered_context.callback_time}}",
    "interest_level": "{{gathered_context.interest_level}}",
    "needs": "{{gathered_context.needs}}",
    "compliance_management": "{{gathered_context.compliance_management}}"
  },
  "initial_context": {
    "skyos_record_id": "{{initial_context.skyos_record_id}}"
  }
}
```

## Local / staging note

Dev tunnels (`ngrok`, etc.) are for local only. Production Dograh must not call localhost.

## Supabase Auth URLs

In Supabase → Authentication → URL Configuration:

- Site URL: `https://skyos-two.vercel.app`
- Redirect URLs: `https://skyos-two.vercel.app/auth/callback`
