<script>
  import { onMount, onDestroy } from "svelte";
  import { navigate } from "svelte-routing";
  // import * as buffer from "buffer";
  import jwtDecode from "jwt-decode";
  import io from "socket.io-client";
  import moment from "moment";
  import { getContext } from "svelte";
  import { fly } from "svelte/transition";

  import Popup from "./Popup.svelte";

  const { open } = getContext("simple-modal");

  let entries = [];
  let serverTime = 0;
  let ioClient;
  let authToken;
  let catalogueId;
  let catalogueEntries;
  let errorMessage;

  //history popup
  let opening = false;
  let opened = false;
  let closing = false;
  let closed = false;

  onMount(async () => {
    console.log("onMount is called");

    //check authentication
    const idToken = localStorage.getItem("bloodstockauction_admin_id_token");
    console.log("idToken : ", idToken);
    if (!idToken) {
      return navigate("/login", { replace: true });
    } else {
      const decoded = jwtDecode(idToken);
      console.log("idToken decoded : ", decoded);

      if (decoded.role !== "admin") {
        return navigate("/login", { replace: true });
      }

      const isExpired = isTokenExpired(idToken);
      console.log("idToken expired : ", isTokenExpired(idToken));
      if (isExpired === true) {
        localStorage.removeItem("bloodstockauction_admin_id_token");
        return navigate("/login", { replace: true });
      }

      authToken = idToken;

      try {
        const catalogueResult = await getCatalogue();
        console.log("getCatalogue result : ", catalogueResult);

        //getCatalogue success
        if (
          catalogueResult &&
          catalogueResult.data &&
          catalogueResult.data.getCurrentCatalogue &&
          catalogueResult.data.getCurrentCatalogue.success === true
        ) {
          catalogueId =
            catalogueResult.data.getCurrentCatalogue.catalogue[0]._id;
          console.log("catalogueId : ", catalogueId);

          if (catalogueId) {
            getEntries(catalogueId);
          }
        }
      } catch (error) {
        console.log(error);
        localStorage.removeItem("bloodstockauction_admin_id_token");
        return navigate("/login", { replace: true });
      }
    }
    //init auction detail data.
  });

  onDestroy(() => {
    console.log("onDestroy is called");

    if (ioClient) {
      console.log("socket is closed");
      ioClient.close();
    }
  });

  function initSocket() {
    //init socket for auction
    if (!ioClient) {
      console.log("socket is openning");
      ioClient = io.connect("https://bondi-dev.bloodstockauction.com");

      ioClient.on("auction", msg => {
        // console.info(msg);

        if (msg.type === "all") {
          serverTime = msg.data.time;
          const newEntries = msg.data.lots;

          if (entries && entries.length > 0) {
            for (let index = 0; index < entries.length; index++) {
              const lotIndex = entries[index].lot_index;
              const currentEntry = newEntries.find(
                entry => entry.lot_index === lotIndex
              );

              if (currentEntry) {
                // Object.assign(entries[index], currentEntry);

                if (
                  entries[index].current_price !== currentEntry.current_price
                ) {
                  tadaAnimation(lotIndex);
                }
                entries[index].current_price = currentEntry.current_price;
                entries[index].bid_count = currentEntry.bid_count;
                entries[index].end_time = currentEntry.end_time;
                entries[index].status = currentEntry.status;
              }
            }
          }
        } else if (msg.type === "lot") {
          console.info("update lot : ", msg);
          const newEntry = msg.data;
          console.info("newEntry : ", newEntry);
          const lotIndex = newEntry.lot_index;
          let entryIndex = entries.findIndex(
            entry => entry.lot_index === lotIndex
          );

          console.log("updateEntry() entryIndex", entryIndex);

          if (entryIndex > -1) {
            if (entries[entryIndex].current_price !== newEntry.current_price) {
              tadaAnimation(lotIndex);
            }

            // console.log("updateEntry() : ", entries[entryIndex]);
            entries[entryIndex].current_price = newEntry.current_price;
            entries[entryIndex].bid_count = newEntry.bid_count;
            entries[entryIndex].end_time = newEntry.end_time;
            entries[entryIndex].status = newEntry.status;

            updateEntryDetail(entries[entryIndex]._id, entryIndex);
          }
        }
      });
    } else {
      console.info("socket is already initialized");
    }
  }

  async function getEntries(catalogueId) {
    try {
      const getAuctionDataResult = await getAuctionData(catalogueId);
      console.log("getAuctionDataResult result : ", getAuctionDataResult);

      if (
        getAuctionDataResult &&
        getAuctionDataResult.data &&
        getAuctionDataResult.data.getEntriesLatestBidsByCatalogueId &&
        getAuctionDataResult.data.getEntriesLatestBidsByCatalogueId.success ===
          true
      ) {
        // getEntriesLatestBidsByCatalogueId.entry
        entries =
          getAuctionDataResult.data.getEntriesLatestBidsByCatalogueId.entry;

        initEntries(entries);
        console.log("init entries : ", entries);
        initSocket();
      }
    } catch (error) {
      console.log(error);
    }
  }

  function initEntries(entries) {
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      if (entry.bid_count > 0) {
        const lastBidding = entry.bids[entry.bids.length - 1];
        console.info("Max bidding : ", entry.lot_index, lastBidding);
        entry.max_price = lastBidding.max_amount;
        entry.highestUserName = lastBidding.user_fullname;
      } else {
        entry.max_price = 500;
        entry.highestUserName = "";
      }
    }
  }

  async function showPopup(entryId) {
    console.log("showPopup is called : ", entryId);

    let history = [];

    const biddingHistoryResult = await getBiddingHistory(entryId);
    console.log("biddingHistoryResult result : ", biddingHistoryResult);

    //getCatalogue success
    if (
      biddingHistoryResult &&
      biddingHistoryResult.data &&
      biddingHistoryResult.data.getBiddingHistory &&
      biddingHistoryResult.data.getBiddingHistory.success === true
    ) {
      history = biddingHistoryResult.data.getBiddingHistory.history;

      if (history && history.length > 0) {
        history = history.reverse();

        const lastBidding = history[0];
        let entryIndex = entries.findIndex(entry => entry._id === entryId);
        console.log("updateEntry() entryIndex", entryIndex);

        if (entryIndex > -1) {
          console.info(
            "Max bidding : ",
            entries[entryIndex].lot_index,
            lastBidding
          );

          entries[entryIndex].max_price = lastBidding.max_amount;
          entries[entryIndex].highestUserName = lastBidding.user_fullname;
        }
      }
      open(Popup, { bids: history });
    }
  }

  async function updateEntryDetail(entryId, entryIndex) {
    const biddingHistoryResult = await getBiddingHistory(entryId);
    console.log("biddingHistoryResult result : ", biddingHistoryResult);

    //getCatalogue success
    if (
      biddingHistoryResult &&
      biddingHistoryResult.data &&
      biddingHistoryResult.data.getBiddingHistory &&
      biddingHistoryResult.data.getBiddingHistory.success === true
    ) {
      let history = biddingHistoryResult.data.getBiddingHistory.history;

      if (history && history.length > 0) {
        history = history.reverse();

        const lastBidding = history[0];
        console.info(
          "Max bidding : ",
          entries[entryIndex].lot_index,
          lastBidding
        );
        entries[entryIndex].max_price = lastBidding.max_amount;
        entries[entryIndex].highestUserName = lastBidding.user_fullname;
      }
      // open(Popup, { bids: history });
    }
  }

  function isTokenExpired(token) {
    try {
      const date = new Date(0);
      const decoded = decode(token);
      date.setUTCSeconds(decoded.exp);
      return date.valueOf() > new Date().valueOf();
    } catch (err) {
      return false;
    }
  }

  function getCountDownTime(time) {
    const remainTime = time / 1000;
    if (remainTime > 0) {
      let seconds = Math.floor(remainTime % 60);
      let minutes = Math.floor((remainTime / 60) % 60);
      let hours = Math.floor((remainTime / (60 * 60)) % 24);
      let days = Math.floor(remainTime / (60 * 60 * 24));

      let remainTimeFormat = [];

      if (days) {
        remainTimeFormat.push(days + "d");
      }

      if (days || hours) {
        remainTimeFormat.push(hours + "h");
      }

      if (days || hours || minutes) {
        remainTimeFormat.push(minutes + "m");
      }

      remainTimeFormat.push(seconds + "s");

      return remainTimeFormat.join(" ");
    } else if (remainTime < 1 && remainTime > -1) {
      return `closing`;
    } else {
      return `closed`;
    }
  }

  function getStatusName(status) {
    if (status === "S") {
      return "Sold";
    } else if (status === "P") {
      return "Passed In";
    } else {
      return "";
    }
  }

  function buttonClick(lotIndex) {
    return tadaAnimation(lotIndex);
  }

  function tadaAnimation(lotIndex) {
    console.log("buttonClick is called : ", lotIndex);
    let priceElement = document.getElementById("price-" + lotIndex);
    priceElement.classList.add("tada");

    let bidElement = document.getElementById("bid-count-" + lotIndex);
    bidElement.classList.add("tada");

    let self = this;
    setTimeout(function() {
      priceElement.classList.remove("tada");
      bidElement.classList.remove("tada");
    }, 1000);
  }

  function buttonAllRefreshClick() {
    return refreshAllEntries();
  }

  function refreshAllEntries() {
    console.log("refreshAllEntries is called : ", catalogueId);
    if (catalogueId) {
      console.log("refreshAllEntries calls getEntries");
      return getEntries(catalogueId);
    }
  }

  async function getAuctionData(catalogueId) {
    errorMessage = undefined;
    const token = authToken;

    let response = await fetch(
      "https://bsa2-admin-backend-dev.bloodstockauction.com/common",
      {
        // TODO: test
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: `
        query
          {
            getEntriesLatestBidsByCatalogueId( catalogueId: \"${catalogueId}\")
            {
              success
              message
              entry {
                _id
                category { _id name slug }
                country_code
                horse { name sire }
                current_price
                reserve_price
                bid_count
                bids { amount max_amount user username user_fullname bidder status date }
                status
                statuses { status date }
                lot_index
                is_reserve
                vendor { _id username phone email name { firstname surname}}
              }
            }
          }`
      }
    );

    return response.json();
  }

  async function getCatalogue() {
    const token = authToken;
    console.log("Auth token : ", token);

    let response = await fetch(
      "https://bsa2-admin-backend-dev.bloodstockauction.com/common",
      {
        // TODO: test
        method: "POST",

        headers: new Headers({
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }),

        body: `
        query
          {
            getCurrentCatalogue
            {
              success
              message
              catalogue { _id name close live country_code status result_confirm }
            }
          }`
      }
    );

    return response.json();
  }

  async function getBiddingHistory(entryId) {
    const token = authToken;
    console.log("Auth token : ", token);

    let response = await fetch(
      "https://bsa2-admin-backend-dev.bloodstockauction.com/common",
      {
        // TODO: test
        method: "POST",

        headers: new Headers({
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }),

        body: `
        query
          {
            getBiddingHistory( entryId: \"${entryId}\")
            {
              success
              message
              history { _id user username user_fullname status max_amount amount bidder status date }
            }
          }`
      }
    );

    return response.json();
  }
</script>

<style>
  .live-container {
    margin-top: 20px;
    margin-bottom: 20px;
    text-align: center;
    /* font-size: 13px; */
  }
  .time {
    margin-bottom: 20px;
    font-size: 20px;
  }
  .animated {
    background-repeat: no-repeat;
    -webkit-animation-duration: 1s;
    animation-duration: 1s;
    -webkit-animation-fill-mode: both;
    animation-fill-mode: both;
  }
  @-webkit-keyframes tada {
    0% {
      -webkit-transform: scale(1);
    }
    10%,
    20% {
      -webkit-transform: scale(0.8) rotate(-5deg);
    }
    30%,
    50%,
    70%,
    90% {
      -webkit-transform: scale(1.2) rotate(5deg);
    }
    40%,
    60%,
    80% {
      -webkit-transform: scale(1.2) rotate(-5deg);
    }
    100% {
      -webkit-transform: scale(1) rotate(0);
    }
  }
  @keyframes tada {
    0% {
      transform: scale(1);
    }
    10%,
    20% {
      transform: scale(0.8) rotate(-5deg);
    }
    30%,
    50%,
    70%,
    90% {
      transform: scale(1.2) rotate(5deg);
    }
    40%,
    60%,
    80% {
      transform: scale(1.2) rotate(-5deg);
    }
    100% {
      transform: scale(1) rotate(0);
    }
  }
  .tada {
    color: red;
    -webkit-animation-name: tada;
    animation-name: tada;
  }
  .black {
    color: black;
  }
</style>

<div class="container">
  <div class="live-container">
    <div class="panel panel-default">
      <div class="time">
        <div>
          {#if serverTime}
            Time : {moment(serverTime).format('DD/MM/YYYY - h:mm:ss a')}
          {/if}
          <div class="float-right">
            <button class="btn btn-danger btn-sm" on:click={refreshAllEntries}>
              <!-- on:click={buttonAllRefreshClick()}> -->
              All Refresh
            </button>
          </div>
        </div>

      </div>
      <div class="panel-body">
        {#if entries && entries.length > 0}
          <table class="table table-striped admin">
            <thead>
              <tr>
                <td>Lot</td>
                <td>Price</td>
                <td>Max Price</td>
                <td>Reserve Price</td>
                <td>Highest bidder</td>
                <td>Bids</td>
                <td>Time</td>
                <td>Status</td>
                <td>Actions</td>
              </tr>
            </thead>
            <tbody>
              {#each entries as entry}
                <tr>
                  <td>{entry.lot_index}</td>
                  <td class="tada black">
                    <div id={'price-' + entry.lot_index} class="animated">
                      {entry.current_price}
                    </div>
                  </td>
                  <td>{entry.max_price}</td>
                  <td>{entry.is_reserve ? entry.reserve_price : ''}</td>
                  <td>{entry.highestUserName}</td>
                  <td class="tada black">
                    <div id={'bid-count-' + entry.lot_index} class="animated">
                      {entry.bid_count}
                    </div>
                  </td>
                  <td>
                    {getCountDownTime(Number(entry.end_time) - serverTime)}
                  </td>
                  <td>{getStatusName(entry.status)}</td>
                  <td>
                    <button
                      class="btn btn-primary btn-sm"
                      on:click={showPopup(entry._id)}>
                      History
                    </button>
                    <button
                      class="btn btn-warning btn-sm"
                      on:click={buttonClick(entry.lot_index)}>
                      Refresh
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {:else}
          <h1>Loading..</h1>
        {/if}
      </div>
    </div>
  </div>
</div>
