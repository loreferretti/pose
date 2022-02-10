function weightedDistanceMatching(poseA, poseB) {
  const count = poseA.keypoints.reduce((res, kpA) => {
    if (poseB.keypoints.find((kpB) => kpA.name === kpB.name)) {
      return res + 1;
    }
    return res;
  }, 0);
  if (count < poseA.keypoints.length / 2) {
    return Infinity;
  }
  const avgXA = poseA.keypoints.reduce((res, kpA) => res + kpA.x, 0) / poseA.keypoints.length.length || 0;
  const avgYA = poseA.keypoints.reduce((res, kpA) => res + kpA.y, 0) / poseA.keypoints.length.length || 0;
  const avgXB = poseB.keypoints.reduce((res, kpB) => res + kpB.x, 0) / poseB.keypoints.length || 0;
  const avgYB = poseB.keypoints.reduce((res, kpB) => res + kpB.y, 0) / poseB.keypoints.length || 0;

  return poseA.keypoints.reduce((res, kpA) => {
    const kpB = poseB.keypoints.find((kpB) => kpA.name === kpB.name);
    if (!kpB) {
      return res + kpA.score * 2; //2 è la distanza massima che si può raggiungere
    }
    return res + kpA.score * (Math.abs(kpA.x - avgXA - (kpB.x - avgXB)) + Math.abs(kpA.y - avgYA - (kpB.y - avgYB)));
  }, 0);
}

const VIDEO_WIDTH = 512;
const VIDEO_HEIGHT = 512;
const FRAME_RATE = 20;
const USE_IMAGE = false;

const drawPoint = ({ ctx, x, y, r }) => {
  ctx.beginPath();
  ctx.arc(x * VIDEO_WIDTH, y * VIDEO_HEIGHT, r, 0, 2 * Math.PI);
  ctx.fillStyle = "#000000";
  ctx.fill();
};
const drawSegment = ({ ctx, pointA, pointB, color, scale }) => {
  if (pointA && pointB) {
    ctx.beginPath();
    ctx.moveTo(pointA.x * scale * VIDEO_WIDTH, pointA.y * scale * VIDEO_WIDTH);
    ctx.lineTo(pointB.x * scale * VIDEO_WIDTH, pointB.y * scale * VIDEO_HEIGHT);
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
};

const drawKeypoints = ({ ctx, keypoints }) => {
  keypoints.forEach(({ x, y }) => {
    drawPoint({ ctx, x, y, r: 6 });
  });
};
const drawSkeleton = ({ ctx, keypoints }) => {
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
    drawSegment({
      ctx,
      pointA: keypoints.find(({ name }) => name === first),
      pointB: keypoints.find(({ name }) => name === second),
      color,
      scale: 1,
    });
  });
};

const addImageProcess = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

$(async () => {
  const video = $("#video").get(0);
  video.width = VIDEO_WIDTH;
  video.height = VIDEO_HEIGHT;
  const canvas = $("#canvas").get(0);
  canvas.width = VIDEO_WIDTH;
  canvas.height = VIDEO_HEIGHT;
  const webcam = new Webcam(video, "user");
  const ctx = canvas.getContext("2d");
  const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTING,
  });

  const img = await addImageProcess("../back-end/assets/16.jpg");
  await webcam.stream();

  const imagePoses = [
    {
      score: 0.7,
      keypoints: [
        {
          y: 0.3062269389629364,
          x: 0.504449188709259,
          score: 0.7027429342269897,
          name: "nose",
        },
        {
          y: 0.2922380566596985,
          x: 0.5168091058731079,
          score: 0.7404518127441406,
          name: "left_eye",
        },
        {
          y: 0.29420435428619385,
          x: 0.4906785786151886,
          score: 0.72865891456604,
          name: "right_eye",
        },
        {
          y: 0.2957649528980255,
          x: 0.5302802920341492,
          score: 0.6799468994140625,
          name: "left_ear",
        },
        {
          y: 0.3016800880432129,
          x: 0.47342240810394287,
          score: 0.7859954833984375,
          name: "right_ear",
        },
        {
          y: 0.34616392850875854,
          x: 0.5627409219741821,
          score: 0.8367493152618408,
          name: "left_shoulder",
        },
        {
          y: 0.3500824570655823,
          x: 0.4436020255088806,
          score: 0.8595637083053589,
          name: "right_shoulder",
        },
        {
          y: 0.2704964876174927,
          x: 0.619113564491272,
          score: 0.932282567024231,
          name: "left_elbow",
        },
        {
          y: 0.2686147093772888,
          x: 0.380423367023468,
          score: 0.8752314448356628,
          name: "right_elbow",
        },
        {
          y: 0.18335765600204468,
          x: 0.582643449306488,
          score: 0.8813289999961853,
          name: "left_wrist",
        },
        {
          y: 0.18383997678756714,
          x: 0.4065172076225281,
          score: 0.8114475607872009,
          name: "right_wrist",
        },
        {
          y: 0.550326943397522,
          x: 0.5428749322891235,
          score: 0.7955687642097473,
          name: "left_hip",
        },
        {
          y: 0.5508424639701843,
          x: 0.46621716022491455,
          score: 0.8097958564758301,
          name: "right_hip",
        },
        {
          y: 0.6831645965576172,
          x: 0.6225772500038147,
          score: 0.923366904258728,
          name: "left_knee",
        },
        {
          y: 0.6897925734519958,
          x: 0.3979915678501129,
          score: 0.8628276586532593,
          name: "right_knee",
        },
        {
          y: 0.8053678274154663,
          x: 0.6417670845985413,
          score: 0.8776750564575195,
          name: "left_ankle",
        },
        {
          y: 0.8178161382675171,
          x: 0.36935141682624817,
          score: 0.9401204586029053,
          name: "right_ankle",
        },
      ],
    },
  ];

  const normImagePoses = imagePoses.map(({ score, keypoints }) => ({
    score,
    keypoints: keypoints.map(({ x, y, score, name }) => ({
      x: (x * img.width) / img.width,
      y: (y * img.width - Math.abs(img.width - img.height) / 2) / img.height,
      score,
      name,
    })),
  }));

  let distance = Infinity;

  setInterval(async () => {
    const videoPoses = USE_IMAGE ? [] : await detector.estimatePoses(video);
    const normVideoPoses = videoPoses.map(({ score, keypoints }) => ({
      score,
      keypoints: keypoints
        .filter((kp) => kp.score > 0.3)
        .map(({ x, y, score, name }) => ({
          x: x / 620,
          y: y / 480,
          score,
          name,
        })),
    }));
    const poses = USE_IMAGE ? normImagePoses : normVideoPoses;
    const computedDistance = weightedDistanceMatching(normImagePoses[0], normVideoPoses[0]);
    distance = Math.min(distance, computedDistance);
    $("#score").text(`${distance} - ${computedDistance}`);
    ctx.clearRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
    ctx.save();
    ctx.drawImage(USE_IMAGE ? img : video, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
    ctx.restore();
    poses.forEach(({ keypoints }) => {
      drawKeypoints({ ctx, keypoints });
      drawSkeleton({ ctx, keypoints });
    });
  }, 1000 / FRAME_RATE);
});
