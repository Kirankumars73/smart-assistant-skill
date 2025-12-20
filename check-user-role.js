// Quick script to check and fix admin role in Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBboGxCfkg8ft6yj-mhNYEpOWalkgz3X4Y",
  authDomain: "smart-academic-assistant.firebaseapp.com",
  projectId: "smart-academic-assistant",
  storageBucket: "smart-academic-assistant.firebasestorage.app",
  messagingSenderId: "979256832186",
  appId: "1:979256832186:web:e68835702d41dad0eb9283",
  measurementId: "G-FV5E1JR6Y0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkAndFixAdminRole() {
  const ADMIN_EMAIL = 'kirankumar07112003@gmail.com';
  
  try {
    console.log('🔍 Checking users in Firestore...');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    usersSnapshot.forEach(async (userDoc) => {
      const userData = userDoc.data();
      console.log(`\n👤 User: ${userData.email}`);
      console.log(`   Role: ${userData.role}`);
      console.log(`   Is Hardcoded Admin: ${userData.isHardcodedAdmin || false}`);
      
      if (userData.email === ADMIN_EMAIL) {
        console.log(`\n🎯 Found admin user!`);
        
        if (userData.role !== 'admin') {
          console.log(`⚠️  Role is "${userData.role}" but should be "admin"`);
          console.log(`🔧 Fixing role...`);
          
          await updateDoc(doc(db, 'users', userDoc.id), {
            role: 'admin',
            isHardcodedAdmin: true,
            lastUpdated: new Date().toISOString()
          });
          
          console.log(`✅ Role updated to admin!`);
        } else {
          console.log(`✅ Role is already admin!`);
        }
      }
    });
    
    console.log('\n✨ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAndFixAdminRole();
