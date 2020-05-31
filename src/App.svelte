<script>
  import { Router, Link, Route } from "svelte-routing";
  import Header from "./Header.svelte";
  import Live from "./Live.svelte";
  import Login from "./Login.svelte";
  import Footer from "./Footer.svelte";
  import Modal from "./Modal.svelte";
  export let url = "";
</script>

<Modal>
  <Header />
  <div class="container">
    <Router {url}>
      <!-- <nav>
      <Link to="/">Home</Link>
      <Link to="live">Live</Link>
    </nav> -->
      <div>
        <Route path="live" component={Live} />
        <Route path="/">
          <Login />
        </Route>
        <Route path="*">
          <Login />
        </Route>
      </div>
    </Router>
  </div>
  <Footer />
</Modal>
