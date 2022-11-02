import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';


// Replace this file with your service account key you get when setting up a firestore.
import serviceAccount from './serviceAccountKey.json'

initializeApp({
  credential: cert(serviceAccount as ServiceAccount),
  databaseURL: "https://databaseName.firebaseio.com"
})
