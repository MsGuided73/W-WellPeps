/** Styles for the dev-only Tweak panel. They live inside its shadow root, so they never touch the site. */
export const TWEAK_CSS = `
:host { all: initial; position: fixed; inset: 0; z-index: 2147483000; pointer-events: none;
  font: 13px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #14233c; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
button { font: inherit; cursor: pointer; }
code { font: 12px/1.35 ui-monospace, Consolas, monospace; word-break: break-all; }

.pill { position: fixed; left: 12px; bottom: 12px; pointer-events: auto; display: flex; align-items: center; gap: 8px;
  background: #14233c; color: #fff; border: 0; border-radius: 999px; padding: 8px 14px; box-shadow: 0 6px 20px rgba(0,0,0,.3); }
.pill:hover { background: #1c3358; }
.badge { background: #1576c4; border-radius: 999px; padding: 0 7px; font-size: 12px; font-weight: 700; }

.panel { position: fixed; top: 12px; right: 12px; width: 340px; max-height: calc(100vh - 24px); pointer-events: auto;
  display: flex; flex-direction: column; background: #fff; border: 1px solid #c9d4e3; border-radius: 12px;
  box-shadow: 0 14px 40px rgba(8,43,89,.28); overflow: hidden; }
.panel.left { right: auto; left: 12px; }
.panel header { display: flex; align-items: center; gap: 6px; padding: 8px 10px; background: #14233c; color: #fff; }
.panel header strong { flex: 1; font-size: 14px; }
.panel header button { background: #25406a; color: #fff; border: 0; border-radius: 6px; padding: 4px 9px; }
.panel header button:hover { background: #315489; }
.panel header button.on { background: #1576c4; }
.body { overflow: auto; padding: 10px; display: grid; gap: 12px; }

.hint { margin: 0; color: #53647f; }
.card { background: #f3f6fb; border: 1px solid #dbe4f0; border-radius: 8px; padding: 8px 10px; display: grid; gap: 3px; }
.lbl { font-weight: 700; }
.src { color: #53647f; font-size: 12px; }
h4 { margin: 0 0 6px; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #53647f; }

.fld { display: grid; grid-template-columns: 1fr 120px 22px; align-items: center; gap: 6px; padding: 2px 0; }
.fld input, .fld select, textarea { width: 100%; font: inherit; padding: 4px 6px; border: 1px solid #c9d4e3; border-radius: 6px; background: #fff; color: inherit; }
.fld input[type=color] { padding: 1px 2px; height: 28px; }
.rv { border: 0; background: transparent; color: #1576c4; font-size: 15px; line-height: 1; padding: 0; }
textarea { min-height: 64px; resize: vertical; }
.check { display: flex; align-items: center; gap: 8px; }
.row { display: flex; gap: 8px; flex-wrap: wrap; }
.row button, .primary { border: 1px solid #c9d4e3; background: #fff; border-radius: 8px; padding: 6px 10px; color: inherit; }
.row button:hover { background: #f3f6fb; }
.primary { background: #1576c4; border-color: #1576c4; color: #fff; font-weight: 700; }
.primary:hover { background: #0f63a8; }
.list { display: grid; gap: 4px; }
.item { display: flex; justify-content: space-between; gap: 8px; text-align: left; background: #f3f6fb; border: 1px solid #dbe4f0; border-radius: 6px; padding: 5px 8px; color: inherit; }
.item:hover { background: #e7eef8; }
.item.cur { border-color: #1576c4; }
.n { color: #53647f; white-space: nowrap; }
details summary { cursor: pointer; color: #1576c4; }
details textarea { margin-top: 6px; min-height: 160px; font: 12px/1.4 ui-monospace, Consolas, monospace; }

.box { position: fixed; pointer-events: none; border-radius: 2px; }
.box.hover { border: 2px dashed #1576c4; background: rgba(21,118,196,.10); }
.box.sel { border: 2px solid #e5484d; background: rgba(229,72,77,.06); }
.box span { position: absolute; left: -2px; top: -22px; background: #1576c4; color: #fff; font-size: 11px; padding: 1px 6px; border-radius: 4px; white-space: nowrap; }
.box.sel span { background: #e5484d; }
`;
