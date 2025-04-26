import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeadphones, faWind } from '@fortawesome/free-solid-svg-icons';
// Importa RecursoLayout definido em pages.jsx (ou de onde ele for exportado)
import { RecursoLayout, Card } from './ui.jsx'; // Assumindo que RecursoLayout vem de ui.jsx agora
// Import da imagem placeholder específica desta página (Ajuste o caminho se necessário)
import relaxingSceneImage from './public/images/relaxing_scene_audio_page.png'; // Mudado para jpg se for o caso

const AudioExercisePage = () => {
  return (
    <RecursoLayout title="Exercício de Respiração Guiada (5 Minutos)" backLink="/recursos">
      <p className="lead mb-6">
        Encontre um momento tranquilo e use este áudio guiado de 5 minutos para praticar a respiração profunda,
        ajudando a acalmar a mente e reduzir o estresse ou a ansiedade.
      </p>

      <Card className="mb-8 bg-primary-light/20 border border-primary/30">
        <div className="flex items-center justify-center mb-4">
          <FontAwesomeIcon icon={faHeadphones} size="3x" className="text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-center text-primary-dark mb-4">Ouça o Exercício Guiado</h2>
        <audio controls controlsList="nodownload" className="w-full">
          {/* O caminho assume que o MP3 está em /public/audio/ */}
          <source src="/audio/breathing-exercise.mp3" type="audio/mpeg" />
          Seu navegador não suporta o elemento de áudio. Por favor, tente usar um navegador mais moderno.
        </audio>
        <p className="text-xs text-center text-neutral-DEFAULT mt-2">Duração: 5 minutos</p>
      </Card>

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Como Fazer o Exercício</h2>
      <ul className="space-y-3 list-disc list-outside ml-5 marker:text-primary">
        <li><strong>Encontre um Lugar Calmo:</strong> Sente-se ou deite-se confortavelmente em um lugar onde não será interrompido(a).</li>
        <li><strong>Relaxe o Corpo:</strong> Solte a tensão nos ombros, pescoço e mandíbula.</li>
        <li><strong>Pressione Play:</strong> Inicie o áudio acima e siga as instruções guiadas.</li>
        <li><strong>Foque na Respiração:</strong> Concentre-se na sensação do ar entrando e saindo do seu corpo.</li>
        <li><strong>Seja Gentil Consigo Mesmo(a):</strong> Se sua mente divagar, apenas reconheça e gentilmente traga o foco de volta para a respiração.</li>
      </ul>

       {/* Imagem com estilo padronizado */}
       <div className="my-8 text-center">
         <img
             src={relaxingSceneImage}
             alt="Cena relaxante para acompanhar o exercício de respiração"
             className="rounded-lg shadow-md mx-auto w-[40rem] h-auto object-cover" // Estilo aplicado, object-cover pode ser útil
             loading="lazy"
         />
       </div>


      <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Benefícios da Respiração Profunda</h2>
      <p>A prática regular de exercícios de respiração pode ajudar a:</p>
      <ul className="space-y-1 list-disc list-outside ml-5 marker:text-primary">
        <li>Reduzir sentimentos de estresse e ansiedade.</li>
        <li>Melhorar a concentração e o foco.</li>
        <li>Promover uma sensação de calma e relaxamento.</li>
        <li>Abaixar a frequência cardíaca e a pressão arterial.</li>
      </ul>
      <p className="mt-6">Incorpore este exercício em sua rotina diária ou sempre que precisar de um momento de pausa e tranquilidade.</p>
    </RecursoLayout>
  );
};

export default AudioExercisePage;