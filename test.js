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
let current = me;
const UserStore = { getCurrentUser: () => current, getUser: id => ({ 1: me, 2: friend })[id], emitChange: () => emits.push("u") };
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
const avatars = { getUserAvatarURL: u => "https://cdn/avatar/" + u.id, getUserAvatarSource: u => ({ uri: "https://cdn/avatar/" + u.id }) };
function RowManager() { }
RowManager.prototype.generate = function ({ message }) { return { type: 1, message: { id: message.id, avatarURL: "https://cdn/avatar/" + message.author.id, username: message.author.globalName || message.author.username } }; };
const nameOf = u => u.globalName || u.username;
const names = { getName: nameOf, useName: nameOf, getGlobalName: nameOf, getUserTag: u => u.username };
const snow = { extractTimestamp: () => 1e12 };
const MultiAccountStore = { getUsers: () => [me, friend] };
const GIF = "R0lGODlhAQABAAAAACw=";
globalThis.__turboModuleProxy = n => (n === "ImagePickerManager" ? { launchImageLibrary: (o, cb) => cb({ assets: [{ type: "image/gif", base64: GIF }] }) } : null);
const props = { "useName,getGlobalName": names, extractTimestamp: snow, "getUserAvatarURL,getUserAvatarSource": avatars, "getAPIBaseURL,get": { get: () => Promise.reject(new Error("no live shop in tests")) }, pushLazy: modals, "Navigator,getHeaderCloseButton": nav, getUserBannerURL: banners };
const vendetta = {
    metro: {
        findByStoreName: n => ({ UserStore, UserProfileStore, MultiAccountStore })[n],
        findByProps: (...p) => props[p.join(",")],
        findByName: n => ({ useBadges, RowManager })[n],
        common: { React, ReactNative: RN, stylesheet: { createThemedStyleSheet: s => s }, clipboard: { getString: () => Promise.resolve(" https://x.test/b.gif \n") }, NavigationNative: { useNavigation: () => null } }
    },
    patcher: {
        after,
        instead: (name, obj, cb) => { const orig = obj[name]; obj[name] = function (...a) { return cb.call(this, a, orig); }; return () => { obj[name] = orig; }; }
    },
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
    await press("Account Age: Seed (1 year)");
    await press("Banner");
    await press("Paste link");
    await press("Avatar");
    await press("Pick from Photos");
    const gif = "data:image/gif;base64," + GIF;
    assert.strictEqual(avatars.getUserAvatarURL({ id: "1" }), gif, "picked GIF is my avatar");
    assert.deepStrictEqual(avatars.getUserAvatarSource({ id: "1" }), { uri: gif });
    assert.strictEqual(avatars.getUserAvatarURL({ id: "2" }), "https://cdn/avatar/2", "others keep theirs");
    assert.strictEqual(me.getAvatarURL(), gif, "user record draws it too");
    assert.strictEqual(friend.getAvatarURL(), "https://cdn/avatar/2");
    assert.strictEqual(new RowManager().generate({ message: { id: "m", author: me } }).message.avatarURL, gif, "chat rows");
    assert.strictEqual(new RowManager().generate({ message: { id: "m", author: friend } }).message.avatarURL, "https://cdn/avatar/2");
    assert.strictEqual(JSON.parse(storage.look_1).avatar, "local", "photo kept out of the look");
    assert.strictEqual(storage.lookimg_1_avatar, gif);
    assert(storage.state === undefined && storage.selected === undefined, "the old shared look moved to this account");

    const u = UserStore.getCurrentUser();
    assert(u instanceof UserRecord && u.getAvatarURL() === gif, "clone keeps class methods");
    assert(/^a?_?[0-9a-f]+$/.test(u.avatarDecorationData.asset), "decoration asset");
    assert(/^nameplates\/.+\/$/.test(u.collectibles.nameplate.asset), "nameplate asset");
    assert.strictEqual(u.collectibles.other, 1, "other collectibles kept");
    assert.strictEqual(UserStore.getUser("2"), friend, "other users untouched");
    const p = UserProfileStore.getUserProfile("1");
    assert(p.profileEffect.skuId && p.premiumType === 2, "effect on profile");
    const want = ["legacy_username", "premium", "staff", "ed_account_age_1"];
    assert.deepStrictEqual(p.badges.map(b => b.id), want, "badges added after real ones");
    assert.deepStrictEqual(useBadges.default({ userId: "1" }).map(b => b.id), want, "useBadges too");
    assert(/assets\/content\/8da9339b/.test(p.badges[3].iconSrc), "tiered badge carries its image link");
    assert.strictEqual(useBadges.default({ userId: "2" }).length, 0, "others' badges untouched");
    assert.strictEqual(banners.getUserBannerURL({ id: "1" }), "https://x.test/b.gif", "pasted banner trimmed and used");
    assert.strictEqual(banners.getUserBannerURL({ id: "2" }), "https://cdn/real-banner");
    assert.strictEqual(me.avatarDecorationData, undefined, "real record not mutated");

    const previewImgs = tree.root.findAll(n => n.type === "Image").map(n => n.props.source.uri);
    assert(previewImgs.includes("https://x.test/b.gif") && previewImgs.some(s => /badge-icons\/5e74e9b6/.test(s)), "preview shows banner and badges");

    await press("Badges");
    await TR.act(() => tree.root.findAll(n => n.type === "Switch")[0].props.onValueChange(true));
    assert.deepStrictEqual(UserProfileStore.getUserProfile("1").badges.map(b => b.id), ["premium", "staff", "ed_account_age_1"], "hide real badges");

    // Profile tab
    await press("Profile");
    const input = ph => tree.root.findAll(n => n.type === "TextInput" && n.props.placeholder === ph)[0];
    const type = async (ph, v) => { await TR.act(() => input(ph).props.onChangeText(v)); await TR.act(() => input(ph).props.onEndEditing()); };
    await type("Your display name", "Cool Adam");
    await type("username", "cooladam");
    await type("they/them", "he/him");
    await type("Write something", "hello there");
    await type("2016-05-21", "2016-05-21");
    await type("2016-05-21", "not a date"); // refused, keeps the last good one
    await type("name#1234", "adam#0001");
    await type("you@example.com", "a@b.test");
    await TR.act(() => tree.root.findAll(n => n.type === "Pressable" && n.props.style && n.props.style[1] && n.props.style[1].backgroundColor === "#eb459e")[0].props.onPress());

    const cu = UserStore.getCurrentUser();
    assert.strictEqual(cu.globalName, "Cool Adam");
    assert.strictEqual(cu.username, "cooladam");
    assert.strictEqual(cu.email, "a@b.test");
    assert.strictEqual(names.getName(me), "Cool Adam", "name helpers");
    assert.strictEqual(names.getName(friend), "friend");
    assert.strictEqual(names.getUserTag(me), "cooladam");
    const prof = UserProfileStore.getUserProfile("1");
    assert.strictEqual(prof.bio, "hello there");
    assert.strictEqual(prof.pronouns, "he/him");
    assert.deepStrictEqual(prof.themeColors, [0xeb459e, 0xeb459e], "profile colors");
    assert.strictEqual(snow.extractTimestamp("1"), Date.parse("2016-05-21T12:00:00Z"), "member since");
    assert.strictEqual(snow.extractTimestamp("2"), 1e12);
    assert.strictEqual(prof.badges.find(b => b.id === "legacy_username").description, "Originally known as adam#0001");
    assert.strictEqual(MultiAccountStore.getUsers()[0].globalName, "Cool Adam", "account switcher");
    assert.strictEqual(MultiAccountStore.getUsers()[1], friend);
    assert.strictEqual(new RowManager().generate({ message: { id: "m", author: me } }).message.username, "Cool Adam", "chat rows");
    assert.strictEqual(JSON.parse(storage.look_1).p.created, "2016-05-21");

    await press("More");
    await TR.act(() => tree.root.findAll(n => n.type === "Switch")[0].props.onValueChange(false));
    assert(!ChatInputActions.default.type().props.children.some(c => c.key === "enhanced-decor"), "chat button can be turned off");

    // presets: save, reset, wear again (picked photo included)
    await TR.act(() => input("Name this look").props.onChangeText("Party"));
    await press("Save");
    await press("Reset all");
    assert.strictEqual(UserStore.getCurrentUser(), me, "reset removes everything");
    assert.strictEqual(banners.getUserBannerURL({ id: "1" }), "https://cdn/real-banner");
    assert.strictEqual(me.getAvatarURL(), "https://cdn/avatar/1", "reset removes the avatar");
    assert.strictEqual(snow.extractTimestamp("1"), 1e12);
    await press("Wear");
    assert.strictEqual(UserStore.getCurrentUser().globalName, "Cool Adam", "preset brings the look back");
    assert.strictEqual(me.getAvatarURL(), gif, "preset brings the picked photo back");
    assert(UserProfileStore.getUserProfile("1").profileEffect.skuId);

    // switching accounts: the other account starts plain, and switching back brings this one's look back
    current = friend;
    assert.strictEqual(UserStore.getCurrentUser(), friend, "other account wears nothing of this one's");
    assert.strictEqual(friend.getAvatarURL(), "https://cdn/avatar/2", "nor its photo");
    assert.strictEqual(new RowManager().generate({ message: { id: "m", author: friend } }).message.username, "friend");
    assert(input("Name this look"), "saved looks are still there to wear");
    current = me;
    assert.strictEqual(UserStore.getCurrentUser().globalName, "Cool Adam", "back: its own look again");
    assert.strictEqual(me.getAvatarURL(), gif);
    await press("Reset all");

    plugin.onUnload();
    assert(!sections.EnhancedDecor, "settings row removed on unload");
    assert.strictEqual(useBadges.default({ userId: "1" })[0], realBadge, "unload restores");
    console.log("ok");
})().catch(e => { console.error(e); process.exit(1); });
