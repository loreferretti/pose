import { Config } from "./scripts/config.js";

$(() => {
  const form = $("#signup-form");
  form.submit(async (e) => {
    e.preventDefault();
    const data = form.serializeArray().reduce(
      (res, val) => ({
        ...res,
        [val.name]: val.value,
      }),
      {}
    );

    const response = await fetch(`${Config.BASE_URL}signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const jsonResponse = await response.json();
    if (response.ok) {
      location.href = "index.html";
    }
    return false;
  });
});
