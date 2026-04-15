export const themes = {
  azul: {
    primary: "218 75% 43%",
    sidebar: "218 75% 30%",
    accent: "218 75% 43%",
  },
  roxo: {
    primary: "270 80% 50%",
    sidebar: "270 80% 35%",
    accent: "270 80% 50%",
  },
  verde: {
    primary: "140 60% 40%",
    sidebar: "140 60% 30%",
    accent: "140 60% 40%",
  },
}

export function setTheme(themeName: keyof typeof themes) {
  const theme = themes[themeName]
  if (!theme) return

  const root = document.documentElement

  root.style.setProperty("--primary", theme.primary)
  root.style.setProperty("--sidebar-primary", theme.sidebar)
  root.style.setProperty("--accent", theme.accent)

  localStorage.setItem("theme", themeName)
}

/*
  Utilities to apply a custom hex color for the site (used by company settings).
  - hexToHsl: pure function (can be used server-side)
  - getThemeVarsFromHex: returns the CSS variable values derived from a hex color
  - applyHexTheme: client-side helper that applies vars to document and persists in localStorage
*/
export function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

export function getThemeVarsFromHex(hex: string) {
  const hsl = hexToHsl(hex)
  const [h, s, l] = hsl.split(' ').map((v, i) => (i === 0 ? parseFloat(v) : parseFloat(v.replace('%', ''))))

  const sidebarBgL = l > 50 ? Math.max(20, l - 30) : Math.max(15, l - 10)
  const sidebarBg = `${h} ${s}% ${sidebarBgL}%`

  const accentL = Math.max(10, sidebarBgL - 5)
  const sidebarAccent = `${h} ${s}% ${accentL}%`

  const sidebarFg = '0 0% 98%'
  const sidebarAccentFg = '0 0% 100%'

  return {
    '--primary': hsl,
    '--sidebar-primary': hsl,
    '--sidebar-background': sidebarBg,
    '--sidebar-foreground': sidebarFg,
    '--sidebar-accent': sidebarAccent,
    '--sidebar-accent-foreground': sidebarAccentFg,
    '--sidebar-primary-foreground': sidebarFg,
    '--sidebar-ring': hsl,
    '--sidebar-border': sidebarAccent,
    '--ring': hsl,
    '--chart-1': hsl,
  }
}

export function applyHexTheme(hex: string) {
  if (typeof document === 'undefined') return
  const vars = getThemeVarsFromHex(hex)
  const root = document.documentElement
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v as string))
  localStorage.setItem('cor_sistema', hex)
}