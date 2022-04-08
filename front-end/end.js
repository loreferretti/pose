import { Config } from "./scripts/config.js";
import { getVideo } from "./scripts/fetchUtils.js";

$(async () => {
  const queryParams = new URLSearchParams(window.location.search);

  const videoId = queryParams.get("id");
  if (!videoId) {
    return;
  }

  const video = await getVideo(videoId);

  const downloadVideoEl = $("button#video_download");
  downloadVideoEl.click(() => {
    fetch(`${Config.SERVER_URL}${video.path}`)
      .then((response) => response.blob())
      .then((blob) => {
        const blobURL = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobURL;
        a.style = "display: none";
        a.download = "strike_a_pose.mp4";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
  });
});
