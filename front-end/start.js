import { getLevels } from "./scripts/fetchUtils.js";

$(async () => {
  if (!localStorage.getItem("ACCESS_TOKEN")) {
    location.href("/");
  }

  const players2 = $("#two-players");
  const levelList = await getLevels();
  const levelListEl = $("#level-list");

  players2.css("display","flex");

  levelList.forEach((levelItem) => {
    levelListEl.append(`
        <div class="card mb-3">
            <div class="card-body">
                <h2 class="card-title" >${levelItem.name}</h2>
                <h5 class="card-subtitle mb-2 text-muted">${levelItem.picture_ids.length} opere</h5>
                <p class="card-text">
                ${levelItem.description}
                </p>
                <a class="btn btn-primary btn-block play" id="play_" href="javascript:play(${levelItem.id},${levelItem.picture_ids.length})">GIOCA</a>
                <a class="btn btn-primary btn-block room" id="room_host" href="javascript:host(${levelItem.id},${levelItem.picture_ids.length})">HOST</a>
                <a class="btn btn-primary btn-block room" id="room_join" href="javascript:join(${levelItem.id},${levelItem.picture_ids.length})">JOIN</a>
                <form class="id_room">
                  <label for="room_id">ID Stanza: </label>
                  <input type="number" id="room_id" name="room_id">
                </form>
            </div>
        </div>
        <script>
          function play(level,n){
            document.getElementById("play_").href="game.html?id="+level.toString()+"&mode=solo";
            window.location=document.getElementById("play_").href;
          }

          function host(level,n){
            play2(level,n);
          }

          function join(level,n){
            play2(level,n);
          }

          function play2(level,n){
            const nPose = document.getElementById("Npose").value;
            const nRound = document.getElementById("rounds").value;
            if(nPose > n){
              alert("Selezionare un numero di pose da replicare minore del numero di opere della modalità selezionata");
            }else{
              document.getElementById("room_host").href="game.html?id="+level.toString()+"&nPose="+nPose.toString()+"&nRound="+nRound.toString()+"&mode=versus";
              window.location=document.getElementById("room_host").href;
            }
          }
        </script>
    `);
  });
});

//document.getElementById("play_").href="game2.html?id="+level.toString()+"&nPose="+nPose.toString()+"&nRound="+nRound.toString();

window.onload = function() {
  const checkbox = document.getElementById('show');
  const form = document.getElementById('form');
  const Npose = document.getElementById('Npose');
  checkbox.checked = false;

  checkbox.addEventListener('click', function handleClick() {
  if (checkbox.checked) {
      form.style.display = 'block';
      var play = document.getElementsByClassName("play");
      var room = document.getElementsByClassName("room");
      var id = document.getElementsByClassName("id_room");
      for (var i=0; i<play.length; i++) {
        play[i].style.display = 'none';
      }
      for (var i=0; i<room.length; i++) {
        room[i].style.display = 'block';
      }
      for (var i=0; i<id.length; i++) {
        id[i].style.display = 'block';
      }
  } else {
      form.style.display = 'none';
      var play = document.getElementsByClassName("play");
      var room = document.getElementsByClassName("room");
      var id = document.getElementsByClassName("id_room");
      for (var i=0; i<play.length; i++) {
        play[i].style.display = 'block';
      }
      for (var i=0; i<room.length; i++) {
        room[i].style.display = 'none';
      }
      for (var i=0; i<id.length; i++) {
        id[i].style.display = 'none';
      }
  }
  });
};