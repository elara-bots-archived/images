const express = require("express"),
  app = express(),
  download = require("image-downloader"),
  { join } = require("path"),
  { stat, mkdir } = require("fs"),
  error = (res, message) => res.json({ status: false, message }),
  exists = (path, create = false) => new Promise((r) => {
    return stat(path, (err, stats) => {
      if (err || !stats) {
        if (create) {
          return mkdir(path, (err) => {
            if (err) return r(false);
            return r(true);
          });
        }
        return r(false);
      }
      return r(true);
    })
  }),
  checkAdmin = (req, res, next) => {
    let key = req.headers["Authorization"] || req.query.authorization;
    if (process.env.ADMIN !== key) return error(res, `Unauthorized, you didn't provide the key`);
    return next()
  }

app
.use(express.json())
.use(express.urlencoded({ extended: false }))
.use(express.static("images"))

app.get("/", (req, res) => res.json({ status: false, message: "This is not for you." }));

app.get("/uptime", (req, res) => res.json({ status: true, ping: new Date().getTime() }))

app.post(`/download`, checkAdmin, async (req, res) => {
  let { url, folder, name } = req.query;
  if (!url || !folder || !name) return error(res, `You didn't provide a folder name, a url or name`);
  try {
    url = new URL(url);
    if (!url.pathname.match(/.(png|jpg|jpeg|gif)/g)) return error(res, `The url needs to end with one of the following extensions: png, jpg, jpeg, gif`);
    let folderPath = `${join(__dirname, "/images")}/${folder}`;
    if (!(await exists(folderPath, true))) return error(res, `I was unable to find or create (/images/${folder})`);
    name = name.toLowerCase().replace(/ +/, "_");
    let dest = `${folderPath}/${name}`;
    if (await exists(dest)) return error(res, `File (/images/${folder}/${name}) already exists!`)
    return download.image({ 
        url: url.href, dest 
    })
    .then(() => {
        console.log(`[${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}]: Added file to ${dest}`)
        return res.json({ 
          status: true, 
          message: `Done, it's been downloaded!` 
        })
      });
  } catch (err) {
    return res.json({
      status: false,
      message: err ? err.message : err
    })
  }
});


app.listen(2020, () => console.log(`[API]: Started`))