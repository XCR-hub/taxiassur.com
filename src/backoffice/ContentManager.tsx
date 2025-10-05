import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Mail, 
  HelpCircle, 
  Plus, 
  Edit, 
  Trash2, 
  Send, 
  Users, 
  Calendar,
  Save,
  Eye,
  EyeOff,
  Home
} from 'lucide-react';
import AuthGuard from '../components/AuthGuard';

interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  image: string;
  status: 'published' | 'draft';
  createdAt: string;
  updatedAt: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  status: 'published' | 'draft';
  createdAt: string;
}

interface Newsletter {
  subject: string;
  content: string;
  recipients: 'all' | 'taxi' | 'vtc' | 'custom';
  customEmails: string;
  scheduledDate?: string;
}

const ContentManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'articles' | 'faq' | 'newsletter'>('articles');
  const [articles, setArticles] = useState<Article[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);

  // Article form state
  const [articleForm, setArticleForm] = useState({
    title: '',
    summary: '',
    content: '',
    tags: '',
    image: '',
    status: 'draft' as 'published' | 'draft'
  });

  // FAQ form state
  const [faqForm, setFaqForm] = useState({
    question: '',
    answer: '',
    category: 'general',
    order: 1,
    status: 'published' as 'published' | 'draft'
  });

  // Newsletter form state
  const [newsletterForm, setNewsletterForm] = useState<Newsletter>({
    subject: '',
    content: '',
    recipients: 'all',
    customEmails: '',
    scheduledDate: ''
  });

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    try {
      // Simuler le chargement des données
      setArticles([
        {
          id: '1',
          title: 'Assurance Taxi 2024 : Nouvelles Réglementations',
          summary: 'Découvrez les changements importants pour l\'assurance taxi en 2024',
          content: '<p>Contenu de l\'article...</p>',
          tags: ['assurance', 'taxi', '2024'],
          image: 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg',
          status: 'published',
          createdAt: '2024-01-15',
          updatedAt: '2024-01-15'
        }
      ]);

      setFaqs([
        {
          id: '1',
          question: 'Quels sont les tarifs d\'assurance taxi ?',
          answer: 'Les tarifs varient selon plusieurs critères : type de véhicule, zone géographique, expérience du conducteur...',
          category: 'tarifs',
          order: 1,
          status: 'published',
          createdAt: '2024-01-10'
        }
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArticleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const articleData = {
        id: editingArticle?.id || Date.now().toString(),
        title: articleForm.title,
        excerpt: articleForm.summary,
        content: articleForm.content,
        tags: articleForm.tags.split(',').map(tag => tag.trim()),
        coverImage: articleForm.image,
        author: 'TaxiAssur',
        createdAt: editingArticle?.createdAt || new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString(),
        status: articleForm.status
      };

      // Publier via webhook Make (format standard)
      const response = await fetch('/webhooks/make.php', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-MAKE-SECRET': import.meta.env.VITE_MAKE_SECRET || 'change_me_secure_token_2024',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          type: 'blog',
          action: 'upsert',
          payload: articleData
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la publication');
      }

      // Mettre à jour la liste locale
      if (editingArticle) {
        setArticles(prev => prev.map(a => a.id === editingArticle.id ? articleData as Article : a));
      } else {
        setArticles(prev => [...prev, articleData as Article]);
      }

      // Reset form
      setArticleForm({
        title: '',
        summary: '',
        content: '',
        tags: '',
        image: '',
        status: 'draft'
      });
      setShowArticleForm(false);
      setEditingArticle(null);

      alert('Article publié avec succès !');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la publication');
    } finally {
      setLoading(false);
    }
  };

  const handleFaqSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const faqData = {
        id: editingFaq?.id || Date.now().toString(),
        question: faqForm.question,
        answer: faqForm.answer,
        updatedAt: new Date().toISOString(),
        tags: [faqForm.category],
        status: faqForm.status
      };

      // Publier via webhook Make (format standard)
      const response = await fetch('/webhooks/make.php', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-MAKE-SECRET': import.meta.env.VITE_MAKE_SECRET || 'change_me_secure_token_2024',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          type: 'faq',
          action: 'upsert',
          payload: faqData
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la publication');
      }

      // Mettre à jour la liste locale
      if (editingFaq) {
        setFaqs(prev => prev.map(f => f.id === editingFaq.id ? faqData : f));
      } else {
        setFaqs(prev => [...prev, faqData]);
      }

      // Reset form
      setFaqForm({
        question: '',
        answer: '',
        category: 'general',
        order: 1,
        status: 'published'
      });
      setShowFaqForm(false);
      setEditingFaq(null);

      alert('FAQ ajoutée avec succès !');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'ajout');
    } finally {
      setLoading(false);
    }
  };

  const handleNewsletterSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterForm.subject || !newsletterForm.content) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      // Envoyer via webhook Make pour distribution
      const response = await fetch('/webhooks/make.php', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-MAKE-SECRET': import.meta.env.VITE_MAKE_SECRET || 'change_me_secure_token_2024',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          type: 'newsletter',
          action: 'send',
          payload: newsletterForm
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi');
      }

      alert('Newsletter envoyée avec succès !');
      
      // Reset form
      setNewsletterForm({
        subject: '',
        content: '',
        recipients: 'all',
        customEmails: '',
        scheduledDate: ''
      });
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  const editArticle = (article: Article) => {
    setEditingArticle(article);
    setArticleForm({
      title: article.title,
      summary: article.summary,
      content: article.content,
      tags: article.tags.join(', '),
      image: article.image,
      status: article.status
    });
    setShowArticleForm(true);
  };

  const editFaq = (faq: FAQ) => {
    setEditingFaq(faq);
    setFaqForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      order: faq.order,
      status: faq.status
    });
    setShowFaqForm(true);
  };

  const deleteArticle = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;
    
    try {
      await fetch('/api/webhook.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'article_delete',
          data: { id }
        })
      });

      setArticles(prev => prev.filter(a => a.id !== id));
      alert('Article supprimé');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const deleteFaq = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette FAQ ?')) return;
    
    try {
      await fetch('/api/webhook.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'faq_delete',
          data: { id }
        })
      });

      setFaqs(prev => prev.filter(f => f.id !== id));
      alert('FAQ supprimée');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <AuthGuard>
    <div className="min-h-screen bg-gray-50">
      {/* Header with Home Button */}
      <header className="bg-white border-b-2 border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Gestion de Contenu
                </h1>
                <p className="text-sm text-gray-600">
                  Publication manuelle d'articles, FAQ et newsletters
                </p>
              </div>
            </div>
            
            <a
              href="/backoffice"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Home size={16} />
              <span>Accueil Backoffice</span>
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'articles', label: 'Articles', icon: FileText },
                { id: 'faq', label: 'FAQ', icon: HelpCircle },
                { id: 'newsletter', label: 'Newsletter', icon: Mail }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Articles Tab */}
            {activeTab === 'articles' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Articles de Blog</h2>
                  <button
                    onClick={() => setShowArticleForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nouvel Article</span>
                  </button>
                </div>

                {showArticleForm && (
                  <div className="bg-gray-50 p-6 rounded-lg mb-6">
                    <h3 className="text-lg font-medium mb-4">
                      {editingArticle ? 'Modifier l\'Article' : 'Nouvel Article'}
                    </h3>
                    <form onSubmit={handleArticleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Titre *
                          </label>
                          <input
                            type="text"
                            required
                            value={articleForm.title}
                            onChange={(e) => setArticleForm(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium"
                            placeholder="Ex: Assurance Taxi 2024 : Guide Complet"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Statut
                          </label>
                          <select
                            value={articleForm.status}
                            onChange={(e) => setArticleForm(prev => ({ ...prev, status: e.target.value as 'published' | 'draft' }))}
                            className="w-full px-3 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium"
                          >
                            <option value="draft">Brouillon</option>
                            <option value="published">Publié</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Résumé *
                        </label>
                        <textarea
                          required
                          rows={3}
                          value={articleForm.summary}
                          onChange={(e) => setArticleForm(prev => ({ ...prev, summary: e.target.value }))}
                          className="w-full px-3 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium"
                          placeholder="Résumé de l'article en 2-3 phrases pour le SEO..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contenu HTML *
                        </label>
                        <textarea
                          required
                          rows={8}
                          value={articleForm.content}
                          onChange={(e) => setArticleForm(prev => ({ ...prev, content: e.target.value }))}
                          className="w-full px-3 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-mono text-sm"
                          placeholder="<p>Votre contenu HTML...</p>"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tags (séparés par des virgules)
                          </label>
                          <input
                            type="text"
                            value={articleForm.tags}
                            onChange={(e) => setArticleForm(prev => ({ ...prev, tags: e.target.value }))}
                            className="w-full px-3 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium"
                            placeholder="assurance, taxi, 2024"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            URL Image de couverture
                          </label>
                          <input
                            type="url"
                            value={articleForm.image}
                            onChange={(e) => setArticleForm(prev => ({ ...prev, image: e.target.value }))}
                            className="w-full px-3 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium"
                            placeholder="https://images.pexels.com/..."
                          />
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <button
                          type="submit"
                          disabled={loading}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
                        >
                          <Save className="w-4 h-4" />
                          <span>{loading ? 'Publication...' : 'Publier'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowArticleForm(false);
                            setEditingArticle(null);
                            setArticleForm({
                              title: '',
                              summary: '',
                              content: '',
                              tags: '',
                              image: '',
                              status: 'draft'
                            });
                          }}
                          className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-lg"
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Articles List */}
                <div className="space-y-4">
                  {articles.map((article) => (
                    <div key={article.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-medium text-gray-900">{article.title}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              article.status === 'published' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {article.status === 'published' ? 'Publié' : 'Brouillon'}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{article.summary}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>Créé: {article.createdAt}</span>
                            <span>Modifié: {article.updatedAt}</span>
                            <div className="flex space-x-1">
                              {article.tags.map((tag, index) => (
                                <span key={index} className="bg-gray-100 px-2 py-1 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => editArticle(article)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteArticle(article.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FAQ Tab */}
            {activeTab === 'faq' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Questions Fréquentes</h2>
                  <button
                    onClick={() => setShowFaqForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nouvelle FAQ</span>
                  </button>
                </div>

                {showFaqForm && (
                  <div className="bg-gray-50 p-6 rounded-lg mb-6">
                    <h3 className="text-lg font-medium mb-4">
                      {editingFaq ? 'Modifier la FAQ' : 'Nouvelle FAQ'}
                    </h3>
                    <form onSubmit={handleFaqSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Question *
                          </label>
                          <input
                            type="text"
                            required
                            value={faqForm.question}
                            onChange={(e) => setFaqForm(prev => ({ ...prev, question: e.target.value }))}
                            className="w-full px-3 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium"
                            placeholder="Ex: Combien coûte une assurance taxi ?"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Catégorie
                          </label>
                          <select
                            value={faqForm.category}
                            onChange={(e) => setFaqForm(prev => ({ ...prev, category: e.target.value }))}
                            className="w-full px-3 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium"
                          >
                            <option value="general">Général</option>
                            <option value="tarifs">Tarifs</option>
                            <option value="garanties">Garanties</option>
                            <option value="sinistres">Sinistres</option>
                            <option value="procedures">Procédures</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Réponse *
                        </label>
                        <textarea
                          required
                          rows={5}
                          value={faqForm.answer}
                          onChange={(e) => setFaqForm(prev => ({ ...prev, answer: e.target.value }))}
                          className="w-full px-3 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium"
                          placeholder="Réponse détaillée à la question..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ordre d'affichage
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={faqForm.order}
                            onChange={(e) => setFaqForm(prev => ({ ...prev, order: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Statut
                          </label>
                          <select
                            value={faqForm.status}
                            onChange={(e) => setFaqForm(prev => ({ ...prev, status: e.target.value as 'published' | 'draft' }))}
                            className="w-full px-3 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium"
                          >
                            <option value="published">Publié</option>
                            <option value="draft">Brouillon</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <button
                          type="submit"
                          disabled={loading}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
                        >
                          <Save className="w-4 h-4" />
                          <span>{loading ? 'Ajout...' : 'Ajouter'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowFaqForm(false);
                            setEditingFaq(null);
                            setFaqForm({
                              question: '',
                              answer: '',
                              category: 'general',
                              order: 1,
                              status: 'published'
                            });
                          }}
                          className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-lg"
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* FAQ List */}
                <div className="space-y-4">
                  {faqs.map((faq) => (
                    <div key={faq.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-medium text-gray-900">{faq.question}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              faq.status === 'published' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {faq.status === 'published' ? 'Publié' : 'Brouillon'}
                            </span>
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                              {faq.category}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{faq.answer}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>Ordre: {faq.order}</span>
                            <span>Créé: {faq.createdAt}</span>
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => editFaq(faq)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteFaq(faq.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Newsletter Tab */}
            {activeTab === 'newsletter' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">Envoi de Newsletter</h2>
                  <p className="text-gray-600 text-sm">
                    Envoi manuel aux abonnés (complément de l'automatisme Make)
                  </p>
                </div>

                <form onSubmit={handleNewsletterSend} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sujet *
                    </label>
                    <input
                      type="text"
                      required
                      value={newsletterForm.subject}
                      onChange={(e) => setNewsletterForm(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium text-lg"
                      placeholder="Nouvelles offres assurance taxi - Janvier 2024"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contenu HTML *
                    </label>
                    <textarea
                      required
                      rows={12}
                      value={newsletterForm.content}
                      onChange={(e) => setNewsletterForm(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-mono text-base"
                      placeholder="<h2>Bonjour,</h2><p>Votre contenu HTML...</p>"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Destinataires
                      </label>
                      <select
                        value={newsletterForm.recipients}
                        onChange={(e) => setNewsletterForm(prev => ({ ...prev, recipients: e.target.value as any }))}
                        className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium"
                      >
                        <option value="all">Tous les abonnés</option>
                        <option value="taxi">Taxi uniquement</option>
                        <option value="vtc">VTC uniquement</option>
                        <option value="custom">Liste personnalisée</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Programmation (optionnel)
                      </label>
                      <input
                        type="datetime-local"
                        value={newsletterForm.scheduledDate}
                        onChange={(e) => setNewsletterForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                        className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium"
                      />
                    </div>
                  </div>

                  {newsletterForm.recipients === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Emails personnalisés (un par ligne)
                      </label>
                      <textarea
                        rows={4}
                        value={newsletterForm.customEmails}
                        onChange={(e) => setNewsletterForm(prev => ({ ...prev, customEmails: e.target.value }))}
                        className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium"
                        placeholder="email1@example.com&#10;email2@example.com"
                      />
                    </div>
                  )}

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-900 mb-2">💡 Bonnes Pratiques</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Utilisez un sujet accrocheur et personnalisé</li>
                      <li>• Incluez un appel à l'action clair</li>
                      <li>• Testez votre HTML avant envoi</li>
                      <li>• Respectez la fréquence d'envoi (max 1/semaine)</li>
                    </ul>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>{loading ? 'Envoi...' : 'Envoyer Newsletter'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewsletterForm({
                        subject: '',
                        content: '',
                        recipients: 'all',
                        customEmails: '',
                        scheduledDate: ''
                      })}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-lg"
                    >
                      Réinitialiser
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </AuthGuard>
  );
};

export default ContentManager;