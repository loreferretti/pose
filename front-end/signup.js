import { Config } from "./scripts/config.js";

function isValid(email) {
  const pattern = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  const regex = new RegExp(pattern);
  return regex.test(email)
}

$(() => {
  const form = $("#signup-form");
  const email = $("input[name='email']");
  const password = $("input[name='password']")
  const submit = $(":submit");

  // disable button if the inputs are empty
  if(!email.val() || !password.val())
    submit.prop("disabled", true);

  form.on("input", function() {
    if(!email.val() || !password.val() || !isValid(email.val()))
      submit.prop("disabled", true);
    else
      submit.prop("disabled", false);
    $("#response-message").empty();
  });

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
