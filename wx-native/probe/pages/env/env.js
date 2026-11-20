const log = require('../../utils/log');
const env = require('../../utils/env');

Page({
  data: { e: null, sdkOk: true, rows: [] },
  onShow() {
    const e = env.collect();
    const sdkOk = env.sdkAtLeast(e.sdk, '2.32.3');
    const rows = [
      { k: '机型', v: e.brand + ' ' + e.model },
      { k: '系统', v: e.system },
      { k: '微信版本', v: e.wechat },
      { k: '基础库', v: e.sdk + (sdkOk ? '' : '（低于 2.32.3）') },
      { k: '运行版本', v: e.envVersion || '取不到' },
      { k: 'AppID', v: e.appId || '取不到' },
      { k: '屏幕', v: e.screen + ' @' + e.pixelRatio + 'x' },
      { k: '可用窗口', v: e.window },
      { k: '状态栏高度', v: e.statusBarHeight + 'px' },
      { k: '胶囊', v: '上 ' + e.menu.top + ' 下 ' + e.menu.bottom + ' 左 ' + e.menu.left + ' 宽 ' + e.menu.width + ' 高 ' + e.menu.height },
      { k: '底部安全区', v: e.safeBottomInset === '' ? '取不到' : e.safeBottomInset + 'px' },
      { k: '微信字号设置', v: e.fontSizeSetting + '' },
      { k: '系统定位开关', v: e.locationEnabled + '' },
      { k: '微信的定位权限', v: e.locationAuthorized + '' },
      { k: '微信的通知权限', v: e.notificationAuthorized + '' }
    ];
    this.setData({ e: e, sdkOk: sdkOk, rows: rows });
    log.record('P1', '设备与版本', e);
    log.setVerdict('P1', sdkOk ? 'pass' : 'fail', '基础库 ' + e.sdk);
  }
});
