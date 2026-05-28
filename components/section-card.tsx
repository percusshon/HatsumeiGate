import Link from 'next/link';

export function SectionCard({
  title,
  description,
  href,
  cta
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-700">{description}</p>
      <Link href={href} className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:underline">
        {cta}
      </Link>
    </section>
  );
}
