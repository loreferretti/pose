$(() => {
  const form = $("#login-form");
  form.submit(async (e) => {
    e.preventDefault();
    const data = form.serializeArray().reduce(
      (res, val) => ({
        ...res,
        [val.name]: val.value,
      }),
      {}
    );

    const response = await fetch("http://127.0.0.1:5000/api/v1/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const jsonResponse = await response.json();
    if (response.ok) {
      localStorage.setItem("ACCESS_TOKEN", jsonResponse.access_token);
      location.href = "game.html";
    }
    console.log(jsonResponse);
    return false;
  });
});
