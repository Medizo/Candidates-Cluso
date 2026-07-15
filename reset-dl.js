const mongoose = require('mongoose');
async function main() {
  await mongoose.connect('mongodb://DonyUser:Litera%402016@ac-4ndgql6-shard-00-00.ckemsuq.mongodb.net:27017,ac-4ndgql6-shard-00-01.ckemsuq.mongodb.net:27017,ac-4ndgql6-shard-00-02.ckemsuq.mongodb.net:27017/cluso?ssl=true&authSource=admin&retryWrites=true&w=majority&appName=Cluster0', { dbName: 'cluso', serverSelectionTimeoutMS: 30000 });
  const r = await mongoose.connection.db.collection('users').updateOne(
    { email: 'ahmadshajee0@gmail.com' },
    { $unset: { digilockerProfile: '' } }
  );
  console.log('Matched:', r.matchedCount, 'Modified:', r.modifiedCount);
  await mongoose.disconnect();
}
main();
