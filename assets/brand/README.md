# Ignite brand assets

## Production flame

- `ignite-flame.png` — Ignite flame mark, 1024×1024 RGBA. Sourced from flat artwork; the peach background was keyed out to transparency and edge pixels un-composited, so the inner flame outline reads as negative space over whatever canvas sits behind it.

Wired via:

- `src/features/auth/components/igniteFlameAsset.ts`
- `expo-splash-screen` `image` in `app.json`
