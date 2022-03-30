import { getLevel } from "./scripts/fetchUtils.js";
import { createPoseCanvas, initGame } from "./scripts/utils.js";

$(async () => {
  const video = $("#video").get(0);
  const webcam = new Webcam(video, "user");
  await webcam.stream();
  const camCanvas = createPoseCanvas($("#camCanvas").get(0));
  const imgCanvas = createPoseCanvas($("#imgCanvas").get(0));

  const queryParams = new URLSearchParams(window.location.search);

  const levelId = queryParams.get("id");

  const level = await getLevel(levelId);

  initGame(level.picture_ids, video, camCanvas, imgCanvas);
});
