interface PDFOptions {
  title: string;
  author?: string;
  subject?: string;
  keywords?: string[];
}

interface PDFSection {
  type: 'heading' | 'text' | 'table' | 'image' | 'spacer';
  content: any;
  style?: Record<string, any>;
}

export class SimplePDFGenerator {
  private sections: PDFSection[] = [];
  private options: PDFOptions;

  constructor(options: PDFOptions) {
    this.options = options;
  }

  addHeading(text: string, level: 1 | 2 | 3 = 1) {
    this.sections.push({
      type: 'heading',
      content: { text, level },
    });
    return this;
  }

  addText(text: string) {
    this.sections.push({
      type: 'text',
      content: text,
    });
    return this;
  }

  addTable(headers: string[], rows: string[][]) {
    this.sections.push({
      type: 'table',
      content: { headers, rows },
    });
    return this;
  }

  addImage(src: string, width?: number, height?: number) {
    this.sections.push({
      type: 'image',
      content: { src, width, height },
    });
    return this;
  }

  addSpacer(height: number = 20) {
    this.sections.push({
      type: 'spacer',
      content: height,
    });
    return this;
  }

  async generate(): Promise<Blob> {
    const html = this.generateHTML();
    return this.htmlToPDF(html);
  }

  private generateHTML(): string {
    const styles = `
      <style>
        @page { margin: 2cm; }
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        h1 { font-size: 24px; margin-bottom: 10px; }
        h2 { font-size: 20px; margin-bottom: 8px; }
        h3 { font-size: 16px; margin-bottom: 6px; }
        p { margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        img { max-width: 100%; height: auto; }
      </style>
    `;

    const content = this.sections
      .map((section) => {
        switch (section.type) {
          case 'heading':
            return `<h${section.content.level}>${section.content.text}</h${section.content.level}>`;
          case 'text':
            return `<p>${section.content}</p>`;
          case 'table':
            const headers = section.content.headers
              .map((h: string) => `<th>${h}</th>`)
              .join('');
            const rows = section.content.rows
              .map(
                (row: string[]) =>
                  `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`
              )
              .join('');
            return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
          case 'image':
            return `<img src="${section.content.src}" width="${section.content.width || 'auto'}" height="${section.content.height || 'auto'}" />`;
          case 'spacer':
            return `<div style="height: ${section.content}px;"></div>`;
          default:
            return '';
        }
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${this.options.title}</title>
          ${styles}
        </head>
        <body>
          <h1>${this.options.title}</h1>
          ${content}
        </body>
      </html>
    `;
  }

  private async htmlToPDF(html: string): Promise<Blob> {
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html,
        options: this.options,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate PDF');
    }

    return response.blob();
  }

  async download(filename: string = 'document.pdf') {
    const blob = await this.generate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export function createQuotePDF(quoteData: any) {
  const pdf = new SimplePDFGenerator({
    title: 'Devis Assurance Taxi',
    author: 'TaxiAssur',
    subject: 'Devis d\'assurance professionnelle',
  });

  pdf
    .addHeading('Devis d\'Assurance Taxi', 1)
    .addSpacer()
    .addText(`Date: ${new Date().toLocaleDateString('fr-FR')}`)
    .addText(`Référence: ${quoteData.reference}`)
    .addSpacer()
    .addHeading('Informations du souscripteur', 2)
    .addText(`Nom: ${quoteData.name}`)
    .addText(`Email: ${quoteData.email}`)
    .addText(`Téléphone: ${quoteData.phone}`)
    .addSpacer()
    .addHeading('Détails du véhicule', 2)
    .addText(`Marque: ${quoteData.vehicle.brand}`)
    .addText(`Modèle: ${quoteData.vehicle.model}`)
    .addText(`Année: ${quoteData.vehicle.year}`)
    .addSpacer()
    .addHeading('Tarification', 2)
    .addTable(
      ['Garantie', 'Montant'],
      [
        ['Responsabilité Civile', `${quoteData.pricing.rc}€/an`],
        ['Tous Risques', `${quoteData.pricing.allRisk}€/an`],
        ['Protection Juridique', `${quoteData.pricing.legal}€/an`],
        ['Total', `${quoteData.pricing.total}€/an`],
      ]
    );

  return pdf;
}
