const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const uri = "mongodb://DonyUser:Litera%402016@ac-4ndgql6-shard-00-00.ckemsuq.mongodb.net:27017,ac-4ndgql6-shard-00-01.ckemsuq.mongodb.net:27017,ac-4ndgql6-shard-00-02.ckemsuq.mongodb.net:27017/cluso?ssl=true&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";

async function main() {
  try {
    await mongoose.connect(uri, { dbName: "cluso", serverSelectionTimeoutMS: 30000 });
    console.log('Connected to MongoDB');
    
    const user = await mongoose.connection.db.collection('users').findOne(
      { email: 'ahmadshajee0@gmail.com' },
      { projection: { digilockerProfile: 1, email: 1, name: 1 } }
    );
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    const output = JSON.stringify(user, null, 2);
    const outPath = path.join(__dirname, 'digilocker-raw-response.txt');
    fs.writeFileSync(outPath, output, 'utf8');
    console.log(`Saved to: ${outPath}`);
    console.log(`File size: ${output.length} chars`);
    
    // Also print a summary
    const dp = user.digilockerProfile;
    if (dp) {
      console.log('\n--- Summary ---');
      console.log('Verified:', dp.verified);
      console.log('Name:', dp.name);
      console.log('Documents count:', dp.documents?.length || 0);
      console.log('Has rawTokenResponse:', !!dp.rawTokenResponse);
      console.log('Has rawUserResponse:', !!dp.rawUserResponse);
      console.log('Has rawDocumentsResponse:', !!dp.rawDocumentsResponse);
      
      if (dp.documents) {
        dp.documents.forEach((doc, i) => {
          console.log(`\nDoc ${i}: ${doc.name} (${doc.doctype})`);
          console.log('  Has fileData:', !!(doc.fileData && doc.fileData.length > 10));
          console.log('  Has certificateData:', !!doc.certificateData);
          if (doc.certificateData) {
            console.log('  certificateData keys:', Object.keys(doc.certificateData));
          }
        });
      }
    } else {
      console.log('No digilockerProfile found');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}
main();
