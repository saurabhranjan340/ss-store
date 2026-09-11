# Frontend deployment notes

Set this Vercel environment variable for Preview and Production:

```env
NEXT_PUBLIC_API_URL=https://<deployed-backend-domain>/api
```

The current ClickUp artifact contains the working frontend source and uses this variable in `src/lib/api.js`. For a standard Vercel deployment, place that source in the real Next.js repository's `/frontend` root and confirm the repository has its normal `package.json`, `app/`, and build script. This sandbox artifact is a React preview, not a substitute for a checked-in Next.js repository.
