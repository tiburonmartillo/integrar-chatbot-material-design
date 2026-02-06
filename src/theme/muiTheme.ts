/**
 * Tema base Material Design 3 - guidelines/guidelines.md
 * Usado en App, EmbeddableChat y PokemonPage
 */
import { createTheme, PaletteMode } from '@mui/material/styles';

const FONT_SANS = "'Kumbh Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const FONT_DISPLAY = "'Anek Latin', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export function createMD3Theme(mode: PaletteMode = 'light') {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#AAC7FF' : '#415F91',
        light: isDark ? '#D6E3FF' : '#D6E3FF',
        dark: isDark ? '#86ACF0' : '#284777',
        contrastText: isDark ? '#0A305F' : '#FFFFFF',
      },
      secondary: {
        main: isDark ? '#BEC6DC' : '#565F71',
        contrastText: isDark ? '#283141' : '#FFFFFF',
      },
      error: {
        main: isDark ? '#FFB4AB' : '#BA1A1A',
        contrastText: isDark ? '#690005' : '#FFFFFF',
      },
      background: {
        default: isDark ? '#111318' : '#F9F9FF',
        paper: isDark ? '#1D2024' : '#FFFFFF',
      },
      text: {
        primary: isDark ? '#E2E2E9' : '#191C20',
        secondary: isDark ? '#C4C6D0' : '#44474E',
      },
      divider: isDark ? '#44474E' : '#C4C6D0',
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: FONT_SANS,
      h1: { fontFamily: FONT_DISPLAY },
      h2: { fontFamily: FONT_DISPLAY },
      h3: { fontFamily: FONT_DISPLAY },
      h4: { fontFamily: FONT_DISPLAY },
      h5: { fontFamily: FONT_DISPLAY },
      h6: { fontFamily: FONT_DISPLAY },
    },
    components: {
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: isDark ? '#33353A' : '#E2E2E9',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            textTransform: 'none',
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
        },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
              backgroundColor: isDark ? '#33353A' : '#E2E2E9',
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
    },
  });
}
