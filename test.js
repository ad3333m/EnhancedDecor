// Self-check: node test.js (needs `npm i --no-save react@18 react-test-renderer@18`).
// Loads the plugin against fake Discord stores, downloads the real catalog, drives the picker.
const assert = require("assert");
const fs = require("fs");
const React = require("react");
const TR = require("react-test-renderer");

const host = n => props => React.createElement(n, props, props.children);
const RN = {
    View: host("View"), Text: host("Text"), Image: host("Image"), TextInput: host("TextInput"), Pressable: host("Pressable"),
    FlatList: p => React.createElement("FlatList", null, p.data.map((item, index) => React.createElement(React.Fragment, { key: p.keyExtractor(item) }, p.renderItem({ item, index })))),
    useWindowDimensions: () => ({ width: 390, height: 844 })
};

class UserRecord { constructor(o) { Object.assign(this, o); } getAvatarURL() { return "avatar:" + this.id; } }
const me = new UserRecord({ id: "1", username: "adam", collectibles: { other: 1 } });
const friend = new UserRecord({ id: "2", username: "friend" });
const myProfile = { userId: "1", premiumType: 0 };
const emits = [];
const UserStore = { getCurrentUser: () => me, getUser: id => ({ 1: me, 2: friend })[id], emitChange: () => emits.push("u") };
const UserProfileStore = { getUserProfile: id => (id === "1" ? myProfile : { userId: id }), emitChange: () => emits.push("p") };

const after = (name, obj, cb) => {
    const orig = obj[name];
    obj[name] = function (...a) { const r = orig.apply(this, a); const n = cb(a, r); return n === undefined ? r : n; };
    return () => { obj[name] = orig; };
};
const storage = {};
const vendetta = {
    metro: {
        findByStoreName: n => ({ UserStore, UserProfileStore })[n],
        findByProps: () => ({ get: () => Promise.reject(new Error("no live shop in tests")) }),
        common: { React, ReactNative: RN, stylesheet: { createThemedStyleSheet: s => s } }
    },
    patcher: { after },
    plugin: { storage },
    logger: { warn() { } },
    ui: { semanticColors: {}, toasts: { showToast() { } } }
};

const src = fs.readFileSync(__dirname + "/index.js", "utf8");
assert(!/\b(const|let|async|class)\s/.test(src.replace(/\/\/.*$/gm, "")), "Hermes: no const/let/async/class");
const plugin = new Function("vendetta", "return " + src)(vendetta);

(async () => {
    plugin.onLoad();
    assert.strictEqual(UserStore.getCurrentUser(), me, "nothing chosen: record untouched");

    let tree;
    await TR.act(async () => { tree = TR.create(React.createElement(plugin.settings)); });
    for (let i = 0; i < 100 && !JSON.parse(storage.catalog || "null"); i++) await TR.act(() => new Promise(r => setTimeout(r, 200)));
    const cat = JSON.parse(storage.catalog);
    const counts = cat.map(c => Object.keys(c).length);
    console.log("catalog: decorations %d, effects %d, nameplates %d, frames %d", ...counts);
    assert(counts[0] > 300 && counts[1] > 100 && counts[2] > 100, "catalog too small");

    const tiles = () => tree.root.findAll(n => n.type === "Pressable" && n.props.style && n.props.style[1] && n.props.style[1].width);
    const tab = i => TR.act(() => tree.root.findAll(n => n.type === "Pressable")[i].props.onPress());
    // tab 0 decorations, 1 effects, 2 nameplates; tile 0 is "None", tile 1 the newest item
    for (const t of [0, 1, 2]) { await tab(t); await TR.act(() => tiles()[1].props.onPress()); }

    const u = UserStore.getCurrentUser();
    assert.notStrictEqual(u, me);
    assert(u instanceof UserRecord && u.getAvatarURL() === "avatar:1", "clone keeps class methods");
    assert(/^a?_?[0-9a-f]+$/.test(u.avatarDecorationData.asset), "decoration asset: " + u.avatarDecorationData.asset);
    assert.strictEqual(u.avatarDecoration, u.avatarDecorationData);
    assert(/^nameplates\/.+\/$/.test(u.collectibles.nameplate.asset), "nameplate asset: " + u.collectibles.nameplate.asset);
    assert.strictEqual(u.collectibles.other, 1, "other collectibles kept");
    assert.strictEqual(UserStore.getUser("1"), u, "getUser(me) is the same copy");
    assert.strictEqual(UserStore.getUser("2"), friend, "other users untouched");
    const p = UserProfileStore.getUserProfile("1");
    assert(p.profileEffect.skuId && p.premiumType === 2, "effect on profile");
    assert.strictEqual(UserProfileStore.getUserProfile("1"), p, "profile copy cached (no re-render loop)");
    assert.strictEqual(me.avatarDecorationData, undefined, "real record not mutated");
    console.log("wearing:", u.avatarDecorationData.asset, u.collectibles.nameplate.asset, p.profileEffect.skuId);

    await TR.act(() => tiles()[1].props.onPress()); // tap again = take off (tab 2)
    assert.strictEqual(UserStore.getCurrentUser().collectibles.nameplate, undefined);

    plugin.onUnload();
    assert.strictEqual(UserStore.getCurrentUser(), me, "unload restores");
    assert(emits.length > 0, "stores told to redraw");
    console.log("ok");
})().catch(e => { console.error(e); process.exit(1); });
