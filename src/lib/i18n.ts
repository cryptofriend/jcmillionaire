import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Get saved language or default to English
const savedLanguage = localStorage.getItem('jc_language') || 'en';

export const resources = {
  en: {
    translation: {
      // Common
      app_name: 'Jackie Chain',
      subtitle: 'Millionaire',
      powered_by: 'Powered by World ID • Rewards on World Chain',
      
      // Home
      home: {
        win_jackpot: 'Win 1M $JC!',
        description: 'Answer 15 questions to climb the prize ladder. Use lifelines wisely!',
        verify_to_play: 'Verify to Play',
        start_run: 'Start Run',
        next_play_in: 'Next play in',
        plays_today: 'Plays Today',
        from_referrals: 'from referrals',
        invite_friend: 'Invite a friend = +1 extra play',
        share: 'Share',
        copied: 'Invite link copied!',
        questions: 'Questions',
        questions_desc: 'Answer 15 trivia questions of increasing difficulty. Each correct answer moves you up the prize ladder. Get them all right to win the jackpot!',
        lifelines: 'Lifelines',
        lifelines_desc: 'You have 3 lifelines per run: 50/50 removes two wrong answers, Hint gives you a clue, and Chain Scan shows what the community answered.',
        safe_havens: 'Safe Havens',
        safe_havens_desc: 'Questions 5 and 10 are safe havens. If you answer wrong after reaching a safe haven, you keep the prize from that level instead of losing everything!',
      },

      // Game
      game: {
        question_of: 'Question {{current}} of {{total}}',
        time_up: "Time's up!",
        correct: 'Correct!',
        wrong: 'Wrong!',
        jackie_says: 'Jackie says:',
        chain_scan_results: 'Chain Scan Results',
        players: 'players',
      },

      // Lifelines
      lifelines: {
        fifty_fifty: '50/50',
        hint: 'Hint',
        chain_scan: 'Chain Scan',
      },

      // Result
      result: {
        game_over: 'Game Over',
        congratulations: 'Congratulations!',
        you_won: 'You Won',
        you_earned: 'You Earned',
        claim_now: 'Claim Now',
        play_again: 'Play Again',
        go_home: 'Go Home',
        share_result: 'Share Result',
      },

      // Profile
      profile: {
        title: 'Profile',
        total_earned: 'Total Earned',
        current_streak: 'Current Streak',
        days: 'days',
        total_runs: 'Total Runs',
        best_streak: 'Best Streak',
      },

      // Leaderboard
      leaderboard: {
        title: 'Leaderboard',
        rank: 'Rank',
        player: 'Player',
        earnings: 'Earnings',
        you: 'You',
      },

      // Verification
      verify: {
        title: 'Verify with World ID',
        description: 'Prove you are a unique human to start playing',
        verifying: 'Verifying...',
        verify_button: 'Verify with World ID',
        verified: 'Verified!',
        welcome: 'Welcome to Jackie Chain!',
      },

      // Notifications
      notifications: {
        title: 'Stay Updated!',
        description: 'Get notified about daily rewards, new games, and special events.',
        enable: 'Enable Notifications',
        skip: 'Skip for now',
        enabled: 'Notifications enabled!',
        denied: 'Notifications denied',
      },

      // Pool stats
      pool: {
        todays_pool: "Today's Pool",
        remaining: 'Remaining',
        locked: 'Locked',
      },

      // Navigation
      nav: {
        home: 'Home',
        game: 'Game',
        leaderboard: 'Leaderboard',
        profile: 'Profile',
      },

      // Trailer
      trailer: {
        story: 'Story',
        referral: 'Invite',
      },
    },
  },
  es: {
    translation: {
      // Common
      app_name: 'Jackie Chain',
      subtitle: 'Millonario',
      powered_by: 'Impulsado por World ID • Recompensas en World Chain',
      
      // Home
      home: {
        win_jackpot: '¡Gana 1M $JC!',
        description: 'Responde 15 preguntas para subir la escalera de premios. ¡Usa los comodines sabiamente!',
        verify_to_play: 'Verificar para Jugar',
        start_run: 'Comenzar Juego',
        next_play_in: 'Próximo juego en',
        plays_today: 'Juegos Hoy',
        from_referrals: 'de referencias',
        invite_friend: 'Invita un amigo = +1 juego extra',
        share: 'Compartir',
        copied: '¡Enlace de invitación copiado!',
        questions: 'Preguntas',
        questions_desc: 'Responde 15 preguntas de trivia de dificultad creciente. Cada respuesta correcta te sube en la escalera de premios. ¡Aciértalas todas para ganar el premio mayor!',
        lifelines: 'Comodines',
        lifelines_desc: 'Tienes 3 comodines por juego: 50/50 elimina dos respuestas incorrectas, Pista te da una pista, y Escaneo de Cadena muestra lo que respondió la comunidad.',
        safe_havens: 'Refugios Seguros',
        safe_havens_desc: 'Las preguntas 5 y 10 son refugios seguros. Si te equivocas después de alcanzar un refugio seguro, ¡conservas el premio de ese nivel en lugar de perderlo todo!',
      },

      // Game
      game: {
        question_of: 'Pregunta {{current}} de {{total}}',
        time_up: '¡Se acabó el tiempo!',
        correct: '¡Correcto!',
        wrong: '¡Incorrecto!',
        jackie_says: 'Jackie dice:',
        chain_scan_results: 'Resultados del Escaneo',
        players: 'jugadores',
      },

      // Lifelines
      lifelines: {
        fifty_fifty: '50/50',
        hint: 'Pista',
        chain_scan: 'Escaneo',
      },

      // Result
      result: {
        game_over: 'Fin del Juego',
        congratulations: '¡Felicitaciones!',
        you_won: 'Ganaste',
        you_earned: 'Has Ganado',
        claim_now: 'Reclamar Ahora',
        play_again: 'Jugar de Nuevo',
        go_home: 'Ir al Inicio',
        share_result: 'Compartir Resultado',
      },

      // Profile
      profile: {
        title: 'Perfil',
        total_earned: 'Total Ganado',
        current_streak: 'Racha Actual',
        days: 'días',
        total_runs: 'Total de Juegos',
        best_streak: 'Mejor Racha',
      },

      // Leaderboard
      leaderboard: {
        title: 'Clasificación',
        rank: 'Posición',
        player: 'Jugador',
        earnings: 'Ganancias',
        you: 'Tú',
      },

      // Verification
      verify: {
        title: 'Verificar con World ID',
        description: 'Demuestra que eres un humano único para comenzar a jugar',
        verifying: 'Verificando...',
        verify_button: 'Verificar con World ID',
        verified: '¡Verificado!',
        welcome: '¡Bienvenido a Jackie Chain!',
      },

      // Notifications
      notifications: {
        title: '¡Mantente Actualizado!',
        description: 'Recibe notificaciones sobre recompensas diarias, nuevos juegos y eventos especiales.',
        enable: 'Activar Notificaciones',
        skip: 'Omitir por ahora',
        enabled: '¡Notificaciones activadas!',
        denied: 'Notificaciones denegadas',
      },

      // Pool stats
      pool: {
        todays_pool: 'Premio de Hoy',
        remaining: 'Restante',
        locked: 'Bloqueado',
      },

      // Navigation
      nav: {
        home: 'Inicio',
        game: 'Juego',
        leaderboard: 'Ranking',
        profile: 'Perfil',
      },

      // Trailer
      trailer: {
        story: 'Historia',
        referral: 'Invitar',
      },
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

// Helper to save language preference
export const setLanguage = (lang: 'en' | 'es') => {
  localStorage.setItem('jc_language', lang);
  i18n.changeLanguage(lang);
};

export const getCurrentLanguage = (): 'en' | 'es' => {
  return (localStorage.getItem('jc_language') as 'en' | 'es') || 'en';
};
