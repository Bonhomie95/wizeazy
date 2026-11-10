import { BrandLoader } from "@/components/brand/Logo";

export default function Loading() {
  return (
    <main className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-4">
        <BrandLoader size={52} />
        <p className="text-sm font-medium text-muted">Charging up…</p>
      </div>
    </main>
  );
}
