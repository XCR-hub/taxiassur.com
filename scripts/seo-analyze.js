#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__dirname);
console.log('🔍 TaxiAssur SEO Analysis');
console.log('==========================');

// Analyze meta tags in HTML files
function analyzeMetaTags(filePath) {
  if (!fs.existsSync(filePath)) return null;
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  const metaChecks = {
    title: /<title[^>]*>([^<]+)<\/title>/i.test(content),
    description: /<meta[^>]*name=["']description["'][^>]*>/i.test(content),
    keywords: /<meta[^>]*name=["']keywords["'][^>]*>/i.test(content),
    canonical: /<link[^>]*rel=["']canonical["'][^>]*>/i.test(content),
    ogTitle: /<meta[^>]*property=["']og:title["'][^>]*>/i.test(content),
    ogDescription: /<meta[^>]*property=["']og:description["'][^>]*>/i.test(content),
    ogImage: /<meta[^>]*property=["']og:image["'][^>]*>/i.test(content),
    twitterCard: /<meta[^>]*name=["']twitter:card["'][^>]*>/i.test(content),
    jsonLd: /<script[^>]*type=["']application\/ld\+json["'][^>]*>/i.test(content)
  };
  
  return metaChecks;
}

// Analyze content structure
function analyzeContent() {
  const contentDir = 'public/content';
  const analysis = {
    blog: { count: 0, avgLength: 0, withFAQ: 0 },
    faq: { count: 0, avgLength: 0 },
    reviews: { count: 0, avgRating: 0 },
    offers: { count: 0 }
  };
  
  // Analyze blog posts
  const blogDir = path.join(contentDir, 'blog');
  if (fs.existsSync(blogDir)) {
    const blogFiles = fs.readdirSync(blogDir).filter(f => f.endsWith('.json'));
    analysis.blog.count = blogFiles.length;
    
    let totalLength = 0;
    let withFAQ = 0;
    
    blogFiles.forEach(file => {
      const content = JSON.parse(fs.readFileSync(path.join(blogDir, file), 'utf8'));
      totalLength += content.content?.length || 0;
      if (content.faq && content.faq.length > 0) withFAQ++;
    });
    
    analysis.blog.avgLength = Math.round(totalLength / blogFiles.length);
    analysis.blog.withFAQ = withFAQ;
  }
  
  // Analyze FAQ
  const faqDir = path.join(contentDir, 'faq');
  if (fs.existsSync(faqDir)) {
    const faqFiles = fs.readdirSync(faqDir).filter(f => f.endsWith('.json'));
    analysis.faq.count = faqFiles.length;
    
    let totalLength = 0;
    faqFiles.forEach(file => {
      const content = JSON.parse(fs.readFileSync(path.join(faqDir, file), 'utf8'));
      totalLength += (content.answer?.length || 0);
    });
    
    analysis.faq.avgLength = Math.round(totalLength / faqFiles.length);
  }
  
  // Analyze reviews
  const reviewsDir = path.join(contentDir, 'reviews');
  if (fs.existsSync(reviewsDir)) {
    const reviewFiles = fs.readdirSync(reviewsDir).filter(f => f.endsWith('.json'));
    analysis.reviews.count = reviewFiles.length;
    
    let totalRating = 0;
    reviewFiles.forEach(file => {
      const content = JSON.parse(fs.readFileSync(path.join(reviewsDir, file), 'utf8'));
      totalRating += content.rating || 0;
    });
    
    analysis.reviews.avgRating = (totalRating / reviewFiles.length).toFixed(1);
  }
  
  // Analyze offers
  const offersDir = path.join(contentDir, 'offers');
  if (fs.existsSync(offersDir)) {
    analysis.offers.count = fs.readdirSync(offersDir).filter(f => f.endsWith('.json')).length;
  }
  
  return analysis;
}

// Check sitemap and robots.txt
function analyzeTechnicalSEO() {
  const checks = {
    sitemap: fs.existsSync('public/feeds/sitemap.xml'),
    rss: fs.existsSync('public/feeds/rss.xml'),
    robots: fs.existsSync('public/robots.txt'),
    manifest: fs.existsSync('public/manifest.json')
  };
  
  // Analyze sitemap if exists
  if (checks.sitemap) {
    const sitemap = fs.readFileSync('public/feeds/sitemap.xml', 'utf8');
    const urlCount = (sitemap.match(/<url>/g) || []).length;
    checks.sitemapUrls = urlCount;
  }
  
  return checks;
}

// Main analysis
console.log('\n📄 Analyse des meta tags...');
const metaAnalysis = analyzeMetaTags('index.html');
if (metaAnalysis) {
  Object.entries(metaAnalysis).forEach(([key, value]) => {
    console.log(`${value ? '✅' : '❌'} ${key}: ${value ? 'Présent' : 'Manquant'}`);
  });
}

console.log('\n📝 Analyse du contenu...');
const contentAnalysis = analyzeContent();
console.log(`✅ Articles de blog: ${contentAnalysis.blog.count} (${contentAnalysis.blog.avgLength} chars avg)`);
console.log(`✅ FAQ: ${contentAnalysis.faq.count} entrées (${contentAnalysis.faq.avgLength} chars avg)`);
console.log(`✅ Avis clients: ${contentAnalysis.reviews.count} (${contentAnalysis.reviews.avgRating}/5 avg)`);
console.log(`✅ Offres: ${contentAnalysis.offers.count}`);
console.log(`✅ Articles avec FAQ: ${contentAnalysis.blog.withFAQ}/${contentAnalysis.blog.count}`);

console.log('\n🔧 Analyse technique SEO...');
const technicalAnalysis = analyzeTechnicalSEO();
Object.entries(technicalAnalysis).forEach(([key, value]) => {
  if (typeof value === 'boolean') {
    console.log(`${value ? '✅' : '❌'} ${key}: ${value ? 'Présent' : 'Manquant'}`);
  } else {
    console.log(`✅ ${key}: ${value}`);
  }
});

// Generate SEO recommendations
const recommendations = [];

if (contentAnalysis.blog.count < 10) {
  recommendations.push('Ajouter plus d\'articles de blog (minimum 10 recommandé)');
}

if (contentAnalysis.blog.avgLength < 1000) {
  recommendations.push('Augmenter la longueur moyenne des articles (minimum 1000 caractères)');
}

if (contentAnalysis.faq.count < 8) {
  recommendations.push('Ajouter plus de questions FAQ (minimum 8 recommandé)');
}

if (contentAnalysis.reviews.count < 20) {
  recommendations.push('Collecter plus d\'avis clients (minimum 20 recommandé)');
}

if (contentAnalysis.blog.withFAQ < contentAnalysis.blog.count * 0.5) {
  recommendations.push('Ajouter des FAQ à plus d\'articles de blog');
}

// Calculate SEO score
const metaScore = metaAnalysis ? Object.values(metaAnalysis).filter(Boolean).length / Object.keys(metaAnalysis).length * 100 : 0;
const contentScore = Math.min(100, (
  Math.min(contentAnalysis.blog.count / 10, 1) * 25 +
  Math.min(contentAnalysis.faq.count / 8, 1) * 25 +
  Math.min(contentAnalysis.reviews.count / 20, 1) * 25 +
  Math.min(contentAnalysis.offers.count / 5, 1) * 25
));
const technicalScore = Object.values(technicalAnalysis).filter(v => v === true).length / Object.keys(technicalAnalysis).length * 100;

const overallScore = Math.round((metaScore + contentScore + technicalScore) / 3);

console.log('\n📊 Score SEO Global');
console.log('===================');
console.log(`Meta tags: ${Math.round(metaScore)}/100`);
console.log(`Contenu: ${Math.round(contentScore)}/100`);
console.log(`Technique: ${Math.round(technicalScore)}/100`);
console.log(`\n🎯 SCORE GLOBAL: ${overallScore}/100`);

if (recommendations.length > 0) {
  console.log('\n💡 Recommandations:');
  recommendations.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec}`);
  });
}

// Save report
const report = {
  timestamp: new Date().toISOString(),
  scores: {
    meta: Math.round(metaScore),
    content: Math.round(contentScore),
    technical: Math.round(technicalScore),
    overall: overallScore
  },
  analysis: {
    meta: metaAnalysis,
    content: contentAnalysis,
    technical: technicalAnalysis
  },
  recommendations
};

fs.writeFileSync('seo-report.json', JSON.stringify(report, null, 2));
console.log('\n📄 Rapport sauvegardé dans seo-report.json');

if (overallScore >= 90) {
  console.log('\n🎉 SEO optimisé pour le ranking #1 !');
} else if (overallScore >= 70) {
  console.log('\n⚠️  Améliorations recommandées pour maximiser le ranking');
} else {
  console.log('\n❌ Optimisations critiques requises');
  process.exit(1);
}