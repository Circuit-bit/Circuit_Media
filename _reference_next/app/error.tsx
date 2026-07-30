"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="status-page"><span>!</span><h1>The data feed blinked.</h1><p>No facts were guessed. Try the request again, or return when the provider recovers.</p><button className="lime-button" type="button" onClick={reset}>Try again ↗</button></main>; }
