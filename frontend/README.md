# OTTv2 frontend

The supplied Login Tournament frontend is connected to the existing main backend.
Use organizer-issued accounts. No demo credentials or public account registration.
Backend operator accounts appear as judges.

From the root: npm run build, then npm start. For hot reload: npm run dev.
Configure VITE_API_BASE_URL with the backend origin and VITE_TOURNAMENT_ID with the
existing tournament ID (default pro). Backend ALLOWED_ORIGINS must allow your frontend origin.
Rebuild after changing Vite variables.

Players join and save their single tournament bot on Tournament. My Submission/Test bot
retains the existing two-bot practice/replay workflow. Judges start rounds after all entrants
save code. Engine results update live standings using points and fixed pairing coefficients.
Automatic Elo and Prisma/MySQL are not added; original JSON persistence remains.
preview.html is an offline visual/practice preview; use the served app for real login.
