// Gedeelde logica VIP-gok (browser + node-test). Database-pad: vipgok1711
(function (root) {
  var P = "vipgok1711";
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
  // resultaat: {status:"ok"|"already"|"phone"|"closed", vote}
  function vote(db, uid, name, phoneRaw, color, ts) {
    var p = normPhone(phoneRaw), n = String(name || "").trim().replace(/\s+/g, " ");
    if (n.length < 2 || n.length > 80) return Promise.reject(new Error("naam"));
    if (!p) return Promise.reject(new Error("gsm"));
    if (color !== "blauw" && color !== "rood") return Promise.reject(new Error("kleur"));
    var mine = db.ref(P + "/votes/" + uid);
    return mine.once("value").then(function (s) {
      if (s.exists()) return { status: "already", vote: s.val() };
      return db.ref(P + "/config/open").once("value").then(function (o) {
        if (o.val() === false) return { status: "closed" };
        var u = {}; u["votes/" + uid] = { n: n, p: p, c: color, t: ts }; u["phones/" + p] = uid;
        return db.ref(P).update(u).then(function () { return { status: "ok", vote: { n: n, p: p, c: color } }; },
          function (e) {
            // geweigerd: nummer al gebruikt, of intussen gesloten
            return db.ref(P + "/config/open").once("value").then(function (o2) {
              if (o2.val() === false) return { status: "closed" };
              return mine.once("value").then(function (s2) { return s2.exists() ? { status: "already", vote: s2.val() } : { status: "phone" }; });
            });
          });
      });
    });
  }
  var api = { P: P, normPhone: normPhone, fmtPhone: fmtPhone, vote: vote };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.VipGok = api;
})(this);
