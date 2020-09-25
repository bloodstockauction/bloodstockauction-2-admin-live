<script>
  import { getContext } from "svelte";
  export let lotIndex;
  export let entryId;
  export let onCancel = () => {};
  export let onConfirm = () => {};

  const { close } = getContext("simple-modal");

  let value;
  let errorMessages;
  let onChange = () => {};

  function _onCancel() {
    console.log("_onCancel is called");
    onCancel();
    close();
  }

  function _onConfirm(entryId, lotIndex, value) {
    console.log("_onConfirm is called : ", entryId, lotIndex, value);

    if (isValidPrice(value)) {
      onConfirm(entryId, lotIndex, value);
      close();
    } else {
      errorMessages = "Wrong price. Please check the bidding price again.";
    }
  }

  function isValidPrice(amount) {
    if (amount >= 600) {
      if (amount < 2000) {
        return amount % 100 === 0;
      } else if (amount < 20000) {
        return amount % 250 === 0;
      } else if (amount < 100000) {
        return amount % 500 === 0;
      } else if (amount < 500000) {
        return amount % 1000 === 0;
      } else {
        return amount % 5000 === 0;
      }
    }
    return false;
  }

  $: onChange(value);
</script>

<style>
  .window {
    max-width: 400px;
  }

  h2 {
    font-size: 2rem;
    text-align: center;
  }

  input {
    width: 100%;
  }

  .buttons {
    display: flex;
    justify-content: space-between;
  }

  .close {
    position: absolute;
    top: -2rem;
    right: 10;
    background: black;
  }
</style>

<div>
  <button class="close" on:click={_onCancel}>×</button>
  <h2 style="font-size: 18px;">Place a bid #{lotIndex}</h2>
  <hr />
  <input
    type="number"
    class="form-control"
    id="price"
    placeholder="Enter bidding price"
    bind:value
    on:keydown={e => e.which === 13 && _onConfirm()} />
  <br />

  {#if errorMessages}
    <div>
      <span style="color: red;">{errorMessages}</span>
    </div>
  {/if}

  <div class="pull-right">
    <button class="btn btn-default btn-sm" on:click={_onCancel}>Cancel</button>
    <button
      class="btn btn-success btn-sm"
      on:click={() => _onConfirm(entryId, lotIndex, value)}
      disabled={!value}>
      Confirm
    </button>
  </div>
</div>
