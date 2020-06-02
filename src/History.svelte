<script>
  export let newliveHistory;
  import { onMount } from "svelte";
  import moment from "moment";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  function scrollTo(lotNumber) {
    dispatch("message", {
      text: lotNumber
    });
  }

  let liveHistories = [];
  let maxHistories = 5;

  $: {
    if (newliveHistory) {
      // console.log("liveHistories changed", newliveHistory);
      // liveHistories.push(newliveHistory);
      liveHistories = [...liveHistories, newliveHistory];
      while (liveHistories && liveHistories.length > maxHistories) {
        liveHistories.shift();
      }
      console.log("liveHistories : ", liveHistories);
      newliveHistory = undefined;
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
    window.onscroll = function() {
      setHistoryScroll();
    };

    // Get the header
    var header = document.getElementById("history-container");

    // Get the offset position of the navbar
    var sticky = header.offsetTop;

    // Add the sticky class to the header when you reach its scroll position. Remove "sticky" when you leave the scroll position
    function setHistoryScroll() {
      console.log("setHistoryScroll is called");
      if (window.pageYOffset > sticky) {
        header.classList.add("sticky");
      } else {
        header.classList.remove("sticky");
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
        LIVE bidding histories for ALL lots ( Max : {maxHistories}
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
              Lot#{history.lot} - {history.prev_price}
              <i class="fa fa-arrow-right" aria-hidden="true" />
              {history.current_price} ( {moment(history.date).format('DD/MM/YYYY - h:mm a')}
              )
              <button
                class="btn btn-success btn-xs"
                on:click={scrollTo(history.lot)}>
                see
              </button>
            </div>
          {/each}
        {:else}No records{/if}
      </div>
    {:else}
      <div class="history-title">
        LIVE bidding histories for ALL lots
        <div class="float-right">
          <a on:click={setShowHistory}>
            <i class="fa fa-arrow-circle-down fa-lg" />
          </a>
        </div>
      </div>
    {/if}
  </div>
</div>
