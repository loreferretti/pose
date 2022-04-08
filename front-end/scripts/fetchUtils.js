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

export const postVideo = (formData) =>
  fetchJson(
    fetch(`${Config.BASE_URL}videos`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("ACCESS_TOKEN")}`,
      },
      method: "POST",
      body: formData,
    })
  );

export const getVideo = (id) =>
  fetchJson(
    fetch(`${Config.BASE_URL}videos/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
  );

export const getUserMe = () =>
  fetchJson(
    fetch(`${Config.BASE_URL}user/me`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("ACCESS_TOKEN")}`,
      },
      method: "GET",
    })
  );

export const getLevels = () =>
  fetchJson(
    fetch(`${Config.BASE_URL}levels`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
  );
