import { initializeFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";
const app = initializeApp({ projectId: "test" });
initializeFirestore(app, { experimentalForceLongPolling: true }, "test-db");
