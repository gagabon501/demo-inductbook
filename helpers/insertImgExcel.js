async function insertImg2excel({ wb, ws, data, col, ext, fieldName }) {
  const promises = data.map(async (d, i) => {
    const url = d[fieldName];
    if (!url) {
      return;
    }
    const ret = await fetch(url);
    const bufferData = await ret.arrayBuffer();
    const imgId = wb.addImage({
      buffer: Buffer.from(bufferData),
      extension: "png",
    });
    // ws.addImage(imgId, {
    //     tl: { col, row: i + 1 },
    //     ext
    // })
    ws.addImage(imgId, {
      tl: { col: col, row: i + 1 }, // top left
      br: { col: col + 1, row: i + 2 }, // bot right
    });
  });
  await Promise.all(promises);
}

//Sample use
const wb = new Excel.Workbook();
const ws = wb.addWorksheet("sheet_name");
ws.columns = [
  {
    header: "Name",
    key: "name",
  },
  {
    header: "photo",
    key: "img",
  },
];

const data = [
  {
    name: "jzx",
    img: "xxxx.png",
  },
];
ws.addRows(data);

await insertImg2excel({
  wb,
  ws,
  data,
  col: 1,
  fieldName: "img",
  // ext: {
  //     width: 60,
  //     height: 60
  // }
});
