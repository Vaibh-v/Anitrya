export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0D12",
        panel: "#11141B",
        border: "#1E2430",
        text: "#E6EAF2",
        muted: "#9AA4B2",
        accent: "#5B8CFF",
        success: "#2ECC71",
        warning: "#F39C12",
        danger: "#E74C3C"
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px"
      }
    }
  },
  plugins: []
};