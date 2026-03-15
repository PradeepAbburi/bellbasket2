# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirements are Node.js and pnpm installed - [install Node.js with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
pnpm install

# Step 4: Start the development server with auto-reloading and an instant preview.
pnpm dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Push notifications (daily + important)

This project supports Firebase Cloud Messaging (FCM) with:

- Daily scheduled notifications via `/api/daily-notify` (Vercel Cron)
- Important manual/broadcast notifications via `/api/notify-important`

### Required environment variables (Vercel)

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `VITE_FIREBASE_VAPID_KEY` (client-side token registration)
- `CRON_SECRET` (used by `/api/daily-notify` authorization)
- `IMPORTANT_NOTIFY_SECRET` (used by `/api/notify-important` authorization)

Optional daily defaults:

- `DAILY_NOTIFY_TITLE`
- `DAILY_NOTIFY_BODY`
- `DAILY_NOTIFY_URL`

### Daily schedule

Configured in `vercel.json`:

- `30 3 * * *` (runs every day at 03:30 UTC)

### Manual important notification example

```bash
curl -X POST https://<your-domain>/api/notify-important \
	-H "Content-Type: application/json" \
	-H "Authorization: Bearer $IMPORTANT_NOTIFY_SECRET" \
	-d '{
		"title": "Urgent Service Update",
		"body": "Platform maintenance tonight at 11:30 PM",
		"url": "/help",
		"roles": ["customer", "vendor"],
		"type": "system",
		"sendInApp": true
	}'
```

### Notes

- Client token registration is handled in `AppContext` (`requestPushNotifications`).
- Tokens are saved in user profile fields `fcmToken` and `fcmTokens`.
- Both APIs send push + in-app notifications, so users see updates even if push fails.
- `daily-notify` now auto-builds the message from top discounted products in Firestore when custom title/body is not provided.
- Vendor order status changes (`accepted` → `packed` → `completed` / `rejected`) trigger customer push + in-app tracking updates.

### Real-time test file

Use the test runner to trigger live notifications immediately:

```bash
# Local quickstart
vercel dev

# in another terminal (auto-detects localhost)
pnpm test:notifications --mode=important --userIds=<USER_ID>

# 1) Important notification test
IMPORTANT_NOTIFY_SECRET=xxx NOTIFY_BASE_URL=https://your-domain.com \
pnpm test:notifications --mode=important --userIds=<USER_ID> --title="Test alert" --body="Live test" --url=/browse

# 2) Order tracking flow simulation (accepted -> packed -> completed)
IMPORTANT_NOTIFY_SECRET=xxx NOTIFY_BASE_URL=https://your-domain.com \
pnpm test:notifications --mode=order-flow --userIds=<USER_ID> --orderId=ORD-TEST-1001 --storeName="BellBasket Mart"

# 3) Daily notifier endpoint test
CRON_SECRET=xxx NOTIFY_BASE_URL=https://your-domain.com \
pnpm test:notifications --mode=daily
```

File: `test/realtime-notification-test.mjs`
