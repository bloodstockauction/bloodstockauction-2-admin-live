<script>
  export const APP_VERSION = "1.0.2";
</script>
<style>
  .header {
    background-color: #4d7496;
    color: white;
    font-size: 18px;
    padding: 10px 20px;
  }

  .header-row {
    display: flex;
    align-items: center;
  }

  .title {
    font-size: 25px;
    margin-right: 10px;
  }

  .version {
    font-size: 13px;
    opacity: 0.85;
    margin-top: 4px;
  }
</style>

<div class="header">
  <div class="container">
    <div class="header-row">
      <div class="title">Bloodstockauction Admin Live</div>
      <div class="version">v{APP_VERSION}</div>
    </div>
  </div>
</div>
