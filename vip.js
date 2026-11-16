// Gedeelde logica VIP-gok 17/11 (browser + node-test). Database-pad: vipgok1711
// Spel: (1) wie scoort de eerste driepunter, (2) punten Giants na het eerste kwart.
// De bestaande databaseregels (votes/<uid> met n,p,c,t + phones/<gsm>) blijven gelden:
// de twee antwoorden zitten in het veld n als "Naam #<rugnummer>#<punten>", c is altijd "rood".
(function (root) {
  var P = "vipgok1711";
  var PLAYERS = [
    { nr: "0",  name: "Jehloni James",    img: "0-james" },
    { nr: "5",  name: "Enoch Cheeks",     img: "5-cheeks" },
    { nr: "6",  name: "Noël Coleman",     img: "6-coleman" },
    { nr: "7",  name: "Cesare Edwards",   img: "7-edwards" },
    { nr: "8",  name: "Letto Van Drom",   img: "8-vandrom" },
    { nr: "9",  name: "Nijel Pack",       img: "9-pack" },
    { nr: "11", name: "Jacari White",     img: "11-white" },
    { nr: "13", name: "Joel Murray",      img: "13-murray" },
    { nr: "24", name: "Kevin Tumba",      img: "24-tumba" },
    { nr: "26", name: "Niels De Ridder",  img: "26-deridder" },
    { nr: "32", name: "Vincent Kesteloot",img: "32-kesteloot" }
  ];
  function player(nr) { for (var i = 0; i < PLAYERS.length; i++) if (PLAYERS[i].nr === String(nr)) return PLAYERS[i]; return null; }
  function normPhone(s) {
    var d = String(s || "").replace(/[^0-9+]/g, "");
    if (d.indexOf("+") === 0) d = d.slice(1); else if (d.indexOf("00") === 0) d = d.slice(2);
    else if (d.indexOf("0") === 0 && (d.length === 10 || d.length === 9)) d = "32" + d.slice(1); // Belgisch nummer
    d = d.replace(/\+/g, "");
    return /^[0-9]{9,15}$/.test(d) ? d : null;
  }
  function fmtPhone(p) {
    if (/^32\d{9}$/.test(p)) return "0" + p.slice(2, 5) + " " + p.slice(5, 7) + " " + p.slice(7, 9) + " " + p.slice(9);
    if (/^32\d{8}$/.test(p)) return "0" + p.slice(2);
    return "+" + p;
  }
  function cleanName(s) { return String(s || "").replace(/#/g, "").trim().replace(/\s+/g, " "); }
  function validScore(x) { var s = String(x).trim(); if (!/^\d{1,2}$/.test(s)) return null; var v = +s; return v <= 70 ? v : null; }
  function encode(name, nr, score) { return cleanName(name) + " #" + nr + "#" + score; }
  // n -> {name, nr, score}  (null als het geen geldige gok van dit spel is, bv. oude tent-gok)
  function decode(n) {
    var m = /^(.*) #(\d{1,2})#(\d{1,2})$/.exec(String(n || ""));
    if (!m || !player(m[2])) return null;
    return { name: m[1], nr: m[2], score: +m[3] };
  }
  // resultaat: {status:"ok"|"already"|"phone"|"closed", vote:{name,nr,score}}
  function vote(db, uid, name, phoneRaw, nr, scoreRaw, ts) {
    var p = normPhone(phoneRaw), n = cleanName(name), sc = validScore(scoreRaw);
    if (n.length < 2 || n.length > 60) return Promise.reject(new Error("naam"));
    if (!p) return Promise.reject(new Error("gsm"));
    if (!player(nr)) return Promise.reject(new Error("speler"));
    if (sc === null) return Promise.reject(new Error("punten"));
    var mine = db.ref(P + "/votes/" + uid);
    function back(s) { return { status: "already", vote: decode(s.val().n) || { name: s.val().n } }; }
    return mine.once("value").then(function (s) {
      if (s.exists()) return back(s);
      return db.ref(P + "/config/open").once("value").then(function (o) {
        if (o.val() === false) return { status: "closed" };
        var u = {}; u["votes/" + uid] = { n: encode(n, nr, sc), p: p, c: "rood", t: ts }; u["phones/" + p] = uid;
        return db.ref(P).update(u).then(function () { return { status: "ok", vote: { name: n, nr: String(nr), score: sc } }; },
          function () {
            return db.ref(P + "/config/open").once("value").then(function (o2) {
              if (o2.val() === false) return { status: "closed" };
              return mine.once("value").then(function (s2) { return s2.exists() ? back(s2) : { status: "phone" }; });
            });
          });
      });
    });
  }
  // winnaars: q1 = iedereen met juiste speler; q2 = kleinste afstand tot echte score
  function winners(list, scorer, q1) {
    var r = { q1: [], q2: [], diff: null };
    if (scorer != null && scorer !== "") r.q1 = list.filter(function (v) { return v.nr === String(scorer); });
    if (q1 != null && q1 !== "") {
      var best = Infinity; list.forEach(function (v) { best = Math.min(best, Math.abs(v.score - q1)); });
      if (best < Infinity) { r.diff = best; r.q2 = list.filter(function (v) { return Math.abs(v.score - q1) === best; }); }
    }
    return r;
  }
  var api = { P: P, PLAYERS: PLAYERS, player: player, normPhone: normPhone, fmtPhone: fmtPhone, encode: encode, decode: decode, validScore: validScore, vote: vote, winners: winners };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.VipGok = api;
})(this);
