<script>
  import moment from "moment";
  export let bids;
</script>

<style>
  .center {
    padding-top: 10px;
    text-align: center;
  }
  .header {
    color: white;
    background-color: #326fa8;
    font-weight: bold;
  }
</style>

<div class="center">
  <table class="table table-striped admin">
    <thead>
      <tr class="header">
        <td>User</td>
        <td>Price</td>
        <td>Max Price</td>
        <td>Date</td>
      </tr>
    </thead>
    <tbody>
      {#each bids as bid}
        <tr>
          <td>
            {bid.user_fullname} (bidder {bid.bidder})
            {#if bid.status}
              <span style="color: red;">- ( {bid.status} )</span>
            {/if}
            {#if !bid.status && bid.amount < bid.max_amount}
              <span style="color: red;">- ( auto )</span>
            {/if}
          </td>
          <td>{bid.amount}</td>
          <td>{bid.max_amount}</td>
          <td>{moment(Number(bid.date)).format('DD/MM/YYYY - h:mm:ss a')}</td>
        </tr>
      {/each}

      <!-- {/if} -->
    </tbody>
  </table>
</div>
