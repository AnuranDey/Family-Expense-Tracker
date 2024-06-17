var datetime = new Date().toLocaleTimeString();
document.getElementById("time").textContent = datetime;

function refreshTime() {
  var Updatedtime = new Date().toLocaleTimeString();
  document.getElementById("time").textContent = Updatedtime;
}
setInterval(refreshTime, 1000);
