const forExport = async (
  colHeadings,
  colWidths,
  dataLists,
  tableHeading,
  exportFilename,
  isCron
) => {
  // console.log("For export");

  const wb = new xlFile.Workbook();
  const ws = wb.addWorksheet("Sheet 1");
  regex = /\.(gif|jpe?g|tiff?|png|webp|bmp)$/i;

  const headingStyle = wb.createStyle({
    font: {
      bold: true,
    },
    alignment: {
      wrapText: true,
      horizontal: "center",
    },
  });

  const myStyle = wb.createStyle({
    font: {
      bold: true,
    },
    alignment: {
      wrapText: true,
      horizontal: "center",
    },
    border: {
      left: {
        style: "thin",
      },
      right: {
        style: "thin",
      },
      top: {
        style: "thin",
      },
      bottom: {
        style: "thin",
      },
    },
  });

  const dataStyle = wb.createStyle({
    alignment: {
      wrapText: true,
      horizontal: "center",
      vertical: "center",
    },
    border: {
      left: {
        style: "thin",
      },
      right: {
        style: "thin",
      },
      top: {
        style: "thin",
      },
      bottom: {
        style: "thin",
      },
    },
  });

  ws.cell(1, 1, 1, colHeadings.length, true)
    .string(tableHeading)
    .style(headingStyle);

  ws.cell(2, 1).string("Run date: " + moment().format("DD-MMM-YYYY @ LT"));

  //set column header titles
  colHeadings.forEach((colHeading, index) => {
    ws.cell(3, index + 1)
      .string(colHeading)
      .style(myStyle);
  });

  //set column width
  colWidths.forEach((colWidth, index) => {
    ws.column(index + 1).setWidth(colWidth);
  });

  let i = 0;
  let j = 1;
  let fname = "";

  // ws.addImage({
  //   path: "./tmp_img/cropped-1636961688850-fccmap.png",
  //   type: "picture",
  //   position: {
  //     type: "oneCellAnchor",
  //     from: {
  //       col: 3,
  //       colOff: 0,
  //       row: 3,
  //       rowOff: 0,
  //     },
  //   },
  // });

  //stuff data into each cell
  // console.log("For excel: ", dataLists); //array of arrays
  dataLists.forEach((dataArr, index) => {
    i++;
    ws.row(i + 3).setHeight(150);
    ws.cell(i + 3, 1)
      .number(i)
      .style(dataStyle);

    // for (const [key, value] of Object.entries(dataObj)) {
    dataArr.forEach((data) => {
      j++;
      // console.log("data: ", data);
      if (typeof data === "string") {
        if (regex.test(data)) {
          // console.log("value: ", value);
          fname = "./tmp_img/" + "cropped-" + data;
          // console.log(`image: ${fname}`);
          fs.readFile(`${fname}`, (err, data) => {
            if (data) {
              console.log("to add: ", data);
              ws.addImage({
                path: fname,
                type: "picture",
                position: {
                  type: "oneCellAnchor",
                  from: {
                    col: j,
                    colOff: 0,
                    row: i + 3,
                    rowOff: 0,
                  },
                },
              });
            } else {
              console.log(`${fname} not found.`);
            }
          });
        } else {
          ws.cell(i + 3, j)
            .string(data)
            .style(dataStyle);
        }
      }
    });
    j = 1;
  });

  // wb.write(exportFilename);
  wb.write(exportFilename, async function (err, stats) {
    if (err) {
      console.error(err);
      return err;
    } else {
      console.log("Excel file created.");
      //if isCron email the file
      if (isCron) {
        const admins = await getEmailRecipients();
        let emails = [];
        let subject = "";
        let emailbody = "see attachment";

        admins.forEach((admin) => {
          emails.push(admin.email);
        });

        // emails = ["gagabon@safenode.co.nz"]; //remove after test
        subject = "List of Attendees for EHS Induction";
        // emailFile(emails, subject, emailbody, "ListAttendees.xlsx"); //located at the top of this file
        emailFile(emails, subject, emailbody, exportFilename); //located at the top of this file
      }
      return dataLists;
    }
  });
};
