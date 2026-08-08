export default function OfflineBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs bg-amber-100 text-amber-700 border border-amber-300 rounded-full px-2.5 py-0.5 font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
      Offline — changes queued
    </span>
  );
}
