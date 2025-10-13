#!/usr/bin/env node
/**
 * Script pour ajouter des FAQ aux articles blog sans FAQ
 */

const fs = require('fs');
const path = require('path');

const blogDir = path.join(__dirname, '../public/content/blog');

// FAQ par thème d'article
const faqByTopic = {
  'devenir-chauffeur-taxi-2024': [
    {
      q: "Combien de temps faut-il pour devenir chauffeur de taxi ?",
      a: "La formation dure 250 heures (2-3 mois), puis il faut compter 2-4 mois pour obtenir la carte professionnelle après réussite de l'examen. Au total, comptez 4-7 mois entre le début de la formation et l'exercice du métier."
    },
    {
      q: "Quel est le coût total pour devenir taxi ?",
      a: "Pour un salarié : 3 000-5 000€ (formation + examen). Pour un artisan locataire : 15 000-25 000€ (formation, véhicule, assurance). Pour un artisan propriétaire à Paris : 180 000-300 000€ (licence incluse)."
    },
    {
      q: "Quel est le taux de réussite à l'examen taxi ?",
      a: "Le taux de réussite moyen national est de 45-55%. À Paris, il tombe à 35-40% en raison de la difficulté accrue. En province, il est légèrement meilleur : 50-60%."
    },
    {
      q: "Quelle assurance est obligatoire pour les taxis ?",
      a: "La RC Professionnelle illimitée est obligatoire, ainsi qu'une assurance véhicule usage professionnel et la garantie passagers transportés. Budget : 1 430-3 500€/an selon la ville. TaxiAssur propose des tarifs négociés dès 1 430€/an."
    }
  ],
  'reglementation-taxi-2024': [
    {
      q: "Quel est le montant minimum de RC professionnelle obligatoire en 2024 ?",
      a: "Le montant minimum de la RC professionnelle est passé à 1,5 million d'euros par sinistre en 2024, contre 1 million d'euros précédemment."
    },
    {
      q: "La protection juridique est-elle obligatoire pour les taxis ?",
      a: "Oui, depuis 2024, une garantie protection juridique minimale de 15 000€ est obligatoire pour tous les chauffeurs de taxi."
    },
    {
      q: "Quel délai pour obtenir un véhicule de remplacement après sinistre ?",
      a: "Depuis 2024, l'assureur doit proposer un véhicule de remplacement sous 48h maximum en cas de sinistre."
    },
    {
      q: "Quelles sont les sanctions en cas de défaut d'assurance taxi ?",
      a: "Les contrôles sont renforcés en 2024 et les amendes peuvent atteindre 3 750€ en cas de défaut d'assurance, plus une immobilisation du véhicule et suspension de la licence."
    }
  ],
  'vehicules-electriques-taxi': [
    {
      q: "L'assurance taxi électrique est-elle plus chère ?",
      a: "Non, au contraire ! Les véhicules électriques bénéficient de réductions tarifaires importantes (15-25%) grâce à leur profil de risque favorable et aux bonus écologiques proposés par les assureurs."
    },
    {
      q: "Quelles garanties spécifiques pour un taxi électrique ?",
      a: "L'assurance doit couvrir la batterie et les composants électroniques, proposer une assistance spécialisée véhicules électriques (dépannage, recharge), et idéalement inclure une garantie perte d'autonomie."
    },
    {
      q: "Puis-je assurer un taxi hybride comme un électrique ?",
      a: "Les véhicules hybrides rechargeables bénéficient aussi de réductions (10-15%), mais moindres que les 100% électriques. Les hybrides simples sont assurés comme des véhicules thermiques."
    }
  ],
  'choisir-vehicule-taxi-2024': [
    {
      q: "Quel est le meilleur véhicule pour débuter en taxi ?",
      a: "La Toyota Prius hybride reste le meilleur choix pour débuter : fiabilité reconnue, faible consommation, coûts d'entretien réduits et bonne côte de revente. Prix : 15 000-25 000€ d'occasion."
    },
    {
      q: "Faut-il acheter un véhicule neuf ou d'occasion ?",
      a: "Pour débuter, un véhicule de 2-4 ans est optimal : décote importante (-40%), encore sous garantie constructeur, et moins de risques de pannes qu'un véhicule plus ancien."
    },
    {
      q: "Quels critères pour choisir un véhicule taxi ?",
      a: "Les 5 critères prioritaires : fiabilité/entretien (Toyota, Skoda), consommation (hybride ou diesel récent), confort passagers (espace, climatisation), coût assurance, et facilité revente."
    }
  ],
  'flotte-taxis-assurance': [
    {
      q: "À partir de combien de véhicules puis-je avoir une assurance flotte ?",
      a: "Les assurances flotte sont généralement proposées à partir de 3 véhicules. Les économies d'échelle deviennent significatives à partir de 5 véhicules (-20 à -35%)."
    },
    {
      q: "Quelle économie avec une assurance flotte taxi ?",
      a: "Une assurance flotte permet d'économiser 20-35% par rapport à des contrats individuels. Pour 5 taxis, l'économie peut atteindre 3 000-5 000€/an."
    },
    {
      q: "Peut-on ajouter des véhicules en cours d'année ?",
      a: "Oui, les contrats flotte permettent d'ajouter ou retirer des véhicules en cours d'année avec ajustement proportionnel de la cotisation."
    }
  ],
  'cout-assurance-taxi-par-ville': [
    {
      q: "Pourquoi l'assurance taxi est-elle plus chère à Paris ?",
      a: "Paris concentre plus de sinistres (circulation dense, stationnement difficile), plus de vols, et des coûts de réparation plus élevés. L'assurance y coûte 2 500-3 500€/an vs 1 400-2 200€ en province."
    },
    {
      q: "Dans quelle ville l'assurance taxi est-elle la moins chère ?",
      a: "Les villes moyennes de province (Limoges, Clermont-Ferrand, Besançon) offrent les tarifs les plus bas : 1 350-1 600€/an pour un bon conducteur."
    },
    {
      q: "Peut-on négocier le prix de son assurance taxi ?",
      a: "Oui ! Utiliser un courtier spécialisé comme TaxiAssur permet d'obtenir des réductions de 25-35% grâce aux tarifs négociés avec plusieurs assureurs."
    }
  ],
  'comparateur-assurance-taxi-guide-2025': [
    {
      q: "Comment fonctionne un comparateur d'assurance taxi ?",
      a: "Un comparateur analyse votre profil (ville, véhicule, ancienneté) et compare les offres de plusieurs assureurs en quelques minutes. TaxiAssur négocie directement avec les assureurs pour obtenir -35% vs tarifs publics."
    },
    {
      q: "Les comparateurs sont-ils gratuits ?",
      a: "Oui, les comparateurs et courtiers sont gratuits pour les clients. Ils sont rémunérés par les assureurs sur commission, sans surcoût pour vous."
    },
    {
      q: "Puis-je souscrire directement après comparaison ?",
      a: "Oui, avec TaxiAssur la souscription est immédiate en ligne (5 minutes) et vous recevez votre attestation par email sous 10 minutes."
    }
  ],
  'assurance-vtc-vs-taxi-differences-2025': [
    {
      q: "Quelle différence de prix entre assurance taxi et VTC ?",
      a: "L'assurance taxi coûte généralement 15-25% plus cher que le VTC car elle inclut obligatoirement la RC Pro illimitée et couvre la maraude (prise de clients dans la rue)."
    },
    {
      q: "Puis-je avoir une assurance taxi ET VTC ?",
      a: "Oui, si vous avez les deux licences. Certains assureurs comme TaxiAssur proposent des contrats combinés avec tarif préférentiel (-20% vs 2 contrats séparés)."
    },
    {
      q: "Un VTC peut-il utiliser une assurance taxi ?",
      a: "Non, les garanties sont différentes. Une assurance taxi pour activité VTC uniquement serait sur-assurance coûteuse. Prenez une assurance VTC adaptée."
    }
  ]
};

// Parcourir tous les fichiers JSON du blog
fs.readdirSync(blogDir).forEach(file => {
  if (!file.endsWith('.json')) return;

  const filePath = path.join(blogDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const article = JSON.parse(content);

  // Skip si FAQ déjà présente
  if (article.faq && article.faq.length > 0) {
    console.log(`✓ ${file} - FAQ déjà présente`);
    return;
  }

  // Chercher FAQ correspondante
  const articleId = file.replace('.json', '');
  const faq = faqByTopic[articleId];

  if (!faq) {
    console.log(`⚠ ${file} - Pas de FAQ définie pour cet article`);
    return;
  }

  // Ajouter FAQ
  article.faq = faq;

  // Sauvegarder
  fs.writeFileSync(filePath, JSON.stringify(article, null, 2) + '\n');
  console.log(`✅ ${file} - ${faq.length} FAQ ajoutées`);
});

console.log('\n✅ Traitement terminé !');
