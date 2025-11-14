import React, { useState, useEffect, useCallback } from 'react';
import { BIBLE_BOOKS } from './constants';
import { fetchChapterText } from './services/geminiService';
import BibleNavigation from './components/BibleNavigation';
import ChapterDisplay from './components/ChapterDisplay';
import Home from './components/Home';
import Search from './components/Search';
import Doctrine from './components/Doctrine';

type Highlights = { [key: string]: number[] };
type ActiveView = 'home' | 'bible' | 'search' | 'doctrine';

const navItems: { label: string; view: ActiveView }[] = [
    { label: 'Início', view: 'home' },
    { label: 'Bíblia', view: 'bible' },
    { label: 'Pesquisa', view: 'search' },
    { label: 'Pontos de Doutrina', view: 'doctrine' },
];

function App() {
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    const savedView = localStorage.getItem('bibleApp-view');
    if (savedView === 'home' || savedView === 'bible' || savedView === 'search' || savedView === 'doctrine') {
      return savedView;
    }
    return 'bible';
  });
  const [selectedBook, setSelectedBook] = useState<string>(() => {
    return localStorage.getItem('bibleApp-book') || BIBLE_BOOKS[0].name;
  });
  const [selectedChapter, setSelectedChapter] = useState<number>(() => {
    return parseInt(localStorage.getItem('bibleApp-chapter') || '1', 10);
  });
  const [chapterText, setChapterText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<Highlights>({});
  const [jumpToVerse, setJumpToVerse] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem('bibleApp-view', activeView);
    localStorage.setItem('bibleApp-book', selectedBook);
    localStorage.setItem('bibleApp-chapter', selectedChapter.toString());
  }, [activeView, selectedBook, selectedChapter]);
  
  useEffect(() => {
    try {
      const savedHighlights = localStorage.getItem('bibleApp-highlights');
      if (savedHighlights) {
        setHighlights(JSON.parse(savedHighlights));
      }
    } catch (e) {
      console.error("Failed to parse highlights from localStorage", e);
      setHighlights({});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('bibleApp-highlights', JSON.stringify(highlights));
  }, [highlights]);

  const maxChapters = BIBLE_BOOKS.find(book => book.name === selectedBook)?.chapters || 1;

  const fetchChapter = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const text = await fetchChapterText(selectedBook, selectedChapter);
      setChapterText(text);
    } catch (err) {
      console.error("Caught error in App.tsx:", err);
      let errorMessage = 'Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.';
      if (err instanceof Error) {
        const lowerCaseMessage = err.message.toLowerCase();
        if (lowerCaseMessage.includes('api key not valid') || lowerCaseMessage.includes('api_key')) {
          errorMessage = 'Sua chave de API é inválida ou não foi configurada. Verifique suas credenciais.';
        } else if (lowerCaseMessage.includes('failed to fetch')) {
          errorMessage = 'Falha na rede. Verifique sua conexão com a internet e tente novamente.';
        } else if (lowerCaseMessage.includes('gemini') || lowerCaseMessage.includes('request failed')) {
          errorMessage = 'O serviço da API Gemini encontrou um erro. Por favor, tente novamente mais tarde.';
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBook, selectedChapter]);

  useEffect(() => {
    if (activeView === 'bible') {
      fetchChapter();
    }
  }, [fetchChapter, activeView]);

  const handleBookChange = (book: string) => {
    setSelectedBook(book);
    setSelectedChapter(1);
  };

  const handleChapterChange = (chapter: number) => {
    if(chapter > 0 && chapter <= maxChapters) {
      setSelectedChapter(chapter);
    }
  };

  const handlePreviousChapter = () => {
    if (selectedChapter > 1) {
      setSelectedChapter(prev => prev - 1);
    } else {
        const currentBookIndex = BIBLE_BOOKS.findIndex(b => b.name === selectedBook);
        if (currentBookIndex > 0) {
            const previousBook = BIBLE_BOOKS[currentBookIndex - 1];
            setSelectedBook(previousBook.name);
            setSelectedChapter(previousBook.chapters);
        }
    }
  };

  const handleNextChapter = () => {
      if (selectedChapter < maxChapters) {
          setSelectedChapter(prev => prev + 1);
      } else {
          const currentBookIndex = BIBLE_BOOKS.findIndex(b => b.name === selectedBook);
          if (currentBookIndex < BIBLE_BOOKS.length - 1) {
              const nextBook = BIBLE_BOOKS[currentBookIndex + 1];
              setSelectedBook(nextBook.name);
              setSelectedChapter(1);
          }
      }
  };
  
  const handleToggleHighlight = (verse: number) => {
    const key = `${selectedBook}-${selectedChapter}`;
    setHighlights(prev => {
      const currentChapterHighlights = prev[key] ? [...prev[key]] : [];
      const verseIndex = currentChapterHighlights.indexOf(verse);
      
      if (verseIndex > -1) {
        currentChapterHighlights.splice(verseIndex, 1);
      } else {
        currentChapterHighlights.push(verse);
        currentChapterHighlights.sort((a, b) => a - b);
      }
      
      if (currentChapterHighlights.length === 0) {
        const newHighlights = { ...prev };
        delete newHighlights[key];
        return newHighlights;
      }
      
      return { ...prev, [key]: currentChapterHighlights };
    });
  };

  const handleClearHighlights = () => {
    const key = `${selectedBook}-${selectedChapter}`;
    setHighlights(prev => {
      const newHighlights = { ...prev };
      if (newHighlights[key]) {
        delete newHighlights[key];
      }
      return newHighlights;
    });
  };
  
  const renderContent = () => {
    switch (activeView) {
      case 'home':
        return <Home />;
      case 'search':
        return <Search />;
      case 'doctrine':
        return <Doctrine />;
      case 'bible':
      default:
        return (
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="lg:w-1/4 xl:w-1/5">
              <BibleNavigation
                selectedBook={selectedBook}
                selectedChapter={selectedChapter}
                onBookChange={handleBookChange}
                onChapterChange={handleChapterChange}
                onPrevious={handlePreviousChapter}
                onNext={handleNextChapter}
                onJumpToVerse={setJumpToVerse}
                onClearHighlights={handleClearHighlights}
                hasHighlights={!!highlights[`${selectedBook}-${selectedChapter}`] && highlights[`${selectedBook}-${selectedChapter}`].length > 0}
              />
            </aside>
            <div className="lg:w-3/4 xl:w-4/5">
              <ChapterDisplay
                book={selectedBook}
                chapter={selectedChapter}
                text={chapterText}
                isLoading={isLoading}
                error={error}
                highlightedVerses={highlights[`${selectedBook}-${selectedChapter}`] || []}
                onToggleHighlight={handleToggleHighlight}
                jumpToVerse={jumpToVerse}
                onJumpComplete={() => setJumpToVerse(null)}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="bg-stone-50 min-h-screen text-stone-800">
      <header className="bg-stone-800 text-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold font-serif">Bíblia Simples</h1>
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map(({ label, view }) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`text-stone-300 hover:text-white transition-colors pb-1 border-b-2 ${
                  activeView === view ? 'border-white font-semibold text-white' : 'border-transparent'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      
      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;