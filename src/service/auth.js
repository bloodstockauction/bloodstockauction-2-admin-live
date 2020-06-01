import Config from "../environments/config";
const BACKEND_END_POINT_PUBLIC = Config.BACKEND_END_POINT_PUBLIC;
const AuthService = {
  login: async function login(email, password) {
    let response = await fetch(BACKEND_END_POINT_PUBLIC, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: `
        query
          {
            login( email : \"${email}\", password : \"${password}\")
            {
              success
              message
              user_id
              name
              email
              role
              token
            }
          }`,
    });
    return response.json();
  },
};

export default AuthService;
