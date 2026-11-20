// 探针记录：接口返回（自动）与人工判断（通过 / 不通过 / 测不了）都存本机，可在「结果汇总」一键复制。
const KEY_LOG = 'mk_probe_log';
const KEY_VERDICT = 'mk_probe_verdict';
const MAX_LOG = 200;

function now() {
  const d = new Date();
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

function read(key, fallback) {
  try {
    const v = wx.getStorageSync(key);
    return v || fallback;
  } catch (e) {
    return fallback;
  }
}

// 记录一次接口调用。payload 里不要放手机号、完整坐标、动态令牌。
function record(caseId, action, payload) {
  const list = read(KEY_LOG, []);
  list.push({ t: now(), id: caseId, action: action, data: payload === undefined ? null : payload });
  while (list.length > MAX_LOG) list.shift();
  wx.setStorageSync(KEY_LOG, list);
  return list[list.length - 1];
}

function logs() { return read(KEY_LOG, []); }
function verdicts() { return read(KEY_VERDICT, {}); }

function setVerdict(caseId, v, note) {
  const all = verdicts();
  all[caseId] = { v: v, note: note || '', t: now() };
  wx.setStorageSync(KEY_VERDICT, all);
}

function clearAll() {
  wx.removeStorageSync(KEY_LOG);
  wx.removeStorageSync(KEY_VERDICT);
}

// 把接口的 fail 回调压成一行可读的字段。
function brief(err) {
  if (!err) return null;
  const o = {};
  if (err.errMsg !== undefined) o.errMsg = err.errMsg;
  if (err.errno !== undefined) o.errno = err.errno;
  if (err.errCode !== undefined) o.errCode = err.errCode;
  return o;
}

module.exports = { record, logs, verdicts, setVerdict, clearAll, brief, now };
