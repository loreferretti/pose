import { Config } from "./config.js";
import { getLevel, getPicture, postVideo } from "./fetchUtils.js";

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
        const spaceDistance = Math.sqrt(
          Math.pow(relativeDistanceXA - relativeDistanceXB, 2) + Math.pow(relativeDistanceYA - relativeDistanceYB, 2)
        );
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
    $("#artwork_label").text(picture.artwork_name+" - "+picture.author_name)
    const img = await createImage(`${Config.SERVER_URL}${picture.path}`);
    const imagePoses = await strongDetector.estimatePoses(img);
    const imageKPs = normalizeKPs(imagePoses, img.width, img.height);
    const imageKPNames = imageKPs.map((kp) => kp.name);
    imgCanvas.drawImage(img);

    if(img.width > img.height) {
      const aspRatio = img.width/img.height;
      $("#imgCanvas").css("transform","scale(1," + 1/aspRatio + ")");
    } else {
      const aspRatio = img.height/img.width;
      $("#imgCanvas").css("transform","scale(" + 1/aspRatio + ",1)");
    }

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
    isFull: () => queue.length === size,
  };
};

export const initGame = async (levelId, video, camCanvas, imgCanvas) => {
  const level = await getLevel(levelId);

  let round = 0;
  const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTING,
  });
  const pictureLoad = await createPictureLoader(imgCanvas);

  const userVideoList = [];
  let idRandom = level.picture_ids;
  let nPictures;
  if(idRandom.length < Config.MAX_PICTURES_SOLO){
    nPictures = idRandom.length;
  }else{
    nPictures = Config.MAX_PICTURES_SOLO;
  }
  console.log(nPictures);
  idRandom = idRandom.sort(() => Math.random() - 0.5)

  const nextRound = async () => {
    const id = idRandom[round];

    const { imageKPNames, distanceFromImg } = await pictureLoad(id);

    const imgQueue = queueGenerator(Config.VIDEO_SECONDS * Config.FRAME_RATE);

    const gameLoop = setInterval(async () => {
      $("#game-loading").remove();
      $("#main").show();
      const videoPoses = await detector.estimatePoses(video);
      const videoKPs = normalizeKPs(videoPoses, 620, 480);
      const filteredVideoKPs = videoKPs.filter((kp) => imageKPNames.includes(kp.name));

      const computedDistance = distanceFromImg(filteredVideoKPs);
      const computedDistancePercentage = Math.min(99, ((1 - computedDistance) / Config.MATCH_LEVEL) * 100).toFixed(0);

      $("#score").width(`${computedDistancePercentage}%`);
      $("#score").text(`${computedDistancePercentage}%`);

      camCanvas.drawImage(video);
      
      if(video.width > video.height) {
        const aspRatio = video.width/video.height;
        $("#camCanvas").css("transform","scale(1," + 1/aspRatio + ")");
      } else {
        const aspRatio = video.height/video.width;
        $("#camCanvas").css("transform","scale(" + 1/aspRatio + ",1)");
      }


      if (Config.DEBUG) {
        camCanvas.drawSkeleton({ keypoints: filteredVideoKPs });
      }
      if (imgQueue.isFull() && 1 - computedDistance > Config.MATCH_LEVEL) {
        clearInterval(gameLoop);
        console.log("MATCH!");
        round++;
        userVideoList.push({ id, frameList: imgQueue.queue });
        imgQueue.clear();
        if (round < nPictures) {
          await nextRound();
        } else {
          const formData = new FormData();
          level.picture_ids.forEach((pictureId) => {
            formData.append("picture_ids[]", pictureId);
          });
          userVideoList.forEach(({ id, frameList }) => {
            frameList.forEach((frame, j) => {
              formData.append(`frames_${id}[]`, frame, `frame_${id}_${j}.jpg`);
            });
          });
          try {
            const video = await postVideo(formData);
            location.href = `/end?id=${video.id}&player=solo`;
          } catch (e) {
            console.error(e);
            location.href = `/end?player=solo`;
          }
        }
      }
      const base64image = camCanvas.canvas.toDataURL("image/jpeg", 0.2);
      const response = await fetch(base64image);
      const imageBlob = await response.blob();
      imgQueue.enqueue(imageBlob);
    }, 1000 / Config.FRAME_RATE);

    return gameLoop;
  };

  return nextRound();
};

export const initGame2 = async (socket,roomId,picturesArray,nPose, nRound, video, camCanvas, imgCanvas) => {
  var first = true;
  let round = 0;
  let pose = 0;
  let roundResults = {time:0,pose:0};
  let gameResults = [];

  const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTING,
  });
  const pictureLoad = await createPictureLoader(imgCanvas);
  const userVideoList = [];

  alert("Round "+(round+1)+" begins!");

  const nextPose = async () => {
    const id = picturesArray[pose];

    const { imageKPNames, distanceFromImg } = await pictureLoad(id);

    const imgQueue = queueGenerator(Config.VIDEO_SECONDS * Config.FRAME_RATE);

    const gameLoop = setInterval(async () => {
      $("#game-loading").remove();
      $("#main").show();
      
      let next = false;
      const videoPoses = await detector.estimatePoses(video);
      const videoKPs = normalizeKPs(videoPoses, 620, 480);
      const filteredVideoKPs = videoKPs.filter((kp) => imageKPNames.includes(kp.name));

      const computedDistance = distanceFromImg(filteredVideoKPs);
      const computedDistancePercentage = Math.min(100, ((1 - computedDistance) / Config.MATCH_LEVEL) * 100).toFixed(0);

      $("#score").width(`${computedDistancePercentage}%`);
      $("#score").text(`${computedDistancePercentage}%`);

      camCanvas.drawImage(video);

      if(video.width > video.height) {
        const aspRatio = video.width/video.height;
        $("#camCanvas").css("transform","scale(1," + 1/aspRatio + ")");
      } else {
        const aspRatio = video.height/video.width;
        $("#camCanvas").css("transform","scale(" + 1/aspRatio + ",1)");
      }

      if (Config.DEBUG) {
        camCanvas.drawSkeleton({ keypoints: filteredVideoKPs });
      }
      if(first){
        resetTimer();
        startTimer();
        first = false;
      }
      if(imgQueue.isFull() && 1 - computedDistance > Config.MATCH_LEVEL){ 
        roundResults.pose++;
        roundResults.time += stringTimeToSeconds(document.getElementById("timer").innerHTML);
        next = true;
      }
      if(Config.TIME_LIMIT <= document.getElementById("timer").innerHTML){
        next = true;
        roundResults.time += stringTimeToSeconds(Config.TIME_LIMIT);
      }
      if (next) {
        resetTimer();
        clearInterval(gameLoop);
        pose++;
        userVideoList.push({ id, frameList: imgQueue.queue });
        imgQueue.clear();
        if (pose < nPose) {
          await nextPose();
        } else if(round >= nRound-1){
          gameResults.push(roundResults);
          
          const formData = new FormData();

          picturesArray.forEach((pictureId) => {
            formData.append("picture_ids[]", pictureId);
          });
          userVideoList.forEach(({ id, frameList }) => {
            frameList.forEach((frame, j) => {
              formData.append(`frames_${id}[]`, frame, `frame_${id}_${j}.jpg`);
            });
          });

          try {
            const video = await postVideo(formData);
            socket.emit("sendResults", roomId,gameResults);

            socket.on("results_received", (player) => {
              console.log("Results received");
              socket.emit("leave", roomId, false);

              socket.on("leave_message", (msg) => {
                console.log("message from room: " + msg);
                localStorage.setItem("retired","false");
                location.href = `/end?id=${video.id}&player=${player}`;
              });
            });
          } catch (e) {
            console.error(e);
            localStorage.setItem("retired","false");
            location.href = `/end?id=${video.id}&player=P1`;
          }
        }else{
          round++;
          pose = 0;
          gameResults.push(roundResults);
          roundResults = {time:0,pose:0};
          alert("Round "+(round+1)+" begins!"); //DA TOGLIERE?
          await nextPose();
        }
      }
      const base64image = camCanvas.canvas.toDataURL("image/jpeg", 0.2);
      const response = await fetch(base64image);
      const imageBlob = await response.blob();
      imgQueue.enqueue(imageBlob);
    }, 1000 / Config.FRAME_RATE);
    first = true;
    startTimer();
    return gameLoop;
  };

  return nextPose();
};

// Timer 
let startTime;
let elapsedTime = 0;
let timerInterval;

// Converte il tempo in formato di ore,minuti,secondi e millisecondi
function timeToString(time) {
  let diffInHrs = time / 3600000;
  let hh = Math.floor(diffInHrs);

  let diffInMin = (diffInHrs - hh) * 60;
  let mm = Math.floor(diffInMin);
  
  let diffInSec = (diffInMin - mm) * 60;
  let ss = Math.floor(diffInSec);
  
  let diffInMs = (diffInSec - ss) * 100;
  let ms = Math.floor(diffInMs);
  
  let formattedMM = mm.toString().padStart(2, "0");
  let formattedSS = ss.toString().padStart(2, "0");
  let formattedMS = ms.toString().padStart(2, "0");

  return `${formattedMM}:${formattedSS}:${formattedMS}`;
}

function stringTimeToSeconds(time){
  let fields = time.split(':');
  let seconds = parseFloat(fields[0]*60) + parseFloat(fields[1]) + parseFloat(fields[2]/100);
  return seconds;
}

function startTimer() {
  startTime = Date.now() - elapsedTime;
  timerInterval = setInterval(function printTime() {
      elapsedTime = Date.now() - startTime;
      document.getElementById("timer").innerHTML = timeToString(elapsedTime);
  }, 10);
}

function resetTimer() {
  elapsedTime = 0;
  clearInterval(timerInterval);
}

function stopTimer() {
  clearInterval(timerInterval);
}