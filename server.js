import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // Removed 'bucket'
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import express from 'express';
import multer from 'multer'; 
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID
};

const port = 3000;
const router = express();
router.use(cors());
const app = initializeApp(firebaseConfig);
const storage = getStorage(app); // Get storage reference
const db = getFirestore(app);

const multerStorage = multer.memoryStorage();
const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg", 
      "image/png",
      "video/mp4", 
      "video/mpeg", 
      "video/webm", 
      "video/ogg", 
      "video/quicktime",
      "video/mkv" 
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image and video files are allowed!"), false);
    }
  },
});

router.post("/api/report-issue", upload.single('file'), async (req, res) => { 
  try {
    console.log(req.body, ' in post');
    const { description, timestamp } = req.body;
    const imageFile = req.file; 

    if (!imageFile) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const filename = `issues/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    const storageRef = ref(storage, filename); // Corrected usage of ref()

    await uploadBytes(storageRef, imageFile.buffer, { contentType: imageFile.mimetype });

    const imageUrl = await getDownloadURL(storageRef);

    const issueRef = await addDoc(collection(db, 'issues'), {
      imageUrl,
      description,
      timestamp: new Date(timestamp),
      status: 'pending',
      createdAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      issueId: issueRef.id,
      imageUrl
    });

  } catch (error) {
    console.error('Error handling issue submission:', error);
    return res.status(500).json({
      error: 'Failed to submit issue',
      details: error.message
    });
  }
});

router.post('/api/upload-video', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('No file uploaded');

    const filename = `videos/${Date.now()}_${req.file.originalname}`;
    const storageRef = ref(storage, filename); // Corrected usage of ref()

    await uploadBytes(storageRef, req.file.buffer, { contentType: req.file.mimetype });

    const videoUrl = await getDownloadURL(storageRef);
    res.status(200).json({ success: true, videoUrl });

  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

export default router;
