async function genExcel(colHeaders, dataLists, filename) {
  //   console.log("Hey, Im called!");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  let row = 0;
  let currRow = "";
  ws.columns = colHeaders;
  regex = /\.(gif|jpe?g|tiff?|png|webp|bmp)$/i; //regex to validate images --> 14-Nov-21

  //stuffing of data on each row
  dataLists.forEach((data) => {
    ws.addRow(data); //stuff data on each row

    currRow = ws.lastRow; //get the current row
    currRow.height = 150; //adjust row heiht

    ws.getCell(`B${row + 2}`).value = null;
    ws.getCell(`I${row + 2}`).value = null;
    row++;
  });

  const ext = { width: 200, height: 200 };

  const startTime = performance.now();
  await insertImg2excel(wb, ws, dataLists, 1, ext);
  await insertImg2excel(wb, ws, dataLists, 8, ext);
  const endTime = performance.now();
  console.log(`Process run inserting images: ${endTime - startTime} ms`);

  //This hideAnimation() function is actually defined inside 'export_list.ejs' --> this only means that any function defined in that file has access or accessbile
  //to all the other functions as longs as they are defined in that file!!! --> 24-Nov-21
  hideAnimation(); //finally got you!!! --> 24-Nov-21 --> this time the animation gets removed once all the image insertions are done

  return wb.xlsx.writeBuffer(); //this is now being processed at the calling end --> returns a buffer --> 23-Nov-21
}

async function insertImg2excel(wb, ws, data, col, ext) {
  //=================================================================================================================================================================
  // REMEMBER THIS: On functions or routines that are asynchronous, i.e. file I/O, network access, or other processes that take time, the trick into ensuring that the
  // routines produce the data correctly when they are called inside a LOOPING routine is to STORE those PROMISES into an ARRAY and do a FINAL RESOLVE at the end once
  // the looping is DONE. E.g.:  "await Promise.all(promises)"
  //================================================================================================================================================================

  //Store all promises first into an array --> the 'promises' variable here defined will store the result of the 'data.map()' function. data.map() is a LOOPING function
  const promises = data.map(async (d, i) => {
    const url = d[col]; //this is the URL of the image to be inserted in the Excel sheet
    if (!url) {
      return;
    }
    const ret = await fetch(url); //this is an asynchronous function
    console.log("ret: ", ret);
    const bufferData = await ret.arrayBuffer(); //this is an asynchronous function
    console.log("bufferData: ", bufferData);

    //this 'wb' object is the object passed from the calling function. This object was crafted from that function and passed onto here
    const imgId = wb.addImage({
      buffer: bufferData,
      extension: "png",
    });

    //this 'ws' object is the object passed from the calling function. This object was crafted from that function and passed onto here
    ws.addImage(imgId, {
      tl: { col: col, row: i + 1 }, // top left
      ext: ext,
    });
  });

  await Promise.all(promises); //FINAL RESOLVE HERE for all the PROMISES STORED IN THE ARRAY --> 24-Nov-21
}
