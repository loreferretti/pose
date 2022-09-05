import { createPoseCanvas, initGame, initGame2 } from "./scripts/utils.js";

$(async () => {
  const video = $("#video").get(0);
  const webcam = new Webcam(video, "user");
  await webcam.stream();
  const camCanvas = createPoseCanvas($("#camCanvas").get(0));
  const imgCanvas = createPoseCanvas($("#imgCanvas").get(0));

  const queryParams = new URLSearchParams(window.location.search);

  const levelId = queryParams.get("id");
  const gameMode = queryParams.get("mode");

  if(gameMode.normalize() === "solo"){
    initGame(levelId, video, camCanvas, imgCanvas);
  }else if(gameMode.normalize() === "versus"){
    var socket = io.connect('https://strikeapose.it/');
    var roomId = localStorage.getItem("roomId");
    socket.emit("join", roomId);

    socket.on("room_message", (msg) => {
      console.log("message from room: " + msg);
    });
    
    const nPose = queryParams.get("nPose");
    const nRound = queryParams.get("nRound");
    document.getElementById("timer").display = "flex";

    initGame2(socket,roomId,levelId, nPose, nRound, video, camCanvas,imgCanvas);
  }
});
