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
  import FlashMessage from "./FlashMessage.svelte";
  import Statics from "./Statics.svelte";
  import BidPopup from "./BidPopup.svelte";

  //service
  import EntryService from "./service/entries";

  const { open } = getContext("simple-modal");
  const AUTH_ID = Config.AUTH_ID;
  const SOCKET_END_POINT = Config.SOCKET_END_POINT;

  let infoMessage = "Loading..";
  let entries = [];
  let serverTime = 0;
  let ioClient;
  let socketId;
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
  let allLiveHistories = [];

  //window scroll
  let showTopButton = false;

  //sales statics
  let totalProfit = 0;
  let commissionProfit = 0;
  let soldLots = [];
  let unSoldLots = [];
  let withdrawnLots = [];

  //filtering
  let filterType = "all";

  //sleep and wakeup check
  let TIMEOUT = 20000;
  let lastSync = new Date().getTime();

  //bidding popup
  let biddingLotIndex;
  let biddingMessage;
  let biddingSuccess;

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

          //set Sync
          initSync();
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
    console.log("initWindowScrollButton is called");
    window.addEventListener("scroll", function() {
      // console.log("onscroll is called : ", window.pageYOffset);
      if (window.pageYOffset > 300) {
        showTopButton = true;
      } else {
        showTopButton = false;
      }
    });
  }

  function initSocket() {
    //init socket for auction
    if (!ioClient) {
      console.log("socket is openning");
      ioClient = io.connect(SOCKET_END_POINT);

      ioClient.on("connect", () => {
        socketId = ioClient.id;
        console.log("socketId : ", socketId);
      });

      ioClient.on("auction", msg => {
        // console.info(msg);

        if (msg.type === "bid") {
          //get result for user biddings
          console.log("bid result: ", msg.data);
          biddingMessage = `Lot #${biddingLotIndex} - ` + msg.data.message;
          biddingSuccess = msg.data.result === "success" ? true : false;
        } else if (msg.type === "all") {
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
            let isUpdateSalesStatics = false;
            if (entries[entryIndex].current_price !== newEntry.current_price) {
              tadaAnimation(lotIndex);

              //update live history
              const newLiveHistory = {
                lot: lotIndex,
                // prev_price: entries[entryIndex].current_price,
                current_price: newEntry.current_price,
                date: new Date()
              };
              addLiveHistory(newLiveHistory);
              //set to update sales statics
              isUpdateSalesStatics = true;
            }

            // console.log("updateEntry() : ", entries[entryIndex]);
            entries[entryIndex].current_price = newEntry.current_price;
            entries[entryIndex].bid_count = newEntry.bid_count;
            entries[entryIndex].end_time = newEntry.end_time;
            entries[entryIndex].status = newEntry.status;

            //update entry data
            updateEntryDetail(entries[entryIndex]._id, entryIndex, authToken);

            //update current status and background color
            setCurrentStatus(entries[entryIndex]);

            //update sales statics
            if (isUpdateSalesStatics) {
              initSalesStatics(entries);
            }
          }
        }
      });
    } else {
      console.info("socket is already initialized");
    }
  }

  async function getEntries(catalogueId) {
    const isExpired = isTokenExpired(authToken);
    console.log("idToken expired : ", isTokenExpired(authToken));
    if (isExpired === true) {
      localStorage.removeItem(AUTH_ID);
      return navigate("/login", { replace: true });
    }

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
        // console.log("entry bids : ", entry.bids);
        const lastBidding = entry.bids[entry.bids.length - 1];
        // console.log("Max bidding : ", entry.lot_index, lastBidding);
        entry.max_price = lastBidding.max_amount;
        entry.highestUserName = lastBidding.user_fullname;

        let highestBidderList = [];

        const bidHistory = entry.bids.reverse();
        highestBidderList = getUnique(bidHistory, "user");

        //splics top 3 only
        highestBidderList = highestBidderList.slice(0, 3);
        // console.log("highestBidderList : ", highestBidderList);

        entry.highestBidderList = highestBidderList;
      } else {
        entry.max_price = 500;
        entry.highestUserName = "";
        entry.highestBidderList = [];
      }

      setCurrentStatus(entry);
    }

    //init sales static
    initSalesStatics(entries);

    //init Live Bidding Logs
    initLiveBiddingLogs(entries);
  }

  function getUnique(arr, comp) {
    // store the comparison  values in array
    const unique = arr
      .map(e => e[comp])

      // store the indexes of the unique objects
      .map((e, i, final) => final.indexOf(e) === i && i)

      // eliminate the false indexes & return unique objects
      .filter(e => arr[e])
      .map(e => arr[e]);

    return unique;
  }

  function initSalesStatics(allEntries) {
    console.log("initSalesStatics is called : ", allEntries);
    soldLots = [];
    unSoldLots = [];
    withdrawnLots = [];

    for (let index = 0; index < allEntries.length; index++) {
      let entry = allEntries[index];

      if (entry.status === "X") {
        withdrawnLots.push(entry);
      } else {
        if (entry.is_reserve === true) {
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

    const commisionLots = soldLots; // changed to add all sold listings

    commissionProfit =
      0.05 *
      commisionLots.reduce(function(sum, entry) {
        // if(entry.is_complimentary){
        //   return sum;
        // }else{
        //   return sum + entry.current_price;
        // }
        return sum + entry.current_price;
      }, 0);

    console.log("soldLots : ", soldLots);
    console.log("unSoldLots : ", unSoldLots);
    console.log("withdrawnLots : ", withdrawnLots);
    console.log("totalProfit : ", totalProfit);
    console.log("commissionProfit : ", commissionProfit);
  }

  function initLiveBiddingLogs(allEntries) {
    console.log("initLiveBiddingLogs is called : ", allEntries);
    let allLiveBiddingLogs = [];

    for (let index = 0; index < allEntries.length; index++) {
      const entry = allEntries[index];
      // console.log("initLiveBiddingLogs entry : ", entry);

      if (entry.bid_count > 0) {
        // console.log("initLiveBiddingLogs bid_count > 0 : ", entry);
        for (let bidIndex = 0; bidIndex < entry.bids.length; bidIndex++) {
          const bidHistory = entry.bids[bidIndex];
          // console.log("initLiveBiddingLogs bidHistory : ", bidHistory);

          const liveBiddingLog = {
            lot: entry.lot_index,
            current_price: bidHistory.amount,
            date: Number(bidHistory.date)
          };
          // console.log("liveBiddingLog : ", liveBiddingLog);
          allLiveBiddingLogs.push(liveBiddingLog);
        }
      }
    }

    // console.log("allLiveBiddingLogs : ", allLiveBiddingLogs);

    allLiveBiddingLogs.sort((a, b) => (a.date < b.date ? 1 : -1));

    allLiveBiddingLogs = allLiveBiddingLogs.slice(0, 10);
    console.log("allLiveBiddingLogs sorted : ", allLiveBiddingLogs);

    allLiveHistories = allLiveBiddingLogs;
  }

  async function showPopup(entryId) {
    console.log("showPopup is called : ", entryId);

    const isExpired = isTokenExpired(authToken);
    console.log("idToken expired : ", isTokenExpired(authToken));
    if (isExpired === true) {
      localStorage.removeItem(AUTH_ID);
      return navigate("/login", { replace: true });
    }

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

          //update top 3 bidder information
          let highestBidderList = [];
          highestBidderList = getUnique(history, "user");

          //splics top 3 only
          highestBidderList = highestBidderList.slice(0, 3);
          // console.log("highestBidderList : ", highestBidderList);

          entries[entryIndex].highestBidderList = highestBidderList;
        }
      }
      open(Popup, { bids: history });
    }
  }

  async function updateEntryDetail(entryId, entryIndex, authToken) {
    const isExpired = isTokenExpired(authToken);
    console.log("idToken expired : ", isTokenExpired(authToken));
    if (isExpired === true) {
      localStorage.removeItem(AUTH_ID);
      return navigate("/login", { replace: true });
    }

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

        //update top 3 bidder information
        let highestBidderList = [];
        highestBidderList = getUnique(history, "user");

        //splics top 3 only
        highestBidderList = highestBidderList.slice(0, 3);
        // console.log("highestBidderList : ", highestBidderList);

        entries[entryIndex].highestBidderList = highestBidderList;
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
    if (priceElement) {
      priceElement.classList.add("tada");
    }

    let bidElement = document.getElementById("bid-count-" + lotIndex);
    if (bidElement) {
      bidElement.classList.add("tada");
    }

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

  function addLiveHistory(newBiddingHistory) {
    console.log("addLiveHistory called : ", newBiddingHistory);

    allLiveHistories.unshift(newBiddingHistory);
    allLiveHistories.slice(0, 10);

    console.log("addLiveHistory allLiveHistories : ", allLiveHistories);

    //to emit update event in History module : forcely asign value
    allLiveHistories = allLiveHistories;
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

  function getBidderPosition(index) {
    if (index === 0) {
      return "1st";
    } else if (index === 1) {
      return "2nd";
    } else if (index === 2) {
      return "3rd";
    } else {
      return "";
    }
  }

  function setCurrentStatus(entry) {
    // console.log("setCurrentStatus is called : ", entry);

    if (entry.is_reserve) {
      if (entry.reserve_price <= entry.current_price) {
        entry.current_status = "sold";
      } else {
        entry.current_status = "unSoldReserve";
      }
    } else {
      if (entry.bid_count > 0) {
        entry.current_status = "sold";
      } else {
        entry.current_status = "unSoldUnreserve";
      }
    }
  }

  function setFilter(Type) {
    console.log("setFilter is called : ", Type);
    filterType = Type;
    console.log("new filter type : ", filterType);
  }

  function initSync() {
    setInterval(function() {
      var currentTime = new Date().getTime();
      if (currentTime > lastSync + TIMEOUT + 2000) {
        // Wake!
        console.log("WAKE UP NOW");

        //check JWT authentication
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
          } else {
            //refresh all entries data
            refreshAllEntries();
          }
        }
      } else {
        console.log("NOT SLEEP YET");
      }
      lastSync = currentTime;
    }, TIMEOUT);
  }

  function bid(entryId, lotIndex, price) {
    console.log("bid is called : ", entryId, lotIndex, price);

    //remove bidding result messages
    biddingLotIndex = undefined;
    biddingMessage = "";

    //auth Token check
    const decoded = jwtDecode(authToken);
    console.log("authToken decoded : ", decoded);

    if (decoded.role !== "admin") {
      localStorage.removeItem(AUTH_ID);
      return navigate("/login", { replace: true });
    }

    if (!decoded.username || !decoded.full_name) {
      localStorage.removeItem(AUTH_ID);
      return navigate("/login", { replace: true });
    }

    const isExpired = isTokenExpired(authToken);
    console.log("authToken expired : ", isTokenExpired(authToken));
    if (isExpired === true) {
      localStorage.removeItem(AUTH_ID);
      return navigate("/login", { replace: true });
    }

    let bidData = {
      id: socketId,
      entryId: entryId,
      token: authToken,
      username: decoded.username,
      user_fullname: decoded.full_name,
      price: price
    };

    console.log("bidData : ", bidData);
    biddingLotIndex = lotIndex;
    ioClient.emit("bid", bidData);
  }

  let biddingPrice;

  const onCancel = price => {
    biddingPrice = 0;
  };

  const onConfirm = (entryId, lotIndex, price) => {
    biddingPrice = price;
    console.log("onConfirm is called : ", entryId, lotIndex, biddingPrice);

    //call bid function
    bid(entryId, lotIndex, price);
  };

  const showDialog = (lotIndex, entryId, currentPrice) => {
    console.log("showDialog is called : ", lotIndex, entryId);

    const isExpired = isTokenExpired(authToken);
    console.log("idToken expired : ", isTokenExpired(authToken));
    if (isExpired === true) {
      localStorage.removeItem(AUTH_ID);
      return navigate("/login", { replace: true });
    }

    open(
      BidPopup,
      {
        lotIndex: lotIndex,
        entryId: entryId,
        currentPrice: currentPrice,
        onCancel,
        onConfirm
      },
      {
        closeButton: false,
        closeOnEsc: false,
        closeOnOuterClick: false
      }
    );
  };
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
  .small-button {
    border-radius: 4px;
    padding: 2px 3px;
    font-size: 9px !important;
  }
  .gold {
    background-color: #ffd700 !important;
  }
  .silver {
    background-color: #a9a9a9 !important;
  }
  .bronze {
    background-color: #d28c47 !important;
  }
  .admin thead tr {
    font-size: 15px;
    background-color: #3f5c8a;
    color: white;
  }
  .left-align {
    text-align: left;
  }
  .sold {
    background-color: #ecfae6;
  }
  .unSold {
    background-color: #f76d6a;
    color: white;
  }
  .price-mark {
    color: #3968c6;
  }
</style>

<div>
  <FlashMessage message={biddingMessage} success={biddingSuccess} />
  {#if entries && entries.length > 0}
    <History allHistories={allLiveHistories} on:message={scrollTo} />
  {/if}
  <div class="container">
    {#if entries && entries.length > 0}
      <div class="live-container">
        <div class="panel panel-default">
          <Statics
            {totalProfit}
            {commissionProfit}
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
          <div>
            <ul class="nav nav-tabs justify-content-end">
              <li class="nav-item">
                <a
                  href="#top"
                  class={filterType === 'all' ? 'nav-link active' : 'nav-link'}
                  on:click={() => setFilter('all')}>
                  All
                </a>
              </li>
              <li class="nav-item">
                <a
                  href="#top"
                  class={filterType === 'unSold' ? 'nav-link active' : 'nav-link'}
                  on:click={() => setFilter('unSoldUnreserve')}>
                  Unsold(UnReserve)
                </a>
              </li>
              <li class="nav-item">
                <a
                  href="#top"
                  class={filterType === 'unSold' ? 'nav-link active' : 'nav-link'}
                  on:click={() => setFilter('unSoldReserve')}>
                  Unsold(Reserve)
                </a>
              </li>
              <li class="nav-item">
                <a
                  href="#top"
                  class={filterType === 'sold' ? 'nav-link active' : 'nav-link'}
                  on:click={() => setFilter('sold')}>
                  Sold
                </a>
              </li>
              <li class="nav-item">
                <a
                  href="#top"
                  class={filterType === 'max' ? 'nav-link active' : 'nav-link'}
                  on:click={() => setFilter('max')}>
                  Max
                </a>
              </li>
            </ul>
          </div>
          <div class="panel-body">
            <table class="table table-striped admin">
              <thead>
                <tr>
                  <td>Lot</td>
                  <td>Name</td>
                  <td>Price</td>
                  <td>Max Price</td>
                  <td>Reserve Price</td>
                  <td class="left-align">Highest bidders</td>
                  <td class="left-align">Vendor</td>
                  <td>Bids</td>
                  <td>Time</td>
                  <td>Status</td>
                  <td>Package</td>
                  <td>Actions</td>
                </tr>
              </thead>
              <tbody>
                {#each entries as entry}
                  {#if filterType === 'all' || (filterType !== 'max' && entry.current_status === filterType) || (filterType === 'max' && entry.current_price !== entry.max_price)}
                    <tr
                      id={'lot' + entry.lot_index}
                      class={entry.status === 'X' ? 'strikeout' : ''}>
                      <td
                        class={entry.current_status === 'sold' ? 'sold' : 'unSold'}>
                        {entry.lot_index}
                      </td>
                      <td
                        class={entry.current_status === 'sold' ? 'sold' : 'unSold'}>
                        {#if entry.horse.name.indexOf('Unnamed') > -1}
                          {entry.horse.name} ({entry.horse.sire})
                        {:else}{entry.horse.name}{/if}
                      </td>
                      <td
                        class={entry.current_status === 'sold' ? 'tada black sold' : 'tada black unSold'}>
                        <div
                          id={'price-' + entry.lot_index}
                          class={entry.current_price === entry.max_price ? 'animated' : 'animated price-mark'}>
                          {entry.current_price}
                        </div>
                      </td>
                      <td
                        class={entry.current_status === 'sold' ? 'sold' : 'unSold'}>
                        <div
                          class={entry.current_price === entry.max_price ? '' : 'price-mark'}>
                          {entry.max_price}
                        </div>
                      </td>
                      <td
                        class={entry.current_status === 'sold' ? 'sold' : 'unSold'}>
                        {#if entry.is_reserve}
                          {#if entry.reserve_price > entry.current_price}
                            <span>{entry.reserve_price}</span>
                          {:else}
                            <span
                              style="color: green;text-decoration: line-through;">
                              {entry.reserve_price}
                            </span>
                          {/if}
                        {/if}
                      </td>
                      <td
                        class={entry.current_status === 'sold' ? 'left-align sold' : 'left-align unSold'}>
                        {#each entry.highestBidderList as bidder, index}
                          <div
                            style="padding: 1px; font-size: {index === 0 ? '14px' : '11px'}">
                            <span>
                              <button
                                class="btn btn-primary btn-xs small-button {index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze'}">
                                {getBidderPosition(index)}
                              </button>
                            </span>
                            {bidder.user_fullname} - {bidder.max_amount}
                          </div>
                        {/each}
                      </td>
                      <td
                        class={entry.current_status === 'sold' ? 'left-align sold' : 'left-align unSold'}>
                        <div>
                          {entry.vendor.name.firstname}
                          {entry.vendor.name.surname}
                        </div>
                      </td>
                      <td
                        class={entry.current_status === 'sold' ? 'tada black sold' : 'tada black unSold'}>
                        <div
                          id={'bid-count-' + entry.lot_index}
                          class="animated">
                          {entry.bid_count}
                        </div>
                      </td>
                      <td
                        class={entry.current_status === 'sold' ? 'sold' : 'unSold'}>
                        {#if entry.status !== 'X'}
                          {getCountDownTime(Number(entry.end_time) - serverTime)}
                        {/if}
                      </td>
                      <td
                        class={entry.current_status === 'sold' ? 'sold' : 'unSold'}
                        style="font-weight: bold;color: {entry.status === 'S' || entry.status === 'X' ? 'red' : 'blue'}">
                        {getStatusName(entry.status)}
                      </td>
                      <td
                        class={entry.current_status === 'sold' ? 'sold' : 'unSold'}>
                        {#if entry.is_no_sales_no_fee === true}
                          {entry.package + "(NSNF)"} 
                        {:else}
                          {entry.package}
                        {/if}
                      </td>
                      <td
                        class={entry.current_status === 'sold' ? 'sold' : 'unSold'}>
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

                        {#if socketId}
                          <button
                            class="btn btn-warning btn-xs"
                            on:click={showDialog(entry.lot_index, entry._id, entry.current_price)}
                            disabled={entry.status !== 'A'}>
                            Bid
                          </button>
                        {:else}
                          <button class="btn btn-primary btn-xs" disabled>
                            Bid
                          </button>
                        {/if}

                      </td>
                    </tr>
                  {/if}
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
        href="#top"
        role="button"
        class="cd-top cd-is-visible"
        on:click={scrollToTop}
        style="z-index: 10;">
        Top
      </a>
    {/if}
  </div>
</div>
