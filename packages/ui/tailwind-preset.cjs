/**
 * Innova design tokens — preset Tailwind compartilhado por todas as apps
 */
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"DM Serif Display"', 'serif'],
      },
      colors: {
        ink: {
          900: '#0F0F19',
          700: '#3F3F50',
          500: '#71718A',
          300: '#B0B0C0',
        },
        accent: {
          50: '#EFEFFE',
          100: '#E0E0FD',
          300: '#A5A4F8',
          500: '#6364E0',
          600: '#4F50C9',
          700: '#3F40A8',
          900: '#1F1F66',
        },
        surface: {
          DEFAULT: '#F4F4F8',
          muted: '#FAFAFC',
        },
        ok: '#10B981',
        warn: '#F59E0B',
        danger: '#EF4444',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        soft: '0 1px 3px rgba(15,15,25,.04), 0 1px 2px rgba(15,15,25,.03)',
        card: '0 8px 30px rgba(99,100,224,.08)',
      },
      animation: {
        'fade-in': 'fadeIn .25s ease',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
    },
  },
};
