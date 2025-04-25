const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const AdmZip = require("adm-zip");

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, "../public")));
app.use(cors());

app.get("/load-project", (req, res) => {

    const zipPath = path.join(__dirname, "../project_bundle (2).zip");

    if (!fs.existsSync(zipPath)) {
        return res.status(404).json({ success: false, message: "ZIP file not found." });
    }

    try {
        const zip = new AdmZip(zipPath);

        const imageEntry = zip.getEntry("image.png") || zip.getEntry("image.jpg");
        const jsonEntry = zip.getEntry("roi_data.json");

        if (!imageEntry || !jsonEntry) {
            return res.status(400).json({ success: false, message: "The required files are missing in the ZIP archive." });
        }

        const imageBase64 = imageEntry.getData().toString("base64");
        const roiData = JSON.parse(jsonEntry.getData().toString("utf8"));

        res.json({
            success: true,
            imageData: `data:image/png;base64,${imageBase64}`,
            roiData
        });
    } catch (error) {
        console.error("ZIP read error:", error);
        res.status(500).json({ success: false, message: "ZIP read error.", error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`The server is running: http://localhost:${PORT}`);
});
