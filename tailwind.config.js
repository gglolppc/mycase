module.exports = {
  content: [
    "./app/templates/**/*.html",
    "./app/static/js/**/*.js",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        accent: "#6366F1",
        "bg-light": "#F8FAFC",
        glass: "rgba(255, 255, 255, 0.75)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
