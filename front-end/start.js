var socket;

function play(level, n) {
    document.getElementById("play_").href = "game.html?id=" + level.toString() + "&mode=solo";
    window.location = document.getElementById("play_").href;
}

function host(level, n, action) {
    const nPose = document.getElementById("Npose").value;
    const nRound = document.getElementById("rounds").value;

    if (action != 1 && nPose > n) {
        alert("Selezionare un numero di pose da replicare minore del numero di opere della modalità selezionata");
        return;
    }

    document.getElementById("show").disabled = true;
    document.getElementById("form_game").disabled = true;
    var room = document.getElementsByClassName("room");
    var id = document.getElementsByClassName("form_room_id");

    for (var i=0; i<room.length; i++) {
        room[i].removeAttribute("href");
    }
    for (var i=0; i<id.length; i++) {
        id[i].disabled = true;
    }

    var access_token = localStorage.getItem("ACCESS_TOKEN");
    if (action == 1) {
        logout();
        return;
    }

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

        socket.emit("join",room.id);
        
        socket.on("room_message", (msg) => {
            console.log("message from room: " + msg);
        });

        socket.on("message", (msg) => {
            console.log("message from server: " + msg);

        });

        socket.on("play", (msg) => {
            console.log("PLAY!");
            play2(level, n, nPose, nRound);
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
                socket.emit("leave",parseInt(document.getElementById("room_id").value));
                location.href = `index.html`;
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
}

function join(level, n) {
    var access_token = localStorage.getItem("ACCESS_TOKEN");

    if(document.getElementById("room_id").value == ""){
        alert("Inserire id room prima di fare il join");
    }else{

        socket = io.connect('https://strikeapose.it/', {
            extraHeaders: {
                Authorization: `Bearer ${access_token}`
            }
        });

        var success = function (room) {
            document.getElementById("Npose").value = room[0].toString();
            document.getElementById("rounds").value = room[1].toString();

            socket.on("status", (status) => {
                console.log("status: " + status.data);
            });

            socket.emit("join",parseInt(document.getElementById("room_id").value));
            
            socket.on("room_message", (msg) => {
                console.log("message from room: " + msg);
            });

            socket.on("message", (msg) => {
                alert(msg);
                console.log("message from server: " + msg);
            });

            socket.on("play", (msg) => {
                console.log(msg);
                play2(level, n, document.getElementById("Npose").value, document.getElementById("rounds").value);
            });
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
                    socket.emit("leave",parseInt(document.getElementById("room_id").value));
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
            data: JSON.stringify({ "room_id": parseInt(document.getElementById("room_id").value)}),
            dataType: "json",
            success: success,
            error: function (xhr, status, error) {
                console.log(error);
            }
        });
    }
}

function play2(level, n, nPose, nRound) {
    document.getElementById("room_host").href = "game.html?id=" + level.toString() + "&nPose=" + nPose.toString() + "&nRound=" + nRound.toString() + "&mode=versus";
    window.location = document.getElementById("room_host").href;
}