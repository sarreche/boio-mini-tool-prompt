export function PageHeader({ title, description }: { title: string; description: string }) {
  return <div className="mb-6"><h1 className="text-3xl font-bold tracking-tight">{title}</h1><p className="mt-2 text-[#60708f]">{description}</p></div>;
}
export function Card({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return <div className="rounded-2xl border border-[#d9dee7] bg-white p-5"><p className="text-sm font-semibold text-[#60708f]">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p>{note ? <p className="mt-2 text-xs text-[#60708f]">{note}</p> : null}</div>;
}
export const field = "min-h-10 rounded-lg border border-[#cbd3df] bg-white px-3 text-sm";
export const button = "min-h-10 rounded-lg bg-[#1261ff] px-4 text-sm font-bold text-white hover:bg-[#084ad4]";
