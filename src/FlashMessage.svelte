<script>
  export let message;
  export let success;
  import { onMount } from "svelte";
  import { createEventDispatcher } from "svelte";

  let timeout;
  let biddingMessage;

  function setShowHistory() {
    console.log("setShowHistory is called", isShowHistory);
    isShowHistory = !isShowHistory;
  }

  $: {
    console.log("Flash message change event is called", message, success);
    biddingMessage = message;
  }

  onMount(async () => {
    console.log("Flash onMount is called");

    window.addEventListener("scroll", setFlashMessageScroll);

    // Add the flash-sticky class to the header when you reach its scroll position. Remove "flash-sticky" when you leave the scroll position
    function setFlashMessageScroll() {
      console.log("setFlashMessageScroll is called");

      // Get the header
      var header = document.getElementById("flashmessage-container");

      // Get the offset position of the navbar
      var sticky = header.offsetTop;
      console.log("flash sticky : ", sticky);

      if (window.pageYOffset > sticky) {
        header.classList.add("flash-sticky");
      } else {
        header.classList.remove("flash-sticky");
      }
    }
  });
</script>

<style>
  .flashmessage-container {
    z-index: 100;
  }
  .flashmessage {
    padding: 10px 40px;
    border: 1px solid transparent;
    /* border-radius: 4px; */
    color: #3c763d;
    background-color: #dff0d8;
    border-color: #d6e9c6;
  }
  .message {
    font-size: 16px;
  }
  .red {
    color: red;
  }
  :global(.flash-sticky) {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
  }
</style>

<div id="flashmessage-container" class="flashmessage-container">
  {#if biddingMessage}
    <div class="flashmessage">
      <div class="message">
        Bidding results :
        {#if success}
          <span>SUCCESS. {biddingMessage}</span>
        {:else}
          <span class="red">FAILED. {biddingMessage}</span>
        {/if}
      </div>
    </div>
  {/if}
</div>
