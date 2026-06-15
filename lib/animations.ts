// Animation class names for smooth transitions
export const animations = {
  fadeIn: 'animate-in fade-in duration-300',
  fadeInUp: 'animate-in fade-in slide-in-from-bottom-4 duration-500',
  fadeInDown: 'animate-in fade-in slide-in-from-top-4 duration-500',
  slideInRight: 'animate-in slide-in-from-right-4 duration-500',
  slideInLeft: 'animate-in slide-in-from-left-4 duration-500',
  zoomIn: 'animate-in zoom-in-50 duration-300',
  scaleIn: 'animate-in zoom-in-95 duration-300',
  pulse: 'animate-pulse',
}

// Transition utilities for smooth state changes
export const transitions = {
  smooth: 'transition-all duration-200 ease-out',
  smoothDelayed: 'transition-all duration-300 ease-out',
  smoothSlow: 'transition-all duration-500 ease-out',
  transform: 'transition-transform duration-200 ease-out',
  opacity: 'transition-opacity duration-200 ease-out',
  colors: 'transition-colors duration-200 ease-out',
}

// Hover states for interactive elements
export const hoverStates = {
  lift: 'hover:shadow-lg hover:scale-105 hover:-translate-y-1',
  subtle: 'hover:shadow-md hover:scale-102',
  glow: 'hover:shadow-lg hover:shadow-primary/30',
  brighten: 'hover:brightness-110',
}

// Focus states for accessibility
export const focusStates = {
  outline: 'focus:outline-2 focus:outline-offset-2 focus:outline-primary',
  ring: 'focus:ring-2 focus:ring-offset-2 focus:ring-primary',
}
