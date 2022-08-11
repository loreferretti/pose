import {checkEmptyInputs, checkValidity, send} from "./scripts/form.js";

$(() => {
  const form = $("#signup-form");
  const email = $("input[name='email']");
  const password = $("input[name='password']")
  const submit = $(":submit");
  const responseMessage = $("#response-message");

  if(checkEmptyInputs(email.val(), password.val()))
    submit.prop("disabled", true);


  form.on("input", function() {
    if(checkValidity(email.val(), password.val()))
      submit.prop("disabled", false)
    else 
      submit.prop("disabled", true);
    responseMessage.empty();

  });

  form.submit(async (e) => {
    e.preventDefault();

    const response = await send(form, "signup");
    const jsonResponse = await response.json();
    if (response.ok) {
      location.href = "index.html";
    }
    return false;
  });
});
