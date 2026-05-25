import { colors, spacing } from './tokens'

export const ThemeRegistry = {
  getColors: () => colors || {},
  getSpacing: () => spacing || {},
}

export default ThemeRegistry
