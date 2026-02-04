<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1_OP47iK8r-vGRrLFOmT7ol9AnhsZRUPH

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```
   npm install
   ```
2. **Before first run:** Follow [docs/BEFORE_FIRST_RUN.md](docs/BEFORE_FIRST_RUN.md) to set up Supabase, environment variables, and Auth.
3. Copy [.env.example](.env.example) to `.env.local` and fill in your values.
4. Run the app:
   ```
   npm run dev
   ```

## Before deploy

Run **`npm run build`** (or **`npm run verify`**) before pushing to the branch that Vercel deploys. If the build fails, fix the error before pushing so production stays green. See [docs/ZERO_DISCREPANCY_STRATEGY.md](docs/ZERO_DISCREPANCY_STRATEGY.md) for the full step-by-step strategy to zero discrepancies.
