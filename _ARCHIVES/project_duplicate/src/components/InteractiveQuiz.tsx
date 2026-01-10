import React, { useState } from 'react';
import { HelpCircle, CheckCircle, XCircle, Trophy, ArrowRight } from 'lucide-react';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  tips: string;
}

const questions: QuizQuestion[] = [
  {
    id: 1,
    question: "Quelle assurance est OBLIGATOIRE pour exercer comme taxi ?",
    options: [
      "Assurance tous risques uniquement",
      "RC Professionnelle illimitée + Assurance véhicule",
      "Assurance au tiers suffit",
      "Aucune assurance n'est obligatoire"
    ],
    correctAnswer: 1,
    explanation: "La RC Pro illimitée ET l'assurance véhicule usage professionnel sont OBLIGATOIRES légalement.",
    tips: "Sans ces 2 assurances = 3,750€ amende + suspension licence + responsabilité illimitée en cas accident."
  },
  {
    id: 2,
    question: "Combien économisez-vous en moyenne avec TaxiAssur ?",
    options: [
      "10-15%",
      "20-25%",
      "35-40%",
      "50% et plus"
    ],
    correctAnswer: 2,
    explanation: "TaxiAssur permet d'économiser 35% en moyenne soit 1,050€/an.",
    tips: "Économie jusqu'à 1,520€/an pour un taxi parisien !"
  },
  {
    id: 3,
    question: "Quelle est la sanction pour rouler SANS assurance taxi ?",
    options: [
      "Simple avertissement",
      "500€ d'amende",
      "3,750€ amende + suspension licence + responsabilité illimitée",
      "Rien si pas contrôlé"
    ],
    correctAnswer: 2,
    explanation: "Sanctions très lourdes : 3,750€ amende immédiate + suspension licence 6 mois + responsabilité personnelle illimitée.",
    tips: "En cas d'accident grave, vous devrez payer TOUS les dommages (jusqu'à plusieurs millions €)."
  },
  {
    id: 4,
    question: "Délai pour obtenir une attestation d'assurance avec TaxiAssur ?",
    options: [
      "5-7 jours ouvrés",
      "48-72 heures",
      "24 heures",
      "10 minutes par email"
    ],
    correctAnswer: 3,
    explanation: "Attestation provisoire reçue par email en 10 minutes ! Vous pouvez rouler immédiatement.",
    tips: "Souscription 100% en ligne 5 min. Carte verte physique reçue sous 48h."
  },
  {
    id: 5,
    question: "Prix moyen assurance taxi en France ?",
    options: [
      "800-1,200€/an",
      "1,500-2,000€/an",
      "2,200-3,500€/an",
      "4,000€ et plus/an"
    ],
    correctAnswer: 2,
    explanation: "Prix marché : 2,200-3,500€/an selon ville. TaxiAssur : 1,430€/an moyenne nationale (-35%).",
    tips: "Paris est la ville la plus chère (3,200€ marché, 2,080€ TaxiAssur)."
  }
];

const InteractiveQuiz: React.FC = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showFinalResult, setShowFinalResult] = useState(false);

  const handleAnswerClick = (answerIndex: number) => {
    if (selectedAnswer !== null) return; // Déjà répondu

    setSelectedAnswer(answerIndex);
    const isCorrect = answerIndex === questions[currentQuestion].correctAnswer;

    if (isCorrect) {
      setScore(score + 1);
    }

    setAnswers([...answers, isCorrect]);
    setShowResult(true);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setShowFinalResult(true);
    }
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setAnswers([]);
    setShowFinalResult(false);
  };

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  if (showFinalResult) {
    const percentage = (score / questions.length) * 100;
    let message = '';
    let emoji = '';
    let ctaMessage = '';

    if (percentage >= 80) {
      message = "Expert Assurance Taxi !";
      emoji = "🏆";
      ctaMessage = "Vous connaissez bien le sujet. Profitez de votre expertise pour économiser -35% !";
    } else if (percentage >= 60) {
      message = "Bonnes Connaissances !";
      emoji = "👍";
      ctaMessage = "Vous avez de bonnes bases. Économisez maintenant avec notre offre -35% !";
    } else if (percentage >= 40) {
      message = "Peut Mieux Faire";
      emoji = "📚";
      ctaMessage = "Améliorez vos connaissances ET économisez -35% sur votre assurance !";
    } else {
      message = "À Découvrir !";
      emoji = "🎓";
      ctaMessage = "Beaucoup à apprendre. Laissez-nous vous guider vers la meilleure assurance -35% !";
    }

    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="text-6xl mb-4">{emoji}</div>
        <h2 className="text-3xl font-black mb-4">{message}</h2>
        <div className="text-5xl font-black text-green-600 mb-4">
          {score}/{questions.length}
        </div>
        <p className="text-xl text-gray-600 mb-8">{percentage}% de bonnes réponses</p>

        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-xl p-6 mb-8">
          <Trophy className="mx-auto mb-4 text-yellow-500" size={48} />
          <p className="text-lg font-semibold text-gray-800 mb-4">{ctaMessage}</p>
          <a
            href="#devis"
            onClick={(e) => {
              e.preventDefault();
              const devisSection = document.getElementById('devis');
              if (devisSection) {
                devisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setTimeout(() => {
                  const nameInput = document.getElementById('name') as HTMLInputElement;
                  if (nameInput) nameInput.focus();
                }, 800);
              }
            }}
            className="inline-flex items-center bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold px-8 py-4 rounded-xl transition-all shadow-lg"
          >
            Économiser 35% Maintenant
            <ArrowRight className="ml-2" size={20} />
          </a>
        </div>

        <button
          onClick={restartQuiz}
          className="text-orange-600 hover:underline font-semibold"
        >
          ← Refaire le quiz
        </button>

        <div className="mt-8 text-left">
          <h3 className="text-xl font-bold mb-4">Récapitulatif :</h3>
          {questions.map((q, index) => (
            <div key={q.id} className="mb-4 p-4 bg-white border border-yellow-100 rounded-lg">
              <div className="flex items-start">
                {answers[index] ? (
                  <CheckCircle className="text-green-600 mr-2 flex-shrink-0 mt-1" size={20} />
                ) : (
                  <XCircle className="text-red-600 mr-2 flex-shrink-0 mt-1" size={20} />
                )}
                <div className="flex-1">
                  <div className="font-semibold mb-1">Question {index + 1}</div>
                  <div className="text-sm text-gray-600">{q.question}</div>
                  {!answers[index] && (
                    <div className="mt-2 text-sm text-orange-600 font-semibold">
                      ✓ Réponse : {q.options[q.correctAnswer]}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <HelpCircle className="text-orange-600 mr-2" size={24} />
          <span className="font-bold text-lg text-gray-900">Quiz Assurance Taxi</span>
        </div>
        <div className="text-sm font-semibold text-gray-900">
          {currentQuestion + 1}/{questions.length}
        </div>
      </div>

      <div className="mb-8">
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className="bg-yellow-500 h-3 rounded-full transition-all duration-300 shadow-inner"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-right text-sm text-gray-900 font-semibold">{Math.round(progress)}% complété</div>
      </div>

      <div className="mb-8">
        <h3 className="text-2xl font-bold mb-6 text-gray-900">{currentQ.question}</h3>

        <div className="space-y-3">
          {currentQ.options.map((option, index) => {
            let bgColor = 'bg-white border border-yellow-100 hover:bg-gradient-to-br from-white to-gray-50 border-orange-200';
            let cursor = 'cursor-pointer';

            if (showResult) {
              cursor = 'cursor-not-allowed';
              if (index === currentQ.correctAnswer) {
                bgColor = 'bg-green-100 border-green-500';
              } else if (index === selectedAnswer && selectedAnswer !== currentQ.correctAnswer) {
                bgColor = 'bg-red-100 border-red-500';
              }
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswerClick(index)}
                disabled={showResult}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${bgColor} ${cursor}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{option}</span>
                  {showResult && index === currentQ.correctAnswer && (
                    <CheckCircle className="text-green-600" size={24} />
                  )}
                  {showResult && index === selectedAnswer && selectedAnswer !== currentQ.correctAnswer && (
                    <XCircle className="text-red-600" size={24} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {showResult && (
        <div className={`mb-6 p-6 rounded-xl ${
          selectedAnswer === currentQ.correctAnswer
            ? 'bg-green-50 border-2 border-green-500'
            : 'bg-orange-50 border-2 border-orange-500'
        }`}>
          <div className="flex items-start mb-3">
            {selectedAnswer === currentQ.correctAnswer ? (
              <CheckCircle className="text-green-600 mr-2 flex-shrink-0 mt-1" size={24} />
            ) : (
              <HelpCircle className="text-orange-600 mr-2 flex-shrink-0 mt-1" size={24} />
            )}
            <div>
              <div className="font-bold text-lg mb-2">
                {selectedAnswer === currentQ.correctAnswer ? "Bravo ! ✓" : "Pas tout à fait..."}
              </div>
              <p className="text-gray-700 mb-3">{currentQ.explanation}</p>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-sm font-semibold text-orange-900 mb-1">💡 Astuce :</div>
                <div className="text-sm text-gray-900">{currentQ.tips}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResult && (
        <button
          onClick={handleNext}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-4 px-8 rounded-xl transition-all flex items-center justify-center shadow-lg"
        >
          {currentQuestion < questions.length - 1 ? "Question Suivante" : "Voir Mon Score"}
          <ArrowRight className="ml-2" size={20} />
        </button>
      )}

      <div className="mt-6 text-center">
        <div className="text-sm text-gray-600">
          Score actuel : <span className="font-bold text-green-600">{score}/{currentQuestion + (showResult ? 1 : 0)}</span>
        </div>
      </div>
    </div>
  );
};

export default InteractiveQuiz;
