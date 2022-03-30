import { Config } from "./config.js";
import { getPicture } from "./fetchUtils.js";

export const createPoseDistanceFrom = (keypointsA = []) => {
  const [avgXA, avgYA] = keypointsA
    .reduce(([sumX, sumY], kpA) => [sumX + kpA.x, sumY + kpA.y], [0, 0])
    .map((sum) => sum / keypointsA.length);

  return (keypointsB = []) => {
    const count = keypointsA.reduce((res, kpA) => {
      if (keypointsB.find((kpB) => kpA.name === kpB.name)) {
        return res + 1;
      }
      return res;
    }, 0);
    if (count < keypointsA.length / 2) {
      return 1;
    }
    const [avgXB, avgYB] = keypointsB
      .reduce(([sumX, sumY], kpB) => [sumX + kpB.x, sumY + kpB.y], [0, 0])
      .map((res) => res / keypointsB.length);

    return Math.sqrt(
      keypointsA.reduce((res, kpA) => {
        const kpB = keypointsB.find((kpB) => kpA.name === kpB.name);
        if (!kpB) {
          return res + 1; //1 è la distanza massima che si può raggiungere
        }
        const relativeDistanceXA = kpA.x - avgXA;
        const relativeDistanceXB = kpB.x - avgXB;
        const relativeDistanceYA = kpA.y - avgYA;
        const relativeDistanceYB = kpB.y - avgYB;
        const spaceDistance =
          Math.abs(relativeDistanceXA - relativeDistanceXB) + Math.abs(relativeDistanceYA - relativeDistanceYB);

        return res + spaceDistance;
      }, 0) / keypointsA.length
    );
  };
};

export const createPoseCanvas = (canvas) => {
  canvas.width = Config.WIDTH;
  canvas.height = Config.HEIGHT;
  const ctx = canvas.getContext("2d");
  const drawPoint = ({ x, y, r, color = "white" }) => {
    ctx.beginPath();
    ctx.arc(x * canvas.width, y * canvas.width, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  };
  const drawSegment = ({ pointA, pointB, color = "white" }) => {
    if (pointA && pointB) {
      ctx.beginPath();
      ctx.moveTo(pointA.x * canvas.width, pointA.y * canvas.width);
      ctx.lineTo(pointB.x * canvas.width, pointB.y * canvas.width);
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.stroke();
    }
  };
  return {
    canvas,
    drawPoint,
    drawSegment,
    drawImage: (img) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    },
    drawSkeleton: ({ keypoints, color = "white" }) => {
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
      keypoints.forEach(({ x, y }) => {
        drawPoint({ x, y, r: 6 });
      });
      adjacentKeyPoints.forEach(([first, second]) => {
        drawSegment({
          pointA: keypoints.find(({ name }) => name === first),
          pointB: keypoints.find(({ name }) => name === second),
          color,
        });
      });
    },
  };
};

export const createImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.crossOrigin = "anonymous";
    img.src = src;
  });

export const normalizeKPs = (poses, width, height) =>
  (poses?.[0]?.keypoints || [])
    .filter((kp) => kp.score > 0.3)
    .map(({ x, y, score, name }) => ({
      x: x / width,
      y: y / height,
      score,
      name,
    }));

export const createPictureLoader = async (imgCanvas) => {
  const strongDetector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
  });

  return async (id) => {
    const picture = await getPicture(id);
    const imageSrc = picture.path;
    const img = await createImage(`${Config.SERVER_URL}${imageSrc}`);
    const imagePoses = await strongDetector.estimatePoses(img);
    const imageKPs = normalizeKPs(imagePoses, img.width, img.height);
    const imageKPNames = imageKPs.map((kp) => kp.name);
    imgCanvas.drawImage(img);
    if (Config.DEBUG) {
      imgCanvas.drawSkeleton({ keypoints: imageKPs });
    }
    const distanceFromImg = createPoseDistanceFrom(imageKPs);

    return {
      imageKPNames,
      distanceFromImg,
    };
  };
};

const queueGenerator = (size) => {
  let queue = [];
  return {
    queue,
    enqueue: (item) => {
      if (queue.length === size) {
        queue.splice(0, 1);
      }
      queue.push(item);
    },
    dequeue: () => {
      queue.splice(0, 1);
    },
    clear: () => {
      queue = [];
    },
  };
};

export const initGame = async (ids, video, camCanvas, imgCanvas) => {
  let round = 0;
  const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTING,
  });
  const pictureLoad = await createPictureLoader(imgCanvas);

  const userVideoList = [];

  const nextRound = async () => {
    const id = ids[round];
    const { imageKPNames, distanceFromImg } = await pictureLoad(id);
    let distance = 1;
    const mainDivElement = document.querySelector("#main");
    const imgQueue = queueGenerator(Config.FRAME_RATE);

    const gameLoop = setInterval(async () => {
      const videoPoses = await detector.estimatePoses(video);
      const videoKPs = normalizeKPs(videoPoses, 620, 480);
      const filteredVideoKPs = videoKPs.filter((kp) => imageKPNames.includes(kp.name));

      const computedDistance = distanceFromImg(filteredVideoKPs);
      distance = Math.min(distance, computedDistance);
      $("#score").text(`${id} - ${((1 - distance) * 100).toFixed(0)}% / ${((1 - computedDistance) * 100).toFixed(0)}%`);

      camCanvas.drawImage(video);
      if (Config.DEBUG) {
        camCanvas.drawSkeleton({ keypoints: filteredVideoKPs });
      }
      if (1 - computedDistance > Config.MATCH_LEVEL) {
        clearInterval(gameLoop);
        console.log("MATCH!");
        round++;
        userVideoList.push(imgQueue.queue);
        imgQueue.clear();
        if (round < ids.length) {
          await nextRound();
        } else {
          console.log(userVideoList);
          /* localStorage.setItem(Config.VIDEO_LIST, JSON.stringify(userVideoList)); */
          /* location.href = "end.html"; */
        }
      }
      const base64image = camCanvas.canvas.toDataURL("image/webp", 0.2);
      imgQueue.enqueue(base64image);

      /* html2canvas(mainDivElement, { allowTaint: true }).then((canvas) => {
        const base64image = canvas.toDataURL("image/png");
        imgQueue.enqueue(base64image);
      }); */
    }, 1000 / Config.FRAME_RATE);

    return gameLoop;
  };

  return nextRound();
};
