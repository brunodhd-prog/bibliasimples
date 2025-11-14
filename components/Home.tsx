import React, { useState, useEffect } from 'react';
import { fetchDailyMessage, DailyMessage } from '../services/geminiService';
import Spinner from './Spinner';

const Home: React.FC = () => {
  const [message, setMessage] = useState<DailyMessage | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadMessage = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dailyMessage = await fetchDailyMessage();
      setMessage(dailyMessage);
    } catch (err) {
      setError("Não foi possível carregar a mensagem do dia. Por favor, tente novamente mais tarde.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMessage();
  }, []);

  const handleShare = async () => {
    if (navigator.share && message) {
      try {
        await navigator.share({
          title: 'Mensagem do Dia da Bíblia Simples',
          text: `"${message.text}" - ${message.reference}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Erro ao compartilhar', error);
      }
    } else {
      console.log('A API de compartilhamento não é suportada neste navegador.');
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <Spinner />;
    }

    if (error) {
      return (
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <button
            onClick={loadMessage}
            className="px-4 py-2 bg-stone-600 text-white rounded-md hover:bg-stone-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    if (message) {
      return (
        <div className="text-center max-w-2xl mx-auto">
          <blockquote className="mb-4">
            <p className="text-xl sm:text-2xl font-serif italic text-stone-700 leading-relaxed">
              “{message.text}”
            </p>
          </blockquote>
          <cite className="block font-semibold text-stone-600 not-italic mb-6">
            {message.reference}
          </cite>
          {navigator.share && (
             <button
                onClick={handleShare}
                className="px-6 py-2 bg-stone-600 text-white rounded-md hover:bg-stone-700 transition-colors shadow-sm"
            >
                Compartilhar
            </button>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg min-h-[60vh] flex flex-col justify-center items-center">
      <h2 className="text-2xl sm:text-3xl font-bold text-stone-700 font-serif mb-8 text-center">
        Mensagem do Dia
      </h2>
      {renderContent()}
    </div>
  );
};

export default Home;