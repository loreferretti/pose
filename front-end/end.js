import { Config } from "./scripts/config.js";

$(() => {
  const userVideoList = localStorage.getItem(Config.VIDEO_LIST);
  console.log(userVideoList);
});
