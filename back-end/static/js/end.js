import { Config } from "./scripts/config.js";
import { getVideo } from "./scripts/fetchUtils.js";

$(async () => {
  const queryParams = new URLSearchParams(window.location.search);
  
  const player = queryParams.get("player");
  const endImg = document.getElementById("victoryImg");
  const endText = document.getElementById("final_title");
  var myResults;
  var opponentResults;

  if(player.normalize() === "solo".normalize()){
    endImg.src = "/static/assets/winner.gif";
    endText.innerHTML = "Congratulazioni, hai vinto!";
  }else{
    endImg.src = "/static/assets/loadWinner.gif";
    endText.innerHTML = "In attesa dell'altro giocatore...";

    var socket = io.connect('https://strikeapose.it/');
    var roomId = localStorage.getItem("roomId");
    socket.emit("join", roomId);
    socket.emit("acquireResults", roomId);

    socket.on("room_message", (msg) => {
      console.log("message from room: " + msg);
    });
    
    socket.on("getResults", (msg) => {
      if(player.normalize() === "1"){
        myResults = msg[0];
        opponentResults = msg[1];
      }else if(player.normalize() === "2"){
        myResults = msg[1];
        opponentResults = msg[0];
      }
      
      let roundP1=0,roundP2=0,posePR1=0,posePR2=0,timeP1=0,timeP2=0;
      let nRound = myResults.length;
      for(let i=0;i<nRound;i++){
        posePR1 += myResults[i].pose;
        posePR2 += opponentResults[i].pose;
        timeP1 += myResults[i].time;
        timeP2 += opponentResults[i].time; 
        if(myResults[i].pose>opponentResults[i].pose){
          roundP1++;
        }else if(myResults[i].pose<opponentResults[i].pose){
          roundP2++;
        }
      }

      let winner = victory(posePR1,posePR2,roundP1,roundP2,timeP1,timeP2);

      if(winner.normalize() === "TIE".normalize()){
        endImg.src = "/static/assets/tie.png";
        endText.innerHTML = "Pareggio!"
      }else if(winner.normalize() === "P1".normalize()){
        endImg.src = "/static/assets/winner.gif";
        endText.innerHTML = "Congratulazioni, hai vinto!";
      }else if(winner.normalize() === "P2".normalize()){
        endImg.src = "static/assets/loser.gif";
        endText.innerHTML = "Hai perso!";
      }
    });
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



function victory(posePR1,posePR2,roundP1,roundP2,timeP1,timeP2){
  let who = "TIE";
  let pointsPose = 5,pointsRound = 10,pointsTime = 0.7;
  let pointsP1 = pointsPose*posePR1 + pointsRound*roundP1 + pointsTime * timeP1;
  let pointsP2 = pointsPose*posePR2 + pointsRound*roundP2 + pointsTime * timeP2;
  if(pointsP1 > pointsP2){
    who = "P1";
  }else if(pointsP2 > pointsP1){
    who = "P2";
  }
  return who;
}
