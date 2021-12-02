// poseVector1 and poseVector2 are 52-float vectors composed of:
// Values 0-33: are x,y coordinates for 17 body parts in alphabetical order
// Values 34-51: are confidence values for each of the 17 body parts in alphabetical order
// Value 51: A sum of all the confidence values
// Again the lower the number, the closer the distance

function weightedDistanceMatching(poseA, poseB) {
  /* let vector1PoseXY = poseVector1.slice(0, 34);
  let vector1Confidences = poseVector1.slice(34, 51);
  let vector1ConfidenceSum = poseVector1.slice(51, 52);

  let vector2PoseXY = poseVector2.slice(0, 34);
 */
  // First summation
  //let summation1 = 1 / vector1ConfidenceSum;

  // Second summation
  /* let summation2 = 0;
  for (let i = 0; i < vector1PoseXY.length; i++) {
    let tempConf = Math.floor(i / 2);
    let tempSum = vector1Confidences[tempConf] * Math.abs(vector1PoseXY[i] - vector2PoseXY[i]);
    summation2 = summation2 + tempSum;
  } */
  const summation1 = 1 / poseA.score;
  const summation2 = poseA.keypoints.reduce((res, val, idx) => res + val.score * (Math.abs(val.x - poseB.keypoints[idx].x) + Math.abs(val.y - poseB.keypoints[idx].y)), 0);

  return summation1 * summation2;
}

const setup = async () => {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const VIDEO_WIDTH = 640;
  const VIDEO_HEIGHT = 480;
  const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTING,
  });
  const video = $("#video").get(0);
  function drawPoint(y, x, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = "#000000";
    ctx.fill();
  }
  function drawKeypoints(keypoints) {
    for (let i = 0; i < keypoints.length; i++) {
      const keypoint = keypoints[i];
      console.log(`keypoint in drawkeypoints ${keypoint}`);
      const { y, x } = keypoint;
      drawPoint(y, x, 6);
    }
  }
  function drawSegment(pair1, pair2, color, scale) {
    ctx.beginPath();
    ctx.moveTo(pair1.x * scale, pair1.y * scale);
    ctx.lineTo(pair2.x * scale, pair2.y * scale);
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  function drawSkeleton(keypoints) {
    const color = "#8f00ff";
    const adjacentKeyPoints = [
      ["nose", "left_eye"],
      ["nose", "right_eye"],
      ["left_eye", "left_ear"],
      ["right_eye", "right_ear"],
      ["left_shoulder", "right_shoulder"],
      ["left_shoulder", "left_elbow"],
      ["left_elbow", "left_wrist"],
      ["right_shoulder", "right_elbow"],
      ["right_elbow", "right_wrist"],
      ["left_shoulder", "left_hip"],
      ["right_shoulder", "right_hip"],
      ["left_hip", "right_hip"],
      ["left_hip", "left_knee"],
      ["left_knee", "left_ankle"],
      ["right_hip", "right_knee"],
      ["right_knee", "right_ankle"],
    ];

    adjacentKeyPoints.forEach(([first, second]) => {
      drawSegment(
        keypoints.find(({ name }) => name === first),
        keypoints.find(({ name }) => name === second),
        color,
        1
      );
    });
  }

  const webcam = new Webcam(video, "user");
  webcam
    .start()
    .then((result) => {
      console.log("webcam started");
    })
    .catch((err) => {
      console.log(err);
    });
  setInterval(async () => {
    const poses = await detector.estimatePoses(video);
    console.log("poses", poses);
    canvas.width = VIDEO_WIDTH;
    canvas.height = VIDEO_HEIGHT;
    ctx.clearRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
    ctx.save();
    ctx.drawImage(video, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
    ctx.restore();
    poses.forEach(({ score, keypoints }) => {
      const filteredKeypoints = keypoints.filter(({ score }) => score > 0.3);
      drawKeypoints(filteredKeypoints);
      drawSkeleton(filteredKeypoints);
    });
  }, 1000 / 20);
};

$(setup);
