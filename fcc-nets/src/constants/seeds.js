// ─── Shared seeds and helpers used by App.jsx and hooks ──────
// Extracted from App.jsx during Pass 4 modularisation. Imported by
// both src/App.jsx and src/hooks/useFirestore.js (and useAuth.js)
// so we keep a single source of truth and avoid circular imports.

export const PRESET_POLL = [
  {id:"batting",  label:"🏏 Batting Focus"},
  {id:"bowling",  label:"🎯 Bowling Focus"},
  {id:"fielding", label:"🧤 Fielding Focus"},
  {id:"mixed",    label:"⚡ Mixed"},
];

// ─── Seed note templates (Captain XI shared club templates) ───
export const SEED_NOTE_TEMPLATES = [
  "Please arrive at least 30 minutes before reporting time for warm-up and team talk.",
  "Bowlers — please be ready for 10 minutes of bowling drills before the match.",
  "Fielders — we'll do 15 minutes of catching practice before the toss. Don't be late.",
  "Bring your full kit including helmet, pads, gloves, and box. Spare gear may not be available.",
  "Lunch and water provided. Bring your own snacks if needed for between innings.",
];

// ─── Seed members ─────────────────────────────────────────────
export const SEED_MEMBERS = [
  "Aadya Kaul","Aarin Venkatesh","Abhinav Singh","Adam Pirzada",
  "Adithya Manimaran","Adithya Vennickle","Advik Akar","Ahaan Sinha",
  "Ahmed Nawaz","Akshay Bhardwaj","Amer Ramzan","Amit Yadav",
  "Anagha Mahajan","Anant Mahajan","Anirudh Ram Sriram","Ansh Gupta",
  "Anveshak Vujjini","Abhijit Guhagarkar",
  "Arun Krishnamurthy","Arun Shankar","Ashwin Shankar","Ashwin Singh Tensingh",
  "Balaji R","Charlie","Deepak Akar","Dhruv Shah",
  "Durgesh","Gagan Sachdeva","Garghi Seenevas","Hasnain Ahmed",
  "Ilayaraja Karuppasamy","Ishan Bordoloi","Jayashwanth J S","Jaya Nair",
  "Kamal Jayalaksminarasimhan","Kian Kakoti","Mishka Gupta","Monesh Shantharam",
  "Nimesh Rajamohanan","Nirmal Mohanan","Nitin Gupta","Nitin Jain",
  "Pranavan Aananth","Prithvi Sagar","Pronit Lahiri","Pulin Dhar",
  "Raghavendar Murali","Rajesh Ayyappan","Rajesh Muthukumar",
  "Rajkumar Jeyaraman","Raju Dantuluri","Ramakrishnan Ravi",
  "Reuben Dayal","Rewanth Punna","Rohind Muthuselvaraj",
  "Rohith Arunkumar","Saatvik Dantuluri","Sahasra Dantuluri","Sagar Gupta",
  "Sahil Gagneja","Samyak Jaggi Ram","Savir Gagneja","Senthil Gnanasambandan",
  "Shardul Joshi","Sharmila C","Shashank Rastogi","Shreyas Gujjar",
  "Stalin Natesan","Sumithra","Syed Hamza Kazmi",
  "Taarush Jain","Talat Munshi","Trineth Arjun","Vihaan Rastogi",
  "Vihaan Sundeep","Vijay Deepak","Vinay Arunkumar",
  "Vinay Kumar","Virendra Pawar","Vishali Jain","Vivek Bhatnagar",
  "Vivek Satyarthi","Xavier Ramzan","Yogismaan Kamal","Zachary Dayal","Zeb Pirzada",
  "Junaid Khan","Muhammad Aun Zaheer",
  "Bhoomi Joshi","Suneeti Bala","Nandini",
].map((name, i) => ({
  id: `m${i+1}`,
  name,
  team: name === "Zachary Dayal" ? "U11" : null,
  teams: name === "Zachary Dayal" ? ["U11"]
       : name === "Bhoomi Joshi"  ? ["U15 Girls"]
       : name === "Nandini"       ? ["U15"]
       : name === "Suneeti Bala"  ? ["Women's"]
       : [],
  role: name === "Reuben Dayal" ? "superadmin" : "member",
}));

// ─── Email seed (from uniform order form) ────────────────────
// Used to pre-populate member emails via admin "Seed Emails" button.
// Also used for first-time login verification for members who have no email yet.
export const EMAIL_SEED = {
  "Aarin Venkatesh":"aarin.venki@gmail.com",
  "Abhijit Guhagarkar":"gabhijit@yahoo.com",
  "Abhinav Singh":"vcefu1@gmail.com",
  "Adam Pirzada":"pirzada.adam2@gmail.com",
  "Adithya Manimaran":"aadi.manimaran@gmail.com",
  "Advik Akar":"akar.advik@gmail.com",
  "Ahmed Nawaz":"ahmednawaz86@hotmail.com",
  "Amit Yadav":"amit230317@gmail.com",
  "Anirudh Ram Sriram":"iamramsriram@gmail.com",
  "Ansh Gupta":"6anshu1994@gmail.com",
  "Arun Krishnamurthy":"kae.arunkumar@gmail.com",
  "Arun Shankar":"arundynaero@gmail.com",
  "Ashwin Shankar":"ashwin.thewall19@gmail.com",
  "Ashwin Singh Tensingh":"ashwin_singh17@yahoo.com",
  "Balaji R":"balajir136@gmail.com",
  "Deepak Akar":"deepakakar@gmail.com",
  "Dhruv Shah":"activities.dhruv@gmail.com",
  "Durgesh":"durgece66@gmail.com",
  "Gagan Sachdeva":"gagan78639@gmail.com",
  "Garghi Seenevas":"s.garghi@gmail.com",
  "Hasnain Ahmed":"ahmed.hasnain@hotmail.com",
  "Ilayaraja Karuppasamy":"ilayarajak04@gmail.com",
  "Jaya Nair":"jayasundeep@gmail.com",
  "Kamal Jayalaksminarasimhan":"jlkamal@gmail.com",
  "Monesh Shantharam":"ms403@snu.edu.in",
  "Nimesh Rajamohanan":"nimesh.rajamohanan@gmail.com",
  "Nirmal Mohanan":"1983.nirmal@gmail.com",
  "Nitin Gupta":"kotanitin@gmail.com",
  "Nitin Jain":"nitin.niec@gmail.com",
  "Prithvi Sagar":"prithvisagar@gmail.com",
  "Pronit Lahiri":"pronit.lahiri@gmail.com",
  "Rajkumar Jeyaraman":"raj2618@gmail.com",
  "Ramakrishnan Ravi":"ramakrishnan23@gmail.com",
  "Reuben Dayal":"reuben.dayal@gmail.com",
  "Rewanth Punna":"revanthpunna2304@gmail.com",
  "Rohind Muthuselvaraj":"rohind.127@gmail.com",
  "Saatvik Dantuluri":"saatvikvarma33@gmail.com",
  "Sagar Gupta":"gksagar10@gmail.com",
  "Sahil Gagneja":"gagneja808@gmail.com",
  "Samyak Jaggi Ram":"dinesh.pro@gmail.com",
  "Shardul Joshi":"spjoshi99@outlook.com",
  "Shashank Rastogi":"ca.shashankrastogi@gmail.com",
  "Shreyas Gujjar":"shreyasgujjar8@gmail.com",
  "Stalin Natesan":"stalinnatesan@gmail.com",
  "Syed Hamza Kazmi":"s.hamza.kazmi@gmail.com",
  "Talat Munshi":"talatmunshi@gmail.com",
  "Trineth Arjun":"madhanprabu@gmail.com",
  "Vijay Deepak":"vijaydeepak33@gmail.com",
  "Vinay Arunkumar":"kae.arunkumar@gmail.com",
  "Vinay Kumar":"kumarvinay14@gmail.com",
  "Virendra Pawar":"virendra23pawar@gmail.com",
  "Vivek Bhatnagar":"vkbhatnagar@gmail.com",
  "Vivek Satyarthi":"satyarthivivek@gmail.com",
  "Xavier Ramzan":"xavier_ramzan@hotmail.com",
  "Zeb Pirzada":"zpirzada@gmail.com",
  // Added from uniform form — were missing from member list
  "Junaid Khan":"junaidmuhammad395@gmail.com",
  "Muhammad Aun Zaheer":"aunzaheer@hotmail.com",
  "Bhoomi Joshi":"joshi.bhoomi013@gmail.com",
  "Suneeti Bala":"suneeti.bala@gmail.com",
  "Jayashwanth J S":"j.jaayshwaanth@gmail.com",
};

// Tiny ID generator
export const uid = () => Math.random().toString(36).slice(2,9);

// Normalise member — migrate old single `team` field to `teams` array.
// normMember — never stores isCoach; derived dynamically from team.coaches[]
export const normMember = m => ({
  ...m,
  teams: m.teams || (m.team ? [m.team] : []),
  children: m.children || [],
  memberType: m.memberType || ((m.teams||[]).length > 0 ? "player" : (m.children||[]).length > 0 ? "parent" : "player"),
});
