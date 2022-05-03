function formatDate(date) {
  var d = new Date(date),
    month = "" + (d.getMonth() + 1),
    day = "" + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  return [year, month, day].join("-");
}

function numToTime(num) {
  const numStr = num > 12 ? (num - 12).toString() : num.toString();
  const postFix = num <= 12 ? "AM" : "PM";
  return (
    (parseInt(numStr) < 10 ? numStr.padStart(2, "0") + ":00" : numStr + ":00") +
    postFix
  );
}

function checkTrainDate() {
  const date_train = moment(document.getElementById("train_date").value).format(
    "YYYY-MM-DD"
  );
  const files_obj = document.getElementById("train_date1").value;
  const inductions = document.getElementById("inductions").value;
  const holidays = document.getElementById("holidays").value;
  const selSession1 = document.getElementById("train_session1");
  const selSession2 = document.getElementById("train_session2");
  const lastInductSession = parseInt(
    document.getElementById("lastinductsession").value.substr(10)
  );
  const bannerTitle = document.getElementById("date_dup").innerHTML;
  const isAdding = document.getElementById("is_adding").value;
  let startSession1 = 0;

  let skedSession1 = [];
  let skedSession2 = [];

  console.log(lastInductSession);
  console.log(date_train);
  console.log(typeof date_train);
  console.log(typeof isAdding);
  console.log(isAdding);

  startSession1 =
    parseInt(inductions.search(date_train)) !== -1 ? lastInductSession : 8;

  for (let i = startSession1; i < startSession1 + 8; i++) {
    skedSession1.push(numToTime(i) + " - " + numToTime(i + 1));
  }

  skedSession2 = skedSession1.slice(1);

  if (isAdding === "true") {
    if (
      moment(date_train).format("YYYY-MM-DD") <= moment().format("YYYY-MM-DD")
    ) {
      document.getElementById("date_dup").innerHTML =
        "Training date cannot be lower than or equal the current date";
      document.getElementById("add_button").disabled = true;
      document.getElementById("train_title").disabled = true;
      document.getElementById("train_session1").disabled = true;
      document.getElementById("train_session2").disabled = true;
      document.getElementById("train_venue").disabled = true;
      document.getElementById("train_pax").disabled = true;
      document.getElementById("train_avail").disabled = true;
    } else {
      if (
        parseInt(files_obj.search(date_train)) !== -1 ||
        parseInt(holidays.search(date_train)) !== -1
      ) {
        document.getElementById("date_dup").innerHTML =
          "Selected date not allowed - duplicate/holiday";
        document.getElementById("add_button").disabled = true;
        document.getElementById("train_title").disabled = true;
        document.getElementById("train_session1").disabled = true;
        document.getElementById("train_session2").disabled = true;
        document.getElementById("train_venue").disabled = true;
        document.getElementById("train_pax").disabled = true;
        document.getElementById("train_avail").disabled = true;
      } else {
        /* "Manage Trainings" */
        document.getElementById("date_dup").innerHTML = bannerTitle;
        document.getElementById("add_button").disabled = false;
        document.getElementById("train_title").disabled = false;
        document.getElementById("train_session1").disabled = false;
        document.getElementById("train_session2").disabled = false;
        document.getElementById("train_venue").disabled = false;
        document.getElementById("train_pax").disabled = false;
        document.getElementById("train_avail").disabled = false;
      }
    } //else moment()
  } //isAdding
} //function checkTrainDate()

function checkGenSkedDate() {
  const date_train = moment(
    document.getElementById("gensked_date").value
  ).format("YYYY-MM-DD");
  const files_obj = document.getElementById("gensked_date1").value;
  const inductions = document.getElementById("inductions").value;
  const holidays = document.getElementById("holidays").value;
  const selSession1 = document.getElementById("gensked_session1");
  const selSession2 = document.getElementById("gensked_session2");
  const lastInductSession = parseInt(
    document.getElementById("lastinductsession").value.substr(10)
  );
  const bannerTitle = document.getElementById("date_dup").innerHTML;
  const isAdding = document.getElementById("is_adding").value;
  let startSession1 = 0;

  let skedSession1 = [];
  let skedSession2 = [];

  console.log(lastInductSession);
  console.log(date_train);
  console.log(typeof date_train);
  console.log(typeof isAdding);
  console.log(isAdding);

  startSession1 =
    parseInt(inductions.search(date_train)) !== -1 ? lastInductSession : 8;

  for (let i = startSession1; i < startSession1 + 8; i++) {
    skedSession1.push(numToTime(i) + " - " + numToTime(i + 1));
  }

  skedSession2 = skedSession1.slice(1);

  if (isAdding === "true") {
    if (
      moment(date_train).format("YYYY-MM-DD") <= moment().format("YYYY-MM-DD")
    ) {
      document.getElementById("date_dup").innerHTML =
        "Booking date cannot be lower than or equal the current date";
      document.getElementById("add_button").disabled = true;
      document.getElementById("train_title").disabled = true;
      document.getElementById("train_session1").disabled = true;
      document.getElementById("train_session2").disabled = true;
      document.getElementById("train_venue").disabled = true;
      document.getElementById("train_pax").disabled = true;
      document.getElementById("train_avail").disabled = true;
    } else {
      if (
        parseInt(files_obj.search(date_train)) !== -1 ||
        parseInt(holidays.search(date_train)) !== -1
      ) {
        document.getElementById("date_dup").innerHTML =
          "Selected date not allowed - duplicate/holiday";
        document.getElementById("add_button").disabled = true;
        document.getElementById("train_title").disabled = true;
        document.getElementById("train_session1").disabled = true;
        document.getElementById("train_session2").disabled = true;
        document.getElementById("train_venue").disabled = true;
        document.getElementById("train_pax").disabled = true;
        document.getElementById("train_avail").disabled = true;
      } else {
        /* "Manage Trainings" */
        document.getElementById("date_dup").innerHTML = bannerTitle;
        document.getElementById("add_button").disabled = false;
        document.getElementById("train_title").disabled = false;
        document.getElementById("train_session1").disabled = false;
        document.getElementById("train_session2").disabled = false;
        document.getElementById("train_venue").disabled = false;
        document.getElementById("train_pax").disabled = false;
        document.getElementById("train_avail").disabled = false;
      }
    } //else moment()
  } //isAdding
} //function checkTrainDate()

function changeButtonTitle(titleText, titleUrl) {
  document.getElementById("button").innerHTML = `Manage ${titleText}`;
  document.getElementById("button").href = titleUrl;
  document.getElementById("button").disabled = false;
}

function loadSked() {
  var xhr = new XMLHttpRequest();

  xhr.open("GET", "/getskedupdate", true);

  xhr.onprogress = function () {};

  xhr.onload = function () {
    if (this.status == 200) {
      const sked = JSON.parse(this.responseText);
      const avail_date = sked.avail_date;
      let btnLabel = "";
      let isFull = false;
      avail_date.forEach((element, index) => {
        btnLabel =
          parseInt(element.booking_num1) <= 0
            ? "&nbspFully Booked"
            : "&nbspBook Now";
        isFull = parseInt(element.booking_num1) <= 0 ? true : false;
        document.getElementById(`isess1${index}`).innerHTML =
          element.booking_num1; //solved the issue: 24-Nov-21 --> Now updates the dashboard (Inductions screen) "live" - same with "livebooking"
        document.getElementById(`icon-${index}`).innerHTML = btnLabel;
        if (isFull) {
          document
            .getElementById(`ibtn${index}`)
            .setAttribute("disabled", "disabled");
        } else {
          document.getElementById(`ibtn${index}`).removeAttribute("disabled");
        }
      });

      let booktxt = "";
      sked.ongoingBooking.forEach((booking) => {
        booktxt = ` ${booking.bookedby}, ${booktxt}`;
      });
      document.getElementById("livebooking").innerHTML = sked.ongoingBooking
        .length
        ? `Live booking: ${sked.ongoingBooking.length} [${booktxt.slice(
            0,
            booktxt.length - 2
          )} ]`
        : "";
    } else if ((this.status = 404)) {
      document.getElementById("text").innerHTML = "Not Found";
    }
  };

  xhr.onerror = function () {
    console.log("Request Error...");
  };

  xhr.send();
}

function loadTrainSked() {
  // Create XHR Object
  var xhr = new XMLHttpRequest();
  // OPEN - type, url/file, async
  xhr.open("GET", "/getskedupdate", true);

  console.log("READYSTATE: ", xhr.readyState);

  // OPTIONAL - used for loaders
  xhr.onprogress = function () {
    console.log("READYSTATE: ", xhr.readyState);
  };

  xhr.onload = function () {
    console.log("READYSTATE: ", xhr.readyState);
    if (this.status == 200) {
      var sked = JSON.parse(this.responseText);

      //console.log(sked);

      //TRAININGS TAB
      let j = 0;
      const train_data = Object.values(sked.files);

      //console.log(train_data)
      let btnLabel = "";
      let isFull = false;

      train_data.forEach((train, i) => {
        btnLabel =
          parseInt(train.train_pax) - parseInt(train.train_tot_session1) <= 0
            ? "&nbspFully Booked"
            : "&nbspBook Now";
        isFull =
          parseInt(train.train_pax) - parseInt(train.train_tot_session1) <= 0
            ? true
            : false;

        document.getElementById(`sess1${i}`).innerHTML =
          train.train_pax - train.train_tot_session1 + " available";
        if (document.getElementById(`sess2${i}`)) {
          document.getElementById(`sess2${i}`).innerHTML =
            train.train_pax - train.train_tot_session2 + " available";
        }

        // Manage button label and state
        document.getElementById(`icon-${i}`).innerHTML = btnLabel;
        if (isFull) {
          document
            .getElementById(`btn${i}`)
            .setAttribute("disabled", "disabled");
        } else {
          document.getElementById(`btn${i}`).removeAttribute("disabled");
        }
      });
    } else if ((this.status = 404)) {
      document.getElementById("text").innerHTML = "Not Found";
    }
  };

  xhr.onerror = function () {
    console.log("Request Error...");
  };
  // Sends request
  xhr.send();
}

function countDown(n) {
  let minutes = n / 60;
  const mintxt = minutes > 1 ? "minutes" : "minute";
  document.getElementById(
    "expiring"
  ).innerHTML = `New booking expiring in: ${minutes.toFixed(2)} ${mintxt}`;
  if (n < 1) {
    return 0;
  }
  setTimeout(() => {
    countDown(n - 1);
  }, 1000);
}

function showBookForm(status) {
  document.getElementById("filetype").style.display = "none";
  document.getElementById("bookform").style.display = status;
  document.getElementById("agree").style.display =
    status === "none" ? "block" : "none";
  document.getElementById("btn_submit").disabled = true;

  setTimeout(() => {
    document.getElementById("cancel").click(); //programmatically press the cancel button --> 17-Nov-21
  }, 1800000); //auto-closes the booking screen after 30-minutes (finished or unfinished). Countdown() function displays the notification --> per Darren's email: 18-Nov-21
}

function doCancel() {
  document.getElementById("cancel").click();
}

function ssFname() {
  // alert("Hey Site Safe!");
  const fileObj = document.getElementById("ss_photo");
  fileValidation(fileObj, "ss_photo1");
  setSubmitButton();
}

function hsFname() {
  const fileObj = document.getElementById("headshot");
  fileValidation(fileObj, "headshot1");
  setSubmitButton();
}

function setSubmitButton() {
  document.getElementById("btn_submit").disabled = true;
  const allowedExtensions = /(\.jpg|\.jpeg|\.png|\.gif)$/i;
  if (
    allowedExtensions.exec(document.getElementById("ss_photo").value) &&
    allowedExtensions.exec(document.getElementById("headshot").value)
  ) {
    document.getElementById("btn_submit").disabled = false;
  }
}

function fileValidation(fileObj, id) {
  var allowedExtensions = /(\.jpg|\.jpeg|\.png|\.gif)$/i;

  if (!allowedExtensions.exec(fileObj.value)) {
    document.getElementById("filetype").style.display = "block";
    setTimeout(() => {
      document.getElementById("filetype").style.display = "none";
    }, 5000);
    fileObj = "";
    return false;
  } else {
    if (fileObj.files && fileObj.files[0]) {
      var reader = new FileReader();
      reader.onload = function (e) {
        document.getElementById(id).innerHTML =
          '<img src="' + e.target.result + '" class="imagePreview"/>';
      };

      reader.readAsDataURL(fileObj.files[0]);

      return true;
    }
  }
}

function startup() {
  document.getElementById("genfile").hidden = true;
}

function loadListObj(listObj) {
  localStorage.setItem("listObj", listObj);
}

function filterTable() {
  var input, filter, table, tr, td, i, txtValue;
  input = document.getElementById("search");
  filter = input.value.toUpperCase();
  table = document.getElementById("table");
  tr = table.getElementsByTagName("tr");
  for (i = 0; i < tr.length; i++) {
    td = tr[i].getElementsByTagName("td")[1]; //Search by First Name
    if (td) {
      txtValue = td.textContent || td.innerText;
      if (txtValue.toUpperCase().indexOf(filter) > -1) {
        tr[i].style.display = "";
      } else {
        tr[i].style.display = "none";
      }
    }
  }
}

function filterViewCard(listObjLength) {
  var input, filter, card;
  input = document.getElementById("search-input");
  filter = input.value.toUpperCase();
  card = document.getElementsByClassName("card");
  // console.log(document.getElementsByTagName("h5"));
  // console.log(listObjLength);
  // document.getElementById("card-0").visibility = "hidden";
  for (i = 0; i < listObjLength; i++) {
    console.log(document.getElementById(`h5-${i}`).innerHTML.indexOf(filter));
    console.log(document.getElementById(`card-${i}`));
    if (document.getElementById(`h5-${i}`).innerHTML.indexOf(filter) == -1) {
      document.getElementById(`card-${i}`).style.display = "none";
    } else {
      document.getElementById(`card-${i}`).style.display = "block";
    }
  }
}

function filterTrainViewCard(listObjLength) {
  var input, filter, card;
  input = document.getElementById("search-input");
  filter = input.value.toUpperCase();
  card = document.getElementsByClassName("card");
  // console.log(document.getElementsByTagName("h5"));
  // console.log(listObjLength);
  // document.getElementById("card-0").visibility = "hidden";
  for (i = 0; i < listObjLength; i++) {
    console.log(
      document.getElementById(`h5-${i}`).innerHTML.toUpperCase().indexOf(filter)
    );
    console.log(document.getElementById(`card-${i}`));
    if (
      document
        .getElementById(`h5-${i}`)
        .innerHTML.toUpperCase()
        .indexOf(filter) == -1
    ) {
      document.getElementById(`card-${i}`).style.display = "none";
    } else {
      document.getElementById(`card-${i}`).style.display = "block";
    }
  }
}

function getList(dFrom, dTo) {
  if (empty(dFrom) || empty(dTo)) {
    document.getElementById("date_error").innerHTML =
      "Please enter valid dates...";
    setTimeout(() => {
      document.getElementById("date_error").innerHTML =
        "Manage Induction Bookings";
    }, 2000); //2 seconds delay
  } else {
    location.replace(
      dFrom === undefined || dTo === undefined
        ? "/print"
        : "/print/?" + "data1=" + dFrom + "&data2=" + dTo
    );
  }
}

function changeText(elementId, text) {
  //document.getElementById("filter_date").innerHtml = "Filter date: "+text
  document.getElementById("date_error").innerHtml = text;
}

function empty(data) {
  if (typeof data == "number" || typeof data == "boolean") {
    return false;
  }
  if (typeof data == "undefined" || data === null) {
    return true;
  }
  if (typeof data.length != "undefined") {
    return data.length == 0;
  }
  var count = 0;
  for (var i in data) {
    if (data.hasOwnProperty(i)) {
      count++;
    }
  }
  return count == 0;
}

function showAnimation() {
  document.getElementById("genfile").hidden = false;
  console.log("Animation shown!");
}

function hideAnimation() {
  document.getElementById("genfile").hidden = true;
  console.log("Animation hidden!");
}

function getExcelFile(method, url) {
  var xhr = new XMLHttpRequest();
  xhr.open(method, url, true);

  // Register the event handler
  xhr.onload = function () {
    if (this.status == 200) {
      const sked = JSON.parse(this.responseText);
      console.log(sked);
    } else {
      console.log("Error calling route");
    }
  };
  xhr.send();
  location.reload(); //have to call this to allow for the flash() message from the server to be displayed --> 06-Dec-21
}

function generateExcelFile(method, url) {
  var promise = new Promise((resolve, reject) => {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);

    xhr.onprogress = function (e) {
      //temporarily removed --> 23-Nov-21
      // var progressText = document.getElementById("progress-text");
      // var progress = document.getElementById("progress");
      // progress.max = e.total;
      // progress.value = e.loaded;
      // var percent_complete = (e.loaded / e.total) * 100;
      // percent_complete = Math.floor(percent_complete);
      // progressText.innerHTML = percent_complete + "%";
    };

    // Register the event handler
    xhr.onload = function () {
      // console.log("READYSTATE: ", xhr.readyState);
      // document.getElementById("progress").hidden=false

      if (this.status == 200) {
        const sked = JSON.parse(this.responseText);
        const baseUrl = location.protocol + "//" + location.host + "/image/";
        let num = 1;
        const dataLists = sked.map((user) => {
          //returned array must align with the colHeaders
          return [
            num++,
            baseUrl + user.headshot,
            user.firstname,
            user.lastname,
            user.phone,
            user.company,
            user.sitesafe,
            moment(user.expiry).format("DD-MM-YYYY"),
            baseUrl + user.ss_photo_filename,
            user.constructsafe,
            moment(user.date_attend).format("DD-MM-YYYY"),
            user.session_title,
            moment(user.bookdate).format("DD-MM-YYYY"),
            user.bookedby,
            user.emergency_person,
            user.emergency_phone,
            user.fcc_supervisor,
            user.workpack,
            user.company_supervisor,
            user.first_tier,
          ];
        });

        const colHeaders = [
          {
            header: "No.",
            key: "num",
            width: 4,
            style: {
              alignment: { vertical: "middle", horizontal: "center" },
            },
          },
          {
            header: "Photo",
            key: "photo",
            width: 27,
            style: {
              alignment: { vertical: "middle", horizontal: "center" },
            },
          },
          {
            header: "Firstname",
            key: "firstname",
            width: 20,
            style: {
              alignment: { vertical: "middle", horizontal: "center" },
            },
          },
          {
            header: "Last Name",
            key: "lastname",
            width: 20,
            style: {
              alignment: { vertical: "middle", horizontal: "center" },
            },
          },
          {
            header: "Phone",
            key: "phone",
            width: 15,
            style: {
              alignment: { vertical: "middle", horizontal: "center" },
            },
          },
          {
            header: "Company",
            key: "company",
            width: 30,
            style: {
              alignment: { vertical: "middle", horizontal: "center" },
            },
          },
          {
            header: "SiteSafe",
            key: "sitesafe",
            width: 27,
            style: {
              alignment: { vertical: "middle", horizontal: "center" },
            },
          },
          {
            header: "Expiry",
            key: "expiry",
            width: 20,
            style: {
              alignment: { vertical: "middle", horizontal: "center" },
            },
          },
          {
            header: "SiteSafe Photo",
            key: "ss_photo",
            width: 27,
            style: {
              alignment: { vertical: "middle", horizontal: "center" },
            },
          },
          {
            header: "Constructsafe",
            key: "constructsafe",
            width: 20,
            style: {
              alignment: { vertical: "middle", horizontal: "center" },
            },
          },
          {
            header: "Booked On",
            key: "booked_on",
            width: 20,
            style: {
              alignment: { vertical: "middle", horizontal: "center" },
            },
          },
          {
            header: "Session",
            key: "session",
            width: 20,
            style: {
              alignment: { vertical: "middle", horizontal: "center" },
            },
          },
          {
            header: "Date Booked",
            key: "date_booked",
            width: 20,
            style: {
              alignment: { vertical: "middle", horizontal: "center" },
            },
          },
          {
            // header: "Booked By",
            header: "Booked and Vaccine Confirmed By",
            key: "booked_by",
            width: 50,
            style: {
              alignment: { vertical: "middle", horizontal: "center" },
            },
          },
          {
            header: "Emergency Contact Person",
            key: "e_person",
            width: 40,
            style: {
              alignment: { vertical: "middle", horizontal: "center" },
            },
          },
          {
            header: "Emergency Contact Number",
            key: "e_num",
            width: 40,
            style: {
              alignment: { vertical: "middle", horizontal: "center" },
            },
          },
          {
            header: "FCC Authorised By",
            key: "fcc_supervisor",
            width: 20,
            style: {
              alignment: { vertical: "middle", horizontal: "center" },
            },
          },
          {
            header: "Workpack Number",
            key: "workpack",
            width: 20,
            style: {
              alignment: { vertical: "middle", horizontal: "center" },
            },
          },
          {
            header: "Company Supervisor",
            key: "supervisor",
            width: 20,
            style: {
              alignment: { vertical: "middle", horizontal: "center" },
            },
          },
          {
            header: "1st Tier Contractor",
            key: "first_tier",
            width: 20,
            style: {
              alignment: { vertical: "middle", horizontal: "center" },
            },
          },
        ];
        const startTime = performance.now();
        genExcel(colHeaders, dataLists, "ListAttendees.xlsx").then(function (
          buffer
        ) {
          const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8",
          });
          saveAs(blob, "ListAttendees.xlsx");
        });
        //all request complete
        const endTime = performance.now();
        resolve(`Process run: ${endTime - startTime} ms`);
      } else {
        reject("Failed");
      }
    };

    xhr.send();
  });
  return promise;
}

function getInductionClick() {
  const dateval = [];
  const url = location.href; //https://inductbook.safenode.co.nz/print/?data1=2021-11-24&data2=2021-11-24
  let redirectUrl = "/getInductionList";
  const indexFirstEqual = url.indexOf("=");
  if (indexFirstEqual != -1) {
    // alert("Pressed button for emailing...");
    const indexSecondEqual = url.indexOf("=", indexFirstEqual + 1);
    const dateFrom = url.slice(indexFirstEqual + 1, indexFirstEqual + 11);
    const dateTo = url.slice(indexSecondEqual + 1, indexSecondEqual + 11);
    console.log("dateFrom: ", dateFrom);
    console.log("dateTo: ", dateTo);
    dateval[0] = dateFrom;
    dateval[1] = dateTo;
    redirectUrl =
      "/getInductionList/?data1=" + dateFrom + "&" + "data2=" + dateTo;
  }
  // /getInductionList/?data1=2022-04-26&data2=2022-04-26
  // alert(redirectUrl);

  getExcelFile("GET", redirectUrl);
}

function genClick() {
  showAnimation();
  const dateval = [];
  const url = location.href; //https://inductbook.safenode.co.nz/print/?data1=2021-11-24&data2=2021-11-24
  let redirectUrl = "/getinductions";
  const indexFirstEqual = url.indexOf("=");
  if (indexFirstEqual != -1) {
    const indexSecondEqual = url.indexOf("=", indexFirstEqual + 1);
    const dateFrom = url.slice(indexFirstEqual + 1, indexFirstEqual + 11);
    const dateTo = url.slice(indexSecondEqual + 1, indexSecondEqual + 11);
    console.log("dateFrom: ", dateFrom);
    console.log("dateTo: ", dateTo);
    dateval[0] = dateFrom;
    dateval[1] = dateTo;
    redirectUrl = "/getinductions/?data1=" + dateFrom + "&" + "data2=" + dateTo;
  }

  //generateExcelFile() here returns a promise with value as a buffer
  generateExcelFile("GET", redirectUrl).then(function (values) {
    console.log(values);
    // hideAnimation() //This gets executed even when the files has not actually downloaded yet
    // location.reload()//does not download the file
  });
}
