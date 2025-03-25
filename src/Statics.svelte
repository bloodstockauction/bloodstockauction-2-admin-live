<script>
  export let totalProfit;
  export let commissionProfit;
  export let allLots;
  export let soldLots;
  export let unSoldLots;
  export let withdrawnLots;

  function addCommas(number) {
    let nStr;

    if (typeof number == "string") {
      nStr = number;
    } else if (typeof number == "number") {
      nStr = number.toString();
    } else {
      // console.error("ERROR addCommas() : ", number);
      return;
    }
    nStr += "";
    let x = nStr.split(".");
    let x1 = x[0];
    let x2 = x.length > 1 ? "." + x[1] : "";
    let rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
      x1 = x1.replace(rgx, "$1" + "," + "$2");
    }
    return x1 + x2;
  }
</script>

<style>
  .statics-column {
    width: 20%;
  }
  .statics-wide-column {
    width: 24%;
  }
  .statics-small-column {
    width: 18%;
  }
  .statics-column .statics-container,
  .statics-wide-column .statics-container,
  .statics-small-column .statics-container {
    margin: 5px;
  }
</style>

<div>
  <div class="row row-bg">
    <div class="statics-wide-column">
      <div class="statics-container">
        <div class="statbox widget box box-shadow">
          <div class="widget-content">
            <div class="visual green">
              <i class="fa fa-usd fa-2x" />
            </div>
            <div class="title">Total (commission) Sales</div>
            <div class="value">
              ${addCommas(totalProfit)}
              <small style="font-size: 10px;">
                (${addCommas(commissionProfit)})
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="statics-column">
      <div class="statics-container">
        <div class="statbox widget box box-shadow">
          <div class="widget-content">
            <div class="visual green">
              <i class="fa fa-thumbs-up fa-2x" />
            </div>
            <div class="title">Sold</div>
            <div class="value">
              {soldLots} lots
              <small style="font-size: 10px;">
                ({((soldLots / (allLots - withdrawnLots)) * 100).toFixed(1)}%)
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="statics-column">
      <div class="statics-container">
        <div class="statbox widget box box-shadow">
          <div class="widget-content">
            <div class="visual yellow">
              <i class="fa fa-frown-o fa-2x" />
            </div>
            <div class="title">Unsold</div>
            <div class="value">
              {unSoldLots} lots
              <small style="font-size: 10px;">
                ({((unSoldLots / (allLots - withdrawnLots)) * 100).toFixed(1)}%)
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="statics-small-column">
      <div class="statics-container">
        <div class="statbox widget box box-shadow">
          <div class="widget-content">
            <div class="visual red">
              <i class="fa fa-thumbs-down fa-2x" />
            </div>
            <div class="title">Withdrawn</div>
            <div class="value">
              {withdrawnLots} lots
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="statics-small-column">
      <div class="statics-container">
        <div class="statbox widget box box-shadow">
          <div class="widget-content">
            <div class="visual blue">
              <i class="fa fa-bar-chart fa-2x" />
            </div>
            <div class="title">Total ( Except Withdrawn )</div>
            <div class="value">{allLots} ({allLots - withdrawnLots}) lots</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
