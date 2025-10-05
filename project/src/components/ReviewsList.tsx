import React, { useState, useEffect } from 'react';
import { Star, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Review } from '../lib/schema';
import { getReviews } from '../lib/content';
import { formatDate, getAverageRating } from '../lib/utils';
import Card from './Card';

interface ReviewsListProps {
  limit?: number;
  showFilters?: boolean;
  carousel?: boolean;
}

const ReviewsList: React.FC<ReviewsListProps> = ({ 
  limit, 
  showFilters = true,
  carousel = false
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        const reviewsData = await getReviews();
        setReviews(reviewsData);
        setFilteredReviews(limit ? reviewsData.slice(0, limit) : reviewsData);
      } catch (error) {
        console.error('Failed to load reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [limit]);

  useEffect(() => {
    let filtered = reviews;
    
    if (selectedRating) {
      filtered = filtered.filter(review => review.rating === selectedRating);
    }
    
    if (limit) {
      filtered = filtered.slice(0, limit);
    }
    
    setFilteredReviews(filtered);
    setCurrentIndex(0);
  }, [reviews, selectedRating, limit]);

  const nextSlide = () => {
    setCurrentIndex((prev) => 
      prev === filteredReviews.length - 1 ? 0 : prev + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => 
      prev === 0 ? filteredReviews.length - 1 : prev - 1
    );
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        size={16}
        className={i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
      />
    ));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-16 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const averageRating = getAverageRating(reviews);
  const ratingCounts = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length
  }));

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="text-center">
        <div className="inline-flex items-center space-x-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-6 border border-amber-200">
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-600">{averageRating}/5</div>
            <div className="flex justify-center mb-1">
              {renderStars(Math.round(averageRating))}
            </div>
            <p className="text-sm text-amber-700">Note moyenne</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-600">{reviews.length}</div>
            <p className="text-sm text-amber-700">Avis clients</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => setSelectedRating(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedRating === null 
                ? 'bg-amber-500 text-black' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tous les avis
          </button>
          {ratingCounts.map(({ rating, count }) => (
            <button
              key={rating}
              onClick={() => setSelectedRating(rating)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center space-x-1 ${
                selectedRating === rating 
                  ? 'bg-amber-500 text-black' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{rating}</span>
              <Star size={14} className="fill-current" />
              <span>({count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Reviews Display */}
      {carousel ? (
        <div className="relative">
          <Card className="max-w-2xl mx-auto">
            {filteredReviews.length > 0 && (
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  {renderStars(filteredReviews[currentIndex].rating)}
                </div>
                <blockquote className="text-lg text-gray-700 mb-4 italic">
                  "{filteredReviews[currentIndex].comment}"
                </blockquote>
                <div className="text-sm text-gray-600">
                  <p className="font-semibold">{filteredReviews[currentIndex].name}</p>
                  <p>{formatDate(filteredReviews[currentIndex].createdAt)}</p>
                  {filteredReviews[currentIndex].source && (
                    <p>via {filteredReviews[currentIndex].source}</p>
                  )}
                </div>
              </div>
            )}
          </Card>
          
          {filteredReviews.length > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-4 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow"
              >
                <ChevronRight size={20} />
              </button>
              
              <div className="flex justify-center mt-4 space-x-2">
                {filteredReviews.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentIndex ? 'bg-amber-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReviews.map(review => (
            <Card key={review.id} hover>
              <div className="flex justify-between items-start mb-3">
                <div className="flex">
                  {renderStars(review.rating)}
                </div>
                {review.source && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {review.source}
                  </span>
                )}
              </div>
              
              <blockquote className="text-gray-700 mb-4 leading-relaxed">
                "{review.comment}"
              </blockquote>
              
              <div className="text-sm text-gray-600">
                <p className="font-semibold">{review.name}</p>
                <p>{formatDate(review.createdAt)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredReviews.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {selectedRating 
              ? `Aucun avis ${selectedRating} étoile${selectedRating > 1 ? 's' : ''} trouvé.`
              : 'Aucun avis disponible.'
            }
          </p>
          {selectedRating && (
            <button
              onClick={() => setSelectedRating(null)}
              className="mt-4 text-amber-600 hover:text-amber-700 font-medium"
            >
              Voir tous les avis
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewsList;