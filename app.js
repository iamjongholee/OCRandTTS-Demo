import express from "express";
import { createWorker } from "tesseract.js";
import multer from "multer";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import fs from "fs";
import textToSpeech from "@google-cloud/text-to-speech";
import dotenv from "dotenv"

dotenv.config();
// Creates a client
const client = new textToSpeech.TextToSpeechClient();

const app = express();

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, __dirname + "/public/uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage: storage,
});

app.use(cors());
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.post("/upload", upload.single("img"), async (req, res, next) => {
  console.log(req.file);
  var mimetype = req.file.mimetype.split("image/");
  const worker = createWorker({
    logger: (m) => console.log(m),
  });

  (async () => {
    await worker.load();
    await worker.loadLanguage("kor+eng");
    await worker.initialize("kor+eng");
    const {
      data: { text },
    } = await worker.recognize(
      `http://localhost:3000/uploads/${req.file.filename}`
    );
    console.log(text);

    await worker.terminate();

    console.log(req.file);

    const request = {
      // input: { text },
      // voice: {
      //   languageCode: "ko_KR",
      //   ssmlGender: "FEMALE",
      //   name: "ko-KR-Wavenet-A",
      // },
      // audioConfig: { audioEncoding: "MP3" },
      input: { text },
      voice: {
        languageCode: "en-US",
        name: "en-US-Wavenet-D",
      },
      audioConfig: {
        audioEncoding: "MP3",
        pitch: 0,
        speakingRate: 1
      },
    };

    // Performs the Text-to-Speech request
    client.synthesizeSpeech(request, (err, response) => {
      if (err) {
        console.error("ERROR:", err);
        return;
      }

      var ts_hms = Date.now().toString();

      console.log("-".repeat("10"));
      console.log("__dirname");
      console.log("-".repeat("10"));

      console.log(__dirname);

      fs.writeFile(
        __dirname + "/public/sounds/" + ts_hms + ".mp3",
        response.audioContent,
        "binary",
        (err) => {
          if (err) {
            console.error("ERROR:", err);
            return;
          }

          console.log(__dirname + ts_hms + ".mp3");
          res.json({ ok: true, text, ts_hms });
        }
      );
    });
  })();
});

app.get("/download", function (req, res) {
  const baseFileURL = `${__dirname}/public/sounds/`;
  const fileName = req.query.fileName;

  console.log(req.query);

  fs.readFile(`${baseFileURL}${fileName}.mp3`, function (err, file) {
    var base64 = new Buffer(file, "binary").toString("base64");
    res.json({ base64 });
  });
});

app.listen(3000, () => {
  console.log("Okay running with port 3000");
});
