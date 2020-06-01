import Config from "../environments/config";
const BACKEND_END_POINT_COMMIN = Config.BACKEND_END_POINT_COMMIN;
const EntryService = {
  getAuctionData: async function getAuctionData(catalogueId, authToken) {
    // errorMessage = undefined;
    const token = authToken;

    let response = await fetch(BACKEND_END_POINT_COMMIN, {
      // TODO: test
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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
          }`,
    });

    return response.json();
  },

  getCatalogue: async function getCatalogue(authToken) {
    const token = authToken;
    console.log("Auth token : ", token);

    let response = await fetch(BACKEND_END_POINT_COMMIN, {
      // TODO: test
      method: "POST",

      headers: new Headers({
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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
          }`,
    });

    return response.json();
  },

  getBiddingHistory: async function getBiddingHistory(entryId, authToken) {
    const token = authToken;
    console.log("Auth token : ", token);

    let response = await fetch(BACKEND_END_POINT_COMMIN, {
      // TODO: test
      method: "POST",

      headers: new Headers({
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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
          }`,
    });

    return response.json();
  },
};

export default EntryService;
