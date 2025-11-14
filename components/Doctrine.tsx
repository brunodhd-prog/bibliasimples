import React from 'react';

const Doctrine: React.FC = () => {
  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg min-h-[60vh] flex flex-col justify-center items-center">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-700 font-serif mb-2">
          Pontos de Doutrina
        </h2>
        <p className="text-lg text-stone-500 mb-6">
          Explorando os Fundamentos da Fé
        </p>
        <p className="text-stone-600">
          Em breve: uma seção dedicada a estudos aprofundados para estudiosos da Bíblia!
        </p>
      </div>
    </div>
  );
};

export default Doctrine;
