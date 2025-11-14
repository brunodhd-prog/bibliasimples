import React, { useState } from 'react';
import { searchBible, SearchResult } from '../services/geminiService';
import Spinner from './Spinner';

const Search: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setResults([]);
    setHasSearched(true);

    try {
      const searchResults = await searchBible(query);
      setResults(searchResults);
    } catch (err) {
      setError('Ocorreu um erro ao realizar a busca. Por favor, tente novamente.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) {
      return <span>{text}</span>;
    }
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <strong key={i} className="bg-amber-200">{part}</strong>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg min-h-[60vh]">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-700 font-serif mb-6 text-center">
          Pesquisar nas Escrituras
        </h2>
        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite uma palavra ou frase..."
            className="w-full p-3 border border-stone-300 rounded-md shadow-sm focus:ring-stone-500 focus:border-stone-500 transition bg-stone-50 text-lg"
            aria-label="Termo de pesquisa"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-6 py-3 bg-stone-600 text-white rounded-md hover:bg-stone-700 transition-colors disabled:bg-stone-400 disabled:cursor-not-allowed"
          >
            {isLoading ? '...' : 'Pesquisar'}
          </button>
        </form>

        <div className="mt-6">
          {isLoading && (
            <div className="flex justify-center">
              <Spinner />
            </div>
          )}
          {error && <p className="text-center text-red-600">{error}</p>}
          {!isLoading && hasSearched && results.length === 0 && !error && (
            <p className="text-center text-stone-600">Nenhum resultado encontrado para "{query}".</p>
          )}
          {results.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-stone-700">
                {results.length} resultado(s) para "{query}"
              </h3>
              <ul className="space-y-4">
                {results.map((result, index) => (
                  <li key={index} className="border-b border-stone-200 pb-4">
                    <p className="font-semibold text-stone-800 font-serif text-lg">
                      {result.book} {result.chapter}:{result.verse}
                    </p>
                    <p className="text-stone-700 mt-1 leading-relaxed">
                      {highlightText(result.text, query)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Search;
