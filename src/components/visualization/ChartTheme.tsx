"use client";

import * as React from "react";

// Minimal theme for build completion
export interface ChartTheme {
  colors: {
    primary: string;
    secondary: string;
    chart: {
      background: string;
      grid: string;
      text: string;
    };
  };
  typography: {
    fontFamily: string;
    fontSize: {
      small: string;
      medium: string;
      large: string;
    };
  };
}

const defaultTheme: ChartTheme = {
  colors: {
    primary: "#2563eb",
    secondary: "#059669",
    chart: {
      background: "#ffffff",
      grid: "#e5e7eb",
      text: "#374151",
    },
  },
  typography: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: {
      small: "12px",
      medium: "14px",
      large: "16px",
    },
  },
};

export const ThemeContext = React.createContext<{
  theme: ChartTheme;
}>({
  theme: defaultTheme,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <ThemeContext.Provider value={{ theme: defaultTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const themePresets = {
  default: defaultTheme,
};

export const colorUtils = {
  primary: "#2563eb",
  secondary: "#059669",
};

export const responsive = {
  mobile: {},
  desktop: {},
};

export const chartStyles = {
  default: {},
};

const ChartTheme = {
  ThemeProvider,
  useTheme,
  themePresets,
  colorUtils,
  responsive,
  chartStyles,
};

export default ChartTheme;
