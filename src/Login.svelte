<script>
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  let email = "";
  let password = "";
  let result;
  let errorMessage;

  onMount(async () => {
    console.log("onMount is called");

    //check authentication
    const idToken = localStorage.getItem("bloodstockauction_admin_id_token");
    console.log("idToken : ", idToken);
    if (idToken) {
      return navigate("/live", { replace: true });
    }
  });

  async function login() {
    errorMessage = undefined;
    console.log("login is called : ", email, password);
    let response = await fetch(
      "https://bsa2-admin-backend.bloodstockauction.com/public",
      {
        // TODO: test
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
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
          }`
      }
    );

    const result = await response.json();
    // result = JSON.stringify(json);
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
        localStorage.setItem("bloodstockauction_admin_id_token", token);
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
    margin-top: 100px;
    margin-bottom: 100px;
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
