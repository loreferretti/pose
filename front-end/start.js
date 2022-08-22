var socket;

function play(level, n) {
    document.getElementById("play_").href = "game.html?id=" + level.toString() + "&mode=solo";
    window.location = document.getElementById("play_").href;
}

function host(level, n, action) {
    var access_token = localStorage.getItem("ACCESS_TOKEN");
    if (action == 1) {
        logout();
        return;
    }

    const nPose = document.getElementById("Npose").value;
    const nRound = document.getElementById("rounds").value;

    data = { "n_round": nRound, "n_pose": nPose };
    socket = io.connect('https://strikeapose.it/', {
        extraHeaders: {
            Authorization: `Bearer ${access_token}`
        }
    });

    var success = function (room) {
        console.log(room)

        socket.on("status", (status) => {
            console.log("status: " + status.data);
        });

        socket.emit("join");

        socket.on("room_message", (msg) => {
            console.log("message from room: " + msg);
        });

        socket.on("message", (msg) => {
            console.log("message from server: " + msg);

        });
        document.getElementById("room_id").value = room.id;
    }

    function logout() {
        $.ajax({
            url: "https://strikeapose.it/api/v1/logout",
            type: "post",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${access_token}`
            },
            success: (data) => {
                console.log(data);
                socket.emit("leave");
                //location.href = "/"
            },
            error: function (xhr, status, error) {
                console.log(error);
            }
        });

    }

    $.ajax({
        url: "https://strikeapose.it/api/v1/join/room",
        type: "post",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access_token}`
        },
        data: JSON.stringify(data),
        dataType: "json",
        success: success,
        error: function (xhr, status, error) {
            console.log(error);
        }
    });
    //play2(level,n,nPose,nRound);
}

function join(level, n) {
    play2(level, n);
}

function play2(level, n, nPose, nRound) {
    if (nPose > n) {
        alert("Selezionare un numero di pose da replicare minore del numero di opere della modalità selezionata");
    } else {
        document.getElementById("room_host").href = "game.html?id=" + level.toString() + "&nPose=" + nPose.toString() + "&nRound=" + nRound.toString() + "&mode=versus";
        window.location = document.getElementById("room_host").href;
    }
}