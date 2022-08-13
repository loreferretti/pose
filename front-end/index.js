import {checkValidity, send} from "./scripts/form.js";

$(() => {

  const form = $("#login-form");
  const email = $("input[name='email']");
  const password = $("input[name='password']")
  const submit = $(":submit");
  const responseMessage = $("#response-message");

  form.on("input", function() {
    if(checkValidity(email.val(), password.val()))
      submit.prop("disabled", false)
    else 
      submit.prop("disabled", true);
    responseMessage.empty();

  });

  form.submit(async (e) => {
    e.preventDefault();

    const response = await send(form, "login");
    const jsonResponse = response.json();
    if (response.ok) {
      localStorage.setItem("ACCESS_TOKEN", jsonResponse.access_token);
      location.href = "start.html";
    } else {
      responseMessage.text(jsonResponse);
    }
    return false;
  });
});
