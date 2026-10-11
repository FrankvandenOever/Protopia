import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <h1>Project not found</h1>
      <p className="note">It may have been removed, or the link is incomplete.</p>
      <Link href="/" className="btn primary" style={{ alignSelf: "flex-start" }}>
        Back to the map
      </Link>
    </main>
  );
}
