import {Config} from "./config.js";

function isValid(email) {
  const pattern = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  const regex = new RegExp(pattern);
  return regex.test(email)
}

function checkEmptyInputs(email, password) {
  return !email || !password;
}

export function checkValidity(email, password) {
  return !checkEmptyInputs(email, password) && isValid(email);
}

export async function send(form, endpoint) {
  const data = form.serializeArray().reduce(
    (res, val) => ({
      ...res,
      [val.name]: val.value,
    }),
    {}
  );
  
  const response = await fetch(`${Config.BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response;
}