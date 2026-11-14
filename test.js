// Self-check: node test.js (needs `npm i --no-save react@18 react-test-renderer@18`).
// Loads the plugin against fake Discord parts, downloads the real catalog, drives the page.
const assert = require("assert");
const fs = require("fs");
const React = require("react");
const TR = require("react-test-renderer");
const h = React.createElement;

const host = n => props => h(n, props, props.children);
const RN = {
    View: host("View"), Text: host("Text"), Image: host("Image"), TextInput: host("TextInput"), Pressable: host("Pressable"),
    ScrollView: host("ScrollView"), Switch: host("Switch"),
    FlatList: p => h("FlatList", null, p.data.map((item, index) => h(React.Fragment, { key: p.keyExtractor(item) }, p.renderItem({ item, index })))),
    useWindowDimensions: () => ({ width: 390, height: 844 })
};

class UserRecord { constructor(o) { Object.assign(this, o); } getAvatarURL() { return "https://cdn/avatar/" + this.id; } }
const me = new UserRecord({ id: "1", username: "adam", collectibles: { other: 1 } });
const friend = new UserRecord({ id: "2", username: "friend" });
const realBadge = { id: "legacy_username", description: "real", icon: "6de6d34650760ba5551a79732e98ed60" };
const myProfile = { userId: "1", premiumType: 0, badges: [realBadge] };
const emits = [];
const UserStore = { getCurrentUser: () => me, getUser: id => ({ 1: me, 2: friend })[id], emitChange: () => emits.push("u") };
const UserProfileStore = { getUserProfile: id => (id === "1" ? myProfile : { userId: id }), emitChange: () => emits.push("p") };
const useBadges = { default: ({ userId }) => (userId === "1" ? [realBadge] : []) };
const banners = { getUserBannerURL: () => "https://cdn/real-banner" };
const pushed = [];
const modals = { push: f => pushed.push(f), pop() { } };
const nav = { Navigator: host("Navigator"), getHeaderCloseButton: () => null };
const ChatInputActions = { default: { type: function Actions() { return h("Row", null, [h("Attach", { key: "attach" })]); } } };
const files = {
    "modules/chat_input/native/action_buttons/ChatInputActionButton.tsx": { default: host("ActionButton") },
    "modules/chat_input/native/action_buttons/ChatInputActions.tsx": ChatInputActions,
    "design/components/Icon/native/redesign/generated/SparklesIcon.tsx": { SparklesIcon: host("Sparkles") }
};
const sections = {};
globalThis.bunny = {
    metro: { findByFilePath: p => files[p] },
    ui: { settings: { registerSection: s => { sections[s.name] = s; return () => delete sections[s.name]; } } }
};

const after = (name, obj, cb) => {
    const orig = obj[name];
    obj[name] = function (...a) { const r = orig.apply(this, a); const n = cb.call(this, a, r); return n === undefined ? r : n; };
    return () => { obj[name] = orig; };
};
const findInReactTree = (t, f) => {
    if (!t || typeof t !== "object") return null;
    if (f(t)) return t;
    for (const c of [].concat(t.props ? t.props.children : [])) { const r = findInReactTree(c, f); if (r) return r; }
    return null;
};
const storage = { selected: JSON.stringify([null, null, null, null]) };
const props = { "getAPIBaseURL,get": { get: () => Promise.reject(new Error("no live shop in tests")) }, pushLazy: modals, "Navigator,getHeaderCloseButton": nav, getUserBannerURL: banners };
const vendetta = {
    metro: {
        findByStoreName: n => ({ UserStore, UserProfileStore })[n],
        findByProps: (...p) => props[p.join(",")],
        findByName: n => (n === "useBadges" ? useBadges : undefined),
        common: { React, ReactNative: RN, stylesheet: { createThemedStyleSheet: s => s }, clipboard: { getString: () => Promise.resolve(" https://x.test/b.gif \n") }, NavigationNative: { useNavigation: () => null } }
    },
    patcher: { after },
    plugin: { storage },
    utils: { findInReactTree },
    logger: { warn() { }, error(...a) { console.error(...a); } },
    ui: { semanticColors: {}, toasts: { showToast() { } }, assets: { getAssetIDByName: () => 1 } }
};

const src = fs.readFileSync(__dirname + "/index.js", "utf8");
assert(src.startsWith("("), "loader runs `return <file>`: must start with (");
assert(!/\b(const|let|async|class)\s|\?\.|\?\?|\.\.\./.test(src.replace(/\/\/.*$/gm, "")), "Hermes-safe syntax only");
const plugin = new Function("vendetta", "return " + src)(vendetta);

const text = n => [].concat(n.props.children).map(c => (c && c.props ? text(c) : typeof c === "string" ? c : "")).join("");

(async () => {
    plugin.onLoad();
    assert.strictEqual(UserStore.getCurrentUser(), me, "nothing chosen: record untouched");

    // chat bar button
    const row = ChatInputActions.default.type();
    const btn = row.props.children.find(c => c.key === "enhanced-decor");
    assert(btn, "chat bar button added");
    btn.type().props.onPress();
    assert.strictEqual(pushed.length, 1, "button opens the page");

    // page from the Settings row
    assert(sections.EnhancedDecor, "settings row registered");
    const Page = (await sections.EnhancedDecor.items[0].render()).default;
    let tree;
    await TR.act(async () => { tree = TR.create(h(Page)); });
    for (let i = 0; i < 100 && !storage.catalog; i++) await TR.act(() => new Promise(r => setTimeout(r, 200)));
    const cat = JSON.parse(storage.catalog);
    const counts = cat.map(c => Object.keys(c).length);
    console.log("catalog: decorations %d, effects %d, nameplates %d, frames %d", ...counts);
    assert(counts[0] > 300 && counts[1] > 100 && counts[2] > 100, "catalog too small");

    const press = label => TR.act(() => tree.root.findAll(n => n.type === "Pressable" && text(n) === label)[0].props.onPress());
    const tiles = () => tree.root.findAll(n => n.type === "Pressable" && n.props.style && n.props.style[1] && typeof n.props.style[1].width === "number");
    // tile 0 is "Take off", tile 1 the newest item
    for (const tab of ["Decor", "Effects", "Nameplates"]) { await press(tab); await TR.act(() => tiles()[1].props.onPress()); }
    await press("Badges");
    await press("Nitro");
    await press("Discord Staff");
    await press("Banner");
    await press("Paste link");

    const u = UserStore.getCurrentUser();
    assert(u instanceof UserRecord && u.getAvatarURL() === "https://cdn/avatar/1", "clone keeps class methods");
    assert(/^a?_?[0-9a-f]+$/.test(u.avatarDecorationData.asset), "decoration asset");
    assert(/^nameplates\/.+\/$/.test(u.collectibles.nameplate.asset), "nameplate asset");
    assert.strictEqual(u.collectibles.other, 1, "other collectibles kept");
    assert.strictEqual(UserStore.getUser("2"), friend, "other users untouched");
    const p = UserProfileStore.getUserProfile("1");
    assert(p.profileEffect.skuId && p.premiumType === 2, "effect on profile");
    assert.deepStrictEqual(p.badges.map(b => b.id), ["legacy_username", "premium", "staff"], "badges added after real ones");
    assert.deepStrictEqual(useBadges.default({ userId: "1" }).map(b => b.id), ["legacy_username", "premium", "staff"], "useBadges too");
    assert.strictEqual(useBadges.default({ userId: "2" }).length, 0, "others' badges untouched");
    assert.strictEqual(banners.getUserBannerURL({ id: "1" }), "https://x.test/b.gif", "pasted banner trimmed and used");
    assert.strictEqual(banners.getUserBannerURL({ id: "2" }), "https://cdn/real-banner");
    assert.strictEqual(me.avatarDecorationData, undefined, "real record not mutated");

    const previewImgs = tree.root.findAll(n => n.type === "Image").map(n => n.props.source.uri);
    assert(previewImgs.includes("https://x.test/b.gif") && previewImgs.some(s => /badge-icons\/5e74e9b6/.test(s)), "preview shows banner and badges");

    await press("Badges");
    await TR.act(() => tree.root.findAll(n => n.type === "Switch")[0].props.onValueChange(true));
    assert.deepStrictEqual(UserProfileStore.getUserProfile("1").badges.map(b => b.id), ["premium", "staff"], "hide real badges");

    await press("More");
    await TR.act(() => tree.root.findAll(n => n.type === "Switch")[0].props.onValueChange(false));
    assert(!ChatInputActions.default.type().props.children.some(c => c.key === "enhanced-decor"), "chat button can be turned off");

    await press("Reset all");
    assert.strictEqual(UserStore.getCurrentUser(), me, "reset removes everything");
    assert.strictEqual(banners.getUserBannerURL({ id: "1" }), "https://cdn/real-banner");

    plugin.onUnload();
    assert(!sections.EnhancedDecor, "settings row removed on unload");
    assert.strictEqual(useBadges.default({ userId: "1" })[0], realBadge, "unload restores");
    console.log("ok");
})().catch(e => { console.error(e); process.exit(1); });
