import localFont from "next/font/local";

const notoSansJp = localFont({
  src: "./noto-sans-jp/variable.woff2",
  variable: "--font-noto-sans-jp",
  weight: "400 900",
  display: "swap",
  preload: false,
});

export default notoSansJp;
