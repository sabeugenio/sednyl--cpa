require('dotenv').config();
const pg = require('pg');

// NIV — encouraging, wisdom, strength, comfort (see rules/bible_rules.txt)
const verses = [
  { reference: 'Philippians 4:13 (NIV)', verse: 'I can do all this through him who gives me strength.' },
  { reference: 'Psalm 23:1 (NIV)', verse: 'The LORD is my shepherd, I lack nothing.' },
  { reference: 'Jeremiah 29:11 (NIV)', verse: 'For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, plans to give you hope and a future.' },
  { reference: 'Isaiah 41:10 (NIV)', verse: 'So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.' },
  { reference: 'Matthew 11:28 (NIV)', verse: 'Come to me, all you who are weary and burdened, and I will give you rest.' },
  { reference: 'Joshua 1:9 (NIV)', verse: 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.' },
  { reference: 'Romans 8:28 (NIV)', verse: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.' },
  { reference: 'Proverbs 3:5-6 (NIV)', verse: 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.' },
  { reference: 'Romans 15:13 (NIV)', verse: 'May the God of hope fill you with all joy and peace as you trust in him, so that you may overflow with hope by the power of the Holy Spirit.' },
  { reference: 'Psalm 27:1 (NIV)', verse: 'The LORD is my light and my salvation—whom shall I fear? The LORD is the stronghold of my life—of whom shall I be afraid?' },
  { reference: 'Isaiah 40:31 (NIV)', verse: 'But those who hope in the LORD will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.' },
  { reference: '2 Timothy 1:7 (NIV)', verse: 'For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.' },
  { reference: 'Hebrews 13:5 (NIV)', verse: 'Keep your lives free from the love of money and be content with what you have, because God has said, "Never will I leave you; never will I forsake you."' },
  { reference: 'Psalm 46:1 (NIV)', verse: 'God is our refuge and strength, an ever-present help in trouble.' },
  { reference: 'Matthew 6:34 (NIV)', verse: 'Therefore do not worry about tomorrow, for tomorrow will worry about itself. Each day has enough trouble of its own.' },
  { reference: 'John 16:33 (NIV)', verse: 'I have told you these things, so that in me you may have peace. In this world you will have trouble. But take heart! I have overcome the world.' },
  { reference: '1 Peter 5:7 (NIV)', verse: 'Cast all your anxiety on him because he cares for you.' },
  { reference: 'Psalm 34:8 (NIV)', verse: 'Taste and see that the LORD is good; blessed is the one who takes refuge in him.' },
  { reference: 'Deuteronomy 31:6 (NIV)', verse: 'Be strong and courageous. Do not be afraid or terrified because of them, for the LORD your God goes with you; he will never leave you nor forsake you.' },
  { reference: 'Exodus 14:14 (NIV)', verse: 'The LORD will fight for you; you need only to be still.' },
  { reference: 'Romans 8:31 (NIV)', verse: 'What, then, shall we say in response to these things? If God is for us, who can be against us?' },
  { reference: 'Zephaniah 3:17 (NIV)', verse: 'The LORD your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.' },
  { reference: 'Psalm 37:4 (NIV)', verse: 'Take delight in the LORD, and he will give you the desires of your heart.' },
  { reference: 'Ephesians 3:20 (NIV)', verse: 'Now to him who is able to do immeasurably more than all we ask or imagine, according to his power that is at work within us.' },
  { reference: 'Nahum 1:7 (NIV)', verse: 'The LORD is good, a refuge in times of trouble. He cares for those who trust in him.' },
  { reference: 'Philippians 4:6-7 (NIV)', verse: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.' },
  { reference: 'Psalm 121:1-2 (NIV)', verse: 'I lift up my eyes to the mountains—where does my help come from? My help comes from the LORD, the Maker of heaven and earth.' },
  { reference: '2 Corinthians 12:9 (NIV)', verse: 'But he said to me, "My grace is sufficient for you, for my power is made perfect in weakness." Therefore I will boast all the more gladly about my weaknesses, so that Christ\'s power may rest on me.' },
  { reference: 'Psalm 55:22 (NIV)', verse: 'Cast your cares on the LORD and he will sustain you; he will never let the righteous be shaken.' },
  { reference: 'Isaiah 26:3 (NIV)', verse: 'You will keep in perfect peace those whose minds are steadfast, because they trust in you.' },
  { reference: 'Proverbs 16:3 (NIV)', verse: 'Commit to the LORD whatever you do, and he will establish your plans.' },
  { reference: 'Romans 8:38-39 (NIV)', verse: 'For I am convinced that neither death nor life, neither angels nor demons, neither the present nor the future, nor any powers, neither height nor depth, nor anything else in all creation, will be able to separate us from the love of God that is in Christ Jesus our Lord.' },
  { reference: 'Psalm 119:105 (NIV)', verse: 'Your word is a lamp for my feet, a light on my path.' },
  { reference: 'James 1:5 (NIV)', verse: 'If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you.' },
  { reference: 'Psalm 62:1-2 (NIV)', verse: 'Truly my soul finds rest in God; my salvation comes from him. Truly he is my rock and my salvation; he is my fortress, I will never be shaken.' },
  { reference: 'Psalm 139:14 (NIV)', verse: 'I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well.' },
  { reference: 'Lamentations 3:22-23 (NIV)', verse: 'Because of the LORD\'s great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.' },
  { reference: 'Psalm 103:8 (NIV)', verse: 'The LORD is compassionate and gracious, slow to anger, abounding in love.' },
  { reference: 'Psalm 4:8 (NIV)', verse: 'In peace I will lie down and sleep, for you alone, LORD, make me dwell in safety.' },
  { reference: 'Psalm 16:8 (NIV)', verse: 'I keep my eyes always on the LORD. With him at my right hand, I will not be shaken.' },
  { reference: 'Psalm 118:24 (NIV)', verse: 'The LORD has done it this very day; let us rejoice today and be glad.' },
  { reference: 'Micah 7:7 (NIV)', verse: 'But as for me, I watch in hope for the LORD, I wait for God my Savior; my God will hear me.' },
  { reference: 'Psalm 42:11 (NIV)', verse: 'Why, my soul, are you downcast? Why so disturbed within me? Put your hope in God, for I will yet praise him, my Savior and my God.' },
  { reference: 'Psalm 30:5 (NIV)', verse: 'For his anger lasts only a moment, but his favor lasts a lifetime; weeping may stay for the night, but rejoicing comes in the morning.' },
  { reference: 'Colossians 3:15 (NIV)', verse: 'Let the peace of Christ rule in your hearts, since as members of one body you were called to peace. And be thankful.' },
  { reference: 'Psalm 23:4 (NIV)', verse: 'Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me.' },
  { reference: 'Psalm 9:9-10 (NIV)', verse: 'The LORD is a refuge for the oppressed, a stronghold in times of trouble. Those who know your name trust in you, for you, LORD, have never forsaken those who seek you.' },
  { reference: '1 Corinthians 16:13 (NIV)', verse: 'Be on your guard; stand firm in the faith; be courageous; be strong.' },
  { reference: 'Psalm 56:3 (NIV)', verse: 'When I am afraid, I put my trust in you.' },
  { reference: 'Romans 12:12 (NIV)', verse: 'Be joyful in hope, patient in affliction, faithful in prayer.' },
];

async function run() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const { rows: fromSettings } = await pool.query(
      'SELECT DISTINCT user_id FROM settings'
    );
    const { rows: fromEntries } = await pool.query(
      'SELECT DISTINCT user_id FROM entries'
    );

    const seen = new Set();
    const uniqueUsers = [];
    for (const row of [...fromSettings, ...fromEntries]) {
      const id = row.user_id;
      if (id && !seen.has(id)) {
        seen.add(id);
        uniqueUsers.push(id);
      }
    }

    if (uniqueUsers.length === 0) {
      console.log(
        'No users found in settings or entries. Add app data first, or insert bible_verses for your user UUID manually.'
      );
      return;
    }

    for (const userId of uniqueUsers) {
      console.log(`Seeding ${verses.length} verses for user: ${userId}`);

      await pool.query('DELETE FROM bible_verses WHERE user_id = $1', [userId]);

      for (let i = 0; i < verses.length; i++) {
        await pool.query(
          'INSERT INTO bible_verses (user_id, verse, reference, sort_order) VALUES ($1, $2, $3, $4)',
          [userId, verses[i].verse, verses[i].reference, i]
        );
      }
    }

    console.log(
      `SUCCESS: ${verses.length} verses seeded for ${uniqueUsers.length} user(s).`
    );
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await pool.end();
  }
}

run();
