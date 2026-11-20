const log = require('./utils/log');
const env = require('./utils/env');

App({
  globalData: {
    autoLocateDone: false, // 本次启动是否已自动申请过定位（C2）
    locState: 'unknown'    // unknown / ok / denied / error
  },
  onLaunch() {
    const e = env.collect();
    log.record('P1', '启动', { sdk: e.sdk, wechat: e.wechat, model: e.model, system: e.system, envVersion: e.envVersion });
  }
});
