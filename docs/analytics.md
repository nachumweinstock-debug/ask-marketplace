# Ask Marketplace Analytics

Analytics is first-party and privacy-conscious. The client batches events to `POST /api/analytics/events`; admin reporting is available at `/admin/analytics` through `GET /api/analytics/admin/summary`.

## Tracked Data

Events include anonymous visitor ID, session ID, URL, page title, page type, referrer, UTM params, device/browser/OS, optional logged-in user ID from the server token, and safe metadata. Metadata keys matching password, token, secret, code, email, phone, zelle, or venmo are dropped on both client and server.

## Page Types

URL classification lives in both `src/lib/analytics.js` and `server/routes/analytics.js`.

- `/` = homepage
- `/schools/[slug]` = school page
- `/subjects/[subject]` = subject page
- `/schools/[slug]/[subject]` = school-subject page
- `/tutors/[slug]` = tutor profile
- `/blog/[slug]` = blog
- `/login`, `/signup`, `/auth/*` = auth
- `/dashboard`, `/account`, `/admin`, `/messages`, `/chat` = dashboard

## Adding Events

Use the helper:

```js
import { trackEvent } from '../lib/analytics';

trackEvent('contact_tutor_clicked', {
  provider_id: provider.id,
  category: provider.category,
});
```

For buttons and links, you can also use data attributes:

```jsx
<button data-analytics-event="become_tutor_clicked" data-analytics-label="hero_cta">
  Post a service
</button>
```

Do not send sensitive personal data in metadata. Use IDs, categories, counts, booleans, and non-sensitive labels.
