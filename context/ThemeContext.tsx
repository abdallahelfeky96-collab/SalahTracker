import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadLanguage } from './../utils/i18n';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: (newTheme: Theme) => Promise<void>;
  themeStyles: typeof themeStyles.dark;
  isDarkMode: boolean;
}

export const themeStyles = {
  dark: {
    bg: '#0f1923',
    card: '#1a2535',
    border: '#2a3a50',
    text: '#dddddd',
    subText: '#888888',
    inputBg: '#0f1923',
    accent: '#c9a84c',
    isDarkMode: true,  // <-- أضيف ده
  },
  light: {
    bg: '#f5f7fa',
    card: '#ffffff',
    border: '#e1e8ed',
    text: '#2c3e50',
    subText: '#0f1923',
    inputBg: '#f5f7fa',
    accent: 'hsl(44, 54%, 54%)',
    isDarkMode: false,  // <-- أضيف ده
  }
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem('user_settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          if (parsed.theme) setTheme(parsed.theme);
        }
      } catch (e) {
        console.log('Error loading theme:', e);
      }
    };
    loadTheme();
    loadLanguage();
  }, []);

  const toggleTheme = async (newTheme: Theme) => {
    setTheme(newTheme);
    try {
      const current = await AsyncStorage.getItem('user_settings');
      const settings = current ? JSON.parse(current) : {};
      await AsyncStorage.setItem('user_settings', JSON.stringify({ ...settings, theme: newTheme }));
    } catch (e) {
      console.log('Error saving theme:', e);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, themeStyles: themeStyles[theme], isDarkMode: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
