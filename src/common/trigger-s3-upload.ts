import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "fs";

const s3 = new S3Client();

export const s3Upload = async (filepath: string, key: string) => {
  const fileStream = fs.createReadStream(filepath);

  const uploadParams = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: fileStream,
    ContentType: "application/octet-stream",
  };

  let fileAlreadyExists = false;
  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
      })
    );

    console.log("File already exists, skipping upload.");
    fileAlreadyExists = true;
  } catch (err: any) {}

  if (!fileAlreadyExists) {
    try {
      const command = new PutObjectCommand(uploadParams);
      const response = await s3.send(command);
      console.log("Upload success:", response);
    } catch (err) {
      console.error("Upload error:", err);
    }
  }
};
