import { setRoomAttr, getRoom } from "./scripts/fetchUtils.js";

var socket;
var roomId;

window.play = function (attrs) {
    const level = attrs[1];
    const n = attrs[2];

    $(() => {
        const roomId = $("#room-id").val();
        if (roomId != "Room ID: ") {
            host(attrs);
        } else {
            window.location = `/game?id=${level.toString()}&mode=solo`;
        }
    });
}

async function host(attrs) {
    roomId = attrs[0];
    const level = attrs[1];
    const n = attrs[2];

    const resp = await setRoomAttr(roomId, level, n);
    console.log(resp)

    const data = await getRoom(roomId);
    const nRound = data.n_round;
    const nPose = data.n_pose;
    if (nPose > n) {
        alert("Selezionare un numero di pose da replicare minore del numero di opere della modalità selezionata");
        return;
    }

    $("#fade").addClass("fade-me");
    $("#fade").show();
    
    socket = io.connect('https://strikeapose.it/');

    socket.on("status", (status) => {
        console.log("status: " + status.data);
    });

    socket.emit("join", roomId);

    socket.on("room_message", (msg) => {
        console.log("message from room: " + msg);
    });

    socket.on("message", (msg) => {
        console.log("message from server: " + msg);
    });

    socket.on("disconnect", () => {
        console.log("disconnect");
    });

    socket.on("play", () => {
        $("#fade").hide();
        console.log("PLAY!");
        play2(level, n, nPose, nRound);
    });
}

window.playButtons = function(attr) {
    $("button.play").attr("disabled", attr);
}

window.join = async function() {
    roomId = $("#room-join-id").val();

    const resp = await getRoom(roomId);
    console.log(resp)
    
    socket = io.connect('https://strikeapose.it/');

    socket.on("status", (status) => {
        console.log("status: " + status.data);
    });

    socket.emit("join", roomId);

    socket.on("room_message", (msg) => {
        console.log("message from room: " + msg);
    });

    socket.on("message", (msg) => {
        console.log("message from server: " + msg);

    });

    socket.on("play", (msg) => {
        console.log(msg);
        play2(resp.level, resp.n, resp.n_pose, resp.n_round);
    });
}

function play2(level, n, nPose, nRound) {
    localStorage.setItem("roomId",roomId);
    socket.emit("leave", roomId);

    socket.on("leave_message", (msg) => {
        console.log("message from room: " + msg);
        window.location = `/game?id=${level.toString()}&nPose=${nPose.toString()}&nRound=${nRound.toString()}&mode=versus`;
    });
}

window.logout = function() {
    if(socket != undefined) {
        socket.emit("leave", roomId);

        socket.on("leave_message", (msg) => {
            console.log("message from room: " + msg);
        });
    }
    Cookies.remove("containerHost", { path: '' })
    Cookies.remove("containerJoin", { path: '' })
    Cookies.remove("formHost", { path: '' })
    Cookies.remove("formJoin", { path: '' })
    Cookies.remove("checkbox", { path: '' })
    window.location = "/logout";
}