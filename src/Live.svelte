<script>
  import { onMount, onDestroy } from "svelte";
  import { navigate } from "svelte-routing";
  import jwtDecode from "jwt-decode";
  import io from "socket.io-client";
  import moment from "moment";
  import { getContext } from "svelte";
  import { fly } from "svelte/transition";
  import Popup from "./Popup.svelte";
  import Config from "./environments/config";
  import History from "./History.svelte";
  import Statics from "./Statics.svelte";

  //service
  import EntryService from "./service/entries";

  const { open } = getContext("simple-modal");
  const AUTH_ID = Config.AUTH_ID;
  const SOCKET_END_POINT = Config.SOCKET_END_POINT;

  let infoMessage = "Loading..";
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

  //live history
  let liveHistory;

  //window scroll
  let showTopButton = false;

  //sales statics
  let totalProfit = 0;
  let soldLots = [];
  let unSoldLots = [];
  let withdrawnLots = [];

  onMount(async () => {
    console.log("onMount is called");

    //set window scroll
    initWindowScrollButton();

    //check authentication
    const idToken = localStorage.getItem(AUTH_ID);
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
        localStorage.removeItem(AUTH_ID);
        return navigate("/login", { replace: true });
      }

      //set Auth JWT token
      authToken = idToken;

      try {
        const catalogueResult = await EntryService.getCatalogue(authToken);
        console.log("getCatalogue result : ", catalogueResult);

        //getCatalogue success
        if (
          catalogueResult &&
          catalogueResult.data &&
          catalogueResult.data.getCurrentCatalogue &&
          catalogueResult.data.getCurrentCatalogue.success === true
        ) {
          const currentCatalogue =
            catalogueResult.data.getCurrentCatalogue.catalogue[0];

          if (currentCatalogue.status !== "live") {
            console.error("Catalogue is not Live");
            infoMessage = "Sorry, catalogue is not live now";
            return;
          }
          catalogueId = currentCatalogue._id;
          console.log("catalogueId : ", catalogueId);

          if (catalogueId) {
            getEntries(catalogueId);
          }
        }
      } catch (error) {
        console.log(error);
        localStorage.removeItem(AUTH_ID);
        return navigate("/login", { replace: true });
      }
    }
  });

  onDestroy(() => {
    console.log("onDestroy is called");

    if (ioClient) {
      console.log("socket is closed");
      ioClient.close();
    }
  });

  function initWindowScrollButton() {
    window.onscroll = function(ev) {
      // console.log("onscroll is called : ", window.pageYOffset);
      if (window.pageYOffset > 300) {
        showTopButton = true;
      } else {
        showTopButton = false;
      }
    };
  }

  function initSocket() {
    //init socket for auction
    if (!ioClient) {
      console.log("socket is openning");
      ioClient = io.connect(SOCKET_END_POINT);

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

              //update live history
              const newLiveHistory = {
                lot: lotIndex,
                prev_price: entries[entryIndex].current_price,
                current_price: newEntry.current_price,
                date: new Date()
              };
              addLiveHistory(newLiveHistory);
            }

            // console.log("updateEntry() : ", entries[entryIndex]);
            entries[entryIndex].current_price = newEntry.current_price;
            entries[entryIndex].bid_count = newEntry.bid_count;
            entries[entryIndex].end_time = newEntry.end_time;
            entries[entryIndex].status = newEntry.status;

            //update entry data
            updateEntryDetail(entries[entryIndex]._id, entryIndex, authToken);
          }
        }
      });
    } else {
      console.info("socket is already initialized");
    }
  }

  async function getEntries(catalogueId) {
    try {
      errorMessage = undefined;
      const getAuctionDataResult = await EntryService.getAuctionData(
        catalogueId,
        authToken
      );
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
        // console.log("Max bidding : ", entry.lot_index, lastBidding);
        entry.max_price = lastBidding.max_amount;
        entry.highestUserName = lastBidding.user_fullname;

        //init sales static
        initSalesStatics(entries);
      } else {
        entry.max_price = 500;
        entry.highestUserName = "";
      }
    }
  }

  function initSalesStatics(allEntries) {
    soldLots = [];
    unSoldLots = [];
    withdrawnLots = [];

    for (let index = 0; index < allEntries.length; index++) {
      let entry = allEntries[index];

      if (entry.status === "X") {
        withdrawnLots.push(entry);
      } else {
        if (entry.is_reserve == true) {
          if (
            entry.current_price >= entry.reserve_price ||
            entry.status === "S"
          ) {
            soldLots.push(entry);
          } else {
            unSoldLots.push(entry);
          }
        } else {
          if (entry.current_price > 500 || entry.status === "S") {
            soldLots.push(entry);
          } else {
            unSoldLots.push(entry);
          }
        }
      }
    }

    totalProfit = soldLots.reduce(function(sum, entry) {
      return sum + entry.current_price;
    }, 0);

    console.log("soldLots : ", soldLots);
    console.log("unSoldLots : ", unSoldLots);
    console.log("withdrawnLots : ", withdrawnLots);
    console.log("totalProfit : ", totalProfit);
  }

  async function showPopup(entryId) {
    console.log("showPopup is called : ", entryId);

    let history = [];

    const biddingHistoryResult = await EntryService.getBiddingHistory(
      entryId,
      authToken
    );
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

  async function updateEntryDetail(entryId, entryIndex, authToken) {
    const biddingHistoryResult = await EntryService.getBiddingHistory(
      entryId,
      authToken
    );
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
      const decoded = jwtDecode(token);
      console.log("isTokenExpired called Token decoded : ", decoded);
      date.setUTCSeconds(decoded.exp);

      // console.log("isTokenExpired called decoded time : ", date.valueOf());
      // console.log(
      //   "isTokenExpired called current time : ",
      //   new Date().valueOf()
      // );

      return date.valueOf() < new Date().valueOf();
    } catch (err) {
      console.error("Token decode error : ", err);
      return true;
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
    } else if (status === "X") {
      return "Withdrawn";
    } else {
      return "";
    }
  }

  function buttonClick(lotIndex) {
    return tadaAnimation(lotIndex);
  }

  function tadaAnimation(lotIndex) {
    console.log("tadaAnimation is called : ", lotIndex);
    let priceElement = document.getElementById("price-" + lotIndex);
    priceElement.classList.add("tada");

    let bidElement = document.getElementById("bid-count-" + lotIndex);
    bidElement.classList.add("tada");

    //play sound effect
    playSoundEffect();

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
    entries = [];
    if (catalogueId) {
      console.log("refreshAllEntries calls getEntries");
      return getEntries(catalogueId);
    }
  }

  function playSoundEffect() {
    var audio = new Audio("sound/coin_sound.mp3");
    audio.play();
  }

  function addLiveHistory(newEntry) {
    console.log("addLiveHistory called : ", newEntry);
    liveHistory = newEntry;
  }

  function scrollTo(event) {
    const lotNumber = event.detail.text;
    console.log(lotNumber);

    let el = document.getElementById("lot" + lotNumber);
    // console.log(`scrolling el : `, el);
    if (el) {
      //set position
      const height = el.offsetTop;
      console.log(`scrolling height : `, height);
      window.scroll(0, height);

      //color change
      let tdItems = el.getElementsByTagName("td");
      for (let i = 0; i < tdItems.length; i++) {
        tdItems[i].setAttribute("style", "background-color:#a3d3e3");
      }

      setTimeout(() => {
        console.log(`setTimeout is called tdItems : `, tdItems);
        for (let i = 0; i < tdItems.length; i++) {
          tdItems[i].removeAttribute("style");
        }
      }, 3000);
    }
  }

  function scrollToTop() {
    window.scroll(0, 0);
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
  tr.strikeout td {
    position: relative;
  }
  tr.strikeout td:before {
    content: " ";
    position: absolute;
    top: 50%;
    left: 0;
    border-bottom: 1px solid #111;
    width: 100%;
  }
  .cd-top {
    display: inline-block;
    height: 40px;
    width: 40px;
    position: fixed;
    bottom: 10px;
    right: 10px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
    /* image replacement properties */

    overflow: hidden;
    text-indent: 100%;
    white-space: nowrap;
    background: #3f5c8a url(/img/cd-top-arrow.svg) no-repeat center 50%;
    visibility: hidden;
    opacity: 0;
    -webkit-transition: opacity 0.3s 0s, visibility 0s 0.3s;
    -moz-transition: opacity 0.3s 0s, visibility 0s 0.3s;
    transition: opacity 0.3s 0s, visibility 0s 0.3s;
  }
  .cd-top.cd-is-visible,
  .cd-top.cd-fade-out,
  .no-touch .cd-top:hover {
    -webkit-transition: opacity 0.3s 0s, visibility 0s 0s;
    -moz-transition: opacity 0.3s 0s, visibility 0s 0s;
    transition: opacity 0.3s 0s, visibility 0s 0s;
  }
  .cd-top.cd-is-visible {
    /* the button becomes visible */

    visibility: visible;
    opacity: 1;
  }
  .cd-top.cd-fade-out {
    /* if the user keeps scrolling down, the button is out of focus and becomes less visible */

    opacity: 0.5;
  }
  .no-touch .cd-top:hover {
    background-color: #3f5c8a;
    opacity: 1;
  }

  @media only screen and (min-width: 768px) {
    .cd-top {
      right: 20px;
      bottom: 10px;
    }
  }
  @media only screen and (min-width: 1024px) {
    .cd-top {
      height: 60px;
      width: 60px;
      right: 30px;
      bottom: 10px;
    }
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

<div>
  {#if entries && entries.length > 0}
    <History newliveHistory={liveHistory} on:message={scrollTo} />
  {/if}
  <div class="container">
    {#if entries && entries.length > 0}
      <!-- <History newliveHistory={liveHistory} on:message={scrollTo} /> -->
      <div class="live-container">
        <div class="panel panel-default">
          <Statics
            {totalProfit}
            allLots={entries.length}
            soldLots={soldLots.length}
            unSoldLots={unSoldLots.length}
            withdrawnLots={withdrawnLots.length} />
          <div class="time">
            <div>
              {#if serverTime}
                Time : {moment(serverTime).format('DD/MM/YYYY - h:mm:ss a')}
              {/if}
              <div class="float-right">
                <button
                  class="btn btn-danger btn-sm"
                  on:click={refreshAllEntries}>
                  <!-- on:click={buttonAllRefreshClick()}> -->
                  All Refresh
                </button>
              </div>
            </div>
          </div>
          <div class="panel-body">
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
                  <tr
                    id={'lot' + entry.lot_index}
                    class={entry.status === 'X' ? 'strikeout' : ''}>
                    <td>{entry.lot_index}</td>
                    <td class="tada black">
                      <div id={'price-' + entry.lot_index} class="animated">
                        {#if entry.is_reserve}
                          {#if entry.reserve_price <= entry.current_price}
                            <span style="color: green;">
                              {entry.current_price}
                            </span>
                          {:else}
                            <span style="color: red;">
                              {entry.current_price}
                            </span>
                          {/if}
                        {:else if entry.bid_count > 0}
                          <span style="color: green;">
                            {entry.current_price}
                          </span>
                        {:else}
                          <span style="color: red;">{entry.current_price}</span>
                        {/if}
                        <!-- {entry.current_price} -->
                      </div>
                    </td>
                    <td>
                      {#if entry.is_reserve}
                        {#if entry.reserve_price <= entry.current_price}
                          <span style="color: green;">{entry.max_price}</span>
                        {:else}
                          <span style="color: red;">{entry.max_price}</span>
                        {/if}
                      {:else if entry.bid_count > 0}
                        <span style="color: green;">{entry.max_price}</span>
                      {:else}
                        <span style="color: red;">{entry.max_price}</span>
                      {/if}
                      <!-- {entry.max_price} -->
                    </td>
                    <td>
                      {#if entry.is_reserve}
                        {#if entry.reserve_price > entry.current_price}
                          <span style="color: red;">{entry.reserve_price}</span>
                        {:else}
                          <span
                            style="color: green;text-decoration: line-through;">
                            {entry.reserve_price}
                          </span>
                        {/if}
                      {/if}
                      <!-- {entry.is_reserve ? entry.reserve_price : ''} -->
                    </td>
                    <!-- <td>{entry.is_reserve ? entry.reserve_price : ''}</td> -->
                    <td>{entry.highestUserName}</td>
                    <td class="tada black">
                      <div id={'bid-count-' + entry.lot_index} class="animated">
                        {entry.bid_count}
                      </div>
                    </td>
                    <td>
                      {#if entry.status !== 'X'}
                        {getCountDownTime(Number(entry.end_time) - serverTime)}
                      {/if}
                    </td>
                    <td
                      style="font-weight: bold;color: {entry.status === 'S' || entry.status === 'X' ? 'red' : 'blue'}">
                      {getStatusName(entry.status)}
                    </td>
                    <td>
                      {#if entry.bid_count > 0}
                        <button
                          class="btn btn-primary btn-xs"
                          on:click={showPopup(entry._id)}>
                          History
                        </button>
                      {:else}
                        <button class="btn btn-primary btn-xs" disabled>
                          History
                        </button>
                      {/if}
                      <!-- <button
                      class="btn btn-warning btn-xs"
                      on:click={buttonClick(entry.lot_index)}>
                      Effect
                    </button> -->
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    {:else}
      <div style="margin: 200px;padding: 40px;text-align: center;">
        <h1>
          <b>{infoMessage}</b>
        </h1>
      </div>
    {/if}

    {#if showTopButton}
      <a
        href="#"
        role="button"
        class="cd-top cd-is-visible"
        on:click={scrollToTop}
        style="z-index: 10;">
        Top
      </a>
    {/if}
  </div>
</div>
