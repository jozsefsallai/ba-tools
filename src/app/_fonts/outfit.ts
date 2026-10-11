import localFont from "next/font/local";

const outfit = localFont({
  src: "./outfit/variable.woff2",
  variable: "--font-outfit",
  weight: "400 900",
  display: "swap",
});

export default outfit;
