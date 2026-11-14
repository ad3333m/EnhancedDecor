(function () {
    // EnhancedDecor: wear any avatar decoration, profile effect, nameplate or profile frame. Only you see it.
    // Vendetta-format plugin (Endcord Mobile, Revenge, Kettu, Bunny). The loader runs `return <this file>`, so the
    // file must start with "(" (a comment line first would return undefined). Hermes treats const/let as var and
    // lacks async/classes, so this stays ES6 with var and promises.
    "use strict";
    var metro = vendetta.metro;
    var common = metro.common;
    var React = common.React;
    var RN = common.ReactNative;
    var h = React.createElement;
    var storage = vendetta.plugin.storage;
    var log = vendetta.logger || console;

    var CDN = "https://cdn.discordapp.com/";
    // Weekly dump of Discord's whole shop (litruv/discord-collectibles). The live shop is merged on top.
    var CATALOG = "https://github.com/litruv/discord-collectibles/releases/download/latest/";
    // Index = Discord's collectible item type: 0 decoration, 1 profile effect, 2 nameplate, 3 profile frame
    var TYPES = [
        { label: "Decorations", file: "avatardecorations.json", cols: 4, aspect: 1 },
        { label: "Effects", file: "profileeffects.json", cols: 3, aspect: 880 / 450 },
        { label: "Nameplates", file: "nameplate.json", cols: 1, aspect: 3 / 16 },
        { label: "Frames", cols: 3, aspect: 1 }
    ];

    function readJSON(key, fallback) {
        try {
            var v = JSON.parse(storage[key] || "null");
            return Array.isArray(v) && v.length === 4 ? v : fallback;
        } catch (e) {
            return fallback;
        }
    }

    // Everything ever seen stays, so items Discord pulls from the shop keep working
    var cat = readJSON("catalog", [{}, {}, {}, {}]);
    var sel = readJSON("selected", [null, null, null, null]);
    var version = 0;
    var loading = false;
    var listeners = [];
    var unpatches = [];
    var cache = new WeakMap();

    function changed() {
        listeners.slice().forEach(function (fn) { fn(); });
    }

    function add(type, item) {
        if (!item.s || !cat[type]) return;
        if ((type === 0 || type === 2) && !item.a) return; // nothing to draw without an asset
        cat[type][item.s] = Object.assign(cat[type][item.s] || {}, item);
    }

    function fromDump(type, it) {
        var urls = (it.assets || []).map(function (x) { return x.url || ""; }).join(" ");
        var item = { s: it.skuId, n: it.name };
        var m;
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
                log.warn("EnhancedDecor: a catalog source failed", e);
                return false;
            });
        });
        return Promise.all(settled).then(function (ok) {
            loading = false;
            storage.catalog = JSON.stringify(cat);
            storage.fetchedAt = Date.now();
            if (ok.indexOf(true) === -1) toast("EnhancedDecor: couldn't load the shop");
            changed();
        });
    }

    function toast(msg) {
        try {
            vendetta.ui.toasts.showToast(msg);
        } catch (e) { }
    }

    // ---- what Discord sees for your own account ----

    function decoration() {
        return sel[0] ? { asset: sel[0].a, skuId: sel[0].s, expiresAt: null } : null;
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
        if ((sel[1] || sel[3]) && !prof.premiumType) p.premiumType = 2;
        return Object.keys(p).length ? p : null;
    }

    // Discord's records are shared, so hand back a copy with our fields instead of changing them
    function patched(src, build) {
        if (!src || typeof src !== "object") return src;
        var hit = cache.get(src);
        if (hit && hit.v === version) return hit.c;
        var props = build(src);
        var c = src;
        if (props) {
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

    function isMe(id) {
        var me = UserStore.getCurrentUser();
        return !!me && me.id === id;
    }

    function redraw() {
        version++;
        [UserStore, ProfileStore].forEach(function (s) {
            try {
                if (s) s.emitChange();
            } catch (e) { }
        });
    }

    function choose(type, item) {
        sel[type] = item ? { s: item.s, n: item.n, a: item.a, p: item.p, t: item.t } : null;
        storage.selected = JSON.stringify(sel);
        redraw();
        changed();
    }

    // ---- picker ----

    var SC = vendetta.ui.semanticColors || {};
    function color() {
        for (var i = 0; i < arguments.length - 1; i++) if (SC[arguments[i]]) return SC[arguments[i]];
        return arguments[arguments.length - 1];
    }
    var BRAND = "#5865f2";
    var GAP = 8;
    var styles = common.stylesheet.createThemedStyleSheet({
        page: { padding: 12 },
        text: { color: color("TEXT_DEFAULT", "TEXT_NORMAL", "#dbdee1"), fontSize: 14 },
        muted: { color: color("TEXT_MUTED", "TEXT_SUBTLE", "#949ba4"), fontSize: 12 },
        row: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
        pill: {
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 99,
            borderWidth: 1.5,
            borderColor: color("BORDER_SUBTLE", "BACKGROUND_MOD_STRONG", "BACKGROUND_MODIFIER_ACCENT", "#4e5058"),
            backgroundColor: color("BACKGROUND_MOD_SUBTLE", "BACKGROUND_MOD_NORMAL", "BACKGROUND_SECONDARY", "#2b2d31")
        },
        on: { borderColor: BRAND, backgroundColor: "rgba(88, 101, 242, 0.25)" },
        input: {
            color: color("TEXT_DEFAULT", "TEXT_NORMAL", "#dbdee1"),
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginBottom: 10,
            backgroundColor: color("BACKGROUND_MOD_SUBTLE", "BACKGROUND_MOD_NORMAL", "BACKGROUND_SECONDARY", "#2b2d31")
        },
        tile: {
            borderRadius: 10,
            borderWidth: 1.5,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            borderColor: color("BORDER_SUBTLE", "BACKGROUND_MOD_STRONG", "BACKGROUND_MODIFIER_ACCENT", "#4e5058"),
            backgroundColor: color("BACKGROUND_MOD_SUBTLE", "BACKGROUND_MOD_NORMAL", "BACKGROUND_SECONDARY", "#2b2d31")
        },
        name: { fontSize: 11, textAlign: "center", paddingHorizontal: 4, paddingVertical: 3 }
    });

    function thumb(type, i) {
        if (type === 0) return CDN + "avatar-decoration-presets/" + i.a + ".png?size=96&passthrough=false";
        if (type === 2) return CDN + "assets/collectibles/" + i.a + "static.png";
        return i.t || CDN + "media/v1/collectibles-shop/" + i.s + "/static";
    }

    // Snowflakes: newest first
    function newestFirst(a, b) {
        return a.s.length !== b.s.length ? b.s.length - a.s.length : (a.s < b.s ? 1 : a.s > b.s ? -1 : 0);
    }

    function Pill(props) {
        return h(RN.Pressable, { onPress: props.onPress, style: [styles.pill, props.on && styles.on] },
            h(RN.Text, { style: styles.text }, props.label));
    }

    var NONE = { s: "", n: "None" };

    function Settings() {
        var tabState = React.useState(0), tab = tabState[0], setTab = tabState[1];
        var qState = React.useState(""), q = qState[0], setQ = qState[1];
        var tickState = React.useState(0), tick = tickState[0], setTick = tickState[1];
        var dims = RN.useWindowDimensions();

        React.useEffect(function () {
            var fn = function () { setTick(function (x) { return x + 1; }); };
            listeners.push(fn);
            var stale = Date.now() - (Number(storage.fetchedAt) || 0) > 12 * 3600 * 1000;
            if (stale || !Object.keys(cat[0]).length) refresh();
            return function () { listeners.splice(listeners.indexOf(fn), 1); };
        }, []);

        var list = React.useMemo(function () {
            var needle = q.trim().toLowerCase();
            var all = Object.keys(cat[tab]).map(function (k) { return cat[tab][k]; });
            if (needle) all = all.filter(function (i) { return String(i.n).toLowerCase().indexOf(needle) !== -1; });
            return [NONE].concat(all.sort(newestFirst));
        }, [tab, q, tick]);

        var type = TYPES[tab];
        var width = (dims.width - 24 - GAP * (type.cols - 1)) / type.cols;
        var imgH = Math.round(width * type.aspect);
        var chosen = sel[tab];

        function renderItem(info) {
            var item = info.item;
            var on = item === NONE ? !chosen : !!chosen && chosen.s === item.s;
            return h(RN.Pressable, {
                onPress: function () { choose(tab, item === NONE || on ? null : item); },
                style: [styles.tile, { width: width }, on && styles.on]
            },
                item === NONE
                    ? h(RN.View, { style: { height: imgH, justifyContent: "center" } }, h(RN.Text, { style: styles.text }, "None"))
                    : h(RN.Image, { source: { uri: thumb(tab, item) }, style: { width: width, height: imgH }, resizeMode: "contain" }),
                h(RN.Text, { numberOfLines: 1, style: [styles.muted, styles.name] }, item.n));
        }

        var count = list.length - 1;
        return h(RN.View, { style: styles.page },
            h(RN.View, { style: styles.row }, TYPES.map(function (t, i) {
                return h(Pill, { key: t.label, label: t.label, on: i === tab, onPress: function () { setTab(i); } });
            })),
            h(RN.Text, { style: [styles.muted, { marginBottom: 8 }] },
                (chosen ? "Wearing: " + chosen.n : "Wearing: nothing") + "  ·  " + count + " items" + (loading ? "  ·  loading…" : "")),
            h(RN.TextInput, {
                value: q,
                onChangeText: setQ,
                placeholder: "Search " + type.label.toLowerCase(),
                placeholderTextColor: "#949ba4",
                style: styles.input
            }),
            h(RN.View, { style: styles.row },
                h(Pill, { label: "Refresh shop", onPress: function () { refresh(); } }),
                h(Pill, { label: "Remove all", onPress: function () { [0, 1, 2, 3].forEach(function (i) { sel[i] = null; }); choose(0, null); } })),
            h(RN.View, { style: { height: Math.round(dims.height * 0.62) } },
                h(RN.FlatList, {
                    key: "t" + tab,
                    data: list,
                    numColumns: type.cols,
                    keyExtractor: function (i) { return i.s || "none"; },
                    renderItem: renderItem,
                    nestedScrollEnabled: true,
                    columnWrapperStyle: type.cols > 1 ? { gap: GAP } : undefined,
                    contentContainerStyle: { gap: GAP, paddingBottom: 40 },
                    initialNumToRender: 24,
                    windowSize: 7,
                    removeClippedSubviews: true
                })));
    }

    return {
        onLoad: function () {
            UserStore = metro.findByStoreName("UserStore");
            ProfileStore = metro.findByStoreName("UserProfileStore");
            if (!UserStore) throw new Error("EnhancedDecor: Discord's UserStore wasn't found");
            var after = vendetta.patcher.after;
            unpatches.push(after("getCurrentUser", UserStore, function (a, r) { return patched(r, userProps); }));
            unpatches.push(after("getUser", UserStore, function (a, r) { return r && isMe(a[0]) ? patched(r, userProps) : r; }));
            if (ProfileStore) {
                ["getUserProfile", "getGuildMemberProfile"].forEach(function (fn) {
                    if (typeof ProfileStore[fn] !== "function") return;
                    unpatches.push(after(fn, ProfileStore, function (a, r) { return r && isMe(a[0]) ? patched(r, profileProps) : r; }));
                });
            }
            redraw();
        },
        onUnload: function () {
            unpatches.splice(0).forEach(function (u) { u(); });
            redraw();
        },
        settings: Settings
    };
})()
