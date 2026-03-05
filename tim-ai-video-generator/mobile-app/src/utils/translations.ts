import { Language } from '@types/index';

type TranslationKeys = {
  home: {
    title: string;
    signLanguageMode: string;
    speechTranslationMode: string;
    settings: string;
  };
  signToSpeech: {
    title: string;
    startCamera: string;
    stopCamera: string;
    recognizedText: string;
    selectOutputLanguage: string;
    playAudio: string;
    processing: string;
  };
  speechToSign: {
    title: string;
    startRecording: string;
    stopRecording: string;
    spokenText: string;
    selectInputLanguage: string;
    processing: string;
    avatarLoading: string;
  };
  settings: {
    title: string;
    preferredLanguage: string;
    signLanguage: string;
    videoQuality: string;
    audioQuality: string;
    about: string;
    version: string;
    changePassword: string;
  };
  common: {
    error: string;
    retry: string;
    cancel: string;
    save: string;
    back: string;
    loading: string;
    noConnection: string;
  };
};

const translations: Record<Language, TranslationKeys> = {
  de: {
    home: {
      title: 'Gebärdensprache Übersetzer',
      signLanguageMode: 'Gebärdensprache',
      speechTranslationMode: 'Sprachübersetzung',
      settings: 'Einstellungen',
    },
    signToSpeech: {
      title: 'Gebärdensprache zu Sprache',
      startCamera: 'Kamera starten',
      stopCamera: 'Kamera stoppen',
      recognizedText: 'Erkannter Text',
      selectOutputLanguage: 'Ausgabesprache wählen',
      playAudio: 'Audio abspielen',
      processing: 'Verarbeitung...',
    },
    speechToSign: {
      title: 'Sprache zu Gebärdensprache',
      startRecording: 'Aufnahme starten',
      stopRecording: 'Aufnahme stoppen',
      spokenText: 'Gesprochener Text',
      selectInputLanguage: 'Eingabesprache wählen',
      processing: 'Verarbeitung...',
      avatarLoading: 'Avatar wird geladen...',
    },
    settings: {
      title: 'Einstellungen',
      preferredLanguage: 'Bevorzugte Sprache',
      signLanguage: 'Gebärdensprache',
      videoQuality: 'Videoqualität',
      audioQuality: 'Audioqualität',
      about: 'Über die App',
      version: 'Version',
      changePassword: 'Passwort ändern',
    },
    common: {
      error: 'Fehler',
      retry: 'Erneut versuchen',
      cancel: 'Abbrechen',
      save: 'Speichern',
      back: 'Zurück',
      loading: 'Laden...',
      noConnection: 'Keine Verbindung zum Server',
    },
  },
  en: {
    home: {
      title: 'Sign Language Translator',
      signLanguageMode: 'Sign Language',
      speechTranslationMode: 'Speech Translation',
      settings: 'Settings',
    },
    signToSpeech: {
      title: 'Sign Language to Speech',
      startCamera: 'Start Camera',
      stopCamera: 'Stop Camera',
      recognizedText: 'Recognized Text',
      selectOutputLanguage: 'Select Output Language',
      playAudio: 'Play Audio',
      processing: 'Processing...',
    },
    speechToSign: {
      title: 'Speech to Sign Language',
      startRecording: 'Start Recording',
      stopRecording: 'Stop Recording',
      spokenText: 'Spoken Text',
      selectInputLanguage: 'Select Input Language',
      processing: 'Processing...',
      avatarLoading: 'Loading Avatar...',
    },
    settings: {
      title: 'Settings',
      preferredLanguage: 'Preferred Language',
      signLanguage: 'Sign Language',
      videoQuality: 'Video Quality',
      audioQuality: 'Audio Quality',
      about: 'About',
      version: 'Version',
      changePassword: 'Change Password',
    },
    common: {
      error: 'Error',
      retry: 'Retry',
      cancel: 'Cancel',
      save: 'Save',
      back: 'Back',
      loading: 'Loading...',
      noConnection: 'No connection to server',
    },
  },
  es: {
    home: {
      title: 'Traductor de Lengua de Señas',
      signLanguageMode: 'Lengua de Señas',
      speechTranslationMode: 'Traducción de Voz',
      settings: 'Configuración',
    },
    signToSpeech: {
      title: 'Lengua de Señas a Voz',
      startCamera: 'Iniciar Cámara',
      stopCamera: 'Detener Cámara',
      recognizedText: 'Texto Reconocido',
      selectOutputLanguage: 'Seleccionar Idioma de Salida',
      playAudio: 'Reproducir Audio',
      processing: 'Procesando...',
    },
    speechToSign: {
      title: 'Voz a Lengua de Señas',
      startRecording: 'Iniciar Grabación',
      stopRecording: 'Detener Grabación',
      spokenText: 'Texto Hablado',
      selectInputLanguage: 'Seleccionar Idioma de Entrada',
      processing: 'Procesando...',
      avatarLoading: 'Cargando Avatar...',
    },
    settings: {
      title: 'Configuración',
      preferredLanguage: 'Idioma Preferido',
      signLanguage: 'Lengua de Señas',
      videoQuality: 'Calidad de Video',
      audioQuality: 'Calidad de Audio',
      about: 'Acerca de',
      version: 'Versión',
      changePassword: 'Cambiar contraseña',
    },
    common: {
      error: 'Error',
      retry: 'Reintentar',
      cancel: 'Cancelar',
      save: 'Guardar',
      back: 'Atrás',
      loading: 'Cargando...',
      noConnection: 'Sin conexión al servidor',
    },
  },
  fr: {
    home: {
      title: 'Traducteur de Langue des Signes',
      signLanguageMode: 'Langue des Signes',
      speechTranslationMode: 'Traduction Vocale',
      settings: 'Paramètres',
    },
    signToSpeech: {
      title: 'Langue des Signes vers Parole',
      startCamera: 'Démarrer la Caméra',
      stopCamera: 'Arrêter la Caméra',
      recognizedText: 'Texte Reconnu',
      selectOutputLanguage: 'Sélectionner la Langue de Sortie',
      playAudio: 'Lire l\'Audio',
      processing: 'Traitement...',
    },
    speechToSign: {
      title: 'Parole vers Langue des Signes',
      startRecording: 'Démarrer l\'Enregistrement',
      stopRecording: 'Arrêter l\'Enregistrement',
      spokenText: 'Texte Parlé',
      selectInputLanguage: 'Sélectionner la Langue d\'Entrée',
      processing: 'Traitement...',
      avatarLoading: 'Chargement de l\'Avatar...',
    },
    settings: {
      title: 'Paramètres',
      preferredLanguage: 'Langue Préférée',
      signLanguage: 'Langue des Signes',
      videoQuality: 'Qualité Vidéo',
      audioQuality: 'Qualité Audio',
      about: 'À Propos',
      version: 'Version',
      changePassword: 'Changer le mot de passe',
    },
    common: {
      error: 'Erreur',
      retry: 'Réessayer',
      cancel: 'Annuler',
      save: 'Enregistrer',
      back: 'Retour',
      loading: 'Chargement...',
      noConnection: 'Pas de connexion au serveur',
    },
  },
  ar: {
    home: {
      title: 'مترجم لغة الإشارة',
      signLanguageMode: 'لغة الإشارة',
      speechTranslationMode: 'ترجمة الكلام',
      settings: 'الإعدادات',
    },
    signToSpeech: {
      title: 'لغة الإشارة إلى الكلام',
      startCamera: 'تشغيل الكاميرا',
      stopCamera: 'إيقاف الكاميرا',
      recognizedText: 'النص المعترف به',
      selectOutputLanguage: 'اختر لغة الإخراج',
      playAudio: 'تشغيل الصوت',
      processing: 'جاري المعالجة...',
    },
    speechToSign: {
      title: 'الكلام إلى لغة الإشارة',
      startRecording: 'بدء التسجيل',
      stopRecording: 'إيقاف التسجيل',
      spokenText: 'النص المنطوق',
      selectInputLanguage: 'اختر لغة الإدخال',
      processing: 'جاري المعالجة...',
      avatarLoading: 'جاري تحميل الصورة الرمزية...',
    },
    settings: {
      title: 'الإعدادات',
      preferredLanguage: 'اللغة المفضلة',
      signLanguage: 'لغة الإشارة',
      videoQuality: 'جودة الفيديو',
      audioQuality: 'جودة الصوت',
      about: 'حول',
      version: 'الإصدار',
      changePassword: 'تغيير كلمة المرور',
    },
    common: {
      error: 'خطأ',
      retry: 'إعادة المحاولة',
      cancel: 'إلغاء',
      save: 'حفظ',
      back: 'رجوع',
      loading: 'جاري التحميل...',
      noConnection: 'لا يوجد اتصال بالخادم',
    },
  },
};

export const getTranslation = (language: Language): TranslationKeys => {
  return translations[language] || translations.en;
};

export default translations;

