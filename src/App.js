import { useState, useRef } from "react";

const SUITS=['S','H','D','C'];
const CCW=['S','E','N','W'];
const PAR={S:'N',N:'S',E:'W',W:'E'};
const TM={S:'SN',N:'SN',E:'EW',W:'EW'};
const DECK=()=>SUITS.flatMap(s=>[2,3,4,5,6,7,8,9,10,11,12,13,14].map(v=>({s,v})));

const L={
  en:{
    sn:{S:'Spades',H:'Hearts',D:'Diamonds',C:'Clubs'},
    title:'TARNEEB',sub:'طرنيب',target:'Target',lang:'Language',start:'Start Game',
    pass:'Pass',bid:'Bid',trump:'Trump',hint:'Hint',
    best:'✓ Best play!',tryThis:"Should've played:",
    conservative:'Too conservative',aggressive:'Too aggressive',solid:'Solid bid!',
    pickTrump:'Choose your Trump',bidding:'Bidding',
    roundOver:'Round Over',madeIt:'Bid made ✓',wentSet:'Went set ✗',
    gameOver:'Match Over',youWin:'You & partner win!',theyWin:'Opponents win',
    grade:'Your Grade',playAgain:'New Match',nextRound:'Next Round',
    you:'You',analyzing:'Analyzing...',yourTurn:'Your turn',tapAgain:'Tap again to play',
    moveAcc:'Move Accuracy',bidAcc:'Bid Accuracy',
    gradeMsg:{A:'Outstanding!',B:'Good game.',C:'Room to improve.',D:'Needs work.',F:'Study harder.'}
  },
  ar:{
    sn:{S:'بستوني',H:'قلبة',D:'ديناري',C:'دبابيكي'},
    title:'طرنيب',sub:'TARNEEB',target:'الهدف',lang:'اللغة',start:'يلا نلعب يا جماعة',
    pass:'ولا إشي',bid:'إطلع',trump:'الطرنيب',hint:'وينها يا عمي',
    best:'✓ هيك بيتلعب!',tryThis:'ليش ما حطيت:',
    conservative:'خفت من ظلك يا زلمة',aggressive:'طار عقلك؟',solid:'زبطت',
    pickTrump:'شو بدك طرنيب',bidding:'المزايدة',
    roundOver:'خلصت الورقة',madeIt:'عملها ✓',wentSet:'وقع ✗',
    gameOver:'انتهى الحكي',youWin:'إنت وشريكك أخدتوها!',theyWin:'الثانيين أخدوها',
    grade:'شو طلع معك',playAgain:'لعبة ثانية يلا',nextRound:'الورقة الجاية',
    you:'إنت',analyzing:'خلي أشوف شو عندك...',yourTurn:'دورك يا صاحبي',tapAgain:'اضغط مرة ثانية',
    moveAcc:'دقة حركاتك',bidAcc:'دقة عرضك',
    gradeMsg:{A:'zay il-ustad!',B:'mish b2attal.',C:'fi shi naqis.',D:'ya khasara fik.',F:'irja3 t3allam min awwal.'}
  },
  mix:{
    sn:{S:'Bastoni',H:'Albi',D:'Dinari',C:'Sinj'},
    title:'TARNEEB',sub:'TARNEEB',target:'Target',lang:'Language',start:'Yalla nileb!',
    pass:'wala ishy',bid:'Bid',trump:'Tarneeb',hint:'Wino?',
    best:'✓ Ahsan 7araka!',tryThis:'Kan lazim:',
    conservative:'Khift min dhalak',aggressive:'6ar 3a2lak?',solid:'Zabt!',
    pickTrump:'Shu badak tarneeb',bidding:'Muzayada',
    roundOver:'Khilset il-wara2a',madeIt:'3amala! ✓',wentSet:'Waqa3 ✗',
    gameOver:'Khilas il-7aki',youWin:'Inta w sharikak akhathtuha!',theyWin:'Il-thaniyyin akhadu',
    grade:'Shu 6ila3 ma3ak',playAgain:'Liba jadida',nextRound:'Il-wara2a il-jayyi',
    you:'Inta',analyzing:'Khalli ashuf...',yourTurn:'Doorak ya sa7bi',tapAgain:'I6ba3 marra thanyi',
    moveAcc:'Di22et il-7arakat',bidAcc:'Di22et il-3ard',
    gradeMsg:{A:'Zay il-ustad ya 3ami!',B:'Mish b2attal.',C:'Fi shi naqis.',D:'Ya khasara fik.',F:'Irja3 t3allam min awwal.'}
  }
};

const VL=v=>({14:'A',13:'K',12:'Q',11:'J'}[v]||String(v));
const SY=s=>({S:'♠',H:'♥',D:'♦',C:'♣'}[s]);
const RED=s=>s==='H'||s==='D';
const shuf=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=0|Math.random()*(i+1);[b[i],b[j]]=[b[j],b[i]];}return b;};
const nxt=p=>CCW[(CCW.indexOf(p)+1)%4];
const lgl=(hand,led)=>{if(!led)return hand;const m=hand.filter(c=>c.s===led);return m.length?m:hand;};
const beats=(a,b,t)=>a.s===b.s?a.v>b.v:a.s===t&&b.s!==t;
const tWin=(tk,t)=>{let w=tk[0];for(let i=1;i<tk.length;i++)if(beats(tk[i].card,w.card,t))w=tk[i];return w.pos;};

// ── QUICK TRICKS (standard Bridge/Tarneeb hand evaluator) ──────────
function quickTricks(hand, suit){
  // Count guaranteed winners in a suit
  const cards = hand.filter(c=>c.s===suit).map(c=>c.v).sort((a,b)=>b-a);
  if(!cards.length) return 0;
  let qt = 0;
  const has = v => cards.includes(v);
  if(has(14) && has(13)) qt += 2.0;      // A-K = 2.0
  else if(has(14) && has(12)) qt += 1.5; // A-Q = 1.5
  else if(has(14)) qt += 1.0;            // A alone = 1.0
  else if(has(13) && has(12)) qt += 1.0; // K-Q = 1.0
  else if(has(13)) qt += 0.5;            // K alone = 0.5
  return qt;
}

// Distribution points (voids, singletons, long suits)
function distPoints(hand, trump){
  let dp = 0;
  SUITS.forEach(s => {
    const n = hand.filter(c=>c.s===s).length;
    if(n === 0) dp += 1.0;         // void
    else if(n === 1) dp += 0.5;    // singleton
    else if(n >= 5) dp += (n-4)*0.5; // long suit
  });
  // Extra value for long trump (if trump known)
  if(trump){
    const trumpLen = hand.filter(c=>c.s===trump).length;
    if(trumpLen >= 6) dp += 1.5;
    else if(trumpLen >= 5) dp += 0.8;
    else if(trumpLen >= 4) dp += 0.3;
  }
  return dp;
}

// Total hand strength (my tricks estimate)
function handStrength(hand, trump){
  let qt = 0;
  SUITS.forEach(s => { qt += quickTricks(hand, s); });
  const dp = distPoints(hand, trump);
  // Long suit tricks: extra winners from long suits
  let longTricks = 0;
  SUITS.forEach(s => {
    const n = hand.filter(c=>c.s===s).length;
    if(n >= 5) longTricks += (n - 4) * 0.4;
  });
  return qt + dp * 0.6 + longTricks;
}

// Best trump suit selection
function aiTrump(hand){
  return SUITS.reduce((best, s) => {
    const cards = hand.filter(c=>c.s===s);
    const qt = quickTricks(hand, s);
    // Weight: QT + length bonus + high card bonus
    const score = qt * 2 + cards.length * 1.2 + cards.reduce((a,c)=>a+(c.v>=11?c.v-10:0),0)*0.1;
    return score > best.sc ? {s, sc:score} : best;
  }, {s:'S', sc:-1}).s;
}

// Proper Tarneeb AI bidding using Quick Tricks algorithm
function aiBid(hand, hi){
  // My expected tricks
  const myTricks = handStrength(hand, null);
  // Partner estimate: average hand = ~3.0-3.5 tricks
  const partnerEst = 3.2;
  const teamTotal = myTricks + partnerEst;
  // Round to nearest bid
  const wouldBid = Math.max(7, Math.round(teamTotal));
  if(wouldBid > hi) return Math.min(13, wouldBid);
  // Aggressive raise: strong hand can push one above
  if(teamTotal >= hi + 0.6 && hi >= 7) return Math.min(13, hi + 1);
  return 'pass';
}

// Keep estTricksWithTrump for bid evaluation
function estTricksWithTrump(hand, trump){
  return handStrength(hand, trump);
}

function aiCard(hand, tk, trump, par, played=[]){
  const led = tk.length ? tk[0].card.s : null;
  const leg = lgl(hand, led);
  const gone = new Set(played.map(c=>`${c.s}${c.v}`));
  const isGone = (s,v) => gone.has(`${s}${v}`);
  const isTopOfSuit = (card) => {
    for(let v=14;v>card.v;v--){ if(!isGone(card.s,v)) return false; }
    return true;
  };
  const risky = c => {
    // Risky to lead if higher cards of same suit are still out
    if(c.s===trump) return false;
    if(c.v===13 && !isGone(c.s,14)) return true;  // K with A still out
    if(c.v===12 && (!isGone(c.s,14)||!isGone(c.s,13))) return true; // Q with A or K still out
    return false;
  };

  if(!tk.length){
    // 1. Lead Ace — guaranteed win
    const aces = leg.filter(c=>c.v===14);
    if(aces.length) return aces.reduce((a,b)=>b.v>a.v?b:a);

    // 2. Lead top-of-suit non-trump (A already played for that suit)
    const topCards = leg.filter(c=>c.v!==14&&isTopOfSuit(c)&&c.s!==trump);
    if(topCards.length) return topCards.reduce((a,b)=>b.v>a.v?b:a);

    // 3. Lead trump if holding 4+
    const trumpCards = leg.filter(c=>c.s===trump);
    if(trumpCards.length>=4) return trumpCards.reduce((a,b)=>b.v>a.v?b:a);

    // 4. Safe non-trump lead (not risky, not void-exploit risk)
    const safeLeads = leg.filter(c=>c.s!==trump&&!risky(c));
    if(safeLeads.length) return safeLeads.reduce((a,b)=>b.v>a.v?b:a);

    // 5. No safe non-trump — prefer low trump over risky K/Q lead
    if(trumpCards.length) return trumpCards.reduce((a,b)=>a.v<b.v?a:b);

    // 6. Absolute last resort — lowest card in hand
    return leg.reduce((a,b)=>a.v<b.v?a:b);
  }

  const wp = tWin(tk,trump);
  const wc = tk.find(t=>t.pos===wp).card;

  if(wp===par){
    const nt = leg.filter(c=>c.s!==trump);
    return (nt.length?nt:leg).reduce((a,b)=>a.v<b.v?a:b);
  }

  const cw = leg.filter(c=>beats(c,wc,trump));
  if(cw.length) return cw.reduce((a,b)=>a.v<b.v?a:b);

  const nt = leg.filter(c=>c.s!==trump);
  return (nt.length?nt:leg).reduce((a,b)=>a.v<b.v?a:b);
}

function calcGrade(moves,bids_h){
  const ms=moves.length?60*(moves.filter(Boolean).length/moves.length):60;
  const bs=bids_h.length?40*(1-bids_h.reduce((a,d)=>a+Math.min(1,Math.abs(d)/4),0)/bids_h.length):40;
  const s=ms+bs;
  return{
    grade:s>=90?'A':s>=77?'B':s>=62?'C':s>=48?'D':'F',
    moveScore:moves.length?Math.round(moves.filter(Boolean).length/moves.length*100):0,
    bidScore:bids_h.length?Math.round(100*(1-bids_h.reduce((a,d)=>a+Math.min(1,Math.abs(d)/4),0)/bids_h.length)):0,
    movesTotal:moves.length,bidsTotal:bids_h.length
  };
}

// Local pre-evaluation — determines tier before calling AI
function localTier(hand,played,tb,trump){
  const led=tb.length?tb[0].card.s:null;
  const leg=lgl(hand,led);
  if(leg.length<=1) return 'green'; // no choice

  if(!tb.length){
    // Leading: best play is the highest value in hand
    const maxVal=leg.reduce((a,b)=>b.v>a.v?b:a).v;
    // Any card tied at max value = green (A of any suit is equally best when leading)
    if(played.v===maxVal) return 'green';
    // Within 2 of max = yellow (e.g. played K when A exists)
    return(maxVal-played.v)<=2?'yellow':'red';
  }

  const wp=tWin(tb,trump);
  const wc=tb.find(t=>t.pos===wp).card;

  if(wp===PAR.S){
    // Partner winning: dump lowest
    const nt=leg.filter(c=>c.s!==trump);
    const best=(nt.length?nt:leg).reduce((a,b)=>a.v<b.v?a:b);
    if(played.s===best.s&&played.v===best.v) return 'green';
    const minVal=best.v+(best.s===trump?100:0);
    const playedVal=played.v+(played.s===trump?100:0);
    return(playedVal-minVal)<=3?'yellow':'red';
  }

  const cw=leg.filter(c=>beats(c,wc,trump));
  if(cw.length){
    // Can win: play lowest winner
    const best=cw.reduce((a,b)=>a.v<b.v?a:b);
    if(played.s===best.s&&played.v===best.v) return 'green';
    return beats(played,wc,trump)?'yellow':'red';
  }

  // Cannot win: dump lowest
  const nt=leg.filter(c=>c.s!==trump);
  const best=(nt.length?nt:leg).reduce((a,b)=>a.v<b.v?a:b);
  if(played.s===best.s&&played.v===best.v) return 'green';
  return played.v<=6?'yellow':'red';
}

// Build card inference context from played cards by position
function buildInference(prev, trump){
  // prev is flat array of cards — we need played-by-position
  // We track voids and likely holdings
  const sn=s=>({S:'Spades',H:'Hearts',D:'Diamonds',C:'Clubs'}[s]);
  const allPlayed=prev||[];
  // Which high cards are still out?
  const gone=new Set(allPlayed.map(c=>`${c.s}${c.v}`));
  const stillOut=s=>[14,13,12,11].filter(v=>!gone.has(`${s}${v}`));
  const lines=[];
  SUITS.forEach(s=>{
    const out=stillOut(s);
    if(out.length<4) lines.push(`${sn(s)}: ${out.length?out.map(v=>VL(v)).join(',')+' still out':'A/K/Q/J all played'}`);
  });
  return lines.join(' | ');
}

// Claude Haiku move evaluation — fast, uses confirmed voids and card signals
async function evalMove(hand, played, tb, trump, lang, prev, confirmedVoids){
  const sn=s=>({S:'Spades',H:'Hearts',D:'Diamonds',C:'Clubs'}[s]);
  const cv=c=>`${VL(c.v)}${SY(c.s)}`;
  const wp=tb.length?tWin(tb,trump):null;
  const wc=wp?tb.find(t=>t.pos===wp)?.card:null;
  const inference=buildInference(prev,trump);

  // Use CONFIRMED voids only (player failed to follow suit)
  const voidLines=[];
  if(confirmedVoids){
    Object.entries(confirmedVoids).forEach(([pos,suits])=>{
      if(pos!=='S'&&suits.length){
        voidLines.push(`${pos} is confirmed void in: ${suits.map(sn).join(', ')}`);
      }
    });
  }

  // K-Q signal inference: if opponent played Q on a trick where K/A was led, they may have no more of that suit
  const signals=[];
  if(prev&&prev.length>=4){
    // Look at recent tricks for high card plays that signal suit exhaustion
    for(let i=0;i<prev.length-3;i+=4){
      const trick4=prev.slice(i,i+4);
      const highCards=trick4.filter(c=>c.v>=12);
      if(highCards.length>=2){
        const suits=new Set(highCards.map(c=>c.s));
        suits.forEach(s=>{
          const inSuit=highCards.filter(c=>c.s===s).sort((a,b)=>b.v-a.v);
          if(inSuit.length>=2){
            signals.push(`Multiple high ${sn(s)} played in same trick — players may be running low on ${sn(s)}`);
          }
        });
      }
    }
  }

  const contextLines=[inference, ...voidLines, ...signals].filter(Boolean).join('\n');

  const prompt=`You are a friendly Tarneeb card coach. Plain everyday English only, no jargon.
IMPORTANT: Evaluate my card based ONLY on what I knew when I played it. Cards played by others AFTER me in this trick were unknown to me — do NOT consider them.
Trump: ${sn(trump)}. Trick ${Math.floor((prev||[]).length/4)+1}/13.
MY HAND when I played (only these cards): ${hand.map(cv).join(' ')}
I played: ${cv(played)}
Cards played BEFORE me this trick: ${tb.length?tb.map(t=>`${t.pos}:${cv(t.card)}`).join(' '):'I was first — nothing played yet'}
Who was winning before my card: ${wc?`${cv(wc)} by ${wp}`:'nobody yet, I led'}
Board knowledge from previous tricks:
${contextLines||'No previous tricks yet'}
Partner=N, Opponents=E+W.
Only suggest a card from MY HAND listed above.
Reply ONLY with JSON: {"wasBestMove":true,"bestCard":null,"explanation":"max 12 words"}
or {"wasBestMove":false,"bestCard":{"s":"H","v":13},"explanation":"max 12 words"}
${lang==='ar'?'Explanation in Palestinian casual Arabic.':lang==='mix'?'Explanation in Arabenglish (Arabic words spelled in English letters).':'Explanation in plain casual English.'}`;
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':'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','anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:100,messages:[{role:'user',content:prompt}]})
    });
    const d=await r.json();
    const txt=(d.content?.[0]?.text||'').replace(/```json|```/g,'').trim();
    const parsed=JSON.parse(txt);
    if(typeof parsed.wasBestMove!=='boolean')throw new Error('bad');
    if(parsed.bestCard){
      const exists=hand.find(c=>c.s===parsed.bestCard.s&&Number(c.v)===Number(parsed.bestCard.v));
      if(!exists)parsed.bestCard=null;
    }
    return parsed;
  }catch{
    // Smart local fallback — never shows "could not analyze"
    const led=tb.length?tb[0].card.s:null;
    const leg=lgl(hand,led);
    if(!tb.length){
      // Leading: should play highest card
      const best=leg.reduce((a,b)=>b.v>a.v?b:a);
      const ok=best.s===played.s&&best.v===played.v;
      return{wasBestMove:ok,bestCard:ok?null:best,explanation:ok?'Good lead.':lang==='ar'?'إطلع أعلى ورقة عندك.':lang==='mix'?'3li a3la wara2a 3andak.':'Lead your strongest card.'};
    }
    const wp2=tWin(tb,trump);const wc2=tb.find(t=>t.pos===wp2)?.card;
    if(wp2===PAR.S){
      const nt=leg.filter(c=>c.s!==trump);const best=(nt.length?nt:leg).reduce((a,b)=>a.v<b.v?a:b);
      const ok=best.s===played.s&&best.v===played.v;
      return{wasBestMove:ok,bestCard:ok?null:best,explanation:ok?'Correct, partner winning.':lang==='ar'?'شريكك رابح — إرمي أواطي ورقة.':lang==='mix'?'Sharikak rabih — irmi a6a2 wara2a.':'Partner is winning — throw your lowest card.'};
    }
    const cw=leg.filter(c=>beats(c,wc2,trump));
    if(cw.length){const best=cw.reduce((a,b)=>a.v<b.v?a:b);const ok=best.s===played.s&&best.v===played.v;return{wasBestMove:ok,bestCard:ok?null:best,explanation:ok?'Good win.':lang==='ar'?'اربح بأصغر ورقة ممكنة.':lang==='mix'?'Irba7 ba-a6al wara2a.':'Win with your lowest winning card.'};}
    const nt=leg.filter(c=>c.s!==trump);const best=(nt.length?nt:leg).reduce((a,b)=>a.v<b.v?a:b);
    const ok=best.s===played.s&&best.v===played.v;
    return{wasBestMove:ok,bestCard:ok?null:best,explanation:ok?'Good discard.':lang==='ar'?'إرمي أواطي ورقة.':lang==='mix'?'Irmi a6a2 wara2a.':'Throw your lowest card when you can\'t win.'};
  }
}

// Evaluate bid AFTER trump is known using Claude AI
async function evalBid(bid,hand,trump,lang){
  const sn=s=>({S:'Spades',H:'Hearts',D:'Diamonds',C:'Clubs'}[s]);
  const myEst=estTricksWithTrump(hand,trump);
  const teamEst=Math.min(13,myEst+3.2);
  const diff=bid-teamEst;
  const prompt=`You are a Tarneeb expert evaluating a bid.

HAND: ${hand.map(c=>`${VL(c.v)}${SY(c.s)}`).join(' ')}
TRUMP SUIT: ${sn(trump)}
PLAYER BID: ${bid}
ESTIMATED tricks for this hand with this trump: ${myEst.toFixed(1)} (team estimate ~${teamEst.toFixed(1)})

Evaluate honestly:
- Is this bid justified given the hand AND the trump suit?
- Consider: number of trump cards, high cards (A/K), voids, long suits
- Bid too high (3+ above estimate) = aggressive/risky
- Bid too low (2+ below estimate) = conservative/wasted opportunity
- Otherwise = solid

Return ONLY JSON:
{"rating":"solid|aggressive|conservative","explanation":"..."}
Language: ${lang==='ar'?'Palestinian casual Arabic slang':lang==='mix'?'mix English and Palestinian Arabic':'English'}. One sentence, honest and direct.`;
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':'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','anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:150,messages:[{role:'user',content:prompt}]})});
    const d=await r.json();
    const txt=(d.content?.[0]?.text||'').replace(/```json|```/g,'').trim();
    const p=JSON.parse(txt);
    const colorMap={solid:'#22c55e',aggressive:'#ef4444',conservative:'#f59e0b'};
    return{c:colorMap[p.rating]||'#22c55e',k:p.rating||'solid',explanation:p.explanation||''};
  }catch{
    const colorMap={solid:'#22c55e',aggressive:'#ef4444',conservative:'#f59e0b'};
    const k=diff>=3?'aggressive':diff<=-2?'conservative':'solid';
    return{c:colorMap[k],k,explanation:''};
  }
}

const G0=()=>({sc:'setup',target:41,lang:'en',names:{N:'',E:'',W:''},scores:{SN:0,EW:0},dealer:'S',moves:[],bids_h:[],hands:{S:[],N:[],E:[],W:[]},bids:{S:null,N:null,E:null,W:null},bidCur:null,bidPasses:0,hiB:6,hiBdr:null,rndBid:null,trump:null,trick:[],tLdr:null,curP:null,tw:{SN:0,EW:0},tN:0,prev:[],prevByPos:{S:[],N:[],E:[],W:[]},confirmedVoids:{N:[],E:[],W:[]},partnerLikelyAces:[],fb:null,ldFB:false,hS:0,hC:null,hintReason:null,bRat:null,rndEnd:null,gameEnd:null,aiT:false,lastW:null,pendingBid:null,bidHint:null,bidHintLoading:false,pendingEval:null,redealMsg:null});

// Smart void-aware hint with plain-language reason
function smartHint(hand, trick, trump, prev, confirmedVoids, hands, names, lang, partnerLikelyAces){
  const sn=s=>({S:'Spades',H:'Hearts',D:'Diamonds',C:'Clubs'}[s]);
  const gone=new Set((prev||[]).map(c=>`${c.s}${c.v}`));
  const isGone=(s,v)=>gone.has(`${s}${v}`);
  const isTopOfSuit=card=>{for(let v=14;v>card.v;v--){if(!isGone(card.s,v))return false;}return true;};
  const isVoid=(pos,suit)=>confirmedVoids&&confirmedVoids[pos]&&confirmedVoids[pos].includes(suit);
  const nm=pos=>pos==='S'?'you':(names[pos]||pos);
  const led=trick.length?trick[0].card.s:null;
  const leg=lgl(hand,led);

  const say=(en,ar,mix)=>lang==='ar'?ar:lang==='mix'?mix:en;

  if(!trick.length){
    // ── LEADING ───────────────────────────────────────────

    // 1. Aces — always safe
    const aces=leg.filter(c=>c.v===14);
    if(aces.length){
      const a=aces[0];
      return{card:a,reason:say(
        `Lead your Ace of ${sn(a.s)} — nobody can beat it.`,
        `إطلع بإيص ${sn(a.s)} — ما حدا بيربح عليها.`,
        `Lead il-As ${sn(a.s)} — ma fi a7ad yirba7 3aleiha.`
      )};
    }

    // 2. Partner likely has Ace — lead low to let them win
    const partnerAces=partnerLikelyAces||[];
    const leadToPartnerAce=leg.filter(c=>c.s!==trump&&partnerAces.includes(c.s)&&c.v!==14);
    if(leadToPartnerAce.length){
      const lowest=leadToPartnerAce.reduce((a,b)=>a.v<b.v?a:b);
      return{card:lowest,reason:say(
        `Your partner probably has the Ace of ${sn(lowest.s)} — lead low and let them take it.`,
        `شريكك عنده غالباً إيص ${sn(lowest.s)} — إطلع واطية وخليه يأخذها.`,
        `Sharikak 3indo ghaliban as ${sn(lowest.s)} — 3li wa6iye w khallio yakhudha.`
      )};
    }

    // 3. Partner void in suit + partner has trump = lead that suit low
    const partnerVoidSuits=leg.filter(c=>c.s!==trump&&isVoid('N',c.s));
    if(partnerVoidSuits.length&&hands.N&&hands.N.length>0){
      const lowest=partnerVoidSuits.reduce((a,b)=>a.v<b.v?a:b);
      return{card:lowest,reason:say(
        `${nm('N')} has no ${sn(lowest.s)} left and can trump in — lead low and let your partner win it.`,
        `${nm('N')} ما عنده ${sn(lowest.s)} وبيقدر يطرنب — إطلع واطية وخلي شريكك يأخذها.`,
        `${nm('N')} mafi ma3o ${sn(lowest.s)} w y2dar y6arnib — 3li w khalli sharikak yakhudha.`
      )};
    }

    // 3. Avoid suits where opponents are void AND might have trump
    const oppVoidSuits={};
    ['E','W'].forEach(opp=>{
      (confirmedVoids[opp]||[]).filter(s=>s!==trump).forEach(s=>{
        if(!oppVoidSuits[s])oppVoidSuits[s]=[];
        oppVoidSuits[s].push(opp);
      });
    });

    // Find safe leads — avoid opponent void suits
    const safeSuits=leg.filter(c=>{
      if(c.s===trump)return false;
      if(oppVoidSuits[c.s])return false; // opponent void here = they'll trump
      if(c.v===13&&!isGone(c.s,14))return false; // K with A still out
      return true;
    });

    if(safeSuits.length){
      const best=safeSuits.reduce((a,b)=>b.v>a.v?b:a);
      // Check if there's a specific reason (top of suit)
      if(isTopOfSuit(best)){
        return{card:best,reason:say(
          `The ${VL(best.v)} of ${sn(best.s)} is now the highest card left in that suit — it should win.`,
          `${VL(best.v)} ${sn(best.s)} هي أعلى ورقة باقية — لازم تربح.`,
          `${VL(best.v)} ${sn(best.s)} hiye a3la wara2a baqye — lazim tirba7.`
        )};
      }
      // Mention who we're avoiding if there's a dangerous suit
      const dangerSuit=Object.keys(oppVoidSuits)[0];
      const dangerOpp=dangerSuit?oppVoidSuits[dangerSuit][0]:null;
      const reason=dangerOpp?say(
        `${nm(dangerOpp)} is out of ${sn(dangerSuit)} and could trump — lead ${sn(best.s)} instead.`,
        `${nm(dangerOpp)} ما عنده ${sn(dangerSuit)} وممكن يطرنب — إطلع ${sn(best.s)} بدل هيك.`,
        `${nm(dangerOpp)} mafi ma3o ${sn(dangerSuit)} w mumkin y6arnib — 3li ${sn(best.s)} badal hek.`
      ):say(`Safe lead in ${sn(best.s)}.`,`إطلع ${sn(best.s)} بأمان.`,`3li ${sn(best.s)} b-aman.`);
      return{card:best,reason};
    }

    // 4. If all suits are dangerous, lead trump to drain opponents
    const myTrump=leg.filter(c=>c.s===trump);
    if(Object.keys(oppVoidSuits).length>0&&myTrump.length){
      const t=myTrump.reduce((a,b)=>b.v>a.v?b:a);
      const dangerOpp=Object.values(oppVoidSuits)[0][0];
      const dangerSuit=Object.keys(oppVoidSuits)[0];
      return{card:t,reason:say(
        `${nm(dangerOpp)} is out of ${sn(dangerSuit)} and will trump anything — lead trump to drain their supply.`,
        `${nm(dangerOpp)} ما عنده ${sn(dangerSuit)} وبيطرنب — إطلع طرنيب عشان تخلصه.`,
        `${nm(dangerOpp)} mafi ma3o ${sn(dangerSuit)} w ha-y6arnib — 3li tarneeb 3shan tkhalliso.`
      )};
    }

    // 5. Fallback — lowest card
    const nonTrump=leg.filter(c=>c.s!==trump);
    const fallback=(nonTrump.length?nonTrump:leg).reduce((a,b)=>a.v<b.v?a:b);
    return{card:fallback,reason:say(`Play it safe with a low card.`,`إطلع واطية على الأمان.`,`3li wa6iye 3-il-aman.`)};
  }

  // ── FOLLOWING ─────────────────────────────────────────
  const wp=tWin(trick,trump);
  const wc=trick.find(t=>t.pos===wp).card;

  if(wp==='N'){
    const nt=leg.filter(c=>c.s!==trump);
    const best=(nt.length?nt:leg).reduce((a,b)=>a.v<b.v?a:b);
    return{card:best,reason:say(
      `${nm('N')} is already winning — just throw your lowest card and save the good ones.`,
      `${nm('N')} رابح — إرمي أواطي ورقة واحفظ الكبار.`,
      `${nm('N')} rabih — irmi a6a2 wara2a wa7fa6 il-kibar.`
    )};
  }

  const cw=leg.filter(c=>beats(c,wc,trump));
  if(cw.length){
    const best=cw.reduce((a,b)=>a.v<b.v?a:b);
    return{card:best,reason:say(
      `Beat them with your lowest winning card — save the bigger ones for later.`,
      `اربح بأصغر ورقة ممكنة — احتفظ بالكبار.`,
      `irba7 ba-a6al wara2a mumkine — i7tafi6 bil-kibar.`
    )};
  }

  const nt=leg.filter(c=>c.s!==trump);
  const best=(nt.length?nt:leg).reduce((a,b)=>a.v<b.v?a:b);
  return{card:best,reason:say(
    `You can't win this one — throw your lowest card.`,
    `ما رح تربح هاي — إرمي أواطي ورقة.`,
    `ma ra7 tirba7 hal-marra — irmi a6a2 wara2a.`
  )};
}

async function getBidHint(hand,hiB,lang){
  const myTricks=handStrength(hand,null);
  const teamTotal=myTricks+3.2;
  const rec=Math.max(7,Math.round(teamTotal));
  const qt=SUITS.reduce((a,s)=>a+quickTricks(hand,s),0).toFixed(1);
  const bestSuit=aiTrump(hand);
  const sn=s=>({S:'Spades',H:'Hearts',D:'Diamonds',C:'Clubs'}[s]);
  const suitCards=hand.filter(c=>c.s===bestSuit).length;
  if(rec<=hiB){
    const reason=lang==='ar'?'إيدك ما تكفي تعلي':lang==='mix'?'Idak ma tkafi t3ali':'Hand not strong enough to raise.';
    return{recommendation:'pass',reason,suit:null};
  }
  const reason=lang==='ar'
    ?`عندك ${qt} أوراق مضمونة، مع شريكك إطلع ${Math.min(13,rec)} — ${sn(bestSuit)} أحسن طرنيب عندك (${suitCards} أوراق)`
    :lang==='mix'
    ?`${qt} guaranteed tricks — bid ${Math.min(13,rec)}, make ${sn(bestSuit)} tarneeb (${suitCards} cards)`
    :`${qt} guaranteed tricks — bid ${Math.min(13,rec)} and make ${sn(bestSuit)} trump (${suitCards} cards in that suit).`;
  return{recommendation:Math.min(13,rec),reason,suit:bestSuit};
}

export default function App(){
  const gR=useRef(G0());
  const[,re]=useState(0);
  const evalRef=useRef({result:null,tier:null,active:false}); // stores pending eval result
  const G=gR.current;
  const tx=L[G.lang]||L.en;
  const up=fn=>{fn(gR.current);re(n=>n+1);};
  const w=ms=>new Promise(r=>setTimeout(r,ms));
  const pn=p=>p==='S'?tx.you:(G.names[p]||p);

  const startMatch=()=>{
    const ns=shuf(['Mohammad','Hazim','Zuhdi']);
    const{lang,target}=G;
    up(g=>{Object.assign(g,G0());g.lang=lang;g.target=target;g.names={N:ns[0],E:ns[1],W:ns[2]};});
    setTimeout(()=>deal(gR.current),10);
  };

  const deal=g=>{
    const dk=shuf(DECK());
    const nh={S:dk.slice(0,13),W:dk.slice(13,26),N:dk.slice(26,39),E:dk.slice(39,52)};
    const di=CCW.indexOf(g.dealer);
    const startPos=CCW[(di+1)%4]; // first bidder is left of dealer
    up(g=>{
      g.hands=nh;g.bids={S:null,N:null,E:null,W:null};
      g.bidCur=startPos;g.bidPasses=0;g.hiB=6;g.hiBdr=null;
      g.rndBid=null;g.trump=null;g.trick=[];g.tLdr=null;g.curP=null;
      g.tw={SN:0,EW:0};g.tN=0;g.prev=[];g.prevByPos={S:[],N:[],E:[],W:[]};g.confirmedVoids={N:[],E:[],W:[]};g.partnerLikelyAces=[];
      g.fb=null;g.ldFB=false;g.hS=0;g.hC=null;
      g.bRat=null;g.rndEnd=null;g.gameEnd=null;g.aiT=false;g.lastW=null;g.pendingBid=null;
      g.bidHint=null;g.bidHintLoading=false;g.redealMsg=null;
      g.sc='bidding';
    });
    if(startPos!=='S')setTimeout(()=>runBidding(nh),800);
  };

  // Bidding loop — runs until 3 consecutive passes, re-cycles when bid is raised
  async function runBidding(hands){
    while(true){
      const g=gR.current;
      if(g.sc!=='bidding')return;
      if(g.bidPasses>=3||(g.hiB>6&&g.bidPasses>=3))break;
      // Check if all 4 passed (no bids at all) — force minimum on current
      const allPassed=Object.values(g.bids).every(b=>b==='pass');
      if(allPassed&&Object.values(g.bids).every(b=>b!==null)){
        // Force dealer to bid 7
        up(g=>{g.bids[g.dealer]=7;g.hiB=7;g.hiBdr=g.dealer;g.bidCur=nxt(g.dealer);g.bidPasses=0;});
        if(gR.current.bidCur==='S'){await pauseForPlayer();if(gR.current.sc!=='bidding')return;}
        continue;
      }
      const pos=g.bidCur;
      if(pos==='S'){await pauseForPlayer();if(gR.current.sc!=='bidding')return;continue;}
      up(g2=>{g2.aiT=true;});
      await w(1000);
      const g2=gR.current;
      const bid=aiBid(hands[pos],g2.hiB);
      up(g2=>{
        g2.bids[pos]=bid;
        if(bid!=='pass'){g2.hiB=bid;g2.hiBdr=pos;g2.bidPasses=0;}
        else g2.bidPasses++;
        g2.bidCur=nxt(pos);g2.aiT=false;
      });
      if(gR.current.bidPasses>=3)break;
      if(gR.current.bidCur==='S'){await pauseForPlayer();if(gR.current.sc!=='bidding')return;}
    }
    setTimeout(finBid,400);
  }

  // Pause bidding loop until player acts
  const playerBidResolverRef=useRef(null);
  function pauseForPlayer(){return new Promise(resolve=>{playerBidResolverRef.current=resolve;});}

  const plyrBid=bid=>{
    const g=gR.current;
    if(bid!=='pass'){
      up(g=>{g.bids.S=bid;g.hiB=Math.max(g.hiB,bid);g.hiBdr='S';g.bidPasses=0;g.pendingBid=bid;g.bidCur=nxt('S');g.bidHint=null;});
    }else{
      up(g=>{g.bids.S='pass';g.bidPasses=(g.bidPasses||0)+1;g.bidCur=nxt('S');g.bidHint=null;});
    }
    // Resume bidding loop
    if(playerBidResolverRef.current){playerBidResolverRef.current();playerBidResolverRef.current=null;}
  };

  const finBid=()=>{
    const g=gR.current;
    let wn=g.hiBdr,amt=g.hiB;
    if(!wn||amt<=6){wn=nxt(g.dealer);amt=7;}
    if(wn==='S'){
      up(g=>{g.rndBid={pos:'S',amount:amt};g.sc='trumpPick';});
    }else{
      const t=aiTrump(gR.current.hands[wn]);
      up(g=>{g.rndBid={pos:wn,amount:amt};g.trump=t;g.tLdr=wn;g.curP=wn;g.sc='playing';});
      if(gR.current.pendingBid){
        const pb=gR.current.pendingBid,ph=gR.current.hands.S,lang=gR.current.lang;
        evalBid(pb,ph,t,lang).then(rat=>{up(g=>{g.bRat=rat;g.pendingBid=null;});});
      }
      setTimeout(()=>aiTurns(wn),1500);
    }
  };

  const pickTrump=suit=>{
    const g=gR.current;
    const pb=g.pendingBid,ph=g.hands.S,lang=g.lang;
    up(g=>{g.trump=suit;g.tLdr='S';g.curP='S';g.sc='playing';g.pendingBid=null;});
    if(pb){
      evalBid(pb,ph,suit,lang).then(rat=>{up(g=>{g.bRat=rat;});});
    }
  };

  const playCard=card=>{
    const g=gR.current;
    if(g.curP!=='S'||g.sc!=='playing'||g.ldFB)return;
    const led=g.trick.length?g.trick[0].card.s:null;
    if(!lgl(g.hands.S,led).find(c=>c.s===card.s&&c.v===card.v))return;
    const legal=lgl(g.hands.S,led);
    const shouldEval=legal.length>1;
    const hb=[...g.hands.S],tb=[...g.trick];
    const prev=[...g.prev];
    const confirmedVoids={N:[...g.confirmedVoids.N],E:[...g.confirmedVoids.E],W:[...g.confirmedVoids.W]};
    const trump=g.trump,lang=g.lang;
    up(g=>{
      g.hands.S=g.hands.S.filter(c=>!(c.s===card.s&&c.v===card.v));
      g.trick=[...g.trick,{pos:'S',card}];
      g.hS=0;g.hC=null;g.hintReason=null;g.fb=null;g.ldFB=false;
      g.pendingEval=shouldEval?{hand:hb,played:card,tb}:null;
    });
    if(shouldEval){
      const tier=localTier(hb,card,tb,trump);
      evalRef.current={result:null,tier,active:true};
      if(tier==='green'){
        evalRef.current.result={tier:'green',wasBestMove:true,bestCard:null,explanation:null};
      } else {
        evalMove(hb,card,tb,trump,lang,prev,confirmedVoids).then(res=>{
          const fb={tier,wasBestMove:res.wasBestMove,bestCard:res.bestCard,explanation:res.explanation};
          evalRef.current.result=fb;
          if(gR.current.ldFB){up(g=>{g.fb=fb;g.ldFB=false;g.moves=[...g.moves,!!res.wasBestMove];});}
        });
      }
    } else {
      evalRef.current={result:null,tier:null,active:false};
    }
    const np=nxt('S');const ct=gR.current.trick;
    if(ct.length>=4)setTimeout(()=>endTrick(ct),2000);
    else{up(g=>{g.curP=np;});setTimeout(()=>aiTurns(np),1000);}
  };

  async function aiTurns(start){
    let pos=start;
    while(pos!=='S'){
      const g=gR.current;
      if(g.sc!=='playing')return;
      if(g.trick.length>=4){setTimeout(()=>endTrick(gR.current.trick),400);return;}
      up(g=>{g.aiT=true;});
      await w(1000);
      const g2=gR.current;
      const card=aiCard(g2.hands[pos],g2.trick,g2.trump,PAR[pos],g2.prev||[]);
      up(g=>{g.hands[pos]=g.hands[pos].filter(c=>!(c.s===card.s&&c.v===card.v));g.trick=[...g.trick,{pos,card}];g.curP=nxt(pos);g.aiT=false;});
      const nt=gR.current.trick;pos=nxt(pos);
      if(nt.length>=4){setTimeout(()=>endTrick(nt),400);return;}
    }
    up(g=>{g.aiT=false;});
  }

  const endTrick=tk=>{
    if(!tk||tk.length<4)return;
    const g=gR.current;const wn=tWin(tk,g.trump);const nn=g.tN+1;
    const pe=g.pendingEval;
    up(g=>{
      g.tw[TM[wn]]++;
      const ledSuit=tk[0].card.s;
      const winCard=tk.find(t=>t.pos===wn).card;
      tk.forEach(t=>{
        g.prevByPos[t.pos]=[...(g.prevByPos[t.pos]||[]),t.card];
        // ONLY confirmed void: player played a DIFFERENT suit when led suit was available
        // This is the only 100% certain inference in Tarneeb (must follow suit rule)
        if(t.pos!=='S' && g.confirmedVoids[t.pos] && t.card.s!==ledSuit && !g.confirmedVoids[t.pos].includes(ledSuit)){
          g.confirmedVoids[t.pos]=[...g.confirmedVoids[t.pos],ledSuit];
        }
      });
      g.prev=[...g.prev,...tk.map(t=>t.card)];
      g.trick=[];g.tLdr=wn;g.curP=wn;g.tN=nn;g.fb=null;g.ldFB=false;g.lastW=wn;g.pendingEval=null;
      // Partner A inference: player played K and A never appeared → partner likely has A
      const playerCard=tk.find(t=>t.pos==='S')?.card;
      if(playerCard&&playerCard.v===13){
        const suit=playerCard.s;
        const aPlayed=tk.some(t=>t.card.s===suit&&t.card.v===14)||(g.prev||[]).some(c=>c.s===suit&&c.v===14);
        if(!aPlayed&&!(g.partnerLikelyAces||[]).includes(suit)){
          g.partnerLikelyAces=[...(g.partnerLikelyAces||[]),suit];
        }
      }
    });
    if(pe&&evalRef.current.active){
      const ev=evalRef.current;
      if(ev.result){
        up(g=>{g.fb=ev.result;g.moves=[...g.moves,!!ev.result.wasBestMove];});
      } else if(ev.tier==='green'){
        up(g=>{g.fb={tier:'green',wasBestMove:true,bestCard:null,explanation:null};g.moves=[...g.moves,true];});
      } else {
        // Still computing — show loading; evalMove.then() delivers when ready
        up(g=>{g.ldFB=true;});
      }
    }
    if(nn>=13){setTimeout(endRound,800);return;}
    if(wn!=='S')setTimeout(()=>aiTurns(wn),1000);
  };

  const endRound=()=>{
    const g=gR.current;const{rndBid,tw,scores}=g;
    const bt=TM[rndBid.pos],dt=bt==='SN'?'EW':'SN';
    const made=tw[bt]>=rndBid.amount;const ns={...scores};
    if(made){
      ns[bt]+=tw[bt]; // bidding team scores their tricks
      // defending team scores 0
    }else{
      ns[bt]-=rndBid.amount; // bidding team loses their bid
      ns[dt]+=tw[dt]; // defending team scores their tricks
    }
    const won=ns.SN>=g.target||ns.EW>=g.target;
    if(won){
      const wt=(ns.SN>=g.target&&ns.EW>=g.target)?TM[rndBid.pos]:ns.SN>=g.target?'SN':'EW';
      const grData=calcGrade(g.moves,g.bids_h);
      up(g=>{g.scores=ns;g.gameEnd={wt,scores:ns,...grData};g.sc='gameOver';});
    }else{
      up(g=>{g.scores=ns;g.rndEnd={made,bt,amt:rndBid.amount,tw:{...tw}};g.sc='roundEnd';});
    }
  };

  const nextRound=()=>{
    up(g=>{g.dealer=nxt(g.dealer);g.rndEnd=null;g.bRat=null;});
    deal(gR.current);
  };

  // ── CARD HINT ─────────────────────────────────────────
  const doHint = () => {
    const g = gR.current;
    if(g.curP!=='S' || g.sc!=='playing') return;
    if(g.hS>=1) return;
    const {card, reason} = smartHint(
      [...g.hands.S], [...g.trick], g.trump, [...g.prev],
      g.confirmedVoids, g.hands, g.names, g.lang, [...(g.partnerLikelyAces||[])]
    );
    up(g=>{ if(card){g.hS=1; g.hC=card; g.hintReason=reason; g.fb=null;} });
  };

  // ── BID HINT ──────────────────────────────────────────
  const doBidHint = async () => {
    const g = gR.current;
    if(g.bidHintLoading || g.bidHint) return;
    up(g=>{g.bidHintLoading=true;});
    const result = await getBidHint([...g.hands.S], g.hiB, g.lang);
    up(g=>{ g.bidHint=result||{recommendation:'?',reason:'No hint available'}; g.bidHintLoading=false; });
  };

  const doRedeal=()=>{
    const g=gR.current;
    if(g.sc!=='bidding') return;
    const faceCards=g.hands.S.filter(c=>c.v>=11);
    if(faceCards.length===0){
      // Valid redeal — reshuffle
      up(g=>{g.redealMsg={ok:true,text:'✓ Redeal granted — no face cards!'}});
      setTimeout(()=>deal(gR.current),1200);
    } else {
      // Invalid — show which face cards they have
      const sn=s=>({S:'♠',H:'♥',D:'♦',C:'♣'}[s]);
      const names=faceCards.map(c=>`${VL(c.v)}${sn(c.s)}`).join(', ');
      const msg=g.lang==='ar'
        ?`عندك أوراق عالية: ${names} — ما تنفعك تطلب إعادة`
        :g.lang==='mix'
        ?`3andak face cards: ${names} — mish masto7a2 redeal`
        :`You have face cards: ${names} — redeal not valid.`;
      up(g=>{g.redealMsg={ok:false,text:msg}});
      setTimeout(()=>up(g=>{g.redealMsg=null;}),3500);
    }
  };

  if(G.sc==='setup')    return <Setup G={G} tx={tx} up={up} start={startMatch}/>;
  if(G.sc==='roundEnd') return <RndEnd G={G} tx={tx} pn={pn} next={nextRound}/>;
  if(G.sc==='gameOver') return <GameOver G={G} tx={tx} restart={startMatch}/>;
  const mode=G.sc==='bidding'?'bid':G.sc==='trumpPick'?'trump':'play';
  return <MainTable G={G} tx={tx} pn={pn} mode={mode} plyrBid={plyrBid} pickTrump={pickTrump} play={playCard} hint={doHint} bidHint={doBidHint} onRedeal={doRedeal}/>;
}

function MainTable({G,tx,pn,mode,plyrBid,pickTrump,play,hint,bidHint,onRedeal}){
  const[sel,setSel]=useState(null);
  const[bidSel,setBidSel]=useState(null);
  const isMyBidTurn=mode==='bid'&&G.bidCur==='S'&&!G.bids.S;
  const forceMin=!G.hiBdr&&G.hiB<=6;
  const minBid=Math.max(7,G.hiB>=7?G.hiB+1:7);
  const curBidder=G.bidCur;

  // Instant bid rating when user selects a number
  const bidRating=(n)=>{
    if(!n)return null;
    const myTricks=handStrength(G.hands.S,null);
    const team=myTricks+3.2;
    const diff=n-team;
    if(diff>=3)return{label:'Aggressive',c:'#ef4444'};
    if(diff<=-2)return{label:'Conservative',c:'#f59e0b'};
    return{label:'Solid',c:'#22c55e'};
  };
  const selRating=bidRating(bidSel);
  const led=G.trick.length?G.trick[0].card.s:null;
  const leg=mode==='play'&&G.curP==='S'?lgl(G.hands.S,led):[];
  const myTurn=mode==='play'&&G.curP==='S'&&!G.ldFB;
  const tc=pos=>G.trick.find(t=>t.pos===pos);
  const tap=card=>{
    if(!myTurn||!leg.find(c=>c.s===card.s&&c.v===card.v))return;
    if(sel&&sel.s===card.s&&sel.v===card.v){setSel(null);play(card);}
    else setSel(card);
  };
  const hand=[...G.hands.S].sort((a,b)=>SUITS.indexOf(a.s)-SUITS.indexOf(b.s)||b.v-a.v);

  return (
    <div style={{height:'100vh',background:'#18192a',display:'flex',flexDirection:'column',overflow:'hidden',fontFamily:'system-ui,sans-serif',color:'white'}}>
      <div style={{flex:1,position:'relative',margin:'10px 10px 0',background:'linear-gradient(155deg,#1e6e44,#185230)',borderRadius:'28px 28px 0 0',overflow:'hidden',minHeight:0}}>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 50% 20%,rgba(255,255,255,0.07),transparent 60%)',pointerEvents:'none'}}/>

        {/* Score cross */}
        <div style={{position:'absolute',top:9,left:9,zIndex:5,display:'grid',gridTemplateColumns:'repeat(3,28px)',gridTemplateRows:'repeat(3,24px)',gap:2}}>
          <div/><ScBox v={G.scores.SN}/><div/>
          <ScBox v={G.scores.EW}/><ScBox v={G.target} dim/><ScBox v={G.scores.EW}/>
          <div/><ScBox v={G.scores.SN}/><div/>
        </div>

        {mode==='play'&&G.trump&&(
          <div style={{position:'absolute',top:10,right:10,zIndex:5,fontSize:'0.72rem',color:RED(G.trump)?'#fca5a5':'white',background:'rgba(0,0,0,0.4)',padding:'3px 11px',borderRadius:20}}>
            {SY(G.trump)} {tx.sn[G.trump]}
          </div>
        )}

        {/* North */}
        <div style={{position:'absolute',top:9,left:'50%',transform:'translateX(-50%)',display:'flex',flexDirection:'column',alignItems:'center',gap:4,zIndex:3}}>
          <PChip name={pn('N')} active={mode==='play'?G.curP==='N':curBidder==='N'}/>
          <MiniCards n={G.hands.N.length} horizontal/>
          {mode==='bid'&&<BidTag b={G.bids.N} active={curBidder==='N'&&G.bids.N===null} tx={tx}/>}
        </div>

        {/* West */}
        <div style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',display:'flex',flexDirection:'column',alignItems:'center',gap:3,zIndex:3}}>
          <PChip name={pn('W')} active={mode==='play'?G.curP==='W':curBidder==='W'} small/>
          <MiniCards n={G.hands.W.length}/>
          {mode==='bid'&&<BidTag b={G.bids.W} active={curBidder==='W'&&G.bids.W===null} tx={tx}/>}
        </div>

        {/* East */}
        <div style={{position:'absolute',right:9,top:'50%',transform:'translateY(-50%)',display:'flex',flexDirection:'column',alignItems:'center',gap:3,zIndex:3}}>
          <PChip name={pn('E')} active={mode==='play'?G.curP==='E':curBidder==='E'} small/>
          <MiniCards n={G.hands.E.length}/>
          {mode==='bid'&&<BidTag b={G.bids.E} active={curBidder==='E'&&G.bids.E===null} tx={tx}/>}
        </div>

        {/* Center area */}
        <div style={{position:'absolute',top:'34%',left:'50%',transform:'translate(-50%,-50%)',display:'flex',flexDirection:'column',alignItems:'center',gap:8,width:'60%'}}>
          {mode==='bid'&&(
            <div style={{textAlign:'center'}}>
              {G.hiB>6&&G.hiBdr?(
                <div style={{background:'rgba(0,0,0,0.35)',borderRadius:12,padding:'6px 14px',textAlign:'center'}}>
                  <div style={{fontSize:'1.6rem',fontWeight:'bold',color:'#d4af37',lineHeight:1}}>{G.hiB}</div>
                  <div style={{fontSize:'0.6rem',opacity:0.45,marginTop:2}}>{pn(G.hiBdr)}</div>
                </div>
              ):(
                <div style={{fontSize:'0.65rem',opacity:0.2}}>Bidding...</div>
              )}
            </div>
          )}
          {mode==='trump'&&(
            <div style={{background:'rgba(0,0,0,0.84)',borderRadius:20,padding:'14px 20px',border:'1px solid rgba(255,255,255,0.07)',textAlign:'center'}}>
              <div style={{color:'#d4af37',fontWeight:'bold',marginBottom:14,fontSize:'0.88rem'}}>{tx.pickTrump}</div>
              <div style={{display:'flex',gap:16,justifyContent:'center'}}>
                {SUITS.map(s=>(
                  <button key={s} onClick={()=>pickTrump(s)} style={{background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:4}}>
                    <span style={{fontSize:'2.5rem',color:RED(s)?'#f87171':'white',lineHeight:1}}>{SY(s)}</span>
                    <span style={{fontSize:'0.6rem',color:RED(s)?'#fca5a5':'rgba(255,255,255,0.55)'}}>{tx.sn[s]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {mode==='play'&&(
            <>
              <div style={{fontSize:'0.63rem',opacity:0.28,background:'rgba(0,0,0,0.15)',padding:'1px 8px',borderRadius:16}}>
                {G.tw.SN}—{G.tw.EW} · T{G.tN+1}/13
              </div>
              <div style={{position:'relative',width:160,height:150}}>
                {[['N',56,2],['E',112,50],['S',56,100],['W',0,50]].map(([pos,l,t])=>{
                  const c=tc(pos);
                  return c?<div key={pos} style={{position:'absolute',left:l,top:t}}><Crd card={c.card} small/></div>:null;
                })}
                {!G.trick.length&&G.lastW&&(
                  <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.6rem',opacity:0.14,textAlign:'center'}}>
                    {pn(G.lastW)}<br/>won
                  </div>
                )}
              </div>
              {myTurn&&(
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                  <button onClick={hint} style={{background:'rgba(0,0,0,0.32)',border:'1px solid rgba(255,255,255,0.1)',color:G.hS>=1?'#fbbf24':'rgba(255,255,255,0.65)',borderRadius:20,padding:'4px 14px',cursor:'pointer',fontSize:'0.75rem',whiteSpace:'nowrap',fontWeight:G.hS>=1?'bold':'normal'}}>
                    {G.hS>=1&&G.hC
                      ? `${tx.hint}: ${VL(G.hC.v)}${SY(G.hC.s)} ${tx.sn[G.hC.s]}`
                      : tx.hint}
                  </button>
                  {G.hS>=1&&G.hintReason&&(
                    <div style={{background:'rgba(0,0,0,0.55)',border:'1px solid rgba(251,191,36,0.2)',borderRadius:10,padding:'6px 12px',maxWidth:280,fontSize:'0.72rem',color:'rgba(255,255,255,0.8)',lineHeight:1.45,textAlign:'center'}}>
                      {G.hintReason}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Feedback popup — 3 tier collapsible */}
        {mode==='play'&&(G.fb||G.ldFB)&&(
          <FeedbackBadge fb={G.fb} loading={G.ldFB} tx={tx}/>
        )}

        {/* Bid rating — only shows briefly after trump pick, then dismissed */}
        {(mode==='trump')&&G.bRat&&(
          <div style={{position:'absolute',bottom:6,left:8,right:8}}>
            <div style={{background:`${G.bRat.c}18`,border:`2px solid ${G.bRat.c}`,borderRadius:10,padding:'7px 10px',textAlign:'center'}}>
              <span style={{color:G.bRat.c,fontWeight:'bold',fontSize:'0.88rem'}}>{tx[G.bRat.k]}</span>
              {G.bRat.explanation&&<span style={{color:G.bRat.c,fontSize:'0.76rem',opacity:0.85}}> — {G.bRat.explanation}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Player area — always visible */}
      <div style={{background:'#18192a',padding:'6px 10px 10px',flexShrink:0}}>
        <div style={{textAlign:'center',fontSize:'0.68rem',marginBottom:4,height:16,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          {mode==='play'&&sel?<span style={{color:'#fbbf24'}}>{tx.tapAgain}</span>
            :mode==='play'&&myTurn?<span style={{opacity:0.4}}>{tx.yourTurn}</span>
            :mode==='play'?<span style={{opacity:0.2}}>···</span>
            :mode==='bid'?<span style={{color:'rgba(212,175,55,0.6)'}}>{tx.bidding}</span>
            :<span style={{color:'rgba(212,175,55,0.6)'}}>{tx.pickTrump}</span>}
          {mode==='bid'&&<button onClick={onRedeal} title="Request redeal" style={{background:'none',border:'none',cursor:'pointer',fontSize:'0.85rem',opacity:0.45,padding:'0 2px',lineHeight:1}}>♻</button>}
        </div>
        {G.redealMsg&&mode==='bid'&&(
          <div style={{background:G.redealMsg.ok?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${G.redealMsg.ok?'rgba(34,197,94,0.3)':'rgba(239,68,68,0.3)'}`,borderRadius:8,padding:'6px 10px',marginBottom:6,textAlign:'center',fontSize:'0.74rem',color:G.redealMsg.ok?'#86efac':'#fca5a5'}}>
            {G.redealMsg.text}
          </div>
        )}
        <FanHand hand={hand} legal={leg} sel={sel} onTap={mode==='play'?tap:null} active={myTurn}/>
        {isMyBidTurn&&(
          <div style={{marginTop:8}}>
            <div style={{display:'flex',gap:6,justifyContent:'center',flexWrap:'wrap',marginBottom:7}}>
              {[7,8,9,10,11,12,13].filter(n=>n>=minBid).map(n=>{
                const r=bidRating(n);
                const isSel=bidSel===n;
                return(
                  <button key={n} onClick={()=>setBidSel(isSel?null:n)} style={{width:44,height:52,borderRadius:8,border:`2px solid ${isSel?(r?.c||'#d4af37'):'rgba(255,255,255,0.1)'}`,background:isSel?`${r?.c||'#d4af37'}18`:'rgba(255,255,255,0.04)',color:isSel?(r?.c||'#d4af37'):'rgba(255,255,255,0.45)',fontSize:'1rem',fontWeight:'bold',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1}}>
                    <span>{n}</span>
                    {isSel&&r&&<span style={{fontSize:'0.42rem',opacity:0.8}}>{r.label}</span>}
                  </button>
                );
              })}
            </div>
            {G.bidHint&&(
              <div style={{background:'rgba(212,175,55,0.08)',border:'1px solid rgba(212,175,55,0.3)',borderRadius:10,padding:'8px 12px',marginBottom:8}}>
                <div style={{color:'#d4af37',fontWeight:'bold',fontSize:'0.88rem',marginBottom:4,textAlign:'center'}}>
                  {G.bidHint.recommendation==='pass'
                    ?`👉 ${tx.pass}`
                    :`👉 ${tx.bid} ${G.bidHint.recommendation}${G.bidHint.suit?` — ${tx.sn[G.bidHint.suit]} trump`:''}`}
                  {G.bidHint.recommendation!=='pass'&&(
                    <span style={{fontSize:'0.7rem',opacity:0.6,marginLeft:6}}>
                      · {G.bidHint.recommendation-1>=minBid?`${G.bidHint.recommendation-1}=Conservative`:''}
                      {G.bidHint.recommendation+1<=13?` · ${G.bidHint.recommendation+1}=Aggressive`:''}
                    </span>
                  )}
                </div>
                {G.bidHint.reason&&<div style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.65)',lineHeight:1.4,textAlign:'center'}}>{G.bidHint.reason}</div>}
              </div>
            )}
            <div style={{display:'flex',gap:8}}>
              {!forceMin&&<button onClick={()=>{setBidSel(null);plyrBid('pass');}} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid rgba(255,255,255,0.07)',background:'rgba(0,0,0,0.1)',color:'rgba(255,255,255,0.3)',cursor:'pointer',fontSize:'0.88rem'}}>{tx.pass}</button>}
              <button onClick={bidHint} disabled={!!G.bidHint||G.bidHintLoading} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.05)',color:G.bidHint?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.6)',cursor:G.bidHint?'default':'pointer',fontSize:'0.85rem',fontWeight:'500'}}>
                {G.bidHintLoading?'···':tx.hint}
              </button>
              {bidSel&&<button onClick={()=>{const b=bidSel;setBidSel(null);plyrBid(b);}} style={{flex:2,padding:'10px',borderRadius:8,border:'none',background:selRating?.c||'#d4af37',color:'#0a0f1e',fontWeight:'bold',cursor:'pointer',fontSize:'0.92rem'}}>{tx.bid} {bidSel}</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScBox({v,dim}){
  return <div style={{display:'flex',alignItems:'center',justifyContent:'center',background:dim?'rgba(0,0,0,0.2)':'rgba(0,0,0,0.52)',borderRadius:5,fontSize:dim?'0.5rem':'0.68rem',fontWeight:'bold',color:dim?'rgba(255,255,255,0.2)':'white'}}>{v}</div>;
}

function PChip({name,active,small}){
  const sz=small?30:38;
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
      <div style={{width:sz,height:sz,borderRadius:'50%',background:active?'rgba(212,175,55,0.2)':'rgba(255,255,255,0.07)',border:`2px solid ${active?'#d4af37':'rgba(255,255,255,0.1)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:small?'0.62rem':'0.75rem',fontWeight:'bold',color:active?'#fbbf24':'rgba(255,255,255,0.55)'}}>
        {name.slice(0,2).toUpperCase()}
      </div>
      <div style={{fontSize:'0.55rem',color:active?'#fbbf24':'rgba(255,255,255,0.35)',whiteSpace:'nowrap'}}>{name}</div>
    </div>
  );
}

function MiniCards({n,horizontal}){
  const count=Math.min(n||0,7);if(!count)return null;
  return (
    <div style={{position:'relative',width:horizontal?count*5+12:14,height:horizontal?14:count*4+16}}>
      {Array(count).fill(0).map((_,i)=>(
        <div key={i} style={{position:'absolute',left:horizontal?i*5:0,top:horizontal?0:i*4,width:12,height:14,background:'linear-gradient(140deg,#1e4fc0,#2a6ddc)',borderRadius:2,border:'1px solid rgba(255,255,255,0.12)',boxShadow:'0 1px 2px rgba(0,0,0,0.3)'}}/>
      ))}
    </div>
  );
}

function BidTag({b,active,tx}){
  if(b===null&&!active)return null;
  const pending=b===null,isPass=b==='pass';
  return (
    <div style={{background:pending?'rgba(212,175,55,0.9)':isPass?'rgba(71,85,105,0.85)':'rgba(34,197,94,0.9)',borderRadius:12,padding:'3px 10px',fontSize:'0.85rem',fontWeight:'bold',color:'white',textAlign:'center',minWidth:30,boxShadow:'0 2px 6px rgba(0,0,0,0.3)',whiteSpace:'nowrap'}}>
      {pending?'⋯':isPass?tx.pass:b}
    </div>
  );
}

function FanHand({hand,legal,sel,onTap,active}){
  if(!hand.length)return null;
  const CW=72,CH=100;
  const vw=typeof window!=='undefined'?Math.min(window.innerWidth,480):390;
  const n=hand.length;
  // More overlap for smoother fan look
  const spc=n>1?Math.min(CW*0.52,(vw-24-CW)/(n-1)):0;
  const totalW=n>1?(n-1)*spc+CW:CW;
  return (
    <div style={{position:'relative',height:CH+16,width:totalW,margin:'0 auto',flexShrink:0}}>
      {hand.map((card,i)=>{
        const isLeg=!!legal?.find(c=>c.s===card.s&&c.v===card.v);
        const isSel=!!(sel&&sel.s===card.s&&sel.v===card.v);
        return (
          <div key={`${card.s}${card.v}`} style={{
            position:'absolute',left:i*spc,
            top:isSel?0:active&&isLeg?10:16,
            zIndex:isSel?200:i+1,
            transition:'top 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s'
          }}>
            <Crd card={card} w={CW} h={CH} lit={isSel} dim={active&&!isLeg} onClick={onTap?()=>onTap(card):null}/>
          </div>
        );
      })}
    </div>
  );
}

function Crd({card,small,w,h,lit,dim,onClick}){
  const rd=RED(card.s);
  const cw=w||(small?44:72),ch=h||(small?62:100);
  return (
    <div onClick={onClick} style={{width:cw,height:ch,borderRadius:8,background:'#fffdf7',border:`2px solid ${lit?'#fbbf24':'#dde1e7'}`,display:'flex',flexDirection:'column',justifyContent:'space-between',padding:small?'2px 3px':'4px 5px',boxShadow:lit?'0 0 18px rgba(251,191,36,0.75), 0 4px 12px rgba(0,0,0,0.3)':'0 3px 8px rgba(0,0,0,0.28)',opacity:dim?0.45:1,userSelect:'none',flexShrink:0,cursor:onClick?'pointer':'default',transition:'opacity 0.15s'}}>
      <div style={{fontSize:small?'0.58rem':'0.78rem',fontWeight:'bold',color:rd?'#dc2626':'#1e293b',lineHeight:1.1}}>{VL(card.v)}<br/>{SY(card.s)}</div>
      <div style={{textAlign:'center',fontSize:small?'0.9rem':'1.5rem',color:rd?'#dc2626':'#1e293b',lineHeight:1}}>{SY(card.s)}</div>
      <div style={{fontSize:small?'0.58rem':'0.78rem',fontWeight:'bold',color:rd?'#dc2626':'#1e293b',lineHeight:1.1,transform:'rotate(180deg)',alignSelf:'flex-end'}}>{VL(card.v)}<br/>{SY(card.s)}</div>
    </div>
  );
}

function FeedbackBadge({fb,loading,tx}){
  const[expanded,setExpanded]=useState(false);
  if(loading){
    return(
      <div style={{position:'absolute',bottom:6,left:8,right:8,zIndex:10}}>
        <div style={{background:'rgba(0,0,0,0.85)',borderRadius:24,padding:'6px 14px',textAlign:'center',border:'1px solid rgba(255,255,255,0.05)',display:'inline-flex',margin:'0 auto',left:'50%'}}>
          <span style={{fontSize:'0.75rem',opacity:0.4}}>···</span>
        </div>
      </div>
    );
  }
  if(!fb) return null;
  const tier=fb.tier||'green';
  const colors={green:'#22c55e',yellow:'#f59e0b',red:'#ef4444'};
  const icons={green:'✓',yellow:'~',red:'✗'};
  const col=colors[tier];
  const hasDetail=(tier==='yellow'||tier==='red')&&fb.explanation;
  return(
    <div style={{position:'absolute',bottom:6,left:'50%',transform:'translateX(-50%)',zIndex:10,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
      <button onClick={hasDetail?()=>setExpanded(e=>!e):undefined}
        style={{background:`rgba(0,0,0,0.88)`,border:`2px solid ${col}`,borderRadius:24,padding:'5px 18px',display:'flex',alignItems:'center',gap:8,cursor:hasDetail?'pointer':'default',minWidth:80,justifyContent:'center'}}>
        <span style={{color:col,fontWeight:'bold',fontSize:'1rem'}}>{icons[tier]}</span>
        <span style={{color:col,fontSize:'0.78rem',fontWeight:'bold'}}>
          {tier==='green'?tx.best:tier==='yellow'?'OK play':tx.tryThis+(fb.bestCard?` ${VL(fb.bestCard.v)}${SY(fb.bestCard.s)}`:'')}
        </span>
        {hasDetail&&<span style={{color:col,fontSize:'0.65rem',opacity:0.7}}>{expanded?'▲':'▼'}</span>}
      </button>
      {expanded&&hasDetail&&(
        <div style={{background:'rgba(0,0,0,0.92)',border:`1px solid ${col}40`,borderRadius:10,padding:'8px 12px',maxWidth:300,fontSize:'0.76rem',color:'rgba(255,255,255,0.85)',lineHeight:1.45,textAlign:'center'}}>
          {fb.explanation}
        </div>
      )}
    </div>
  );
}

function Setup({G,tx,up,start}){
  return (
    <div style={{minHeight:'100vh',background:'#18192a',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'white',fontFamily:'Georgia,serif',padding:24,gap:32}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'3.5rem',fontWeight:'bold',color:'#d4af37',letterSpacing:6}}>{tx.title}</div>
        <div style={{fontSize:'1rem',color:'rgba(212,175,55,0.45)',letterSpacing:3,marginTop:4,fontFamily:'system-ui'}}>{tx.sub}</div>
      </div>
      <div style={{width:'100%',maxWidth:310,fontFamily:'system-ui,sans-serif',display:'flex',flexDirection:'column',gap:20}}>
        <div>
          <div style={{fontSize:'0.7rem',textTransform:'uppercase',letterSpacing:2,opacity:0.38,marginBottom:8}}>{tx.target}</div>
          <div style={{display:'flex',gap:8}}>
            {[31,41,51].map(t=><button key={t} onClick={()=>up(g=>{g.target=t;})} style={{flex:1,padding:'14px',borderRadius:8,border:`2px solid ${G.target===t?'#d4af37':'#1e293b'}`,background:G.target===t?'rgba(212,175,55,0.1)':'transparent',color:G.target===t?'#d4af37':'#4b5563',fontSize:'1.1rem',fontWeight:'bold',cursor:'pointer'}}>{t}</button>)}
          </div>
        </div>
        <div>
          <div style={{fontSize:'0.7rem',textTransform:'uppercase',letterSpacing:2,opacity:0.38,marginBottom:8}}>{tx.lang}</div>
          <div style={{display:'flex',gap:8}}>
            {[['en','EN'],['ar','ع'],['mix','Mix']].map(([l,label])=><button key={l} onClick={()=>up(g=>{g.lang=l;})} style={{flex:1,padding:'14px',borderRadius:8,border:`2px solid ${G.lang===l?'#d4af37':'#1e293b'}`,background:G.lang===l?'rgba(212,175,55,0.1)':'transparent',color:G.lang===l?'#d4af37':'#4b5563',fontSize:'0.95rem',cursor:'pointer'}}>{label}</button>)}
          </div>
        </div>
        <button onClick={start} style={{padding:'16px',borderRadius:10,background:'#d4af37',border:'none',color:'#0a0f1e',fontSize:'1.1rem',fontWeight:'bold',cursor:'pointer'}}>{tx.start}</button>
      </div>
    </div>
  );
}

function RndEnd({G,tx,pn,next}){
  const r=G.rndEnd;if(!r)return null;
  // Show result from player's perspective (SN team = you & partner)
  const playerTeam='SN';
  const oppTeam='EW';
  const playerBidder=r.bt==='SN';
  const playerMade=playerBidder?r.made:!r.made; // did player's team succeed?
  // What happened: if bidding team is player team → show madeIt/wentSet. If opponent bid → show opponent went set / held them
  let resultText, resultColor;
  if(playerBidder){
    resultText=r.made?tx.madeIt:tx.wentSet;
    resultColor=r.made?'#22c55e':'#ef4444';
  } else {
    // Opponents bid — player's team defended
    resultText=r.made?`Opponents made their bid`:`Opponents went set ✓`;
    resultColor=r.made?'#ef4444':'#22c55e';
  }
  return (
    <div style={{minHeight:'100vh',background:'#18192a',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'white',fontFamily:'system-ui,sans-serif',gap:18,padding:24}}>
      <div style={{fontSize:'1.4rem',fontWeight:'bold',color:'#d4af37'}}>{tx.roundOver}</div>
      <div style={{background:'rgba(255,255,255,0.03)',borderRadius:16,padding:'18px 24px',width:'100%',maxWidth:300,textAlign:'center',border:'1px solid rgba(255,255,255,0.05)'}}>
        <div style={{fontSize:'1rem',color:resultColor,fontWeight:'bold',marginBottom:8}}>{resultText}</div>
        <div style={{fontSize:'0.72rem',opacity:0.35,marginBottom:16}}>{pn(G.rndBid?.pos)} bid {r.amt} · {r.bt==='SN'?`${pn('S')}&${pn('N')}`:`${pn('E')}&${pn('W')}`} won {r.tw[r.bt]}</div>
        <div style={{display:'flex',justifyContent:'space-around',gap:16}}>
          {[['SN',`${pn('S')} & ${pn('N')}`],['EW',`${pn('E')} & ${pn('W')}`]].map(([t,label])=>(
            <div key={t} style={{textAlign:'center',flex:1}}>
              <div style={{fontSize:'0.6rem',opacity:0.32,marginBottom:3}}>{label}</div>
              <div style={{fontSize:'2.5rem',fontWeight:'bold'}}>{G.scores[t]}</div>
              <div style={{fontSize:'0.55rem',opacity:0.18}}>/ {G.target}</div>
            </div>
          ))}
        </div>
      </div>
      <button onClick={next} style={{padding:'13px 36px',borderRadius:10,background:'#d4af37',border:'none',color:'#0a0f1e',fontSize:'1rem',fontWeight:'bold',cursor:'pointer'}}>{tx.nextRound}</button>
    </div>
  );
}

function GameOver({G,tx,restart}){
  const ge=G.gameEnd;if(!ge)return null;
  const isWin=ge.wt==='SN';
  const gc={A:'#22c55e',B:'#84cc16',C:'#f59e0b',D:'#f97316',F:'#ef4444'}[ge.grade]||'#94a3b8';
  const gm=tx.gradeMsg[ge.grade]||'';
  const Bar=({label,val,col})=>(
    <div style={{marginBottom:12}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:'0.75rem'}}>
        <span style={{opacity:0.55}}>{label}</span>
        <span style={{fontWeight:'bold',color:col}}>{val}%</span>
      </div>
      <div style={{height:7,background:'rgba(255,255,255,0.07)',borderRadius:4,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${val}%`,background:col,borderRadius:4,transition:'width 0.8s ease'}}/>
      </div>
    </div>
  );
  return (
    <div style={{minHeight:'100vh',background:'#18192a',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'white',fontFamily:'system-ui,sans-serif',gap:20,padding:24}}>
      <div style={{fontSize:'1.8rem',fontWeight:'bold',color:'#d4af37'}}>{tx.gameOver}</div>
      <div style={{fontSize:'1.1rem',color:isWin?'#22c55e':'#ef4444',fontWeight:'bold'}}>{isWin?tx.youWin:tx.theyWin}</div>
      <div style={{display:'flex',gap:24,justifyContent:'center'}}>
        {[['SN','You & Partner'],['EW','Opponents']].map(([t,label])=>(
          <div key={t} style={{textAlign:'center'}}>
            <div style={{fontSize:'0.62rem',opacity:0.28,marginBottom:3}}>{label}</div>
            <div style={{fontSize:'2.8rem',fontWeight:'bold',color:ge.wt===t?'#d4af37':'#475569'}}>{ge.scores[t]}</div>
          </div>
        ))}
      </div>
      <div style={{background:'rgba(255,255,255,0.03)',borderRadius:16,padding:'20px',width:'100%',maxWidth:300,border:'1px solid rgba(255,255,255,0.05)'}}>
        <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:18}}>
          <div style={{fontSize:'5.5rem',fontWeight:'bold',color:gc,lineHeight:1}}>{ge.grade}</div>
          <div>
            <div style={{fontSize:'0.68rem',opacity:0.35,marginBottom:3}}>{tx.grade}</div>
            <div style={{fontSize:'0.9rem',color:gc,fontWeight:'bold'}}>{gm}</div>
            <div style={{fontSize:'0.6rem',opacity:0.2,marginTop:5}}>{ge.movesTotal} moves · {ge.bidsTotal} bids</div>
          </div>
        </div>
        <Bar label={tx.moveAcc} val={ge.moveScore} col='#3b82f6'/>
        <Bar label={tx.bidAcc} val={ge.bidScore} col='#8b5cf6'/>
      </div>
      <button onClick={restart} style={{padding:'13px 36px',borderRadius:10,background:'#d4af37',border:'none',color:'#0a0f1e',fontSize:'1rem',fontWeight:'bold',cursor:'pointer'}}>{tx.playAgain}</button>
    </div>
  );
}
