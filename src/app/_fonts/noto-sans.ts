import localFont from "next/font/local";

const notoSans = localFont({
  src: "./noto-sans/variable.woff2",
  variable: "--font-noto-sans",
  weight: "400 700",
  display: "swap",
});

export default notoSans;
