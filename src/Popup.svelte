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
  .member-link {
    color: #1565c0;
    text-decoration: underline;
    cursor: pointer;
  }
  .member-link:hover {
    color: #0d47a1;
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
            <a
              class="member-link"
              href={"https://admin.bloodstockauction.com/members/" + bid.user}
              target="_blank"
              rel="noopener noreferrer">
              {bid.user_fullname}
            </a>
            (bidder {bid.bidder})
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
