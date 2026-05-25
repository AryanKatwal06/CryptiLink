import tokens from './tokens'

export const ThemeRegistry = {
  getColors: () => (tokens as any).colors || {},
  getSpacing: () => (tokens as any).spacing || {},
}

export default ThemeRegistry
