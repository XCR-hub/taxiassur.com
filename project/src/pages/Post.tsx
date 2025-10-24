import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BlogPost from '../components/BlogPost';

const Post: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <BlogPost />
      </main>
      <Footer />
    </div>
  );
};

export default Post;