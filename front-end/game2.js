import { createPoseCanvas, initGame2 } from "./scripts/utils.js";

$(async () => {
  const video = $("#video").get(0);
  const webcam = new Webcam(video, "user");
  await webcam.stream();
  const camCanvas1 = createPoseCanvas($("#camCanvas1").get(0));
  const camCanvas2 = createPoseCanvas($("#camCanvas2").get(0));
  const imgCanvas = createPoseCanvas($("#imgCanvas").get(0));

  const queryParams = new URLSearchParams(window.location.search);

  const levelId = queryParams.get("id");
  const nPose = queryParams.get("nPose");
  const nRound = queryParams.get("nRound");
  
  initGame2(levelId, nPose, nRound, video, camCanvas1, camCanvas2, imgCanvas);
});
  