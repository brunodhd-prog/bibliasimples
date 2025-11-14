import React, { useEffect } from 'react';
import Spinner from './Spinner';

interface ChapterDisplayProps {
  book: string;
  chapter: number;
  text: string;
  isLoading: boolean;
  error: string | null;
  highlightedVerses: number[];
  onToggleHighlight: (verse: number) => void;
  jumpToVerse: number | null;
  onJumpComplete: () => void;
}

const ChapterDisplay: React.FC<ChapterDisplayProps> = ({
  book,
  chapter,
  text,
  isLoading,
  error,
  highlightedVerses,
  onToggleHighlight,
  jumpToVerse,
  onJumpComplete,
}) => {
  useEffect(() => {
    if (jumpToVerse !== null) {
      const verseElement = document.getElementById(`verse-${jumpToVerse}`);
      if (verseElement) {
        document.querySelectorAll('.verse-highlight').forEach(el => {
          el.classList.remove('verse-highlight');
        });

        verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        verseElement.classList.add('verse-highlight');
        
        setTimeout(() => {
          verseElement.classList.remove('verse-highlight');
        }, 2500);
      }
      onJumpComplete();
    }
  }, [jumpToVerse, onJumpComplete]);

  const formattedText = text.split('\n').map((line, index) => {
    const match = line.match(/^(\d+)\.\s(.*)/);
    if (match) {
      const verseNumber = parseInt(match[1], 10);
      const isHighlighted = highlightedVerses.includes(verseNumber);
      return (
        <p
          key={index}
          id={`verse-${match[1]}`}
          title="Clique para marcar ou desmarcar o versículo"
          className={`mb-2 transition-colors duration-300 ease-out cursor-pointer rounded-md px-2 -mx-2 ${isHighlighted ? 'user-highlight' : 'hover:bg-stone-100'}`}
          onClick={() => onToggleHighlight(verseNumber)}
        >
          <span className="font-bold text-sm text-stone-500 align-super mr-2">{match[1]}</span>
          {match[2]}
        </p>
      );
    }
    return <p key={index} className="mb-2">{line}</p>;
  });

  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg min-h-[60vh] flex flex-col">
      <div className="text-center mb-6 border-b border-stone-200 pb-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-700 font-serif">
          {book} {chapter}
        </h2>
      </div>

      <div className="flex-grow pt-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Spinner />
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
                <p className="text-red-600 font-semibold">Erro</p>
                <p className="text-stone-600 mt-2">{error}</p>
            </div>
          </div>
        ) : (
          <div className="prose prose-stone max-w-none font-serif text-lg leading-relaxed">
            {formattedText}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChapterDisplay;