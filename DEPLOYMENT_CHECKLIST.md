# Code Clever Production Checklist

- [ ] Provision MySQL and import `database/schema.sql`
- [ ] Create production `.env`
- [ ] Set a strong `JWT_SECRET`
- [ ] Set production frontend/API origins
- [ ] Configure HTTPS
- [ ] Configure CORS for the production domain
- [ ] Store uploaded proof/profile images in object storage
- [ ] Create an admin account by setting `users.role = 'admin'` securely
- [ ] Configure C1–C9 plans and task library
- [ ] Configure Lucky Wheel rewards/weights
- [ ] Configure team reward levels
- [ ] Test signup/login/logout
- [ ] Test task submit → admin approve → wallet → commission
- [ ] Test deposit approve and withdrawal reject/refund
- [ ] Test Lucky Wheel daily limit and wallet credit
- [ ] Back up MySQL before launch
- [ ] Add monitoring/logging for the API
