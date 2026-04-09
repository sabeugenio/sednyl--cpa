require('dotenv').config();
const pg = require('pg');

const verses = [
  { reference: "Philippians 4:13", verse: "I can do all things through Christ who strengthens me." },
  { reference: "Psalm 23:1", verse: "The LORD is my shepherd; I shall not want." },
  { reference: "Jeremiah 29:11", verse: "For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, plans to give you hope and a future." },
  { reference: "Isaiah 41:10", verse: "So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand." },
  { reference: "Matthew 11:28", verse: "Come to me, all you who are weary and burdened, and I will give you rest." },
  { reference: "Joshua 1:9", verse: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go." },
  { reference: "Romans 8:28", verse: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose." },
  { reference: "Proverbs 3:5-6", verse: "Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight." },
  { reference: "Romans 15:13", verse: "May the God of hope fill you with all joy and peace as you trust in him, so that you may overflow with hope by the power of the Holy Spirit." },
  { reference: "Psalm 27:1", verse: "The LORD is my light and my salvation—whom shall I fear? The LORD is the stronghold of my life—of whom shall I be afraid?" },
  { reference: "Isaiah 40:31", verse: "But those who hope in the LORD will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint." },
  { reference: "2 Timothy 1:7", verse: "For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline." },
  { reference: "Hebrews 13:5", verse: "Keep your lives free from the love of money and be content with what you have, because God has said, 'Never will I leave you; never will I forsake you.'" },
  { reference: "Psalm 46:1", verse: "God is our refuge and strength, an ever-present help in trouble." },
  { reference: "Matthew 6:34", verse: "Therefore do not worry about tomorrow, for tomorrow will worry about itself. Each day has enough trouble of its own." },
  { reference: "John 16:33", verse: "I have told you these things, so that in me you may have peace. In this world you will have trouble. But take heart! I have overcome the world." },
  { reference: "1 Peter 5:7", verse: "Cast all your anxiety on him because he cares for you." },
  { reference: "Psalm 34:8", verse: "Taste and see that the LORD is good; blessed is the one who takes refuge in him." },
  { reference: "Deuteronomy 31:6", verse: "Be strong and courageous. Do not be afraid or terrified because of them, for the LORD your God goes with you; he will never leave you nor forsake you." },
  { reference: "Exodus 14:14", verse: "The LORD will fight for you; you need only to be still." },
  { reference: "Romans 8:31", verse: "What, then, shall we say in response to these things? If God is for us, who can be against us?" },
  { reference: "Zephaniah 3:17", verse: "The LORD your God is in your midst, a mighty one who will save; he will rejoice over you with gladness; he will quiet you by his love; he will exult over you with loud singing." },
  { reference: "Psalm 37:4", verse: "Take delight in the LORD, and he will give you the desires of your heart." },
  { reference: "Ephesians 3:20", verse: "Now to him who is able to do immeasurably more than all we ask or imagine, according to his power that is at work within us." },
  { reference: "Nahum 1:7", verse: "The LORD is good, a refuge in times of trouble. He cares for those who trust in him." }
];

async function run() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Get distinct user IDs from settings to know who to seed for
    const { rows: users } = await pool.query("SELECT DISTINCT user_id FROM settings WHERE key = 'verse_rotated_at'");
    
    if (users.length === 0) {
      console.log("No users with active rotations found. Seeding for all users in entries table as fallback...");
      const { rows: fallbackUsers } = await pool.query("SELECT DISTINCT user_id FROM entries");
      users.push(...fallbackUsers);
    }

    const uniqueUsers = [...new Set(users.map(u => u.user_id))];

    for (const userId of uniqueUsers) {
      console.log(`Seeding 25 verses for user: ${userId}`);
      
      // Clear existing
      await pool.query('DELETE FROM bible_verses WHERE user_id = $1', [userId]);

      // Insert fresh ones
      for (let i = 0; i < verses.length; i++) {
        await pool.query(
          'INSERT INTO bible_verses (user_id, verse, reference, sort_order) VALUES ($1, $2, $3, $4)',
          [userId, verses[i].verse, verses[i].reference, i]
        );
      }
    }

    console.log(`SUCCESS: 25 unique verses seeded for ${uniqueUsers.length} users!`);
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await pool.end();
  }
}

run();
