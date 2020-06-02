<script>
  export let newliveHistory;
  import moment from "moment";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  function scrollTo(lotNumber) {
    dispatch("message", {
      text: lotNumber
    });
  }

  let liveHistories = [];

  $: {
    if (newliveHistory) {
      // console.log("liveHistories changed", newliveHistory);
      // liveHistories.push(newliveHistory);
      liveHistories = [...liveHistories, newliveHistory];
      if (liveHistories && liveHistories.length > 5) {
        liveHistories.shift();
      }
      console.log("liveHistories : ", liveHistories);
    }
  }

  let isShowHistory = false;

  function setShowHistory() {
    console.log("setShowHistory is called", isShowHistory);
    isShowHistory = !isShowHistory;
  }
</script>

<style>
  .history-container {
    padding: 15px;
    margin-bottom: 20px;
    border: 1px solid transparent;
    /* border-radius: 4px; */
    color: #3c763d;
    background-color: #dff0d8;
    border-color: #d6e9c6;
  }
  .history-rows {
    padding: 3px;
  }
</style>

<div class="history-container">
  <div>
    {#if isShowHistory}
      LIVE bidding histories for ALL lots ( Max : 5)
      <div class="float-right">
        <a on:click={setShowHistory}>
          <i class="fa fa-arrow-circle-up fa-lg" />
        </a>
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
      LIVE bidding histories for ALL lots
      <div class="float-right">
        <a on:click={setShowHistory}>
          <i class="fa fa-arrow-circle-down fa-lg" />
        </a>
      </div>
    {/if}
  </div>
</div>
