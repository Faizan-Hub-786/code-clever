# Code Clever — Task Center V3

React + Vite frontend with a MySQL/Express backend foundation.

## Run frontend
npm install
npm run dev

## Run API
1. Copy `.env.example` to `.env`
2. Set your MySQL credentials and a strong JWT_SECRET.
3. Import `database/schema.sql` into MySQL.
4. Start the API:
   npm run server

The frontend task page falls back to demo data if the API is not available. After login, store the returned JWT as `cc_token` to use the real task API.

## Task logic
- Active plan controls the daily task count and unit reward.
- User task assignments are unique per user/day/task.
- Reward is read from the plan's `unit_reward`; it is not trusted from the browser.
- A task must be started/submitted before server-side completion.
- Completion runs inside a MySQL transaction and creates a wallet ledger entry.
- Wallet balance and lifetime earnings are updated atomically.
- Audit logs record completed-task rewards.
- Production app-install tasks should use a real verification/callback/proof process before calling completion; the demo endpoint is not proof of an external install.

## Financial integrity
Do not present package deposits or projected earnings as guaranteed returns. Any real-money product should include appropriate legal/compliance review, transparent terms, refund rules, and server-side payment verification.


## Plans V4
- `/plans` reads C1-C9 plan data from the server when authenticated.
- Plan reward formula is `daily_task_count × unit_reward`.
- `/api/plans/select` changes the active plan and writes an audit log.
- Selecting a plan does not itself charge a wallet. Real package payment should be handled by a separately verified deposit/payment flow.


## Team V5
- `/team` uses `/api/team` when authenticated and falls back to demo data otherwise.
- Referral relationships are stored in `referrals`.
- Team reward amounts are not fabricated by the browser; production reward credits should be posted to the wallet ledger only after verified qualifying activity.
- The current demo team UI is for presentation/testing and should be wired to the final published team-reward rules before launch.


## Settings V6
- `/settings` includes Account, Security, Notifications, Preferences, Appearance and Help sections.
- `/settings` includes quick toggles and logout.
- `/settings` -> Edit Profile supports local/demo persistence and the authenticated `/api/profile` endpoint.
- Profile updates are validated server-side for name/email; duplicate emails are rejected.


## Wallet / Deposit / Withdrawal V7
- `/wallet` displays the server-side wallet balance and transaction ledger.
- `/deposit` creates a pending deposit request. The browser never credits the wallet.
- `/withdraw` validates available balance and moves requested funds from available to pending inside a MySQL transaction.
- Admin foundation endpoints approve deposits, reject deposits, mark withdrawals paid, and reject withdrawals with a transactional refund.
- In production, admin endpoints must have an actual admin-role authorization middleware; the current shared `auth` middleware is only a development foundation.
- Real payment providers should be verified server-to-server before approving deposits. Never treat a client-submitted reference alone as proof of payment.


## Admin + Lucky Wheel V8
- `/admin` is a centralized admin control center.
- Admin allow-list uses `ADMIN_USER_IDS` in `.env`; do not expose admin routes without role-based authorization in production.
- Controls include users, deposits, withdrawals, plans, tasks, lucky wheel and site settings.
- Lucky Wheel has configurable segments, weights, enable/disable and daily spin limit UI.
- The browser demo wheel is animated, but real rewards must be selected server-side, rate-limited, persisted in a spin ledger, and credited atomically. The `/api/wheel/spin` endpoint intentionally returns 501 until the final wheel configuration/reward ledger is implemented.


## Lucky Wheel V9
- Added `/lucky-wheel` user page.
- Wheel configuration is persisted in `site_settings`.
- Server performs weighted random selection and enforces the daily spin limit.
- Spins are recorded in `lucky_wheel_spins`.
- Positive rewards are credited atomically to `wallets` and `wallet_transactions`.
- Admin wheel configuration is persisted.


## Navigation V10
- Added one unified responsive sidebar/topbar across authenticated pages.
- Added animated active navigation states and mobile drawer.
- Navigation: Home, Tasks, Plans, Team, Wallet, Lucky Wheel, Settings.
- Added profile shortcut and logout.
- Added unread notification API foundation.


## Home Dashboard V11
- Added unified authenticated Home/Dashboard at `/home`.
- Added live wallet, task, monthly and team earning summary API.
- Added task progress, active plan, recent activity and quick actions.
- Added responsive premium dashboard UI with animated micro-interactions.
- Company visual section is ready for the provided Code Clever meeting/company imagery to be inserted into the existing asset pipeline.


## Tasks V12
- Reworked the task center into a real workflow: Available → Started → Submitted → Completed.
- Added proof submission UI and app-opening action.
- Added active task library endpoint.
- Server completion now requires a submitted task proof before wallet credit.
- Rewards remain tied to the assigned plan's `unit_reward`.
- Added responsive library cards and workflow animations.


## Plans V13
- Plans are loaded from MySQL.
- Added active-plan retrieval.
- Added server-side plan activation.
- Activation checks wallet balance and atomically debits the package/job-bond amount.
- Previous active plan is cancelled when a new plan is activated.
- Activation is recorded in `wallet_transactions` and `audit_logs`.
- The active plan remains the source of daily task count and unit reward.


## Team V14
- Rebuilt Team page with live referral code/link, sharing and team statistics.
- Added direct referral member listing and activity count.
- Added configurable team reward levels.
- Added `team_reward_levels` and `team_reward_ledger` MySQL tables.
- Team page reads commission rates from the database; rates are informational until the reward-generation service is enabled.


## Settings V15
- Added functional Edit Profile with profile image selection/preview.
- Added MySQL persistence for profile fields.
- Added user settings persistence for notifications/security/preferences.
- Added real password-change endpoint using bcrypt verification.
- Added animated settings toggles and responsive layouts.


## Wallet V16
- Added live wallet dashboard and transaction history.
- Added EasyPaisa/JazzCash deposit and withdrawal request flows.
- Deposits are pending admin review.
- Withdrawals atomically reserve funds by moving the amount into pending balance.
- Every withdrawal creates a wallet ledger entry.
- Added responsive wallet UI and finance forms.


## Admin Control Center V17
- Added database-backed admin authorization using `users.role`.
- Added real admin overview API and management queues.
- Added user suspend/activate control.
- Added deposit approval/rejection with atomic wallet credit.
- Added withdrawal paid/reject-and-refund workflow.
- Added plan enable/disable controls.
- Added task generation/refresh/pause controls.
- Added global site setting controls.
- Added Lucky Wheel configuration persistence.
- Added admin audit logging for key financial/account actions.
- Fixed deposit/withdrawal request fields to match the MySQL schema.


## Authentication V18
- Signup and login now use the real Express/MySQL authentication API.
- JWT session is stored in `cc_token`.
- User role is returned and preserved for admin route protection.
- All application routes except signup/login are protected.
- `/admin` requires `users.role = 'admin'` on the server and client.
- Logout clears both user and token session data.
- Registration can be disabled globally by the administrator.
- Passwords require at least 8 characters.
- Successful login records `last_login_at`.


## Lucky Wheel V19
- Added server-authoritative Lucky Wheel spin endpoint.
- Daily spin limit is enforced from server configuration.
- Weighted reward selection happens on the server.
- Every spin is stored in `lucky_wheel_spins`.
- Positive rewards are credited to the wallet ledger transactionally.
- Added admin configuration loading/saving for wheel status, limits, rewards and weights.
- Added user spin history and remaining-spin display.


## Team Commission Engine V20
- Added server-side multi-level commission calculation on verified task rewards.
- Commission rates come from `team_reward_levels`.
- Uplines are resolved through `users.referred_by`.
- Each commission is credited atomically to the upline wallet.
- Every commission gets a `team_reward_ledger` entry and wallet transaction.
- Added commission summary/history API and Team UI ledger.
- Added a unique ledger reference constraint to reduce duplicate commission credits.


## Task Engine V21
- Daily task generation now selects active library apps and assigns only the active plan's configured daily task count.
- Reward is assigned server-side from the user's active plan unit reward.
- Added admin task-library CRUD endpoints for listing, adding and enabling/disabling apps.
- Proof submission is validated server-side before verification.
- Existing task state machine remains available -> started -> submitted -> completed.
- Verified completion remains the only point at which task rewards and team commissions are credited.


## Admin Task Review V22
- Added admin proof-review queue.
- Admin can open submitted proof and approve/reject.
- Approval atomically credits the task reward and triggers team commissions.
- Rejection changes the task state without paying a reward.
- Added admin app library tabs for review, library management, and adding new tasks.
- Added task library enable/disable controls.
- Added audit logging for task approvals.


## Admin User Management V23
- Added searchable user management.
- Added detailed user profile modal.
- Added wallet balances and lifetime earnings.
- Added active plan information.
- Added referral/referrer information and team count.
- Added team commission total.
- Added task completion statistics and wallet transaction history API.
- Added recent audit activity.
- Added suspend/activate controls.


# CODE CLEVER — FINAL V24 RELEASE

## Production architecture
- React + Vite frontend
- Express REST API
- MySQL database
- JWT authentication
- bcrypt password hashing
- Server-authoritative wallet, task, team commission and Lucky Wheel logic
- Admin-only backend authorization
- Audit logging for important financial/account actions

## Final feature set
1. Signup / Login / Logout
2. Protected routes and admin route protection
3. Home dashboard
4. C1–C9 plans
5. Daily app-download task engine
6. Proof submission and admin review
7. Wallet and transaction ledger
8. Deposit requests
9. Withdrawal requests with balance reservation/refund
10. Team/referral system
11. Multi-level team commissions
12. Lucky Wheel with weighted server-side outcomes
13. Profile editing and profile image selection
14. Security/password settings
15. Notification/preferences persistence
16. Admin control center
17. Admin user management
18. Admin plan controls
19. Admin task/app library
20. Admin deposit/withdrawal queues
21. Admin Lucky Wheel controls
22. Global site controls
23. Audit trail

## Local setup
1. Create a MySQL database.
2. Import `database/schema.sql`.
3. Copy `.env.example` to `.env`.
4. Set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and a strong `JWT_SECRET`.
5. Install packages with `npm install`.
6. Start API with `npm run server`.
7. Start frontend with `npm run dev`.
8. For production, run `npm run build` and serve `dist`.

## Important production notes
- Replace all localhost API URLs with the deployed API origin, or use a Vite environment variable.
- Use HTTPS in production.
- Set a long, random JWT secret.
- Restrict MySQL to the application server/private network.
- Configure CORS to the production frontend origin instead of `*`.
- Add real object storage for proof/profile images rather than data URLs.
- Review the business/legal/compliance requirements for any paid earning, referral, deposit, withdrawal, or promotional reward model before public launch.
- Never treat frontend balances or reward values as authoritative; the server/database is authoritative.
