<script>
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import AuthService from "./service/auth";
  import Config from "./environments/config";

  let email = "";
  let password = "";
  let result;
  let errorMessage;
  const AUTH_ID = Config.AUTH_ID;

  onMount(async () => {
    console.log("onMount is called");

    //check authentication
    const idToken = localStorage.getItem(AUTH_ID);
    console.log("idToken : ", idToken);
    if (idToken) {
      return navigate("/live", { replace: true });
    }
  });

  async function login() {
    errorMessage = undefined;

    console.log("login is called : ", email, password);

    const result = await AuthService.login(email, password);
    console.log("result : ", result);

    if (
      result &&
      result.data &&
      result.data.login &&
      result.data.login.success === true
    ) {
      const authResult = result.data.login;
      const token = authResult.token;
      let userProfile = authResult;
      if (userProfile.token) {
        delete userProfile.token;
      }

      if (authResult.role === "admin") {
        localStorage.setItem(AUTH_ID, token);
        navigate("/live", { replace: true });
      } else {
        errorMessage = "You are not permited.";
      }
    } else {
      errorMessage = "Login failed.";
    }
  }
</script>

<style>
  .login-container {
    margin-top: 130px;
    margin-bottom: 130px;
  }
</style>

<div class="container">
  <div class="login-container">
    <div class="row">
      <div class="col-md-4 offset-md-4">
        <form>
          <div class="form-group">
            <label>Email:</label>
            <input
              id="email"
              bind:value={email}
              required
              class="form-control"
              name="email"
              placeholder="Please enter email"
              type="text" />
          </div>
          <div class="form-group">
            <label>Password:</label>
            <input
              id="password"
              bind:value={password}
              required
              class="form-control"
              name="password"
              placeholder="Please enter password"
              type="password" />
          </div>
          <div class="float-right">
            <button class="btn btn-primary" type="button" on:click={login}>
              Login
            </button>
          </div>
          {#if errorMessage}
            <div>
              <span style="color: red;">{errorMessage}</span>
            </div>
          {/if}
        </form>
      </div>
    </div>
  </div>
</div>
