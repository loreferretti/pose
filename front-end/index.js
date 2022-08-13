import {checkValidity} from "./scripts/form.js";
import {Config} from "./scripts/config.js";

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

    const data = form.serializeArray().reduce(
      (res, val) => ({
        ...res,
        [val.name]: val.value,
      }),
      {}
    );
    
    $.ajax({
      url: `${Config.BASE_URL}login`,
      type: "post",
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify(data),
      dataType: "json",
      success: (data) => {
        localStorage.setItem("ACCESS_TOKEN", data.access_token);
        location.href = "start.html";
      },
      error: (data) => {
        console.log(data);
      }
    });

    return false;
  });
});
