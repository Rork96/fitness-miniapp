This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Onboarding Speed Control

The weekly speed step is powered by `src/features/calories/onboarding/ui/SpeedExact.tsx`. The component accepts:

- `value`: current rate expressed in the active unit (`kg` or `lbs`).
- `range`: `{ min, max, step }` boundaries for the slider track.
- `zones`: `{ slow, recommended, aggressive }` zone centres used to animate the emoji row and the “Recommended” chip.
- `unit`: `'kg' | 'lbs'`, plus optional `labels`, `unitLabel`, and `tickLabels` overrides.

Update the defaults by tweaking `speedRangeMetric`, `speedRangeImperial`, `speedZonesMetric`, and `speedZonesImperial` in `src/features/calories/onboarding/constants.ts`. The onboarding wizard converts between units before passing values to `SpeedExact`.

## Smoke Tests

A Playwright smoke test lives at `tests/smoke/onboarding.spec.ts`. It walks through the calorie onboarding flow, verifies the slider behaviour, and checks navigation to `/tools`.

To run it locally:

```bash
# install playwright browsers once
npx playwright install --with-deps

# execute the suite
npm run test:e2e
```

The CLI environment does not ship Playwright binaries, so you may need an internet connection to install them the first time.
