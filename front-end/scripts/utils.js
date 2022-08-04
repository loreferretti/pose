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
    /*drawImage2: (img, sx, sy, sWidth, sHeight) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    },*/
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
    const img = await createImage(`${Config.SERVER_URL}${picture.path}`);
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
    isFull: () => queue.length === size,
  };
};

export const initGame = async (levelId, video, camCanvas, imgCanvas) => {
  $("#main").hide();
  const level = await getLevel(levelId);

  let round = 0;
  const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTING,
  });
  const pictureLoad = await createPictureLoader(imgCanvas);

  const userVideoList = [];

  const nextRound = async () => {
    const id = level.picture_ids[round];

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
      if (Config.DEBUG) {
        camCanvas.drawSkeleton({ keypoints: filteredVideoKPs });
      }
      if (imgQueue.isFull() && 1 - computedDistance > Config.MATCH_LEVEL) {
        clearInterval(gameLoop);
        console.log("MATCH!");
        round++;
        userVideoList.push({ id, frameList: imgQueue.queue });
        imgQueue.clear();
        if (round < level.picture_ids.length) {
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
            location.href = `end.html?id=${video.id}`;
          } catch (e) {
            console.error(e);
            location.href = `end.html`;
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

export const initGame2 = async (levelId, nPose, nRound, video, camCanvas1, camCanvas2, imgCanvas) => {
  $("#main").hide();
  const level = await getLevel(levelId);

  let pose = 0;
  let round = 0;
  let posePR1 = 0,posePR2 = 0,poseP1 = 0,roundP1 = 0,poseP2 = 0,roundP2 = 0,timeP1 = 0,timeP2 = 0;
  const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTING,
  });
  const pictureLoad = await createPictureLoader(imgCanvas);

  const userVideoList = [];
  alert("Round "+(round+1)+" begins!"); //DA TOGLIERE?
  const nextPose = async () => {
    const id = level.picture_ids[pose];

    const { imageKPNames, distanceFromImg } = await pictureLoad(id);

    const imgQueue = queueGenerator(Config.VIDEO_SECONDS * Config.FRAME_RATE);

    const gameLoop = setInterval(async () => {
      $("#game-loading").remove();
      $("#main").show();
      let videoPoses1,videoPoses2;
      let videoKPs1,videoKPs2;
      let filteredVideoKPs1,filteredVideoKPs2;
      let computedDistance1,computedDistance2;
      let computedDistancePercentage1,computedDistancePercentage2;
      let img = new Image(); // DA SOSTITUIRE CON IL VIDEO DEL PLAYER 2
      img.src = '../assets/sfondo.png';
      let next = false;
      
      if(!match1){
        videoPoses1 = await detector.estimatePoses(video);
        videoKPs1 = normalizeKPs(videoPoses1, 620, 480);
        filteredVideoKPs1 = videoKPs1.filter((kp) => imageKPNames.includes(kp.name));
        computedDistance1 = distanceFromImg(filteredVideoKPs1);
        computedDistancePercentage1 = Math.min(100, ((1 - computedDistance1) / Config.MATCH_LEVEL) * 100).toFixed(0);
        $("#score1").width(`${computedDistancePercentage1}%`);
        $("#score1").text(`${computedDistancePercentage1}%`);
      }
      if(!match2){
        videoPoses2 = await detector.estimatePoses(img);
        videoKPs2 = normalizeKPs(videoPoses2, 620, 480);
        filteredVideoKPs2 = videoKPs2.filter((kp) => imageKPNames.includes(kp.name));
        computedDistance2 = distanceFromImg(filteredVideoKPs2);
        computedDistancePercentage2 = Math.min(100, ((1 - computedDistance2) / Config.MATCH_LEVEL) * 100).toFixed(0);
        $("#score2").width(`${computedDistancePercentage2}%`);
        $("#score2").text(`${computedDistancePercentage2}%`);
      }

      //camCanvas1.drawImage2(video,video.videoWidth/2,0,video.videoWidth/2,video.videoHeight);
      //camCanvas2.drawImage2(video,0,0,video.videoWidth/2,video.videoHeight);
      camCanvas1.drawImage(video);
      camCanvas2.drawImage(img);
      if (Config.DEBUG) {
        if(!match1){
          camCanvas1.drawSkeleton({ keypoints: filteredVideoKPs1 });
        }
        if(!match2){
          camCanvas2.drawSkeleton({ keypoints: filteredVideoKPs2 });
        }
      }

      if(imgQueue.isFull() && 1 - computedDistance1 > Config.MATCH_LEVEL && !match1){ 
        match1 = true;
        poseP1++;
        timeP1 += stringTimeToSeconds(document.getElementById("timer1").innerHTML);
      }
      if(imgQueue.isFull() && 1 - computedDistance2 > Config.MATCH_LEVEL && !match2){ 
        match2 = true;
        poseP2++;
        timeP2 += stringTimeToSeconds(document.getElementById("timer2").innerHTML);
      }
      if ((Config.TIME_LIMIT <= document.getElementById("timer1").innerHTML || Config.TIME_LIMIT <= document.getElementById("timer2").innerHTML) || (match1 && match2)){
        next = true;
        if(!match1){
          timeP1 += stringTimeToSeconds(Config.TIME_LIMIT);
        }
        if(!match2){
          timeP2 += stringTimeToSeconds(Config.TIME_LIMIT);
        }
      }
      
      if(next){
        resetTimer();
        clearInterval(gameLoop);
        pose++;
        userVideoList.push({ id, frameList: imgQueue.queue });
        imgQueue.clear();
        if (pose < nPose) {
          await nextPose();
        } else if(round >= nRound-1){
          if(poseP1>poseP2){
            roundP1++;
          }else if(poseP2>poseP1){
            roundP2++;
          }
          posePR1 += poseP1;
          posePR2 += poseP2;
          console.log("RoundP1: "+roundP1+", RoundP2: "+roundP2);
          console.log("TimeP1: "+timeP1+", TimeP2: "+timeP2);
          let winner = victory(posePR1,posePR2,roundP1,roundP2,timeP1,timeP2);
          console.log("Winner: "+winner);

          const formData = new FormData();

          formData.append("nRound", nRound+1);

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
            location.href = `end.html?id=${video.id}&winner=${winner}`;
          } catch (e) {
            console.error(e);
            location.href = `end.html?winner=${winner}`;
          }
        }else{
          round++;
          pose = 0;
          if(poseP1>poseP2){
            roundP1++;
          }else if(poseP2>poseP1){
            roundP2++;
          }
          posePR1 += poseP1;
          posePR2 += poseP2;
          poseP1=0;
          poseP2=0;
          console.log("RoundP1: "+roundP1+", RoundP2: "+roundP2);
          console.log("TimeP1: "+timeP1+", TimeP2: "+timeP2);
          alert("Round "+(round+1)+" begins!"); //DA TOGLIERE?
          await nextPose();
        }
      }
      const base64image = camCanvas1.canvas.toDataURL("image/jpeg", 0.2);
      const response = await fetch(base64image);
      const imageBlob = await response.blob();
      imgQueue.enqueue(imageBlob);
    }, 1000 / Config.FRAME_RATE);
    startTimer();
    return gameLoop;
  };

  return nextPose();
};

// Timer 
let startTime;
let elapsedTime = 0;
let timerInterval;
let match1,match2;

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
  match1 = false;
  match2 = false;
  timerInterval = setInterval(function printTime() {
      elapsedTime = Date.now() - startTime;
      if(!match1){
        document.getElementById("timer1").innerHTML = timeToString(elapsedTime);
      }
      if(!match2){
        document.getElementById("timer2").innerHTML = timeToString(elapsedTime);
      }
  }, 10);
}

function resetTimer() {
  elapsedTime = 0;
  clearInterval(timerInterval);
}

function stopTimer() {
  clearInterval(timerInterval);
}

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