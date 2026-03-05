import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  // Auth screens
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  
  // Main app screens
  Onboarding: undefined;
  Home: undefined;
  SignToSpeech: undefined;
  SpeechToSign: undefined;
  Settings: undefined;
  History: undefined;
  Dictionary: undefined;
  Help: undefined;
  ChangePassword: undefined;
  About: undefined;
  Profile: undefined;
  Terms: undefined;
};

// Auth screen props
export type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;
export type RegisterScreenProps = NativeStackScreenProps<RootStackParamList, 'Register'>;
export type ForgotPasswordScreenProps = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

// Main app screen props
export type OnboardingScreenProps = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;
export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
export type SignToSpeechScreenProps = NativeStackScreenProps<RootStackParamList, 'SignToSpeech'>;
export type SpeechToSignScreenProps = NativeStackScreenProps<RootStackParamList, 'SpeechToSign'>;
export type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;
export type HistoryScreenProps = NativeStackScreenProps<RootStackParamList, 'History'>;
export type DictionaryScreenProps = NativeStackScreenProps<RootStackParamList, 'Dictionary'>;
export type HelpScreenProps = NativeStackScreenProps<RootStackParamList, 'Help'>;
export type ChangePasswordScreenProps = NativeStackScreenProps<RootStackParamList, 'ChangePassword'>;
export type AboutScreenProps = NativeStackScreenProps<RootStackParamList, 'About'>;
export type ProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'Profile'>;
export type TermsScreenProps = NativeStackScreenProps<RootStackParamList, 'Terms'>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
