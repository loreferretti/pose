import { Config } from "./scripts/config.js";
import { getVideo } from "./scripts/fetchUtils.js";

$(async () => {
  const queryParams = new URLSearchParams(window.location.search);
  
  const winner = queryParams.get("winner");
  const endImg = document.getElementById("victoryImg");
  const endText = document.getElementById("final_title");
  if(winner.normalize() === "TIE".normalize()){
    endImg.src = "assets/tie.png";
    endText.innerHTML = "Pareggio!"
  }else if(winner.normalize() === "P1".normalize()){
    endImg.src = "assets/winner.gif";
    endText.innerHTML = "Congratulazioni, hai vinto!";
  }else if(winner.normalize() === "P2".normalize()){
    endImg.src = "assets/loser.gif";
    endText.innerHTML = "Hai perso!";
  }

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
