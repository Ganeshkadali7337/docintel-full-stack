// Cloudinary file storage service
// Handles uploading and deleting files in Cloudinary cloud storage

import { v2 as cloudinary } from 'cloudinary'

// Validate that all required Cloudinary env vars are present at startup
if (!process.env.CLOUDINARY_CLOUD_NAME) {
  throw new Error('CLOUDINARY_CLOUD_NAME is not set in environment variables')
}
if (!process.env.CLOUDINARY_API_KEY) {
  throw new Error('CLOUDINARY_API_KEY is not set in environment variables')
}
if (!process.env.CLOUDINARY_API_SECRET) {
  throw new Error('CLOUDINARY_API_SECRET is not set in environment variables')
}

// Configure the Cloudinary SDK with credentials from env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Upload a file buffer to Cloudinary
// folder: the Cloudinary folder path (e.g. 'docintel/documents')
// Returns: { url, publicId }
export async function uploadFile(buffer, filename, folder) {
  return new Promise((resolve, reject) => {
    // Use upload_stream to upload raw buffer data
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename,
        resource_type: 'raw', // 'raw' is required for non-image files like PDF/DOCX
        use_filename: true,
        unique_filename: false,
      },
      (error, result) => {
        if (error) {
          reject(error)
          return
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        })
      }
    )

    // Write the buffer into the stream to start the upload
    uploadStream.end(buffer)
  })
}

// Delete a file from Cloudinary by its public ID
// Does not throw — logs the error but lets the caller continue
// This way document deletion succeeds even if Cloudinary is temporarily unavailable
export async function deleteFile(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })
  } catch (error) {
    // Log but don't throw — document deletion should still complete
    console.error('Cloudinary delete failed:', error.message)
  }
}
