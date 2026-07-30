import Link from "next/link";
export default function NotFound() { return <main className="status-page"><span>404</span><h1>That device is off the radar.</h1><p>The model may not be imported yet, or the URL changed during verification.</p><Link className="lime-button" href="/search">Search all devices ↗</Link></main>; }
