import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                // As per `geist` font documentation for Tailwind CSS
                sans: ['var(--font-geist-sans)'],
                mono: ['var(--font-geist-mono)'],
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
    ],
};
export default config;