/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		"./src/**/*.{js,ts,jsx,tsx}",
		"../src/**/*.{js,ts,jsx,tsx}",
		"./testbed/src/**/*.{js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			colors: {
				primary: "var(--primary)",
				background: "var(--background)",
				text: "var(--text)",
				border: "var(--border)",
			},
		},
	},
	plugins: [],
};
