import axios from "axios";
import "@/services/index";
import { PontCore } from "@/services/pontCore";

const http = axios.create({
  // baseURL: 'https://smm.tx.joinf.com/',
  // baseURL: import.meta.env.VITE_HOST_URL + '/',
  withCredentials: true,
  // headers: {
  //   'Access-Control-Allow-Origin': 'futong.joinf.com'
  // }
});

http.interceptors.request.use(
  (config) => {
    //   let userInfo = window.localStorage.getItem('userInfo') || '';
    //   userInfo = userInfo ? JSON.parse(userInfo) : {};
    //   const token = userInfo.token || '';

    //   if (
    //     token &&
    //     config.url &&
    //     config.url?.indexOf('/api/vrifyKaptcha') === -1
    //   ) {
    //     config.headers.accessToken = token;
    //   }
    return config;
  },
  (err) => {
    return Promise.reject(err);
  }
);

http.interceptors.response.use(
  (response) => {
    const { data } = response;
    // if (data.code === 100001) {
    //   // 登陆过期
    //   //   router.push({ path: "/login" });
    // }
    console.error(response, data);
    return data;
  },
  (err) => {
    console.error(err);
    return Promise.reject(err);
  }
);

PontCore.useFetch(http);
