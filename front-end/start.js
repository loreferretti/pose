import { getLevels } from "./scripts/fetchUtils.js";

$(async () => {
  if (!localStorage.getItem("ACCESS_TOKEN")) {
    location.href("/");
  }

  const levelList = await getLevels();
  const levelListEl = $("#level-list");
  levelList.forEach((levelItem) => {
    levelListEl.append(`
        <div class="card mb-3">
            <div class="card-body">
                <h2 class="card-title" >${levelItem.name}</h2>
                <h5 class="card-subtitle mb-2 text-muted">${levelItem.picture_ids.length} opere</h5>
                <p class="card-text">
                ${levelItem.description}
                </p>
                <a class="btn btn-primary btn-block" href="game.html?id=${levelItem.id}">GIOCA</a>
            </div>
        </div>
    `);
  });
});
