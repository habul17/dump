export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-5 pt-1" aria-label="Loading" role="status">
      <div className="h-12 rounded-2xl bg-surface" />
      <div className="h-10 rounded-xl bg-surface" />
      <div className="h-32 rounded-2xl bg-surface" />
      <div className="h-48 rounded-2xl bg-surface" />
    </div>
  );
}
