<script>
  export let allHistories;
  import { onMount } from "svelte";
  import moment from "moment";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  function scrollTo(lotNumber) {
    dispatch("message", {
      text: lotNumber
    });
  }

  // let allHistories = [];
  let liveHistories = [];
  let maxHistories = 5;

  $: {
    if (allHistories && allHistories.length > maxHistories) {
      liveHistories = allHistories.slice(0, maxHistories);
    } else {
      liveHistories = allHistories;
    }
  }

  let isShowHistory = false;

  function setShowHistory() {
    console.log("setShowHistory is called", isShowHistory);
    isShowHistory = !isShowHistory;
  }

  onMount(async () => {
    console.log("History onMount is called");
    // When the user scrolls the page, execute myFunction
    // window.onscroll = function() {
    //   setHistoryScroll();
    // };

    window.addEventListener("scroll", setHistoryScroll);

    // Add the sticky class to the header when you reach its scroll position. Remove "sticky" when you leave the scroll position
    function setHistoryScroll() {
      console.log("setHistoryScroll is called");

      // Get the header
      var historyHeader = document.getElementById("history-container");
      var flashMessageHeader = document.getElementById(
        "flashmessage-container"
      );

      console.log("flashmessage-container : ", flashMessageHeader.clientHeight);

      // Get the offset position of the navbar
      var sticky = historyHeader.offsetTop;

      if (window.pageYOffset > sticky) {
        if (flashMessageHeader.clientHeight > 0) {
          historyHeader.classList.add("sticky");
        } else {
          historyHeader.classList.add("sticky-top");
        }
      } else {
        if (flashMessageHeader.clientHeight > 0) {
          historyHeader.classList.remove("sticky");
        } else {
          historyHeader.classList.remove("sticky-top");
        }
      }
    }
  });
</script>

<style>
  .history-container {
    padding: 15px 40px;
    margin-bottom: 20px;
    border: 1px solid transparent;
    /* border-radius: 4px; */
    color: #3c763d;
    background-color: #dff0d8;
    border-color: #d6e9c6;
    z-index: 100;
  }
  .history-title {
    font-size: 16px;
  }
  .history-rows {
    padding: 3px;
  }
  :global(.sticky) {
    position: fixed;
    top: 43px;
    left: 0;
    width: 100%;
  }
  :global(.sticky-top) {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
  }
  /* Add some top padding to the page content to prevent sudden quick movement (as the header gets a new position at the top of the page (position:fixed and top:0) */
  :global(.sticky + .container) {
    padding-top: 150px;
  }
</style>

<div id="history-container" class="history-container">
  <div>
    {#if isShowHistory}
      <div class="history-title">
        LIVE Bidding Logs ( Max : {maxHistories}
        <span style="padding: 0 10px;">
          <input type="range" bind:value={maxHistories} min="1" max="10" />
        </span>
        )
        <div class="float-right">
          <a on:click={setShowHistory}>
            <i class="fa fa-arrow-circle-up fa-lg" />
          </a>
        </div>
      </div>
      <hr />
      <div>
        {#if liveHistories && liveHistories.length > 0}
          {#each liveHistories as history}
            <div class="history-rows">
              Lot#{history.lot} - {history.current_price} ( {moment(history.date).format('DD/MM/YYYY - h:mm a')}
              )
              <button
                class="btn btn-success btn-xs"
                on:click={scrollTo(history.lot)}>
                view
              </button>
            </div>
          {/each}
        {:else}No records{/if}
      </div>
    {:else}
      <div class="history-title">
        LIVE Bidding Logs
        <div class="float-right">
          <a on:click={setShowHistory}>
            <i class="fa fa-arrow-circle-down fa-lg" />
          </a>
        </div>
      </div>
    {/if}
  </div>
</div>
