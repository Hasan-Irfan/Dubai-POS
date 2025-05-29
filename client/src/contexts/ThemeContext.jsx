import React, { createContext, useContext, useEffect, useState } from 'react';

    const ThemeContext = createContext();

    export const useTheme = () => useContext(ThemeContext);

    export const ThemeProvider = ({ children }) => {
      const [theme, setTheme] = useState(() => {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme) {
          return storedTheme;
        }
        // Default to dark theme if no preference or system preference is dark
        // return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        return 'dark'; // Defaulting to dark as per initial setup
      });

      useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
      }, [theme]);

      const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
      };

      return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
          {children}
        </ThemeContext.Provider>
      );
    };