(function () {
    // EnhancedDecor: wear any avatar decoration, profile effect, nameplate, profile frame, badge or banner. Only you
    // see it. Vendetta-format plugin (Endcord Mobile, Revenge, Kettu, Bunny). The loader runs `return <this file>`, so
    // the file must start with "(" (a comment line first would return undefined). Hermes treats const/let as var and
    // lacks async/classes, so this stays ES6 with var and promises.
    "use strict";
    var metro = vendetta.metro;
    var common = metro.common;
    var React = common.React;
    var RN = common.ReactNative;
    var h = React.createElement;
    var after = vendetta.patcher.after;
    var storage = vendetta.plugin.storage;
    var log = vendetta.logger || console;
    var G = typeof globalThis !== "undefined" ? globalThis : global;

    var NAME = "EnhancedDecor";
    var CDN = "https://cdn.discordapp.com/";
    // Weekly dump of Discord's whole shop (litruv/discord-collectibles). The live shop is merged on top.
    var CATALOG = "https://github.com/litruv/discord-collectibles/releases/download/latest/";
    // Index = Discord's collectible item type: 0 decoration, 1 profile effect, 2 nameplate, 3 profile frame
    var TYPES = [
        { label: "Decor", file: "avatardecorations.json", cols: 4, aspect: 1 },
        { label: "Effects", file: "profileeffects.json", cols: 3, aspect: 880 / 450 },
        { label: "Nameplates", file: "nameplate.json", cols: 1, aspect: 3 / 16 },
        { label: "Frames", cols: 3, aspect: 1 }
    ];
    // Discord's own badge ids and icons, so Discord draws them like real ones
    var BADGES = [
        ["staff", "Discord Staff", "5e74e9b61934fc1f67c65515d1f7e60d"],
        ["partner", "Partnered Server Owner", "3f9748e53446a137a052f3454e2de41e"],
        ["certified_moderator", "Moderator Programs Alumni", "fee1624003e2fee35cb398e125dc479b"],
        ["hypesquad", "HypeSquad Events", "bf01d1073931f921909045f3a39fd264"],
        ["hypesquad_house_1", "HypeSquad Bravery", "8a88d63823d8a71cd5e390baa45efa02"],
        ["hypesquad_house_2", "HypeSquad Brilliance", "011940fd013da3f7fb926e4a1cd2e618"],
        ["hypesquad_house_3", "HypeSquad Balance", "3aa41de486fa12454c3761e8e223442e"],
        ["bug_hunter_level_1", "Discord Bug Hunter", "2717692c7dca7289b35297368a940dd0"],
        ["bug_hunter_level_2", "Discord Bug Hunter (Gold)", "848f79194d4be5ff5f81505cbd0ce1e6"],
        ["active_developer", "Active Developer", "6bdc42827a38498929a4920da12695d9"],
        ["verified_developer", "Early Verified Bot Developer", "6df5892e0f35b051f8b61eace34f4967"],
        ["early_supporter", "Early Supporter", "7060786766c9c840eb3019e725d2b358"],
        ["premium", "Nitro", "2ba85e8026a8614b640c2837bcdfe21b"],
        ["premium_tenure_1_month_v2", "Nitro Bronze", "4f33c4a9c64ce221936bd256c356f91f"],
        ["premium_tenure_3_month_v2", "Nitro Silver", "4514fab914bdbfb4ad2fa23df76121a6"],
        ["premium_tenure_6_month_v2", "Nitro Gold", "2895086c18d5531d499862e41d1155a6"],
        ["premium_tenure_12_month_v2", "Nitro Platinum", "0334688279c8359120922938dcb1d6f8"],
        ["premium_tenure_24_month_v2", "Nitro Diamond", "0d61871f72bb9a33a7ae568c1fb4f20a"],
        ["premium_tenure_36_month_v2", "Nitro Emerald", "11e2d339068b55d3a506cff34d3780f3"],
        ["premium_tenure_60_month_v2", "Nitro Ruby", "cd5e2cfd9d7f27a8cdcd3e8a8d5dc9f4"],
        ["premium_tenure_72_month_v2", "Nitro Opal", "5b154df19c53dce2af92c9b61e6be5e2"],
        ["guild_booster_lvl1", "Server Booster (1 month)", "51040c70d4f20a921ad6674ff86fc95c"],
        ["guild_booster_lvl2", "Server Booster (2 months)", "0e4080d1d333bc7ad29ef6528b6f2fb7"],
        ["guild_booster_lvl3", "Server Booster (3 months)", "72bed924410c304dbe3d00a6e593ff59"],
        ["guild_booster_lvl4", "Server Booster (6 months)", "df199d2050d3ed4ebf84d64ae83989f8"],
        ["guild_booster_lvl5", "Server Booster (9 months)", "996b3e870e8a22ce519b3a50e6bdd52f"],
        ["guild_booster_lvl6", "Server Booster (12 months)", "991c9f39ee33d7537d9f408c3e53141e"],
        ["guild_booster_lvl7", "Server Booster (15 months)", "cb3ae83c15e970e8f3d410bc62cb8b99"],
        ["guild_booster_lvl8", "Server Booster (18 months)", "7142225d31238f6387d9f09efaa02759"],
        ["guild_booster_lvl9", "Server Booster (24 months)", "ec92202290b48d0879b7413d2dde3bab"],
        ["legacy_username", "Originally known as", "6de6d34650760ba5551a79732e98ed60"],
        ["quest_completed", "Completed a Quest", "7d9ae358c8c5e118768335dbe68b4fb8"],
        ["orb_profile_badge", "Orbs Apprentice", "83d8a1eb09a8d64e59233eec5d4d5c2d"]
    ];
    // Tiered badges (icons in assets/content). Discord doesn't know these ids, so they're drawn from their link.
    // ponytail: tier n of Account Age labelled as n years; Discord only says "levels up as your account gets older"
    var TIERED = [
        ["account_age", "Account Age", "Seed 8da9339b9d405f0194947e607c839b1bd43436211e5bf07fe7f4ce005578e9e4 Sprout f12847ebadd9022c3d67e5b31b5f3608e1ff48a222528fb6059e0fd310fc71b7 Sapling dccc28b53d39406e65e76541d6b940b23a9d31ef418100d77d6eb30c4adb9098 Bud 7c0a10981060861722c0216fd6c01a9fd8b10accbd3d6a04dcde275896e82e8b Blossom 52c374af536a4621a65503b4350f7459e3d00f3ed4e3b941c3902c0d9af45f4a Redwood 8041acaf604df1ace1ad2a12fd020513e50dfdd09899dc2e455e622d41c91000 Sequoia 7c5a1b1ce27181145c7e37bf6ad323353c14e8db201cfa3cb336292ad9a5d03d Bristlecone 53b3a2b4307df9dfc05a4c9da977baa4a6fd822f5a3d24843f949d1c93398322 Stromatolite d30993594816cc6035041941291dc7a5862e55676ce85eef91f89fd0c59f2931 Primordial 1930d04a8a1d0aba6f97b19b7e7b87158ab154ebffd5468d6ada66671285968b"],
        ["gifting", "Gifting", "Patron 5a2c578f82445956549c6454a2d65f8ba35b53f59120a4aa55855098ce5a653d Champion ac865fd339fbaa75d77278cd695936f168cd9b88dbbd72fdaeb76174bc0039d3 Luminary 35885be90179a2b4cc4e29aaf1285fe561c837f037aa805df40e921fd8db4867 Icon 70b46c1ea400bc57e2d5ac937c70b7ef25599feb1c62d7817c257f19051f1460 Hero 779d517e251fd2f6c4d64b4bf5839ea20cc5e061a2f971c7811ab2486ccf4553 Legendary eb5ce89c01c7884a614b5be0ebadb0d86215b61b55c04a01d27cffb131b4a070"],
        ["streaming", "Streaming", "Newcomer 571a6f607289dfc034d5735ea020bb53f29e9d53dcc54ee852f9f070538ff73a Fledgling 3e1ec0a72ca812e53ecd53d55c18c2d9765cc89eee08b1e74f7e0bdbfe2e96a2 Breakout 443707ffced738635bb0ee5c054544c67ec9dfab63b03e661bc1295d5399cac7 Standout 522de4edcb75e0544633b9ccb55c58d672c4a2fa70a81231bd42bb56cd6555bd Trendsetter 9482ad3a1104986a4cce2979291c733eca0707f6218ddfb6ff36e32e3fd709e9 Headliner 2cf2a4ab39800a963efdb900b823dc8ccb23464434f3e11d329851ae566cac22 Star 20e0b4ff7fc63681efe95082a69f9bfe7259f1485fa6fa6cebaf709336f42b90 Sensation 7ceb7fc55dba1fd4c4c5a9acd8345e3b74bca789bf8503445f3bf89109ae47a4 Visionary 5fbabf24366e08c5f7a56219d7d39f29c41034b5bd091573600f07a904af0035 Phenomenon dd20ac476f0bb7ea9a553abc699c0d6b9854a3f802187e3bf9bf2e45c37a766a"],
        ["game_time", "Game Time", "Casual c2844b37da74241525c1001c2ae5dd2719beb0095af8f88dcb35a37ceb0e1892 Recreational 157b789531c602542070e680c410d74275e796b6c45cd717292f6d2a59593972 Dedicated d6ab0696aae97fca8e6b2b88d4117f09f9ea895d4f0cebee770564369ff06873 Committed cc1edd8d955872cd9fbd9bafec80c973287817560d0895587686e3e1671a698e Serious 4039caeef586467d50939f3154f87828645d6f1bd699b8f0c1da686b02cefe68 Devoted 3d39b6cef7f00fe9e2d51f229034650b900481823af05d09e6537e912de30301 Seasoned 46512ce94203c84d7919904acfbd07fc5a8316010a610b8fd6a1cc937e5ac75e Ironclad 9bff716e6bae2ef42dc959bac05a0dfc480bf89484c111ed7fb4aa0332cb22d8 Unshakeable 1f51d59934543176d8b585c4e5a62d77ca3677c6e26ae4da74b1b639f9091b5e Eternal 8a62ba720addf7584d3e7f82170104e6a2b35aea4aba5ffc7260cfd706f40c37"],
        ["game_variety", "Game Variety", "Sampler cbd75cae9bca1c49b35eb0d9c189af4c8604b4f69a1de17ae550db9f03cbd371 Dabbler c9fe2cefaf224c0fb73a5fe11476987930809fa307069deb8bbb2f0b99bac545 Enthusiast e016406cec55df228f6e4e7ee9ec5ac10cf0ccd5037c5926da5c26c44e32d374 Ranger 7265bc6f9ff0a47962dafe01b6f9c8f75927392aaf48d48c3619d123d2b584f5 Explorer ffd4938d41c57d27fec0f253a54756c40add56f761c5b1471b531d838e8669db Adventurer dcfdce8dfc254b6e8fa9cfba5dcd918f027e27554c3aa2403fe01eb319cf2194 Voyager 183d6521c3696b0b42f73dd9c319307490982a5dffdc34a923b760d82b20916a Maverick 84d4695cdcbb350ad5385c06e87caf06835872135625a8bff6bac300af858412 Polymath 1d8d9e3254727d1a1c01b194f2d01ade4525dc8b85c39b877af09768eaf031be Universalist 4731855cd51c1d45fd14dc088b80815ea0562a353b48db369092019fbcb44ec7"]
    ];
    TIERED.forEach(function (g) {
        var parts = g[2].split(" ");
        for (var i = 0; i < parts.length; i += 2) {
            var n = i / 2 + 1;
            var label = g[1] + ": " + parts[i] + (g[0] === "account_age" ? " (" + n + (n === 1 ? " year)" : " years)") : "");
            BADGES.push(["ed_" + g[0] + "_" + n, label, CDN + "assets/content/" + parts[i + 1] + ".png"]);
        }
    });
    BADGES.push(["ed_meadow", "Last Meadow Online", CDN + "badge-icons/ca105ad9cfc8580c765101d17bbb2323.png"]);
    var BADGE_BY_ID = {};
    var BADGE_SRC = {}; // our ids -> image link, for Discord's badge component
    BADGES.forEach(function (b) {
        BADGE_BY_ID[b[0]] = b;
        if (b[0].indexOf("ed_") === 0) BADGE_SRC[b[0]] = b[2];
    });

    function parse(key, fallback) {
        try {
            var v = JSON.parse(storage[key] || "null");
            return v == null ? fallback : v;
        } catch (e) {
            return fallback;
        }
    }

    // Everything ever seen stays, so items Discord pulls from the shop keep working
    var cat = parse("catalog", null);
    if (!Array.isArray(cat) || cat.length !== 4) cat = [{}, {}, {}, {}];

    // Each account wears its own look: "look_<user id>" holds it, "lookimg_<user id>_<avatar|banner>" its picked photos
    // (kept apart so saving stays small and fast). Switching accounts loads that account's look, so nothing carries
    // over. Saved looks (presets) and the chat-button switch are shared ("shared"): wearing a saved look is a choice.
    function normalize(s) {
        s = s && typeof s === "object" ? s : {};
        if (!Array.isArray(s.sel) || s.sel.length !== 4) s.sel = [null, null, null, null];
        if (!Array.isArray(s.badges)) s.badges = [];
        s.hideBadges = !!s.hideBadges;
        if (typeof s.banner !== "string") s.banner = "";
        if (typeof s.avatar !== "string") s.avatar = "";
        // Profile text: name, username, pronouns, bio, color1, color2, created (YYYY-MM-DD), oldName, email, phone
        if (!s.p || typeof s.p !== "object") s.p = {};
        return s;
    }

    // Before per-account looks there was one look for everyone in "state" (v1: only "selected") and "img_<k>". It goes
    // to the first account this version sees, and the old keys go away so no other account picks it up.
    var legacy = parse("state", null);
    if (legacy || storage.selected) {
        legacy = legacy || {};
        if (!Array.isArray(legacy.sel)) legacy.sel = parse("selected", null);
    }
    var shared = parse("shared", null) || {
        presets: legacy && Array.isArray(legacy.presets) ? legacy.presets : [],
        chatButton: legacy && legacy.chatButton !== undefined ? !!legacy.chatButton : true
    };

    var owner = null; // the account whose look `st` is
    var st, sel, imgCache;
    function wear(s) {
        st = normalize(s);
        st.presets = shared.presets;
        st.chatButton = shared.chatButton;
        sel = st.sel;
        imgCache = {};
    }
    wear(null); // nobody's look until Discord says who's signed in

    function useAccount(id) {
        if (!id || id === owner) return;
        owner = id;
        var s = parse("look_" + id, null);
        if (!s && legacy) {
            s = legacy;
            ["avatar", "banner"].forEach(function (k) {
                if (/^data:/.test(s[k] || "")) {
                    storage["lookimg_" + id + "_" + k] = s[k];
                    s[k] = "local";
                } else if (s[k] === "local") {
                    storage["lookimg_" + id + "_" + k] = storage["img_" + k] || "";
                }
                delete storage["img_" + k];
            });
            delete storage.state;
            delete storage.selected;
            legacy = null;
            wear(s);
            persist();
        } else {
            wear(s);
        }
        version++;
        profileVersion++;
    }

    function persist() {
        shared.presets = st.presets;
        shared.chatButton = st.chatButton;
        storage.shared = JSON.stringify(shared);
        if (owner) storage["look_" + owner] = JSON.stringify(st, function (k, v) { return k === "presets" || k === "chatButton" ? undefined : v; });
    }

    function imgOf(k) {
        if (st[k] !== "local") return st[k];
        if (imgCache[k] === undefined) imgCache[k] = storage["lookimg_" + owner + "_" + k] || "";
        return imgCache[k];
    }

    var version = 0;
    var loading = false;
    var listeners = [];
    var unpatches = [];
    var cache = new WeakMap();

    function changed() {
        listeners.slice().forEach(function (fn) { fn(); });
    }

    function toast(msg) {
        try {
            vendetta.ui.toasts.showToast(msg);
        } catch (e) { }
    }

    // ---- catalog ----

    function add(type, item) {
        if (!item.s || !cat[type]) return;
        if ((type === 0 || type === 2) && !item.a) return; // nothing to draw without an asset
        cat[type][item.s] = Object.assign(cat[type][item.s] || {}, item);
    }

    function fromDump(type, it) {
        var urls = (it.assets || []).map(function (x) { return x.url || ""; }).join(" ");
        var item = { s: it.skuId, n: it.name };
        var m;
        if (it.category) item.c = it.category;
        if (type === 0 && (m = /avatar-decoration-presets\/([^.?\s]+)/.exec(urls))) item.a = m[1];
        if (type === 2) {
            if ((m = /assets\/collectibles\/(\S+\/)static\.png/.exec(urls))) item.a = m[1];
            item.p = it.palette;
        }
        if (type === 1 && it.thumbnailUrl) item.t = it.thumbnailUrl;
        add(type, item);
    }

    // The live shop's raw JSON: items sit in products, bundles and variant groups, so walk all of it
    function walk(node, name, depth) {
        if (!node || typeof node !== "object" || depth > 12) return;
        if (Array.isArray(node)) {
            node.forEach(function (n) { walk(n, name, depth + 1); });
            return;
        }
        if (Array.isArray(node.items) && node.name) name = node.name;
        var t = node.type;
        if (typeof t === "number" && t >= 0 && t <= 3 && node.sku_id && !node.items) {
            var item = { s: String(node.sku_id), n: name || node.label || String(node.sku_id) };
            if (node.asset) item.a = node.asset;
            if (node.palette) item.p = node.palette;
            add(t, item);
        }
        Object.keys(node).forEach(function (k) {
            if (node[k] && typeof node[k] === "object") walk(node[k], name, depth + 1);
        });
    }

    function refresh() {
        if (loading) return Promise.resolve();
        loading = true;
        changed();
        var jobs = [0, 1, 2].map(function (type) {
            return fetch(CATALOG + TYPES[type].file)
                .then(function (r) {
                    if (!r.ok) throw new Error("HTTP " + r.status);
                    return r.json();
                })
                .then(function (j) { (j.items || []).forEach(function (it) { fromDump(type, it); }); });
        });
        var http = metro.findByProps("getAPIBaseURL", "get");
        if (http) {
            jobs.push(http.get({ url: "/collectibles-categories/v2", query: { include_bundles: true } })
                .then(function (r) { walk(r && r.body, null, 0); }));
        }
        var settled = jobs.map(function (p) {
            return p.then(function () { return true; }, function (e) {
                log.warn(NAME + ": a catalog source failed", e);
                return false;
            });
        });
        return Promise.all(settled).then(function (ok) {
            loading = false;
            storage.catalog = JSON.stringify(cat);
            storage.fetchedAt = Date.now();
            if (ok.indexOf(true) === -1) toast(NAME + ": couldn't load the shop");
            changed();
        });
    }

    // ---- what Discord sees for your own account ----

    function decoration() {
        return sel[0] ? { asset: sel[0].a, skuId: sel[0].s, expiresAt: null } : null;
    }

    function ourBadges() {
        return st.badges.filter(function (id) { return BADGE_BY_ID[id]; }).map(function (id) {
            var b = BADGE_BY_ID[id];
            return BADGE_SRC[id] ? { id: id, description: b[1], icon: "dummy", iconSrc: BADGE_SRC[id] } : { id: b[0], description: b[1], icon: b[2] };
        });
    }

    var LEGACY_ICON = "6de6d34650760ba5551a79732e98ed60";

    function mergeBadges(real) {
        var ours = ourBadges();
        var old = st.p.oldName;
        if (old) {
            ours = ours.filter(function (b) { return b.id !== "legacy_username"; });
            ours.push({ id: "legacy_username", description: "Originally known as " + old, icon: LEGACY_ICON });
        }
        var ids = ours.map(function (b) { return b.id; });
        var kept = st.hideBadges || !Array.isArray(real) ? [] : real.filter(function (b) { return !b || ids.indexOf(b.id) === -1; });
        return kept.concat(ours);
    }

    function badgesChanged() {
        return st.badges.length > 0 || st.hideBadges || !!st.p.oldName;
    }

    function colorInt(hex) {
        return hex ? parseInt(hex.slice(1), 16) : null;
    }

    function createdDate() {
        return st.p.created ? new Date(st.p.created + "T12:00:00Z") : null;
    }

    function userProps(u) {
        var p = {};
        var d = decoration();
        if (d) {
            p.avatarDecoration = d;
            p.avatarDecorationData = d;
        }
        if (sel[2]) {
            p.collectibles = Object.assign({}, u.collectibles, {
                // ponytail: palette defaults to crimson when the shop gave none
                nameplate: { skuId: sel[2].s, asset: sel[2].a, label: sel[2].n, palette: sel[2].p || "crimson", expiresAt: null }
            });
        }
        var P = st.p;
        if (P.name) {
            p.globalName = P.name;
            p.displayName = P.name;
        }
        if (P.username) p.username = P.username;
        if (P.created) p.createdAt = createdDate();
        if (P.email) p.email = P.email;
        if (P.phone) p.phone = P.phone;
        return Object.keys(p).length ? p : null;
    }

    function profileProps(prof) {
        var p = {};
        var d = decoration();
        if (d) {
            p.avatarDecoration = d;
            p.avatarDecorationData = d;
        }
        if (sel[1]) {
            p.profileEffectId = sel[1].s;
            p.profileEffect = { skuId: sel[1].s, expiresAt: null, expireAt: null };
        }
        if (sel[3]) p.profileFrame = { skuId: sel[3].s, expiresAt: null };
        if (imgOf("banner")) p.banner = "enhanced_decor"; // any value: the link comes from getUserBannerURL
        if (badgesChanged()) p.badges = mergeBadges(prof.badges);
        var P = st.p;
        if (P.bio) p.bio = P.bio;
        if (P.pronouns) p.pronouns = P.pronouns;
        if (P.color1) {
            p.accentColor = colorInt(P.color1);
            p.themeColors = [colorInt(P.color1), colorInt(P.color2 || P.color1)];
        }
        if ((sel[1] || sel[3] || imgOf("banner") || P.color1) && !prof.premiumType) p.premiumType = 2;
        return Object.keys(p).length ? p : null;
    }

    // Discord's records are shared, so hand back a copy with our fields instead of changing them. Same source and
    // version give the same copy, so screens comparing what a store returns don't redraw for nothing.
    function patched(src, build) {
        if (!src || typeof src !== "object") return src;
        var hit = cache.get(src);
        if (hit && hit.v === version) return hit.c;
        var props = build(src);
        var c = src;
        if (props && Array.isArray(src)) c = props;
        else if (props) {
            c = Object.create(Object.getPrototypeOf(src));
            Reflect.ownKeys(src).forEach(function (k) {
                var d = Object.getOwnPropertyDescriptor(src, k);
                d.configurable = true;
                if ("value" in d) d.writable = true;
                else if (!d.set) d.set = function () { };
                Object.defineProperty(c, k, d);
            });
            Object.keys(props).forEach(function (k) {
                Object.defineProperty(c, k, { value: props[k], writable: true, configurable: true, enumerable: true });
            });
        }
        cache.set(src, { v: version, c: c });
        return c;
    }

    var UserStore, ProfileStore;

    // Whoever's signed in now; switching accounts swaps in that account's look
    function me() {
        var u = UserStore && UserStore.getCurrentUser();
        if (u && u.id !== owner) useAccount(u.id);
        return u;
    }

    function isMe(id) {
        var u = me();
        return !!u && !!id && u.id === id;
    }

    function redraw() {
        version++;
        [UserStore, ProfileStore].forEach(function (s) {
            try {
                if (s) s.emitChange();
            } catch (e) { }
        });
    }

    function save() {
        if (!owner) me();
        persist();
        redraw();
        changed();
    }

    function choose(type, item) {
        sel[type] = item ? { s: item.s, n: item.n, a: item.a, p: item.p, t: item.t } : null;
        save();
    }

    function toggleBadge(id) {
        var i = st.badges.indexOf(id);
        if (i === -1) st.badges.push(id);
        else st.badges.splice(i, 1);
        save();
    }

    // k: "avatar" or "banner". url: https link, data: link from Photos, or "" to remove
    function setImg(k, url) {
        url = String(url || "").trim();
        if (url && !/^(https:\/\/\S+|data:image\/[\w.+-]+;base64,\S+)$/i.test(url)) return toast("Needs an https:// image link");
        var local = /^data:/.test(url);
        if (!owner) me();
        storage["lookimg_" + owner + "_" + k] = local ? url : "";
        imgCache[k] = local ? url : "";
        st[k] = local ? "local" : url;
        save();
    }

    var FIELD_CHECK = {
        color1: [/^#[0-9a-f]{6}$/i, "Colors look like #5865f2"],
        color2: [/^#[0-9a-f]{6}$/i, "Colors look like #5865f2"],
        created: [/^(20[1-9]\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Dates look like 2016-05-21"]
    };

    // Returns false when the value was refused
    function setField(k, v) {
        v = String(v || "").trim();
        if (/^color/.test(k) && /^[0-9a-f]{6}$/i.test(v)) v = "#" + v;
        var check = FIELD_CHECK[k];
        if (v && check && !check[0].test(v)) {
            toast(check[1]);
            return false;
        }
        if ((st.p[k] || "") === v) return true;
        if (v) st.p[k] = v;
        else delete st.p[k];
        save();
        return true;
    }

    // Bumped when the profile text changes from outside its fields (reset, preset), so the fields show it
    var profileVersion = 0;

    function resetAll() {
        [0, 1, 2, 3].forEach(function (i) { sel[i] = null; });
        st.badges = [];
        st.hideBadges = false;
        st.p = {};
        profileVersion++;
        setImg("avatar", "");
        setImg("banner", "");
    }

    // ---- presets: a whole look, pictures included ----

    function savePreset(name) {
        name = String(name || "").trim().slice(0, 32) || "Look " + (st.presets.length + 1);
        var id = String(Date.now());
        ["avatar", "banner"].forEach(function (k) {
            if (st[k] === "local") storage["pimg_" + id + "_" + k] = imgOf(k);
        });
        st.presets.push({ id: id, name: name, data: JSON.parse(JSON.stringify({ sel: sel, badges: st.badges, hideBadges: st.hideBadges, p: st.p, avatar: st.avatar, banner: st.banner })) });
        save();
        toast("Saved " + name);
    }

    function loadPreset(pr) {
        var d = pr.data;
        [0, 1, 2, 3].forEach(function (i) { sel[i] = d.sel ? d.sel[i] : null; });
        st.badges = (d.badges || []).slice();
        st.hideBadges = !!d.hideBadges;
        st.p = Object.assign({}, d.p);
        profileVersion++;
        ["avatar", "banner"].forEach(function (k) {
            setImg(k, d[k] === "local" ? storage["pimg_" + pr.id + "_" + k] : d[k]);
        });
        toast("Wearing " + pr.name);
    }

    function deletePreset(pr) {
        st.presets = st.presets.filter(function (x) { return x !== pr; });
        ["avatar", "banner"].forEach(function (k) { delete storage["pimg_" + pr.id + "_" + k]; });
        save();
    }

    // ---- finding Discord's parts ----

    function findFile(path) {
        try {
            var b = G.bunny;
            return b && b.metro && typeof b.metro.findByFilePath === "function" ? b.metro.findByFilePath(path) : undefined;
        } catch (e) {
            return undefined;
        }
    }

    // A component's render, whatever form it's exported in: function, memo, forwardRef, memo of forwardRef (iOS)
    function afterRender(mod, key, cb) {
        var c = mod && mod[key];
        var wrap = function (a, res) { return cb(res); };
        if (typeof c === "function") return after(key, mod, wrap);
        if (c && typeof c.type === "function") return after("type", c, wrap);
        if (c && c.type && typeof c.type.render === "function") return after("render", c.type, wrap);
        if (c && typeof c.render === "function") return after("render", c, wrap);
        return null;
    }

    function icon(names) {
        for (var i = 0; i < names.length; i++) {
            var m = findFile("design/components/Icon/native/redesign/generated/" + names[i] + ".tsx");
            if (m && m[names[i]]) return m[names[i]];
            var p = metro.findByProps(names[i]);
            if (p && p[names[i]]) return p[names[i]];
        }
        return null;
    }

    function assetId(names) {
        for (var i = 0; i < names.length; i++) {
            try {
                var id = vendetta.ui.assets.getAssetIDByName(names[i]);
                if (id) return id;
            } catch (e) { }
        }
        return undefined;
    }

    function openPage(navigation) {
        var render = function () { return h(Page, null); };
        if (navigation && typeof navigation.push === "function") {
            try {
                navigation.push("BUNNY_CUSTOM_PAGE", { title: NAME, render: render });
                return;
            } catch (e) { }
        }
        var modals = metro.findByProps("pushLazy");
        var nav = metro.findByProps("Navigator", "getHeaderCloseButton");
        if (!modals || typeof modals.push !== "function" || !nav) return toast(NAME + ": couldn't open the page");
        var close = function () { modals.pop(); };
        modals.push(function () {
            return h(nav.Navigator, {
                initialRouteName: "ENHANCED_DECOR",
                screens: { ENHANCED_DECOR: { title: NAME, headerLeft: nav.getHeaderCloseButton(close), render: render } }
            });
        });
    }

    // ---- page ----

    var SC = vendetta.ui.semanticColors || {};
    function color() {
        for (var i = 0; i < arguments.length - 1; i++) if (SC[arguments[i]]) return SC[arguments[i]];
        return arguments[arguments.length - 1];
    }
    var BRAND = "#5865f2";
    var GAP = 8;
    var TEXT = color("TEXT_DEFAULT", "TEXT_NORMAL", "#dbdee1");
    var MUTED = color("TEXT_MUTED", "TEXT_SUBTLE", "#949ba4");
    var CARD = color("BACKGROUND_SECONDARY", "BACKGROUND_BASE_LOWER", "#2b2d31");
    var TILE = color("BACKGROUND_MOD_SUBTLE", "BACKGROUND_MOD_NORMAL", "BACKGROUND_SECONDARY_ALT", "#313338");
    var BORDER = color("BORDER_SUBTLE", "BACKGROUND_MOD_STRONG", "BACKGROUND_MODIFIER_ACCENT", "#4e5058");
    var styles = common.stylesheet.createThemedStyleSheet({
        page: { flex: 1, padding: 12, gap: 10 },
        text: { color: TEXT, fontSize: 14 },
        bold: { color: TEXT, fontSize: 16, fontWeight: "700" },
        label: { color: TEXT, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
        swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: BORDER },
        swatchOn: { borderColor: TEXT, borderWidth: 3 },
        muted: { color: MUTED, fontSize: 12 },
        card: { borderRadius: 16, overflow: "hidden", backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
        banner: { height: 92, backgroundColor: BRAND },
        avatarWrap: { position: "absolute", left: 14, top: 52, width: 76, height: 76, alignItems: "center", justifyContent: "center" },
        avatar: { width: 68, height: 68, borderRadius: 34, borderWidth: 4, borderColor: CARD },
        avatarDecor: { position: "absolute", width: 82, height: 82 },
        cardBody: { paddingTop: 8, paddingBottom: 12, paddingLeft: 102, paddingRight: 12, minHeight: 74, gap: 6 },
        plate: { height: 34, borderRadius: 8, overflow: "hidden", justifyContent: "center", paddingHorizontal: 10 },
        plateImg: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 },
        badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
        chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 12, paddingBottom: 12 },
        chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99, backgroundColor: TILE },
        reset: { position: "absolute", right: 10, top: 10, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 99, backgroundColor: "rgba(0,0,0,0.45)" },
        resetText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
        tabs: { gap: 6, paddingRight: 12 },
        pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5, borderColor: BORDER, backgroundColor: TILE },
        on: { borderColor: BRAND, backgroundColor: "rgba(88, 101, 242, 0.25)" },
        input: { color: TEXT, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: TILE, borderWidth: 1, borderColor: BORDER },
        tile: { borderRadius: 14, borderWidth: 1.5, overflow: "hidden", alignItems: "center", borderColor: BORDER, backgroundColor: TILE },
        check: { position: "absolute", right: 5, top: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" },
        checkText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
        name: { color: TEXT, fontSize: 11, fontWeight: "600", textAlign: "center", paddingHorizontal: 4, paddingTop: 4 },
        sub: { color: MUTED, fontSize: 10, textAlign: "center", paddingHorizontal: 4, paddingBottom: 5 },
        row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 12, borderRadius: 12, backgroundColor: TILE },
        buttons: { flexDirection: "row", flexWrap: "wrap", gap: 8 }
    });

    function thumb(type, i) {
        if (type === 0) return CDN + "avatar-decoration-presets/" + i.a + ".png?size=160&passthrough=true";
        if (type === 2) return CDN + "assets/collectibles/" + i.a + "static.png";
        return i.t || CDN + "media/v1/collectibles-shop/" + i.s + "/static";
    }

    function badgeIcon(icon) {
        return /^https:/.test(icon) ? icon : CDN + "badge-icons/" + icon + ".png";
    }

    function avatarOf(u) {
        try {
            var url = u.getAvatarURL(undefined, 128, true);
            if (typeof url === "string") return url;
        } catch (e) { }
        return CDN + "embed/avatars/0.png";
    }

    // Snowflakes: newest first
    function newestFirst(a, b) {
        return a.s.length !== b.s.length ? b.s.length - a.s.length : (a.s < b.s ? 1 : a.s > b.s ? -1 : 0);
    }

    function useTick() {
        var s = React.useState(0);
        React.useEffect(function () {
            var fn = function () { s[1](function (x) { return x + 1; }); };
            listeners.push(fn);
            return function () { listeners.splice(listeners.indexOf(fn), 1); };
        }, []);
        return s[0];
    }

    function Pill(p) {
        return h(RN.Pressable, { onPress: p.onPress, style: [styles.pill, p.on && styles.on] },
            h(RN.Text, { style: styles.text }, p.label));
    }

    function Preview() {
        var u = me();
        var P = st.p;
        var name = P.name || (u ? u.globalName || u.username : "You");
        var shown = mergeBadges(u ? realBadges(u.id) : []);
        var chips = [];
        if (sel[1]) chips.push("Effect: " + sel[1].n);
        if (sel[3]) chips.push("Frame: " + sel[3].n);
        if (P.created) chips.push("Member since " + P.created);
        var tint = P.color1 ? { backgroundColor: P.color1 } : null;
        return h(RN.View, { style: [styles.card, P.color1 && { borderColor: P.color2 || P.color1, borderWidth: 2 }] },
            imgOf("banner")
                ? h(RN.Image, { source: { uri: imgOf("banner") }, style: styles.banner, resizeMode: "cover" })
                : h(RN.View, { style: [styles.banner, tint] }),
            h(RN.Pressable, { style: styles.reset, onPress: resetAll }, h(RN.Text, { style: styles.resetText }, "Reset all")),
            h(RN.View, { style: styles.avatarWrap },
                h(RN.Image, { source: { uri: imgOf("avatar") || (u ? avatarOf(u) : CDN + "embed/avatars/0.png") }, style: styles.avatar }),
                sel[0] && h(RN.Image, { source: { uri: thumb(0, sel[0]) }, style: styles.avatarDecor })),
            h(RN.View, { style: styles.cardBody },
                h(RN.View, { style: styles.plate },
                    sel[2] && h(RN.Image, { source: { uri: thumb(2, sel[2]) }, style: styles.plateImg, resizeMode: "cover" }),
                    h(RN.Text, { numberOfLines: 1, style: styles.bold }, name)),
                (P.username || P.pronouns) ? h(RN.Text, { numberOfLines: 1, style: styles.muted }, [P.username, P.pronouns].filter(Boolean).join(" · ")) : null,
                P.bio ? h(RN.Text, { numberOfLines: 2, style: styles.text }, P.bio) : null,
                shown.length > 0 && h(RN.View, { style: styles.badgeRow }, shown.map(function (b) {
                    return b && b.icon ? h(RN.Image, { key: b.id, source: { uri: b.iconSrc || badgeIcon(b.icon) }, style: { width: 20, height: 20 } }) : null;
                }))),
            chips.length > 0 && h(RN.View, { style: styles.chips }, chips.map(function (c) {
                return h(RN.View, { key: c, style: styles.chip }, h(RN.Text, { style: styles.muted, numberOfLines: 1 }, c));
            })));
    }

    // Your real badges, from the profile Discord already has (before our changes)
    var rawProfile = null;
    function realBadges(id) {
        try {
            var p = rawProfile && rawProfile(id);
            return p && Array.isArray(p.badges) ? p.badges : [];
        } catch (e) {
            return [];
        }
    }

    var Tile = React.memo(function Tile(p) {
        var item = p.item;
        return h(RN.Pressable, { onPress: function () { p.onPick(item); }, style: [styles.tile, { width: p.width }, p.on && styles.on] },
            item.none
                ? h(RN.View, { style: { height: p.imgH, justifyContent: "center" } }, h(RN.Text, { style: [styles.muted, { fontSize: 26 }] }, "⊘"))
                : h(RN.Image, { source: { uri: p.uri }, style: { width: p.width, height: p.imgH }, resizeMode: p.cover ? "cover" : "contain" }),
            h(RN.Text, { numberOfLines: 1, style: styles.name }, item.n),
            item.c ? h(RN.Text, { numberOfLines: 1, style: styles.sub }, item.c) : h(RN.View, { style: { height: 5 } }),
            p.on && !item.none && h(RN.View, { style: styles.check }, h(RN.Text, { style: styles.checkText }, "✓")));
    });

    var NONE = { s: "", n: "None", none: true };

    function Grid(p) {
        var type = p.type;
        var tick = p.tick;
        var qs = React.useState("");
        var q = qs[0];
        var width = p.width;
        var t = TYPES[type];
        var list = React.useMemo(function () {
            var needle = q.trim().toLowerCase();
            var all = Object.keys(cat[type]).map(function (k) { return cat[type][k]; });
            if (needle) {
                all = all.filter(function (i) {
                    return (String(i.n) + " " + (i.c || "")).toLowerCase().indexOf(needle) !== -1;
                });
            }
            return [NONE].concat(all.sort(newestFirst));
        }, [type, q, tick]);
        var w = (width - GAP * (t.cols - 1)) / t.cols;
        var imgH = Math.round(w * t.aspect);
        var chosen = sel[type];
        var pick = React.useCallback(function (item) {
            var on = item.none ? !chosen : !!chosen && chosen.s === item.s;
            choose(type, item.none || on ? null : item);
        }, [type, chosen]);
        return h(RN.View, { style: { flex: 1, gap: 10 } },
            h(RN.TextInput, {
                value: q,
                onChangeText: qs[1],
                placeholder: "Search " + (list.length - 1) + " " + t.label.toLowerCase() + (loading ? " (loading…)" : ""),
                placeholderTextColor: "#949ba4",
                autoCorrect: false,
                style: styles.input
            }),
            h(RN.FlatList, {
                key: "t" + type,
                style: { flex: 1 },
                data: list,
                numColumns: t.cols,
                keyExtractor: function (i) { return i.s || "none"; },
                renderItem: function (info) {
                    var item = info.item;
                    var on = item.none ? !chosen : !!chosen && chosen.s === item.s;
                    return h(Tile, { item: item, on: on, width: w, imgH: imgH, uri: item.none ? null : thumb(type, item), cover: type === 2, onPick: pick });
                },
                extraData: chosen,
                nestedScrollEnabled: true,
                keyboardShouldPersistTaps: "handled",
                columnWrapperStyle: t.cols > 1 ? { gap: GAP } : undefined,
                contentContainerStyle: { gap: GAP, paddingBottom: 60 },
                initialNumToRender: 24,
                windowSize: 7,
                removeClippedSubviews: true
            }));
    }

    function Badges(p) {
        var cols = 4;
        var w = (p.width - GAP * (cols - 1)) / cols;
        return h(RN.View, { style: { flex: 1, gap: 10 } },
            h(RN.View, { style: styles.row },
                h(RN.View, { style: { flex: 1 } },
                    h(RN.Text, { style: styles.text }, "Hide my real badges"),
                    h(RN.Text, { style: styles.muted }, "Show only the ones you pick")),
                h(RN.Switch, { value: st.hideBadges, onValueChange: function (v) { st.hideBadges = v; save(); } })),
            h(RN.FlatList, {
                style: { flex: 1 },
                data: BADGES,
                numColumns: cols,
                keyExtractor: function (b) { return b[0]; },
                extraData: p.tick,
                columnWrapperStyle: { gap: GAP },
                contentContainerStyle: { gap: GAP, paddingBottom: 60 },
                nestedScrollEnabled: true,
                renderItem: function (info) {
                    var b = info.item;
                    var on = st.badges.indexOf(b[0]) !== -1;
                    return h(RN.Pressable, { onPress: function () { toggleBadge(b[0]); }, style: [styles.tile, { width: w, paddingTop: 12 }, on && styles.on] },
                        h(RN.Image, { source: { uri: badgeIcon(b[2]) }, style: { width: 32, height: 32 } }),
                        h(RN.Text, { numberOfLines: 2, style: [styles.name, { paddingBottom: 8 }] }, b[1]),
                        on && h(RN.View, { style: styles.check }, h(RN.Text, { style: styles.checkText }, "✓")));
                }
            }));
    }

    // A photo or GIF from the library, kept inside the plugin as a data: link. No resize options, so the picker
    // hands back the original file and GIFs stay animated.
    var MAX_PHOTO = 8 * 1024 * 1024; // base64 characters, about 6 MB of image
    function pickPhoto(k) {
        var picker = null;
        try {
            picker = (G.__turboModuleProxy && G.__turboModuleProxy("ImagePickerManager")) || RN.NativeModules.ImagePickerManager;
        } catch (e) { }
        if (!picker || typeof picker.launchImageLibrary !== "function") return toast("Couldn't open the photo picker");
        picker.launchImageLibrary({ mediaType: "photo", selectionLimit: 1, includeBase64: true }, function (res) {
            if (!res || res.didCancel) return;
            var a = res.assets && res.assets[0];
            if (res.errorCode || !a || !a.base64) return toast(res.errorMessage || "Couldn't read that photo");
            if (a.base64.length > MAX_PHOTO) return toast("That one's too big (over 6 MB). Pick a smaller one or paste a link.");
            setImg(k, "data:" + (a.type || "image/jpeg") + ";base64," + a.base64);
        });
    }

    var IMG_TABS = {
        avatar: { hint: "Pick a photo or GIF, or paste a link. It replaces your profile picture everywhere on this phone. GIFs stay animated.", ph: "https://…/avatar.gif", preview: { width: 120, height: 120, borderRadius: 60, alignSelf: "center" } },
        banner: { hint: "Pick a photo or GIF, or paste a link. It shows as your banner on your profile, only on this phone.", ph: "https://…/banner.gif", preview: { width: "100%", height: 140, borderRadius: 14 } }
    };

    function ImageTab(p) {
        var k = p.k;
        var cfg = IMG_TABS[k];
        var vs = React.useState(st[k] === "local" ? "" : st[k]);
        var v = vs[0];
        var current = imgOf(k);
        function paste() {
            try {
                common.clipboard.getString().then(function (s) {
                    vs[1](String(s || "").trim());
                    setImg(k, s);
                });
            } catch (e) {
                toast("Couldn't read the clipboard");
            }
        }
        return h(RN.ScrollView, { style: { flex: 1 }, contentContainerStyle: { gap: 10, paddingBottom: 60 }, keyboardShouldPersistTaps: "handled" },
            h(RN.Text, { style: styles.muted }, cfg.hint),
            h(RN.Pressable, { style: [styles.pill, styles.on, { alignItems: "center", paddingVertical: 12 }], onPress: function () { pickPhoto(k); } },
                h(RN.Text, { style: styles.bold }, "Pick from Photos")),
            h(RN.TextInput, {
                value: v,
                onChangeText: vs[1],
                onSubmitEditing: function () { setImg(k, v); },
                placeholder: cfg.ph,
                placeholderTextColor: "#949ba4",
                autoCapitalize: "none",
                autoCorrect: false,
                keyboardType: "url",
                returnKeyType: "done",
                style: styles.input
            }),
            h(RN.View, { style: styles.buttons },
                h(Pill, { label: "Paste link", onPress: paste }),
                h(Pill, { label: "Use it", on: true, onPress: function () { setImg(k, v); } }),
                h(Pill, { label: "Remove", onPress: function () { vs[1](""); setImg(k, ""); } })),
            current ? h(RN.Image, { source: { uri: current }, style: cfg.preview, resizeMode: "cover" }) : null);
    }

    // A text field that saves when you leave it (saving on every key would redraw Discord each time)
    function Field(p) {
        var vs = React.useState(st.p[p.k] || "");
        var commit = function () {
            if (!setField(p.k, vs[0])) vs[1](st.p[p.k] || "");
        };
        return h(RN.View, { style: { gap: 4 } },
            h(RN.Text, { style: styles.label }, p.label),
            h(RN.TextInput, {
                value: vs[0],
                onChangeText: vs[1],
                onEndEditing: commit,
                onBlur: commit,
                onSubmitEditing: p.multi ? undefined : commit,
                placeholder: p.ph,
                placeholderTextColor: "#949ba4",
                multiline: !!p.multi,
                maxLength: p.max,
                autoCapitalize: p.caps || "sentences",
                autoCorrect: !p.caps,
                keyboardType: p.kb,
                style: [styles.input, p.multi && { minHeight: 96, textAlignVertical: "top" }]
            }));
    }

    var SWATCHES = ["#5865f2", "#eb459e", "#ed4245", "#f0b232", "#57f287", "#00a8fc", "#9b59b6", "#1abc9c", "#ffffff", "#111214"];

    function ColorField(p) {
        var vs = React.useState(st.p[p.k] || "");
        var set = function (v) {
            setField(p.k, v);
            vs[1](st.p[p.k] || "");
        };
        return h(RN.View, { style: { gap: 6 } },
            h(RN.Text, { style: styles.label }, p.label),
            h(RN.View, { style: { flexDirection: "row", gap: 8, alignItems: "center" } },
                h(RN.View, { style: [styles.swatch, { width: 38, height: 38, backgroundColor: st.p[p.k] || "transparent" }] }),
                h(RN.TextInput, {
                    value: vs[0],
                    onChangeText: vs[1],
                    onEndEditing: function () { set(vs[0]); },
                    onSubmitEditing: function () { set(vs[0]); },
                    placeholder: "#5865f2",
                    placeholderTextColor: "#949ba4",
                    autoCapitalize: "none",
                    autoCorrect: false,
                    maxLength: 7,
                    style: [styles.input, { flex: 1 }]
                }),
                h(Pill, { label: "Clear", onPress: function () { set(""); } })),
            h(RN.View, { style: styles.badgeRow }, SWATCHES.map(function (c) {
                return h(RN.Pressable, { key: c, onPress: function () { set(c); }, style: [styles.swatch, { backgroundColor: c }, st.p[p.k] === c && styles.swatchOn] });
            })));
    }

    function ProfileTab() {
        return h(RN.ScrollView, { style: { flex: 1 }, contentContainerStyle: { gap: 12, paddingBottom: 80 }, keyboardShouldPersistTaps: "handled" },
            h(RN.Text, { style: styles.muted }, "Leave a field empty to keep your real one. Only this phone sees the changes."),
            h(Field, { k: "name", label: "Display name", ph: "Your display name", max: 32 }),
            h(Field, { k: "username", label: "Username", ph: "username", max: 32, caps: "none" }),
            h(Field, { k: "pronouns", label: "Pronouns", ph: "they/them", max: 40 }),
            h(Field, { k: "bio", label: "About me", ph: "Write something", max: 190, multi: true }),
            h(ColorField, { k: "color1", label: "Profile color" }),
            h(ColorField, { k: "color2", label: "Second color (gradient)" }),
            h(Field, { k: "created", label: "Account created (Member since)", ph: "2016-05-21", max: 10, caps: "none", kb: "numbers-and-punctuation" }),
            h(Field, { k: "oldName", label: "Originally known as (old username badge)", ph: "name#1234", max: 40, caps: "none" }),
            h(Field, { k: "email", label: "Email (shown in your account settings)", ph: "you@example.com", max: 80, caps: "none", kb: "email-address" }),
            h(Field, { k: "phone", label: "Phone (shown in your account settings)", ph: "+44 7700 900000", max: 24, caps: "none", kb: "phone-pad" }));
    }

    function Presets() {
        var ns = React.useState("");
        return h(RN.View, { style: { gap: 8 } },
            h(RN.Text, { style: styles.label }, "Saved looks"),
            h(RN.View, { style: { flexDirection: "row", gap: 8, alignItems: "center" } },
                h(RN.TextInput, {
                    value: ns[0],
                    onChangeText: ns[1],
                    placeholder: "Name this look",
                    placeholderTextColor: "#949ba4",
                    maxLength: 32,
                    style: [styles.input, { flex: 1 }]
                }),
                h(Pill, { label: "Save", on: true, onPress: function () { savePreset(ns[0]); ns[1](""); } })),
            st.presets.length === 0 ? h(RN.Text, { style: styles.muted }, "Nothing saved yet. Save your current look to switch back to it in one tap.") : null,
            st.presets.map(function (pr) {
                return h(RN.View, { key: pr.id, style: styles.row },
                    h(RN.Text, { style: [styles.text, { flex: 1 }], numberOfLines: 1 }, pr.name),
                    h(Pill, { label: "Wear", on: true, onPress: function () { loadPreset(pr); } }),
                    h(Pill, { label: "Delete", onPress: function () { deletePreset(pr); } }));
            }));
    }

    function More() {
        var counts = TYPES.map(function (t, i) { return Object.keys(cat[i]).length + " " + t.label.toLowerCase(); }).join(", ");
        return h(RN.ScrollView, { style: { flex: 1 }, contentContainerStyle: { gap: 10, paddingBottom: 60 }, keyboardShouldPersistTaps: "handled" },
            h(Presets, null),
            h(RN.View, { style: styles.row },
                h(RN.View, { style: { flex: 1 } },
                    h(RN.Text, { style: styles.text }, "Button in the chat bar"),
                    h(RN.Text, { style: styles.muted }, "Opens " + NAME + " from any chat")),
                h(RN.Switch, { value: !!st.chatButton, onValueChange: function (v) { st.chatButton = v; save(); } })),
            h(RN.View, { style: styles.buttons },
                h(Pill, { label: loading ? "Loading shop…" : "Refresh shop", onPress: function () { refresh(); } }),
                h(Pill, { label: "Reset everything", onPress: resetAll })),
            h(RN.Text, { style: styles.muted }, "Catalog: " + counts + "."),
            h(RN.Text, { style: styles.muted }, "Everything here only changes what this phone shows. Other people still see your real profile."),
            h(RN.Text, { style: styles.muted }, "Also in Settings → " + NAME + "."));
    }

    var TABS = ["Profile", "Decor", "Effects", "Nameplates", "Frames", "Badges", "Avatar", "Banner", "More"];
    var GRID_TABS = ["Decor", "Effects", "Nameplates", "Frames"];

    function Page() {
        var tick = useTick();
        var ts = React.useState(0);
        var tab = ts[0];
        var dims = RN.useWindowDimensions();
        var width = dims.width - 24;

        React.useEffect(function () {
            var stale = Date.now() - (Number(storage.fetchedAt) || 0) > 12 * 3600 * 1000;
            if (stale || !Object.keys(cat[0]).length) refresh();
        }, []);

        var name = TABS[tab];
        var grid = GRID_TABS.indexOf(name);
        var body = grid !== -1 ? h(Grid, { key: "g" + grid, type: grid, tick: tick, width: width })
            : name === "Profile" ? h(ProfileTab, { key: "profile" + profileVersion })
                : name === "Badges" ? h(Badges, { tick: tick, width: width })
                    : name === "Avatar" ? h(ImageTab, { key: "avatar", k: "avatar" })
                        : name === "Banner" ? h(ImageTab, { key: "banner", k: "banner" })
                            : h(More, null);

        return h(RN.View, { style: [styles.page, { minHeight: Math.round(dims.height * 0.8) }] },
            h(Preview, null),
            h(RN.View, null,
                h(RN.ScrollView, { horizontal: true, showsHorizontalScrollIndicator: false, contentContainerStyle: styles.tabs },
                    TABS.map(function (label, i) {
                        return h(Pill, { key: label, label: label, on: i === tab, onPress: function () { ts[1](i); } });
                    }))),
            body);
    }

    function Settings() {
        var navigation = null;
        try {
            navigation = common.NavigationNative.useNavigation();
        } catch (e) { }
        return h(RN.View, { style: { padding: 12, gap: 10 } },
            h(RN.Pressable, { style: [styles.pill, styles.on, { alignItems: "center", paddingVertical: 12 }], onPress: function () { openPage(navigation); } },
                h(RN.Text, { style: styles.bold }, "Open " + NAME)),
            h(RN.Text, { style: styles.muted }, "Also opens from the ✨ button in the chat bar, and from Settings → " + NAME + "."));
    }

    // ---- entry points: chat bar button, Settings row ----

    function addChatButton() {
        var Btn = findFile("modules/chat_input/native/action_buttons/ChatInputActionButton.tsx");
        Btn = Btn && Btn.default;
        var Icon = icon(["SparklesIcon", "PaintPaletteIcon", "StarIcon", "PencilIcon"]);
        var actions = findFile("modules/chat_input/native/action_buttons/ChatInputActions.tsx");
        if (!Btn || !Icon || !actions) return log.warn(NAME + ": chat bar not found, no button there");
        var ChatButton = function () {
            return h(Btn, { accessibilityLabel: NAME, IconComponent: Icon, onPress: function () { openPage(); } });
        };
        var un = afterRender(actions, "default", function (tree) {
            try {
                var node = vendetta.utils.findInReactTree(tree, function (n) { return n && n.props && Array.isArray(n.props.children); });
                if (!node) return tree;
                var kids = node.props.children;
                var at = kids.findIndex(function (c) { return c && c.key === "enhanced-decor"; });
                if (at !== -1) kids.splice(at, 1);
                if (st.chatButton) kids.push(h(ChatButton, { key: "enhanced-decor" }));
            } catch (e) {
                log.error(NAME + ": chat bar button failed", e);
            }
            return tree;
        });
        if (un) unpatches.push(un);
    }

    function addSettingsRow() {
        var ui = G.bunny && G.bunny.ui && G.bunny.ui.settings;
        if (!ui || typeof ui.registerSection !== "function") return;
        unpatches.push(ui.registerSection({
            name: NAME,
            items: [{
                key: "ENHANCED_DECOR",
                title: function () { return NAME; },
                icon: assetId(["ic_profile_24px", "UserIcon", "ic_person"]),
                render: function () { return Promise.resolve({ default: Page }); }
            }]
        }));
    }

    function optional(what, fn) {
        try {
            fn();
        } catch (e) {
            log.warn(NAME + ": " + what + " unavailable", e);
        }
    }

    return {
        onLoad: function () {
            UserStore = metro.findByStoreName("UserStore");
            ProfileStore = metro.findByStoreName("UserProfileStore");
            if (!UserStore) throw new Error(NAME + ": Discord's UserStore wasn't found");
            // A new session (start-up, or switching accounts): wear that account's look
            if (common.FluxDispatcher) {
                var onSession = function () {
                    setTimeout(function () {
                        me();
                        redraw();
                        changed();
                    }, 0);
                };
                common.FluxDispatcher.subscribe("CONNECTION_OPEN", onSession);
                unpatches.push(function () { common.FluxDispatcher.unsubscribe("CONNECTION_OPEN", onSession); });
            }
            unpatches.push(after("getCurrentUser", UserStore, function (a, r) {
                if (r && r.id !== owner) useAccount(r.id);
                return patched(r, userProps);
            }));
            unpatches.push(after("getUser", UserStore, function (a, r) { return r && isMe(a[0]) ? patched(r, userProps) : r; }));
            if (ProfileStore && typeof ProfileStore.getUserProfile === "function") {
                var original = ProfileStore.getUserProfile;
                rawProfile = function (id) { return original.call(ProfileStore, id); };
                ["getUserProfile", "getGuildMemberProfile"].forEach(function (fn) {
                    if (typeof ProfileStore[fn] !== "function") return;
                    unpatches.push(after(fn, ProfileStore, function (a, r) { return r && isMe(a[0]) ? patched(r, profileProps) : r; }));
                });
            }
            optional("Badges", function () {
                var mod = metro.findByName("useBadges", false);
                if (!mod || typeof mod.default !== "function") return;
                unpatches.push(after("default", mod, function (a, r) {
                    var props = a[0];
                    if (!props || !isMe(props.userId) || !Array.isArray(r) || !badgesChanged()) return r;
                    return patched(r, function (real) { return mergeBadges(real); });
                }));
                // Our tiered badges: Discord's badge component draws them from their link, and keeps their ids
                var pb = metro.findByName("ProfileBadge", false);
                if (pb && typeof pb.default === "function") {
                    unpatches.push(vendetta.patcher.before("default", pb, function (args) {
                        var p = args[0];
                        if (p && BADGE_SRC[p.id]) args[0] = Object.assign({}, p, { source: { uri: BADGE_SRC[p.id] } });
                    }));
                }
                var ids = metro.findByProps("resolveProfileBadgeId");
                ["resolveProfileBadgeId", "toProfileBadgeLegacyId"].forEach(function (k) {
                    if (!ids || typeof ids[k] !== "function") return;
                    unpatches.push(vendetta.patcher.instead(k, ids, function (a, orig) {
                        return typeof a[0] === "string" && BADGE_SRC[a[0]] ? a[0] : orig.apply(this, a);
                    }));
                });
            });
            optional("Banners", function () {
                var banners = metro.findByProps("getUserBannerURL");
                if (banners) {
                    unpatches.push(after("getUserBannerURL", banners, function (a, url) {
                        var arg = a[0];
                        return imgOf("banner") && arg && isMe(arg.id || arg.userId) ? imgOf("banner") : url;
                    }));
                }
                var DP = findFile("modules/user_profile/DisplayProfile.tsx");
                DP = DP && DP.default;
                if (DP && DP.prototype && typeof DP.prototype.getBannerURL === "function") {
                    unpatches.push(after("getBannerURL", DP.prototype, function (a, url) {
                        return imgOf("banner") && isMe(this && this.userId) ? imgOf("banner") : url;
                    }));
                }
            });
            optional("Avatar", function () {
                var mine = function (u) { return !!imgOf("avatar") && !!u && isMe(u.id || u.userId); };
                var icons = metro.findByProps("getUserAvatarURL", "getUserAvatarSource") || metro.findByProps("getUserAvatarURL");
                if (icons && typeof icons.getUserAvatarURL === "function") {
                    unpatches.push(after("getUserAvatarURL", icons, function (a, url) { return mine(a[0]) ? imgOf("avatar") : url; }));
                }
                if (icons && typeof icons.getUserAvatarSource === "function") {
                    unpatches.push(after("getUserAvatarSource", icons, function (a, src) { return mine(a[0]) ? { uri: imgOf("avatar") } : src; }));
                }
                // User records draw their own avatar too, and they all share one prototype
                var protoDone = false;
                var patchProto = function () {
                    var u = me();
                    var proto = u && Object.getPrototypeOf(u);
                    if (protoDone || !proto) return;
                    protoDone = true;
                    if (typeof proto.getAvatarURL === "function") {
                        unpatches.push(after("getAvatarURL", proto, function (a, url) { return mine(this) ? imgOf("avatar") : url; }));
                    }
                    if (typeof proto.getAvatarSource === "function") {
                        unpatches.push(after("getAvatarSource", proto, function (a, src) { return mine(this) ? { uri: imgOf("avatar") } : src; }));
                    }
                };
                patchProto();
                if (!protoDone && common.FluxDispatcher) {
                    var onOpen = function () {
                        patchProto();
                        common.FluxDispatcher.unsubscribe("CONNECTION_OPEN", onOpen);
                    };
                    common.FluxDispatcher.subscribe("CONNECTION_OPEN", onOpen);
                    unpatches.push(function () { common.FluxDispatcher.unsubscribe("CONNECTION_OPEN", onOpen); });
                }
            });
            // Your messages in chat are native rows that carry the name and avatar themselves
            optional("Chat rows", function () {
                var RowManager = metro.findByName("RowManager");
                if (!RowManager || !RowManager.prototype || typeof RowManager.prototype.generate !== "function") return;
                unpatches.push(after("generate", RowManager.prototype, function (a, row) {
                    var src = a[0] && a[0].message;
                    var m = row && row.type === 1 && row.message;
                    if (!m || !src || !src.author || !isMe(src.author.id)) return;
                    if (imgOf("avatar") && typeof m.avatarURL === "string") m.avatarURL = imgOf("avatar");
                    var real = src.author.globalName || src.author.username;
                    if (st.p.name && typeof m.username === "string" && m.username === real) m.username = st.p.name;
                }));
            });
            // Display name and username wherever Discord works them out
            optional("Names", function () {
                var names = metro.findByProps("useName", "getGlobalName") || metro.findByProps("getUserTag", "getGlobalName");
                if (!names) return;
                var myName = function (u) { return st.p.name && u && isMe(u.id) ? st.p.name : undefined; };
                ["getName", "useName", "getGlobalName"].forEach(function (k) {
                    if (typeof names[k] !== "function") return;
                    unpatches.push(after(k, names, function (a, r) { return myName(a[0]) || r; }));
                });
                if (typeof names.getUserTag === "function") {
                    unpatches.push(after("getUserTag", names, function (a, r) { return st.p.username && a[0] && isMe(a[0].id) ? st.p.username : r; }));
                }
            });
            // "Member since": Discord reads it from your id
            optional("Account creation date", function () {
                var snow = metro.findByProps("extractTimestamp");
                if (!snow || typeof snow.extractTimestamp !== "function") return;
                unpatches.push(vendetta.patcher.instead("extractTimestamp", snow, function (a, orig) {
                    var d = st.p.created && isMe(a[0]) ? createdDate() : null;
                    return d ? d.getTime() : orig.apply(this, a);
                }));
            });
            // The account switcher
            optional("Account switcher", function () {
                var accounts = metro.findByStoreName("MultiAccountStore");
                if (!accounts) return;
                ["getUsers", "getValidUsers"].forEach(function (k) {
                    if (typeof accounts[k] !== "function") return;
                    unpatches.push(after(k, accounts, function (a, list) {
                        return Array.isArray(list) ? patched(list, function (l) { return l.map(function (u) { return u && isMe(u.id) ? patched(u, userProps) : u; }); }) : list;
                    }));
                });
            });
            optional("Chat bar button", addChatButton);
            optional("Settings row", addSettingsRow);
            redraw();
        },
        onUnload: function () {
            unpatches.splice(0).forEach(function (u) {
                try {
                    u();
                } catch (e) { }
            });
            rawProfile = null;
            redraw();
        },
        settings: Settings
    };
})()
