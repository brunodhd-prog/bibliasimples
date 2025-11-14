import React, { useState } from 'react';
import { BIBLE_BOOKS } from '../constants';

interface BibleNavigationProps {
  selectedBook: string;
  selectedChapter: number;
  onBookChange: (book: string) => void;
  onChapterChange: (chapter: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onJumpToVerse: (verse: number) => void;
  onClearHighlights: () => void;
  hasHighlights: boolean;
}

const BibleNavigation: React.FC<BibleNavigationProps> = ({
  selectedBook,
  selectedChapter,
  onBookChange,
  onChapterChange,
  onPrevious,
  onNext,
  onJumpToVerse,
  onClearHighlights,
  hasHighlights
}) => {
  const [verseInput, setVerseInput] = useState('');
  const currentBook = BIBLE_BOOKS.find(b => b.name === selectedBook);
  const maxChapters = currentBook?.chapters || 1;

  const handleChapterInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chapter = e.target.valueAsNumber;
    if (!isNaN(chapter)) {
      onChapterChange(chapter);
    }
  };

  const handleChapterBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let chapter = e.target.valueAsNumber;
     if (isNaN(chapter) || chapter < 1) {
      chapter = 1;
    } else if (chapter > maxChapters) {
      chapter = maxChapters;
    }
    onChapterChange(chapter);
  };
  
  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const verseNumber = parseInt(verseInput, 10);
    if (!verseNumber) return;

    onJumpToVerse(verseNumber);
    setVerseInput('');
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md sticky top-24">
      <h2 className="text-lg font-semibold mb-4 text-stone-700">Navegação</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="book-select" className="block text-sm font-medium text-stone-600 mb-1">
            Livro
          </label>
          <select
            id="book-select"
            value={selectedBook}
            onChange={(e) => onBookChange(e.target.value)}
            className="w-full p-2 border border-black rounded-md shadow-sm focus:ring-black focus:border-black transition bg-stone-100"
          >
            {BIBLE_BOOKS.map(book => (
              <option key={book.name} value={book.name}>
                {book.name}
              </option>
            ))}
          </select>
        </div>
        
        <form onSubmit={handleJumpSubmit} className="flex items-end gap-2">
            <div className="w-1/3">
                <label htmlFor="chapter-input" className="block text-sm font-medium text-stone-600 mb-1">
                    Capítulo
                </label>
                <input
                    type="number"
                    id="chapter-input"
                    value={selectedChapter}
                    onChange={handleChapterInput}
                    onBlur={handleChapterBlur}
                    min="1"
                    max={maxChapters}
                    className="w-full p-2 border border-black rounded-md shadow-sm focus:ring-black focus:border-black transition bg-stone-100"
                />
            </div>
            <div className="w-2/3 flex items-end gap-2">
                <div className="flex-grow">
                     <label htmlFor="verse-input" className="block text-sm font-medium text-stone-600 mb-1">
                        Verso
                     </label>
                     <input
                        id="verse-input"
                        type="number"
                        value={verseInput}
                        onChange={e => setVerseInput(e.target.value)}
                        placeholder="..."
                        min="1"
                        className="w-full p-2 border border-black rounded-md shadow-sm focus:ring-black focus:border-black transition bg-stone-100"
                        aria-label="Pular para o verso"
                    />
                </div>
                <button 
                    type="submit"
                    className="px-4 py-2 bg-stone-600 text-white rounded-md hover:bg-stone-700 transition-colors"
                    aria-label="Ir para o verso"
                >
                    Ir
                </button>
            </div>
        </form>
        
        <div className="flex justify-between items-center pt-2">
             <button 
                onClick={onPrevious} 
                className="px-4 py-2 bg-stone-200 text-stone-700 rounded-md hover:bg-stone-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
             >
                &larr; Anterior
             </button>
             <button 
                onClick={onNext} 
                className="px-4 py-2 bg-stone-200 text-stone-700 rounded-md hover:bg-stone-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
             >
                Próximo &rarr;
             </button>
        </div>

        {hasHighlights && (
            <button
                onClick={onClearHighlights}
                className="w-full mt-2 px-3 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors text-sm"
                title="Limpar destaques neste capítulo"
            >
                Limpar Destaques
            </button>
        )}
      </div>
    </div>
  );
};

export default BibleNavigation;