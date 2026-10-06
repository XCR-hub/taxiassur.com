import { Link } from 'react-router-dom';
import { ACQUISITION_PAGES, ACQUISITION_FAQ } from '../../shared/acquisition-pages.js';

export default function AcquisitionGuide({ pathname }: { pathname: string }) {
  const page = ACQUISITION_PAGES[pathname];
  if (!page) return null;
  return (
    <section className="py-12 sm:py-16 bg-gray-950 text-white" aria-label={page.heading}>
      <div className="container-max max-w-5xl space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold">{page.heading}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {page.sections.map(section => <article key={section.title} className="rounded-xl border border-gray-700 p-5">
            <h3 className="text-lg font-semibold text-amber-300 mb-3">{section.title}</h3>
            <p className="text-gray-200 leading-relaxed">{section.text}</p>
          </article>)}
        </div>
        <nav aria-label="Préparer votre assurance taxi" className="flex flex-wrap gap-4">
          {page.links.map(link => <Link key={link.href} to={link.href} className="text-amber-300 underline underline-offset-4">{link.label}</Link>)}
        </nav>
        <Link to="/devis-assurance-taxi#devis-form" className="inline-flex rounded-xl bg-amber-400 px-6 py-3 font-bold text-gray-950">Demander mon devis gratuit</Link>
      </div>
    </section>
  );
}

export function AcquisitionQuestions() {
  return <section className="container-max py-12 max-w-4xl text-white">
    <h2 className="text-2xl font-bold mb-6">Questions sur votre demande</h2>
    {ACQUISITION_FAQ.map(item => <details key={item.question} className="border-b border-gray-700 py-4"><summary className="cursor-pointer font-semibold">{item.question}</summary><p className="mt-3 text-gray-200">{item.answer}</p></details>)}
  </section>;
}
