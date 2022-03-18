import { createPoseCanvas, initGame } from "./utils.js";

$(async () => {
  const video = $("#video").get(0);
  const webcam = new Webcam(video, "user");
  await webcam.stream();
  const camCanvas = createPoseCanvas($("#camCanvas").get(0));
  const imgCanvas = createPoseCanvas($("#imgCanvas").get(0));

  let ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  initGame(ids, video, camCanvas, imgCanvas);
});
