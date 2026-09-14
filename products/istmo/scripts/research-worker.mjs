// Optional external worker. No recurring service is installed or scheduled by this file.
const base = process.env.NEXT_PUBLIC_SITE_URL;
const secret = process.env.RESEARCH_WORKER_SECRET;
if (!base || !secret)
  throw new Error("Set NEXT_PUBLIC_SITE_URL and RESEARCH_WORKER_SECRET");
const response = await fetch(new URL("/api/research/worker", base), {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
});
if (!response.ok) throw new Error(`Worker returned ${response.status}`);
console.log(await response.json());
