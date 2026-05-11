// ─── Admin-screen seed data (Pass 6) ──────────────────────────
// NAME_MAP, AMBIGUOUS_FIRST_NAMES, DIVISION_TEAMS — used by
// AdminView's name-fix and division-assignment helpers,
// and by App.jsx's fixAllNames helper.

export const NAME_MAP = {
  "Aadya":"Aadya Kaul","Aarin":"Aarin Venkatesh","Abhinav":"Abhinav Singh",
  "Adam":"Adam Pirzada","Advik":"Advik Akar","Ahaan":"Ahaan Sinha",
  "Ahmed":"Ahmed Nawaz","Akshay":"Akshay Bhardwaj","Amer":"Amer Ramzan",
  "Amit":"Amit Yadav","Anagha":"Anagha Mahajan","Anant":"Anant Mahajan",
  "Anirudh":"Anirudh Ram Sriram","Anshu":"Ansh Gupta",
  "Anveshak":"Anveshak Vujjini","Abhijit":"Abhijit Guhagarkar",
  "Deepak":"Deepak Akar","Dhruv":"Dhruv Shah",
  "Gagan":"Gagan Sachdeva","Garghi":"Garghi Seenevas",
  "Hasnain":"Hasnain Ahmed","Ilayaraja":"Ilayaraja Karuppasamy",
  "Ishan":"Ishan Bordoloi","Jaya":"Jaya Nair",
  "Kamal":"Kamal Jayalaksminarasimhan","Kian":"Kian Kakoti",
  "Mishka":"Mishka Gupta","Monesh":"Monesh Shantharam",
  "Nimesh":"Nimesh Rajamohanan","Nirmal":"Nirmal Mohanan",
  "Pranavan":"Pranavan Aananth","Prithvi":"Prithvi Sagar",
  "Pronit":"Pronit Lahiri","Pulin":"Pulin Dhar",
  "Raghavendar":"Raghavendar Murali","Rajkumar":"Rajkumar Jeyaraman",
  "Raju":"Raju Dantuluri","Ramakrishnan":"Ramakrishnan Ravi",
  "Reuben":"Reuben Dayal","Rewanth":"Rewanth Punna",
  "Rohind":"Rohind Muthuselvaraj","Rohith":"Rohith Arunkumar",
  "Saatvik":"Saatvik Dantuluri","Sahasra":"Sahasra Dantuluri",
  "Sagar":"Sagar Gupta","Sahil":"Sahil Gagneja",
  "Samyak":"Samyak Jaggi Ram","Savir":"Savir Gagneja",
  "Senthil":"Senthil Gnanasambandan","Shardul":"Shardul Joshi",
  "Sharmila":"Sharmila C","Shashank":"Shashank Rastogi",
  "Shreyas":"Shreyas Gujjar","Stalin":"Stalin Natesan",
  "Syed":"Syed Hamza Kazmi","Taarush":"Taarush Jain",
  "Talat":"Talat Munshi","Trineth":"Trineth Arjun",
  "Vijay":"Vijay Deepak","Virendra":"Virendra Pawar",
  "Vishali":"Vishali Jain","Xavier":"Xavier Ramzan",
  "Yogismaan":"Yogismaan Kamal","Zachary":"Zachary Dayal","Zeb":"Zeb Pirzada",
  // Session refs use old short names too — include these common session-only names:
  "Rajesh":"Rajesh Muthukumar", // will be overridden for Rajesh Ayyappan if both exist
  // Renamed members — old name → new name:
  "Jay":"Jayashwanth J S",
};
// Names that are ambiguous (multiple people share the first name) — manual fix only:
export const AMBIGUOUS_FIRST_NAMES = ["Adithya","Arun","Ashwin","Nitin","Rajesh","Vihaan","Vinay","Vivek"];

// ─── Division team rosters (from squad lists) ─────────────────
// Maps member names (as stored in Firebase) to their division team.
// Run "Assign Division Teams" in Admin Panel to apply these.
export const DIVISION_TEAMS = {
  // Div 2
  "Aarin Venkatesh":       "Div 2",
  "Saatvik Dantuluri":     "Div 2",
  "Vinay Arunkumar":       "Div 2",
  "Dhruv Shah":            "Div 2",
  "Ashwin Shankar":        "Div 2",
  "Rewanth Punna":         "Div 2",
  "Syed Hamza Kazmi":      "Div 2",
  "Garghi Seenevas":       "Div 2",
  "Rohind Muthuselvaraj":  "Div 2",
  "Adithya Manimaran":     "Div 2",
  "Anirudh Ram Sriram":    "Div 2",
  "Vinay Kumar":           "Div 2",
  "Stalin Natesan":        "Div 2",
  "Virendra Pawar":        "Div 2",
  "Vijay Deepak":          "Div 2",
  "Muhammad Aun Zaheer":   "Div 2",
  // Div 3
  "Adam Pirzada":          "Div 3",
  "Advik Akar":            "Div 3",
  "Junaid Khan":           "Div 3",
  "Ahmed Nawaz":           "Div 3",
  "Prithvi Sagar":         "Div 3",
  "Reuben Dayal":          "Div 3",
  "Nimesh Rajamohanan":    "Div 3",
  "Sahil Gagneja":         "Div 3",
  "Deepak Akar":           "Div 3",
  "Nitin Jain":            "Div 3",
  "Vivek Bhatnagar":       "Div 3",
  "Balaji R":              "Div 3",
  "Ilayaraja Karuppasamy": "Div 3",
  // Div 4
  "Samyak Jaggi Ram":      "Div 4",
  "Abhinav Singh":         "Div 4",
  "Xavier Ramzan":         "Div 4",
  "Anveshak Vujjini":      "Div 4",
  "Amit Yadav":            "Div 4",
  "Gagan Sachdeva":        "Div 4",
  "Shreyas Gujjar":        "Div 4",
  "Nirmal Mohanan":        "Div 4",
  "Monesh Shantharam":     "Div 4",
  "Shashank Rastogi":      "Div 4",
  "Rajkumar Jeyaraman":    "Div 4",
  "Sagar Gupta":           "Div 4",
  "Vivek Satyarthi":       "Div 4",
  "Arun Shankar":          "Div 4",
  "Jayashwanth J S":       "Div 4",
  "Shardul Joshi":         "Div 4",
  "Pronit Lahiri":         "Div 4",
};

// ─── T20 Squads 2026 ─────────────────────────────────────────
// Separate tournament — mixed squads not tied to division groups.
export const T20_SQUADS = {
  "T20 Serie 4": {
    captain: "Syed Hamza Kazmi",
    vc:      "Ashwin Shankar",
    nameMap: {
      "Chuchendra Durgesh Mattaparthi": "Durgesh",
      "Balaji Ramdas":                  "Balaji R",
    },
    // Genuinely new — not in EMAIL_SEED or existing member list
    newMembers: [
      {name:"Virendra Pawar",      teams:["T20 Serie 4"]},
      {name:"Muhammad Aun Zaheer", teams:["T20 Serie 4"]},
    ],
    members: [
      "Dhruv Shah","Ashwin Shankar","Rewanth Punna","Syed Hamza Kazmi",
      "Garghi Seenevas","Adithya Manimaran","Anirudh Ram Sriram","Vinay Kumar",
      "Stalin Natesan","Virendra Pawar","Vijay Deepak","Muhammad Aun Zaheer",
      "Chuchendra Durgesh Mattaparthi","Nimesh Rajamohanan","Deepak Akar",
      "Nitin Jain","Balaji Ramdas","Reuben Dayal",
    ],
  },
  "T20 Serie 5": {
    captain: "Aurangzeb Pirzada",
    vc:      "Vivek Satyarthi",
    nameMap: {
      "Aurangzeb Pirzada":              "Zeb Pirzada",        // Zeb is his preferred name in app
      "Arunkumar Krishnamurthy":        "Arun Krishnamurthy", // already in system
      "Arun Shankar Ambadipudi":        "Arun Shankar",       // already in system
      "Jayashwanth Jeganathan Subhashini": "Jayashwanth J S", // already in system
    },
    // Genuinely new — not in EMAIL_SEED or existing member list
    newMembers: [
      {name:"Aniket Rao",               teams:["T20 Serie 5"]}, // different from Aniket Sharma (U11 coach)
      {name:"Muhammad Junaid",          teams:["T20 Serie 5"]},
      {name:"Dantuluri Venkatakrishna", teams:["T20 Serie 5"]}, // different from Saatvik Dantuluri
      {name:"Vivek Bhatnagar",          teams:["T20 Serie 5"]}, // different from Vivek Satyarthi
      {name:"Sagar Sachdeva",           teams:["T20 Serie 5"]}, // different from Sagar Gupta
    ],
    members: [
      "Aniket Rao","Muhammad Junaid","Ahmed Nawaz","Prithvi Sagar","Sahil Gagneja",
      "Dantuluri Venkatakrishna","Arunkumar Krishnamurthy","Vivek Bhatnagar",
      "Amit Yadav","Gagan Sachdeva","Shreyas Gujjar","Nirmal Mohanan",
      "Monesh Shantharam","Shashank Rastogi","Aurangzeb Pirzada",
      "Rajkumar Jeyaraman","Sagar Sachdeva","Vivek Satyarthi",
      "Arun Shankar Ambadipudi","Jayashwanth Jeganathan Subhashini","Shardul Joshi",
    ],
  },
};
