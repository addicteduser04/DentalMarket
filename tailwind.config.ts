import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: { colors: { ink: "#17211d", cream: "#f6f4ed", sage: "#47705d", mint: "#d9eee3", coral: "#e8734f" } } },
  plugins: []
} satisfies Config;
