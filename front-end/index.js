import { Config } from "./scripts/config.js";

function isValid(email) {
  const pattern = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  const regex = new RegExp(pattern);
  return regex.test(email)
}

$(() => {

  const form = $("#login-form");
  const email = $("input[name='email']");
  const submit = $(":submit");

  submit.prop("disabled", true);

  email.on("input", function(){
    if(isValid($(this).val())) {
      $(":submit").prop("disabled", false);
    }
  });

  form.on("input", function() {
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

    const response = await fetch(`${Config.BASE_URL}login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const jsonResponse = await response.json();
    if (response.ok) {
      localStorage.setItem("ACCESS_TOKEN", jsonResponse.access_token);
      location.href = "start.html";
    } else {
      $("#response-message").text(jsonResponse);
    }
    return false;
  });
});
