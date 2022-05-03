var interval = 30000; // 1000 = 1 second, 30000 = 30 seconds;
setInterval(loadData, interval);

function drawBarGraphs(data) {
  new Chart(document.getElementById("bar-chart"), {
    type: "bar",
    data: {
      labels: ["Inductions", "Trainings", "OtherBookings"],
      datasets: [
        {
          backgroundColor: [
            "rgba(185, 240, 173, 0.7)",
            "rgba(109, 158, 227, 0.7)",
            "rgba(235, 173, 240, 0.7)",
          ],
          borderColor: "black",
          data: [data[2], data[3], data[4]],
          barThickness: 300,
        },
      ],
    },
    options: {
      title: {
        display: true,
        text: "Total Bookings Dashboard",
        fontSize: 30,
      },
      scales: {
        xAxes: [
          {
            ticks: { fontSize: 20 },
          },
        ],
        yAxes: [
          {
            ticks: {
              min: 0,
            },
          },
        ],
      },
      legend: { display: false },
      tooltips: {
        bodyFontSize: 20,
        titleFontSize: 30,
      },
    },
  });
}

function drawLineGraph(data) {
  new Chart(document.getElementById("line-chart"), {
    type: "bar",
    data: {
      labels: data[0],
      datasets: [
        {
          type: "line",
          borderColor: "#8e5ea2",
          data: data[1],
          fill: false,
        },
      ],
    },
    options: {
      title: {
        display: true,
        text: "Induction Series Dashboard",
        fontSize: 30,
      },
      scales: {
        xAxes: [
          {
            ticks: { fontSize: 20 },
          },
        ],
        yAxes: [
          {
            ticks: {
              min: 0,
            },
          },
        ],
      },
      legend: { display: false },
      tooltips: {
        bodyFontSize: 20,
        titleFontSize: 30,
      },
    },
  });
}

function loadData() {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "/getskedupdate", true);

  console.log("READYSTATE: ", xhr.readyState);

  xhr.onprogress = function () {
    console.log("READYSTATE: ", xhr.readyState);
  };

  xhr.onload = function () {
    console.log("READYSTATE: ", xhr.readyState);
    if (this.status == 200) {
      var data = JSON.parse(this.responseText);

      drawBarGraphs([
        data.labels,
        data.inductDataSet,
        data.totInductions,
        data.totTrainings,
        data.totGenSkeds,
      ]);

      drawLineGraph([
        data.labels,
        data.inductDataSet,
        data.totInductions,
        data.totTrainings,
        data.totGenSkeds,
      ]);
    } else if ((this.status = 404)) {
      document.getElementById("text").innerHTML = "Not Found";
    }
  };

  xhr.onerror = function () {
    console.log("Request Error...");
  };

  xhr.send(); //sends request
}
