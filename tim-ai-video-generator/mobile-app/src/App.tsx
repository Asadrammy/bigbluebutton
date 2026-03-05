import React from 'react';
import AppNavigator from '@navigation/AppNavigator';
import { Provider } from 'react-redux';
import { store } from '@store/index';
import { AuthProvider } from '@contexts/AuthContext';
import { ThemeProvider } from '@theme/index';
import { SettingsProvider } from '@contexts/SettingsContext';

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AuthProvider>
        <SettingsProvider>
          <ThemeProvider>
            <AppNavigator />
          </ThemeProvider>
        </SettingsProvider>
      </AuthProvider>
    </Provider>
  );
};

export default App;

