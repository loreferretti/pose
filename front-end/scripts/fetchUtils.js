import { Config } from "./config.js";

const fetchJson = async (callback) => {
  const response = await callback;
  if (!response.ok) {
    return null;
  }

  return await response.json();
};

export const getPicture = (id) =>
  fetchJson(
    fetch(`${Config.BASE_URL}pictures/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
  );

export const getLevel = (id) =>
  fetchJson(
    fetch(`${Config.BASE_URL}levels/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
  );
