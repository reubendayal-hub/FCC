// ── Single-voice cricket commentary library ───────────────────────────
//
// 22 categories, minimum 10 lines each. Lines may include the templated
// placeholders {batter}, {bowler}, {fielder} — these are substituted by
// utils/commentaryGen.js#pickCommentary at runtime.
//
// Lines are paraphrased "in the spirit of" famous broadcasters — never
// verbatim quotes. Attribution comments mark the closest inspiration.
// Famous broadcasters whose style seasons the lines:
//   Bill Lawry        — punchy excitement
//   Tony Greig        — emphatic boundary calls
//   Richie Benaud     — understated dryness
//   Ravi Shastri      — muscular six calls, "tracer bullet" energy
//   David "Bumble" Lloyd — pithy one-liners
//   Harsha Bhogle     — analytical wit
//   Ian Smith         — celebratory Kiwi flavour
//   Tony Cozier       — Caribbean lilt
//   Mark Nicholas     — measured English drama
//
// All placeholder usage is optional — generator falls back to "the batter"
// / "the bowler" / "the fielder" if a placeholder is unfilled.

export const COMMENTARY_LIB = {
  // ── dot balls (3 categories) ───────────────────────────────────
  dot_defended: [
    "Yorker — DEFENDED! Fortress mode activated!",
    "Solid. {batter} keeps it out.",
    // in the spirit of Richie Benaud
    "Marvellous defence. Right under the eyes.",
    "Dead bat — straight back to {bowler}.",
    "{bowler} probes the line, {batter} responds in kind.",
    "Cool customer, {batter}. Soft hands, soft answer.",
    "Watched onto the bat — textbook.",
    "Front-foot defence — and {bowler} can't ask for more.",
    // in the spirit of Mark Nicholas
    "And {batter}, with the easy authority of a man at home.",
    "Bat behind the ball, head still — proper cricket.",
    "Smothered. Nothing for {bowler} on that one.",
    // in the spirit of Harsha Bhogle
    "Defence with intent — {batter} knows what he's doing out there.",
  ],

  dot_missed: [
    // in the spirit of Bill Lawry
    "BEATEN! {bowler} has him swishing at thin air!",
    "Played and missed — that's a corker from {bowler}!",
    "Through the gate — and away through to the keeper.",
    // in the spirit of Bumble
    "Ooooh! That had {batter}'s name on it. Just no edge.",
    "Searching shot from {batter} — fresh air on offer.",
    // in the spirit of Benaud
    "A small inquiry from {batter}, and {bowler} declines to answer.",
    "Beaten all ends up — {bowler} smiling at the top of his mark.",
    "Swing and a miss — {batter} grimaces.",
    // in the spirit of Ian Smith
    "OH! Right past the outside edge — what a ball from {bowler}!",
    "Beats the bat — close shave for {batter}.",
    "Tempted, and tempted again — {batter} can't lay bat on it.",
  ],

  dot_leave: [
    "Shouldered arms — {batter} lets it sail through.",
    // in the spirit of Benaud
    "{batter} declines. Wise.",
    "Lets it go — sound judgement of off stump.",
    "Eye in — {batter} knows where his pegs are.",
    "Watched all the way into the gloves. No need to play.",
    // in the spirit of Mark Nicholas
    "A composed leave — the mark of a batter at peace.",
    "{batter} sways out of harm's way.",
    "Sees it, judges it, leaves it. Three small acts of cricket mastery.",
    "Through to the keeper — {batter} doesn't twitch.",
    "Arms drawn back like a duellist's pistol — no shot played.",
    "Off-stump awareness from {batter}. Five star.",
  ],

  // ── runs (3 categories) ───────────────────────────────────────
  run_1: [
    "Tucked away off the pads — single to {batter}.",
    "Nudged into the gap — easy one.",
    // in the spirit of Bumble
    "Push, run, done. That's how you milk an over.",
    "Worked through midwicket — they jog one.",
    "Quick single — {batter} calls, his partner answers.",
    "Tap and run — sharp running between the wickets.",
    "One to long-on — strike rotated.",
    // in the spirit of Bhogle
    "Pressure released with the softest of pushes — clever cricket.",
    "{batter} keeps the scoreboard ticking.",
    "Eased into the gap — a single, but a confidence-builder.",
    "Touched fine, scampered through.",
    "One run — quietly important.",
    // Approach-aware (over/round the wicket) — only fire when scorer
    // has set bowlerApproach for this bowler.
    "From {approach}, angled in — nudged for a single.",
    "{approach}, straight on the pads — flicked away for one.",
  ],

  run_2: [
    "Driven into the gap — easy two!",
    "{batter} turns one into two — sharp running!",
    // in the spirit of Bill Lawry
    "Quick! Two! And they could've gone for three!",
    "Two more — well placed and well run.",
    "Punched off the back foot — comfortable double.",
    "Pushed wide of mid-off — they come back for the second.",
    // in the spirit of Bumble
    "Couple. Sweat-makers, these.",
    "Run hard, both of them — two to {batter}.",
    "Worked square and they hustle through for two.",
    "Good placement, even better running.",
    "Squeezed through the gap — that's a brace of runs.",
  ],

  run_3: [
    "THREE! All-out running between the wickets!",
    "Out into the deep — they come back for three!",
    // in the spirit of Ian Smith
    "They've turned for the third! And they make it!",
    "Three runs — chest heaving, but earned.",
    "Driven down the ground — long-on lets it through, three taken!",
    // in the spirit of Lawry
    "GO, GO, GO! Three! And what running!",
    "{batter} drives, the fielder chases — and they steal the third.",
    "Pushed into the gap — and a rare three out here.",
    "Hammered to deep cover — three, and the fielder's still chasing.",
    "Three more, and {batter} doffs his helmet.",
    "A three! You don't see those every day.",
  ],

  // ── boundaries (8 categories) ─────────────────────────────────
  four_driven: [
    "FOUR! Driven through cover — picture perfect!",
    // in the spirit of Tony Greig
    "That's all the way! Through the off side!",
    "Off-driven by {batter} — RACING to the boundary!",
    "Straight back past {bowler} — FOUR!",
    "Caressed through the covers — pure timing.",
    // in the spirit of Mark Nicholas
    "Sumptuous. Through cover — and to the rope.",
    "Punched on the up — and the rope is reached in a heartbeat.",
    "Cover drive of the highest order from {batter}!",
    "Threaded between mid-off and cover — beautifully done.",
    "Walks into a drive — and the timing is exquisite.",
    // in the spirit of Bhogle
    "Classical. Almost old-school. And the boundary, modern enough.",
    "Stand and deliver — {batter} unfurls the drive.",
    // Approach-aware
    "From {approach}, full and there — driven for FOUR.",
    "{approach}, on the half-volley — and {batter} times it sweetly to the rope.",
  ],

  four_pulled: [
    // in the spirit of Lawry
    "PULLED! Crashed away to the leg side — FOUR!",
    "Short, and {batter} swivels — into the rope!",
    "Cracked through square leg — boundary!",
    "Square cut — and that's RACING to the fence!",
    // in the spirit of Greig
    "That's all the way! Pulled for FOUR!",
    "Rocks back, pulls, and {batter} pockets four more.",
    "Slapped through point — no chance for the fielder.",
    // in the spirit of Bumble
    "Tickled fine — and away to the rope. Start the car? Not just yet.",
    "Worked square — and the fielder's just a spectator.",
    "Cut square — uppish but safe, and four runs to {batter}.",
    "Half-tracker — DESPATCHED to the boundary.",
    "Pull shot, bottom hand dominant — perfect execution.",
  ],

  four_edged: [
    // in the spirit of Bumble
    "Edged — and FOUR! That'll do nicely!",
    "Outside edge — over the slips — and four more!",
    "Thick edge — flies through the cordon!",
    "{batter} wears a sheepish grin — four off the edge.",
    "Pings off the outer half — and the third man rope is too close.",
    "Streaky! But they all count.",
    "{bowler} will not enjoy that — four off the edge.",
    // in the spirit of Cozier
    "Plays and edges — and the rope welcomes it warmly.",
    "Mis-hit, well-rewarded — four to {batter}.",
    "Edged past gully — the keeper can only watch.",
    "Inside edge — past the stumps, away for four. Lucky boy.",
  ],

  four_generic: [
    // in the spirit of Greig
    "FOUR! That's all the way!",
    "Boundary! {batter} finds the gap.",
    "Smacked away — four more on the board.",
    "Cracking shot — and the fielders can only chase.",
    "{bowler} shakes his head — that's four.",
    "Timed to perfection — into the gap, to the rope.",
    "FOUR! What a stroke from {batter}!",
    // in the spirit of Lawry
    "BANG! Into the fence!",
    "Threaded the gap — boundary all the way.",
    "Crisp, clean, four runs — vintage {batter}.",
    "Hammered to the rope — pressure released.",
  ],

  six_straight: [
    // in the spirit of Tony Greig
    "All the way! That's GONE!",
    // in the spirit of Ravi Shastri
    "Like a tracer bullet — over the sightscreen!",
    "Six! {batter} sends {bowler} into the stands!",
    "Cleared the rope by ten metres!",
    // in the spirit of Bumble
    "Start the car! That one's leaving the ground!",
    "Into the night sky — six runs.",
    "{batter} takes him on, and wins.",
    "Lofted, lovely, gone — six!",
    // in the spirit of Ian Smith
    "OH MY! That's enormous!",
    "Smashed back over the bowler's head!",
    "He's middled it — and a long way too.",
    "Up, up, and over!",
    // in the spirit of Shastri
    "That's in the slot — and {batter} doesn't miss out!",
  ],

  six_legside: [
    // in the spirit of Shastri
    "Helicopter-style! Over cow corner — SIX!",
    "Slog-swept into the stands — {batter} is in the mood!",
    "Heaved over midwicket — and a long way back!",
    // in the spirit of Lawry
    "PUMPED into the crowd! Six!",
    "{batter} swings, connects — and that's GONE!",
    "Pulled, and pulled HARD — six runs!",
    "Over deep square leg — into the sponsor's hoarding!",
    // in the spirit of Smith
    "OH HE'S NAILED IT! Out of the park!",
    "Lofted over midwicket — that's a maximum.",
    "Cow corner — and the bowler buries his head.",
    "{batter} clears the fence with feet to spare.",
    "Pickup shot — into orbit!",
  ],

  six_offside: [
    "Lofted over extra cover — SIX!",
    // in the spirit of Greig
    "That's all the way — over the off side!",
    "Inside-out — and over the rope!",
    "Driven over cover — what a way to bring up a boundary!",
    "{batter} goes upstairs — and clears the off-side fence.",
    "Skipped down the track — and deposited over long-off!",
    // in the spirit of Nicholas
    "Glorious. Lofted, with the full face — and gone.",
    "Carved over point — six runs, audacious!",
    "Slog over wide long-on — into the second tier!",
    "Reverse-ramped over third — what an outrageous shot from {batter}!",
    "Punched on the up — and over the rope, just!",
  ],

  six_generic: [
    "SIX! Massive!",
    // in the spirit of Shastri
    "That's gone all the way — INTO THE CROWD!",
    "{batter} flexes — and a maximum.",
    "Cleared the rope — easy as you like.",
    // in the spirit of Bumble
    "Right out of the screws — six runs!",
    "Soaring into the stands — six!",
    "Up and away — six big ones to {batter}!",
    "Out of the ground! Where's that ball gone?",
    "Maximum — and {bowler} mutters under his breath.",
    "{batter} swings for the fences — and finds them.",
    "Lofted, lofted, gone — six!",
  ],

  // ── wickets (6 categories) ────────────────────────────────────
  wicket_bowled: [
    // in the spirit of Lawry
    "GOT HIM! TIMBER! {batter} is GONE!",
    "Bowled him! Castle in ruins!",
    "Through the gate — {bowler} has his man!",
    // in the spirit of Smith
    "OH HE'S DONE HIM! Off stump, gone!",
    "Cleaned up! {batter} walks back, head down.",
    // in the spirit of Greig
    "Stumps a mess! {bowler} delivers the goods!",
    "Splattered! {batter} can only stare at the wreckage.",
    "Yorker, perfect length — and the bails fly!",
    "{bowler} cartwheels the stumps — what a sight!",
    "Bowled 'im! Pure magic from {bowler}.",
    // in the spirit of Bhogle
    "The bails go for a stroll — {bowler} has his reward.",
    "Stumps rearranged — superb delivery from {bowler}.",
    // Approach-aware
    "{approach}, jagging back in — and the off pole takes a tumble!",
  ],

  wicket_caught: [
    "Caught! {fielder} takes a beauty!",
    // in the spirit of Smith
    "OH HE'S TAKEN IT! What a catch from {fielder}!",
    "Edged — and {fielder} swallows it!",
    "Top edge — and the fielder runs round to gobble it up!",
    "Skied — and {fielder} settles under it!",
    // in the spirit of Lawry
    "GOT HIM! Caught at slip!",
    "Lobs it up — straight to {fielder}!",
    "Hangs the bat out — and pays the price. {fielder} takes the catch.",
    // in the spirit of Bumble
    "Tickled through to the keeper — and {batter} is on his way.",
    "Caught behind! {bowler} celebrates with the cordon.",
    "Drilled — straight to the fielder! {batter} dawdles, dismayed.",
    "{fielder} clings on — magnificent work in the deep!",
    // Approach-aware
    "{approach}, fishing outside off — and {fielder} pouches it!",
  ],

  wicket_lbw: [
    // in the spirit of Lawry
    "STONE DEAD! That's plumb! Finger up!",
    "LBW! {bowler} traps {batter} in front!",
    "Pinned on the crease — and the finger goes up!",
    "Right in front of all three! {batter} has to go.",
    "Pad first, bat trailing — and the umpire raises the digit.",
    // in the spirit of Bhogle
    "Beaten on the angle — and {batter} departs, no review left.",
    "Looked plumb to me, and the umpire agrees.",
    // in the spirit of Greig
    "That's gotta be out! LBW!",
    "Inswinger does the trick — {batter} struck dead in front.",
    "Trapped on the back foot — and {bowler} has the breakthrough.",
    "Skid-on, no bat, and the umpire's finger speaks.",
    // Approach-aware
    "From {approach}, struck on the pad — finger up!",
  ],

  wicket_runout: [
    // in the spirit of Lawry
    "RUN OUT! Direct hit from {fielder}!",
    "Bullet throw from {fielder} — {batter} is short!",
    "Mix-up in the middle — and {batter} is on his way!",
    "Yes, no, GO — too late! Run out!",
    "Diving back — but {fielder} has whipped off the bails!",
    "{fielder} swoops, picks up, and hits! Direct hit!",
    // in the spirit of Smith
    "OH WHAT A THROW! Run out by a yard!",
    "Suicidal single — {fielder} makes them pay.",
    "Calling chaos — and the bails are off!",
    "Sent back by his partner — but the throw beats him!",
    "Hesitation costs {batter} his wicket.",
    "Run out! What a piece of fielding from {fielder}!",
  ],

  wicket_stumped: [
    // in the spirit of Bumble
    "STUMPED! Lightning hands from {fielder}!",
    "Down the track, beaten, and {fielder} whips off the bails!",
    "Stranded! {batter} has nowhere to go!",
    "{fielder} is QUICK with the gloves — stumped!",
    "Foot in the air — and that's all it takes!",
    // in the spirit of Smith
    "OH HE'S OUT OF HIS GROUND! Stumped by {fielder}!",
    "Dances down, misses, and {fielder} is alert as ever!",
    "Slick keeping from {fielder} — bails off in a flash!",
    "{batter} commits — and pays the ultimate price.",
    "Drawn out by {bowler} — {fielder} does the rest.",
    "Caught short of his crease — stumping done in a blink.",
  ],

  wicket_hitwicket: [
    "HIT WICKET! {batter} drags it onto his own stumps!",
    // in the spirit of Lawry
    "Oh dear — he's HIT HIS OWN WICKET!",
    "Foot back too far — and the bails fall!",
    "Hooked, swivelled — and clattered into his own stumps!",
    "{batter} treads on the stumps! That's just unlucky!",
    "Bat down — onto the off bail. Hit wicket!",
    "A schoolboy moment — {batter} dislodges the bails himself.",
    // in the spirit of Bumble
    "He's done himself in! Hit wicket — what a way to go!",
    "Twisted out of position — and the stumps suffer.",
    "Helmet falls onto the stumps — and the umpire signals out!",
    "Caught in two minds — and his own bat does the damage.",
  ],

  // ── extras (4 categories) ─────────────────────────────────────
  wide: [
    "Wide called — drifted down the leg side.",
    "Sprayed wide — gift to the batting side.",
    // in the spirit of Bumble
    "Wide as a barn door! Free run!",
    "{bowler} loses his line — wide signalled.",
    "Slipped out of the hand — wide.",
    "Drifted past the tramline — wide called.",
    // in the spirit of Benaud
    "A wide. Costly.",
    "Down the leg side — wide, and the keeper has to dive.",
    "Sprayed outside off — umpire calls it wide.",
    "{bowler} grimaces — wide called.",
    "Loose ball — and the runs flow without a shot played.",
    "Wide. {bowler} won't be happy with that one.",
  ],

  noball: [
    "No-ball! Front foot over the line!",
    // in the spirit of Lawry
    "NO-BALL! And it's a FREE HIT next ball!",
    "Overstepped — no-ball, and the umpire's arm goes out.",
    "{bowler} steps over the popping crease — no-ball.",
    "Front-foot no-ball — costly mistake.",
    // in the spirit of Bumble
    "Oversteps! Free hit coming up — get your singing voice ready.",
    "No-ball — and a chance for {batter} to swing for the fences.",
    "Caught by the umpire's eye — front foot too far.",
    "No-ball signalled — and {bowler} kicks the turf.",
    "{bowler} drags the foot too far — no-ball.",
    "Costly. No-ball, free hit, and momentum to {batter}.",
    "Foot fault — and the umpire's call is unmistakable.",
  ],

  bye: [
    "Byes! Through to the boundary — keeper beaten!",
    "Slips through the keeper — byes taken.",
    // in the spirit of Bumble
    "Misses everything — including the keeper! Byes!",
    "Beats {batter}, beats the keeper — byes scampered.",
    "Down the leg side — bye signalled.",
    "Through the gate, past the stumps, into the gloves — except not!",
    "{batter} misses, keeper misses — easy byes.",
    "Sneaky byes — opportunism from the batters.",
    "Scampered through for byes — sharp running.",
    "Past the keeper — and the batters take advantage.",
    "Glides through — bye called by the umpire.",
  ],

  legbye: [
    "Off the pads — leg byes taken.",
    "Hit on the thigh — and they sneak a leg bye.",
    "Glances off the pad — and away for a leg bye.",
    // in the spirit of Bumble
    "Hits the pads, runs taken — leg byes, the cheeky kind.",
    "{batter} offers no shot — leg bye signalled.",
    "Padded away — leg byes for the team.",
    "Off the front pad, fine of square — leg byes scampered.",
    "Deflects off the boot — and the umpire's hand goes to his shoulder.",
    "Leg bye — they'll take whatever they can get.",
    "Pinged off the pad, away into the gap — leg byes!",
    "Crab-like deflection off the thigh pad — and they run.",
  ],

  // ── milestones (4 categories) ─────────────────────────────────
  milestone_fifty: [
    // in the spirit of Bhogle
    "FIFTY for {batter}! A composed, classy half-century!",
    "Raises the bat — fifty up for {batter}!",
    "Half-century! {batter} salutes the dressing room!",
    "A patient, polished fifty — {batter} milks the applause.",
    // in the spirit of Nicholas
    "Fifty runs of class and intent — {batter} doffs the helmet.",
    "What a knock! {batter} brings up the fifty in style!",
    "Half-century to {batter} — and the partnership flourishes.",
    "Fifty up — {batter} acknowledges the crowd, the partner, the dressing room.",
    "And the bat is raised — fifty for {batter}!",
    // in the spirit of Smith
    "FIFTY! What a contribution from {batter}!",
    "Half-century for {batter} — and there could be plenty more.",
    "Fifty runs — earned the hard way.",
  ],

  milestone_hundred: [
    // in the spirit of Bhogle
    "HUNDRED! {batter} brings up the century! What a moment!",
    "CENTURY for {batter}! Helmet off, bat aloft, eyes to the heavens!",
    // in the spirit of Smith
    "OH HE'S DONE IT! {batter} has his hundred!",
    "A magnificent hundred from {batter} — the crowd is on its feet!",
    // in the spirit of Lawry
    "GOT THERE! {batter} has the three figures!",
    "Hundred up for {batter}! Salutes every corner of the ground!",
    "Century! A masterclass from {batter}!",
    "Hundred! {batter} kisses the badge — pure joy!",
    // in the spirit of Nicholas
    "Three figures for {batter} — and a moment etched in memory.",
    "One hundred for {batter}! Take a bow, son!",
    "Hundred! {batter} embraces his partner — a sublime knock!",
    "{batter} reaches the milestone — and the dressing room is on its feet!",
  ],

  milestone_fiveFor: [
    // in the spirit of Greig
    "FIVE-FOR for {bowler}! A magnificent spell!",
    "Five wickets to {bowler} — bowling figures to cherish!",
    "{bowler} completes the five-for! Hands raised, ball in pocket!",
    "Five-fer! What a spell from {bowler}!",
    // in the spirit of Smith
    "FIVE WICKETS for {bowler}! Outstanding!",
    "Five-for — and {bowler} salutes the dressing room!",
    "Five-wicket haul — a career moment for {bowler}!",
    "Five wickets in the bag for {bowler} — class act!",
    // in the spirit of Bhogle
    "{bowler} pockets the ball — five wickets, well earned.",
    "Five-fer! Mark this day for {bowler}!",
    "A magical spell — {bowler} brings up the five-wicket haul.",
    "Five-for, and a standing ovation for {bowler}!",
  ],

  end_of_over: [
    "And that's the over — drinks of water, sip of strategy.",
    // in the spirit of Benaud
    "End of the over. Time to think.",
    "Six balls done — and the bowlers regroup.",
    "Over complete — captain has a quick word with {bowler}.",
    "End of an over — batters meet mid-pitch, plot the next phase.",
    "Over done. The game pauses for a breath.",
    // in the spirit of Nicholas
    "And so the over ends — a small reset before the next chapter.",
    "Six balls bowled — and {bowler} walks back to fine leg.",
    "That's the over — let's see what comes next.",
    // in the spirit of Bumble
    "Over done — bowler off, fielders shuffle, on we go.",
    "End of an over — and the bowler's figures take a moment of reflection.",
    "Over completed — the calm before whatever comes next.",
  ],
};

export default COMMENTARY_LIB;
