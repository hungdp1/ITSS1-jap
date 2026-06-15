const cloudinary = require("../utils/cloudinary");
const streamifier = require("streamifier");

function uploadToCloudinary(buffer, folder = "posts") {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "auto",
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );

        streamifier.createReadStream(buffer).pipe(stream);
    });
}

module.exports = uploadToCloudinary;