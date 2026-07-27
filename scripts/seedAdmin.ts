import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app, config.firestoreDatabaseId);

async function seed() {
  try {
    const cred = await createUserWithEmailAndPassword(auth, "superadmin@admin.com", "154183");
    
    await setDoc(doc(db, "admins", cred.user.uid), {
      id: cred.user.uid,
      name: "Super Administrator",
      email: "superadmin@admin.com",
      role: "Super Admin",
      status: "Active",
      createdAt: new Date().toISOString()
    });

    console.log("Super Admin seeded successfully!");
    process.exit(0);
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      console.log("Super Admin already exists.");
      process.exit(0);
    } else {
      console.error(err);
      process.exit(1);
    }
  }
}

seed();
