import { BrowserWindow } from "electrobun/bun";

const isProduction = Bun.env.NODE_ENV === "production";
const url = isProduction ? "views://main/index.html" : "http://localhost:1420";

new BrowserWindow({
  title: "gametau electrobun counter",
  url,
});
